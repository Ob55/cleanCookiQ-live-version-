-- Institution validation pipeline.
--   upload -> verification_status 'unverified' (pending check)
--          -> validation runner writes 'verified' (Passed) or 'flagged' + validation_issues
--   Only 'verified' institutions count on dashboards / views and are visible to
--   platform actors. Funders see only institutions an admin allocated to them.

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS validation_issues     jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note     text,
  ADD COLUMN IF NOT EXISTS recommendation_reason text;

CREATE INDEX IF NOT EXISTS idx_institutions_verification_status
  ON public.institutions (verification_status);
CREATE INDEX IF NOT EXISTS idx_institutions_name_county
  ON public.institutions (lower(name), county);

-- ---------- views: count only validated institutions ----------
CREATE OR REPLACE VIEW public.v_programme_overview
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.name,
  p.description,
  p.status,
  p.county_scope,
  p.target_institution_count,
  p.total_budget_ksh,
  p.programme_manager_id,
  p.created_at,
  COALESCE(inst.institution_count, 0)   AS institution_count,
  COALESCE(inst.installed_count, 0)     AS installed_count,
  COALESCE(mem.member_count, 0)         AS member_count,
  COALESCE(rfq.rfq_count, 0)            AS rfq_count
FROM public.programmes p
LEFT JOIN (
  SELECT programme_id,
         count(*) AS institution_count,
         count(*) FILTER (WHERE pipeline_stage = 'installed') AS installed_count
  FROM public.institutions
  WHERE programme_id IS NOT NULL AND verification_status = 'verified'
  GROUP BY programme_id
) inst ON inst.programme_id = p.id
LEFT JOIN (
  SELECT programme_id, count(*) AS member_count
  FROM public.programme_members GROUP BY programme_id
) mem ON mem.programme_id = p.id
LEFT JOIN (
  SELECT programme_id, count(*) AS rfq_count
  FROM public.procurement_rfqs GROUP BY programme_id
) rfq ON rfq.programme_id = p.id;

CREATE OR REPLACE VIEW public.v_county_metrics
WITH (security_invoker = true) AS
WITH inst_agg AS (
  SELECT
    county,
    COUNT(*)                                                              AS institutions_count,
    COUNT(*) FILTER (WHERE pipeline_stage IN ('assessed','matched','negotiation','contracted','installed','monitoring')) AS assessed_or_later_count,
    COUNT(*) FILTER (WHERE pipeline_stage IN ('installed','monitoring'))  AS transitioned_count,
    MODE() WITHIN GROUP (ORDER BY current_fuel)                           AS dominant_fuel,
    COALESCE(SUM(meals_per_day), 0)                                       AS total_meals_per_day,
    COALESCE(SUM(number_of_students), 0)                                  AS total_students
  FROM public.institutions
  WHERE county IS NOT NULL AND verification_status = 'verified'
  GROUP BY county
),
prov_agg AS (
  SELECT
    county_name,
    COUNT(*) AS providers_serving_count
  FROM public.providers,
       LATERAL UNNEST(COALESCE(counties_served, ARRAY[]::TEXT[])) AS county_name
  GROUP BY county_name
)
SELECT
  c.id           AS county_id,
  c.code         AS county_code,
  c.name         AS county_name,
  c.region       AS region,
  c.capital      AS capital,
  COALESCE(ia.institutions_count, 0)        AS institutions_count,
  COALESCE(ia.assessed_or_later_count, 0)   AS assessed_count,
  COALESCE(ia.transitioned_count, 0)        AS transitioned_count,
  ia.dominant_fuel                          AS dominant_fuel,
  COALESCE(ia.total_meals_per_day, 0)       AS total_meals_per_day,
  COALESCE(ia.total_students, 0)            AS total_students,
  COALESCE(pa.providers_serving_count, 0)   AS providers_serving_count
FROM public.counties c
LEFT JOIN inst_agg ia ON ia.county = c.name
LEFT JOIN prov_agg pa ON pa.county_name = c.name;

-- ---------- RLS: institutions ----------
-- Funders: only institutions an admin allocated to them.
-- Other platform actors: only validated institutions (codes still masked in-app).
DROP POLICY IF EXISTS "institutions_actor_read" ON public.institutions;
CREATE POLICY "institutions_actor_read" ON public.institutions
  FOR SELECT TO authenticated
  USING (
    verification_status = 'verified'
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.user_id = auth.uid()
        AND pr.org_type IN ('csr', 'supplier', 'researcher', 'kplc_depot', 'institution')
    )
  );

DROP POLICY IF EXISTS "institutions_funder_read" ON public.institutions;
CREATE POLICY "institutions_funder_read" ON public.institutions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.funder_institution_links l
    JOIN public.funder_profiles fp ON fp.id = l.funder_id
    WHERE l.institution_id = institutions.id
      AND l.status = 'active'
      AND fp.user_id = auth.uid()
  ));

-- Anonymous public map: validated institutions only.
DROP POLICY IF EXISTS "Public can view institutions" ON public.institutions;
CREATE POLICY "Public can view institutions" ON public.institutions
  FOR SELECT TO anon
  USING (verification_status = 'verified');

-- Owners must not be able to self-validate: block changes to validation columns
-- by anyone who is not host staff.
CREATE OR REPLACE FUNCTION public.protect_institution_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_host(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verification_status   := 'unverified';
      NEW.verified_by           := NULL;
      NEW.verified_at           := NULL;
      NEW.verification_note     := NULL;
      NEW.validation_issues     := '[]'::jsonb;
      NEW.validation_checked_at := NULL;
      RETURN NEW;
    END IF;
    NEW.verification_status   := OLD.verification_status;
    NEW.verified_by           := OLD.verified_by;
    NEW.verified_at           := OLD.verified_at;
    NEW.verification_note     := OLD.verification_note;
    NEW.validation_issues     := OLD.validation_issues;
    NEW.validation_checked_at := OLD.validation_checked_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_institution_validation ON public.institutions;
CREATE TRIGGER trg_protect_institution_validation
  BEFORE INSERT OR UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.protect_institution_validation();

-- ---------- RLS: funder allocation is admin-only ----------
DROP POLICY IF EXISTS "Funders can create links" ON public.funder_institution_links;
DROP POLICY IF EXISTS "Admins can manage links" ON public.funder_institution_links;
DROP POLICY IF EXISTS "Hosts can manage funder links" ON public.funder_institution_links;
CREATE POLICY "Hosts can manage funder links" ON public.funder_institution_links
  FOR ALL TO authenticated
  USING (public.is_host(auth.uid()))
  WITH CHECK (public.is_host(auth.uid()));

-- Validation pipeline, part 2 (builds on 20260923100000_institution_validation).
--   * institution_registry: optional official school list admins upload; the
--     validator matches uploaded names/locations against it.
--   * institutions.recommended_providers: top provider ids suggested for the
--     recommended cooking method.

CREATE TABLE IF NOT EXISTS public.institution_registry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  name_norm     text NOT NULL,
  county        text,
  sub_county    text,
  registry_code text,
  latitude      double precision,
  longitude     double precision,
  source        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institution_registry_name_county
  ON public.institution_registry (name_norm, county);

ALTER TABLE public.institution_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts manage registry" ON public.institution_registry;
CREATE POLICY "Hosts manage registry" ON public.institution_registry
  FOR ALL TO authenticated
  USING (public.is_host(auth.uid()))
  WITH CHECK (public.is_host(auth.uid()));

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS recommended_providers uuid[] NOT NULL DEFAULT '{}';

-- Institutions already on the platform before the validation pipeline are
-- trusted as-is: mark them Passed so dashboard counts stay unchanged. Only
-- uploads from now on go through validation.
UPDATE public.institutions
SET verification_status   = 'verified',
    verification_note     = 'Existing institution — passed when validation was introduced',
    verified_at           = now(),
    validation_issues     = '[]'::jsonb,
    validation_checked_at = now()
WHERE verification_status <> 'verified'
  AND validation_checked_at IS NULL;  -- never re-pass rows the validator already judged

-- Bulk-apply validator results in one round trip:
--   _results = [{ "id": uuid, "issues": [...] }, ...]
-- Empty issues -> 'verified' (Passed), otherwise 'flagged'. Host staff only.
CREATE OR REPLACE FUNCTION public.apply_institution_validation(_results jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_host(auth.uid()) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  WITH r AS (
    SELECT x.id, x.issues FROM jsonb_to_recordset(_results) AS x(id uuid, issues jsonb)
  ), u AS (
    UPDATE public.institutions i SET
      verification_status   = CASE WHEN jsonb_array_length(r.issues) = 0
                                   THEN 'verified'::public.verification_status
                                   ELSE 'flagged'::public.verification_status END,
      validation_issues     = r.issues,
      validation_checked_at = now(),
      verified_at           = CASE WHEN jsonb_array_length(r.issues) = 0 THEN now() END,
      verified_by           = CASE WHEN jsonb_array_length(r.issues) = 0 THEN auth.uid() END,
      verification_note     = CASE WHEN jsonb_array_length(r.issues) = 0 THEN 'Passed automatic validation' END
    FROM r WHERE i.id = r.id
    RETURNING 1
  )
  SELECT count(*) INTO n FROM u;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_institution_validation(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_institution_validation(jsonb) TO authenticated;

-- Bulk-save cooking-method proposals:
--   _rows = [{ "id": uuid, "method": text, "reason": text, "providers": [uuid] }, ...]
CREATE OR REPLACE FUNCTION public.apply_institution_recommendations(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_host(auth.uid()) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  WITH r AS (
    SELECT x.id, x.method, x.reason, x.providers
    FROM jsonb_to_recordset(_rows) AS x(id uuid, method text, reason text, providers uuid[])
  ), u AS (
    UPDATE public.institutions i SET
      recommended_solution  = r.method,
      recommendation_reason = r.reason,
      recommended_providers = COALESCE(r.providers, '{}')
    FROM r WHERE i.id = r.id
    RETURNING 1
  )
  SELECT count(*) INTO n FROM u;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_institution_recommendations(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_institution_recommendations(jsonb) TO authenticated;

-- Extend the owner guard from 20260923100000: besides validation columns,
-- institution owners can't change the admin's method proposal. (INSERT keeps
-- the proposal fields as given so the self-registration setup still works.)
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
      NEW.recommended_providers := '{}';
      RETURN NEW;
    END IF;
    NEW.verification_status   := OLD.verification_status;
    NEW.verified_by           := OLD.verified_by;
    NEW.verified_at           := OLD.verified_at;
    NEW.verification_note     := OLD.verification_note;
    NEW.validation_issues     := OLD.validation_issues;
    NEW.validation_checked_at := OLD.validation_checked_at;
    NEW.recommended_solution  := OLD.recommended_solution;
    NEW.recommendation_reason := OLD.recommendation_reason;
    NEW.recommended_providers := OLD.recommended_providers;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- RLS tightening — narrow SELECT on PII / financial / scoring tables.
--
-- Follow-up to 20260512100500_security_hardening_round2.sql which flagged
-- these tables as still readable by every authenticated user.
--
-- BEFORE this migration, all four tables had:
--     CREATE POLICY "... can view ..."
--       FOR SELECT TO authenticated USING (true);
--
-- That meant any logged-in user — supplier, researcher, kplc_depot,
-- "other" — could read every institution's documents, financing
-- applications, assessments, and readiness scores. That's PII for
-- documents and competitive intelligence for the others.
--
-- AFTER this migration, the SELECT policies are narrowed to the
-- legitimate readers per table:
--
--   institution_documents — admin / manager / uploader / institution
--     org-member / linked funder / linked supplier.
--   financing_applications — admin / manager / institution org-member /
--     any funder or CSR user (the marketplace audience).
--   assessments — admin / manager / assessor / institution org-member /
--     any funder or CSR user (deal evaluators).
--   readiness_scores — admin / manager / institution org-member /
--     any funder or CSR user.
--
-- INSERT / UPDATE / DELETE policies are not changed by this migration —
-- existing write rules already covered the actual write paths used by
-- the app.
--
-- This migration is idempotent: each new policy is DROP IF EXISTS'd
-- before being created, so re-running it is safe.
-- ============================================================

-- ---------- institution_documents ----------
DROP POLICY IF EXISTS "Authenticated can view institution documents" ON public.institution_documents;
DROP POLICY IF EXISTS "institution_documents_scoped_read"             ON public.institution_documents;

CREATE POLICY "institution_documents_scoped_read"
  ON public.institution_documents
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    -- The uploader can always read their own upload (covers funder
    -- personal-doc uploads where institution_id IS NULL).
    OR uploaded_by = auth.uid()
    -- Institution owner OR any user whose profile is linked to that
    -- institution organisation (multi-user institutions).
    OR EXISTS (
      SELECT 1
      FROM public.institutions i
      LEFT JOIN public.profiles pr
        ON pr.organisation_id = i.id AND pr.user_id = auth.uid()
      WHERE i.id = institution_documents.institution_id
        AND (i.created_by = auth.uid() OR pr.user_id IS NOT NULL)
    )
    -- Funder who has expressed interest in this institution.
    OR EXISTS (
      SELECT 1
      FROM public.funder_institution_links fil
      JOIN public.funder_profiles fp ON fp.id = fil.funder_id
      WHERE fil.institution_id = institution_documents.institution_id
        AND fp.user_id = auth.uid()
    )
    -- Supplier paired with this institution.
    OR EXISTS (
      SELECT 1
      FROM public.institution_supplier_links isl
      JOIN public.providers prov ON prov.id = isl.provider_id
      JOIN public.profiles pr    ON pr.organisation_id = prov.organisation_id
      WHERE isl.institution_id = institution_documents.institution_id
        AND pr.user_id = auth.uid()
    )
  );

-- ---------- financing_applications ----------
DROP POLICY IF EXISTS "Authenticated can view financing"     ON public.financing_applications;
DROP POLICY IF EXISTS "financing_applications_scoped_read"   ON public.financing_applications;

CREATE POLICY "financing_applications_scoped_read"
  ON public.financing_applications
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    -- Institution owner / org-member reads their own applications.
    OR EXISTS (
      SELECT 1
      FROM public.institutions i
      LEFT JOIN public.profiles pr
        ON pr.organisation_id = i.id AND pr.user_id = auth.uid()
      WHERE i.id = financing_applications.institution_id
        AND (i.created_by = auth.uid() OR pr.user_id IS NOT NULL)
    )
    -- Any funder / CSR user — they're the marketplace audience.
    -- (Onboarding flow gates these org types behind admin approval.)
    OR EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = auth.uid()
        AND pr.org_type IN ('funder', 'csr')
    )
  );

-- ---------- assessments ----------
DROP POLICY IF EXISTS "Authenticated users can view assessments" ON public.assessments;
DROP POLICY IF EXISTS "assessments_scoped_read"                  ON public.assessments;

CREATE POLICY "assessments_scoped_read"
  ON public.assessments
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    -- Field agent who carried out the assessment.
    OR assessor_id = auth.uid()
    -- Institution owner / org-member reads their own assessment.
    OR EXISTS (
      SELECT 1
      FROM public.institutions i
      LEFT JOIN public.profiles pr
        ON pr.organisation_id = i.id AND pr.user_id = auth.uid()
      WHERE i.id = assessments.institution_id
        AND (i.created_by = auth.uid() OR pr.user_id IS NOT NULL)
    )
    -- Any funder / CSR user — they evaluate deals.
    OR EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = auth.uid()
        AND pr.org_type IN ('funder', 'csr')
    )
  );

-- ---------- readiness_scores ----------
DROP POLICY IF EXISTS "Authenticated users can view scores" ON public.readiness_scores;
DROP POLICY IF EXISTS "readiness_scores_scoped_read"        ON public.readiness_scores;

CREATE POLICY "readiness_scores_scoped_read"
  ON public.readiness_scores
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    -- Institution owner / org-member reads their own score.
    OR EXISTS (
      SELECT 1
      FROM public.institutions i
      LEFT JOIN public.profiles pr
        ON pr.organisation_id = i.id AND pr.user_id = auth.uid()
      WHERE i.id = readiness_scores.institution_id
        AND (i.created_by = auth.uid() OR pr.user_id IS NOT NULL)
    )
    -- Any funder / CSR user.
    OR EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = auth.uid()
        AND pr.org_type IN ('funder', 'csr')
    )
  );

-- ---------- Supporting indexes ----------
-- The new policies touch profiles.user_id + organisation_id, and the
-- funder/supplier link tables, on every SELECT. Make sure those
-- predicates are indexed. (Most already exist; CREATE INDEX IF NOT
-- EXISTS makes this idempotent.)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_org_id
  ON public.profiles (user_id, organisation_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_org_type
  ON public.profiles (user_id, org_type);
CREATE INDEX IF NOT EXISTS idx_institutions_created_by
  ON public.institutions (created_by);

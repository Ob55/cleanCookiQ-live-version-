-- ============================================================
-- Programme tenancy — host-tenant multi-tenancy on the existing
-- `programmes` table.
--
-- Model (see /home/brian/.claude/plans/atomic-juggling-fern.md):
--   * A "programme" row IS a tenant (an engagement / advisory workstream).
--     The first is the IRENA / Taita Taveta assignment. Future programmes,
--     portfolios and advisory work onboard the same way — by data, not code.
--   * The HOST is not a row: it is any user with admin / manager /
--     field_agent, who already had unfiltered access via has_role().
--     Ignis = host, retaining cross-tenant visibility.
--   * A non-host user sees only the programme(s) they are a member of.
--
-- Tenancy is carried ONLY by:
--     programme_members.programme_id  (who belongs to a tenant + their role)
--     institutions.programme_id       (which rows belong to a tenant)
--
-- We deliberately do NOT reuse profiles.organisation_id for tenancy: that
-- column is already overloaded — its FK targets organisations(id) but the
-- 20260521100000 RLS policies compare it against institutions.id. Reusing
-- it for a third meaning would collide. The helpers below never touch it.
-- ============================================================

-- ---------- (a) Scoping spine: institutions.programme_id ----------
-- Nullable on purpose. NULL = host-only / unassigned (legacy Ignis data):
-- visible to the host, invisible to any tenant member. Existing rows keep
-- working untouched.
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_institutions_programme_id
  ON public.institutions (programme_id);

-- ---------- (b) Per-tenant membership + role ----------
-- Separate from the global user_roles table on purpose: user_roles grants
-- platform-wide capabilities, whereas membership here is scoped to one
-- programme. A user can hold different roles across different programmes.
-- `county_pipeline_viewer` is the Taita Taveta scoped, read-only role.
DO $$ BEGIN
  CREATE TYPE public.programme_member_role AS ENUM
    ('programme_lead', 'programme_editor', 'programme_viewer', 'county_pipeline_viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.programme_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id  uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          public.programme_member_role NOT NULL DEFAULT 'programme_viewer',
  invited_email text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_programme_members_user      ON public.programme_members (user_id);
CREATE INDEX IF NOT EXISTS idx_programme_members_programme ON public.programme_members (programme_id);

ALTER TABLE public.programme_members ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_programme_members_updated_at ON public.programme_members;
CREATE TRIGGER trg_programme_members_updated_at
  BEFORE UPDATE ON public.programme_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- (c) Helper functions ----------
-- SECURITY DEFINER + SET search_path so policies can read programme_members
-- without tripping over its own RLS (same pattern as public.has_role).

CREATE OR REPLACE FUNCTION public.is_host(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin'::public.app_role)
      OR public.has_role(_uid, 'manager'::public.app_role)
      OR public.has_role(_uid, 'field_agent'::public.app_role);
$$;

-- All programme ids a user may see: explicit memberships + programmes they
-- manage. Used by the member-read policies below.
CREATE OR REPLACE FUNCTION public.user_programme_ids(_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT programme_id FROM public.programme_members WHERE user_id = _uid
  UNION
  SELECT id FROM public.programmes WHERE programme_manager_id = _uid;
$$;

-- Can this user EDIT a programme's data? Host, the programme's manager, or a
-- member with role programme_lead / programme_editor. Viewers and county
-- pipeline viewers are read-only. Used by write policies below and mirrored
-- by the client (canEdit) so the UI matches what RLS actually allows.
CREATE OR REPLACE FUNCTION public.can_edit_programme(_uid uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_host(_uid)
      OR EXISTS (SELECT 1 FROM public.programmes p
                 WHERE p.id = _programme_id AND p.programme_manager_id = _uid)
      OR EXISTS (SELECT 1 FROM public.programme_members m
                 WHERE m.programme_id = _programme_id AND m.user_id = _uid
                   AND m.role IN ('programme_lead', 'programme_editor'));
$$;

-- ============================================================
-- RLS
-- ============================================================

-- ---------- programme_members ----------
DROP POLICY IF EXISTS "pm_host_manage" ON public.programme_members;
CREATE POLICY "pm_host_manage" ON public.programme_members
  FOR ALL TO authenticated
  USING (public.is_host(auth.uid()))
  WITH CHECK (public.is_host(auth.uid()));

-- The programme's manager can manage its members (add/remove/change role).
DROP POLICY IF EXISTS "pm_lead_manage" ON public.programme_members;
CREATE POLICY "pm_lead_manage" ON public.programme_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.programmes p
    WHERE p.id = programme_members.programme_id AND p.programme_manager_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programmes p
    WHERE p.id = programme_members.programme_id AND p.programme_manager_id = auth.uid()
  ));

-- A member can see their own membership rows (so the client can resolve
-- "which programme am I in" for the scoped portal).
DROP POLICY IF EXISTS "pm_self_read" ON public.programme_members;
CREATE POLICY "pm_self_read" ON public.programme_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------- institutions (the one high-risk rewrite) ----------
-- BEFORE: "Authenticated users can view institutions" USING (true) — every
-- logged-in user saw every institution. That blanket read is what powers
-- the marketplace / funder deal-flow / logged-in map today, but it also
-- makes tenant isolation impossible. We replace it with scoped policies.
--
-- Untouched by this migration (still apply, permissive-OR):
--   * "Public can view institutions"            (anon only — public map)
--   * "Admins/Managers can manage institutions" (host writes + reads)
--   * "Institution users can select own institution" (owner via created_by)
DROP POLICY IF EXISTS "Authenticated users can view institutions" ON public.institutions;

-- Host: full cross-tenant visibility.
DROP POLICY IF EXISTS "institutions_host_read" ON public.institutions;
CREATE POLICY "institutions_host_read" ON public.institutions
  FOR SELECT TO authenticated
  USING (public.is_host(auth.uid()));

-- Tenant member: only their programme's institutions.
DROP POLICY IF EXISTS "institutions_member_read" ON public.institutions;
CREATE POLICY "institutions_member_read" ON public.institutions
  FOR SELECT TO authenticated
  USING (
    programme_id IS NOT NULL
    AND programme_id IN (SELECT public.user_programme_ids(auth.uid()))
  );

-- Platform actors keep the broad read they rely on today (marketplace,
-- funder deal-flow, supplier and institution browsing). institution_code
-- masking in src/lib/institutionDisplay.ts still hides names cross-actor.
--
-- NOTE: org_type 'other' is intentionally EXCLUDED here — it is a catch-all
-- with no institution-browsing feature, so it drops to least-privilege
-- (host/owner/programme-scope only). Tenant-scoped users provisioned for an
-- engagement (e.g. Taita Taveta County) are given org_type 'other' with no
-- platform role, so this exclusion is what limits them to their programme.
DROP POLICY IF EXISTS "institutions_actor_read" ON public.institutions;
CREATE POLICY "institutions_actor_read" ON public.institutions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.user_id = auth.uid()
        AND pr.org_type IN ('funder', 'csr', 'supplier', 'researcher', 'kplc_depot', 'institution')
    )
  );

-- ---------- child tables: add programme-member read ----------
-- Additive only. The existing *_scoped_read policies (20260521100000) stay
-- as-is; these grant programme members read to their programme's rows via
-- institutions.programme_id. (M&E tables — deliveries/risk/carbon — are
-- extended in a later phase; the county pipeline view needs only
-- institutions.)

DROP POLICY IF EXISTS "assessments_member_read" ON public.assessments;
CREATE POLICY "assessments_member_read" ON public.assessments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = assessments.institution_id
      AND i.programme_id IN (SELECT public.user_programme_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "financing_applications_member_read" ON public.financing_applications;
CREATE POLICY "financing_applications_member_read" ON public.financing_applications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = financing_applications.institution_id
      AND i.programme_id IN (SELECT public.user_programme_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "readiness_scores_member_read" ON public.readiness_scores;
CREATE POLICY "readiness_scores_member_read" ON public.readiness_scores
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = readiness_scores.institution_id
      AND i.programme_id IN (SELECT public.user_programme_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "institution_documents_member_read" ON public.institution_documents;
CREATE POLICY "institution_documents_member_read" ON public.institution_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = institution_documents.institution_id
      AND i.programme_id IN (SELECT public.user_programme_ids(auth.uid()))
  ));

-- ============================================================
-- v_programme_overview — one RLS-respecting row per programme with rollups
-- for the admin Projects list/detail. security_invoker so it is filtered by
-- the caller's own RLS (host sees all; member sees theirs).
-- ============================================================
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
  WHERE programme_id IS NOT NULL
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

GRANT SELECT ON public.v_programme_overview TO authenticated;

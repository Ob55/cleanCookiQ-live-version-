-- ============================================================
-- Transition Scenarios — the costed pathway per institution.
--
-- The PRD's "every assessment ends in a number" requirement (capex, fuel
-- saving, payback, residual risk) is modelled by EXTENDING the existing
-- cost_models table rather than adding a new one: cost_models already holds
-- capex / monthly_opex / current_monthly_fuel_cost / projected_monthly_savings
-- / payback_months / roi_percentage / assumptions per institution+technology.
--
-- Added here: programme scoping, review workflow, a single recommended
-- pathway per institution, and provenance (methodology_version / assumptions_ref)
-- so every figure traces to Wilson's fuel-specific costing methodology.
--
-- The payback/ROI/savings scalars become DERIVED — computed by src/lib/tco.ts
-- via src/lib/scenarioTco.ts on write — so a disagreement with the workbook is
-- a function bug, not a typo. The allowed technology set is per-programme
-- config (system_config), so LPG can be excluded and ICS kept benchmark-only
-- for this engagement without a code change.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.scenario_status AS ENUM ('draft', 'reviewed', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.cost_models
  ADD COLUMN IF NOT EXISTS programme_id        uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status              public.scenario_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewed_by         uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS is_recommended      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS residual_risk       text,
  ADD COLUMN IF NOT EXISTS methodology_version text,
  ADD COLUMN IF NOT EXISTS assumptions_ref     text;

-- Scope existing scenarios to their institution's programme.
UPDATE public.cost_models c
  SET programme_id = i.programme_id
  FROM public.institutions i
  WHERE i.id = c.institution_id AND c.programme_id IS NULL AND i.programme_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cost_models_programme ON public.cost_models (programme_id);

-- At most one recommended pathway per institution.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_models_recommended
  ON public.cost_models (institution_id) WHERE is_recommended;

-- ---------- RLS: tighten the blanket read, add tenancy ----------
-- BEFORE: "Authenticated users can view cost models" USING (true) — every
-- logged-in user saw every scenario. Replace with host/member scoped reads
-- mirroring the institutions rewrite in 20260808100000. The existing
-- "Admins can manage cost models" policy stays (permissive-OR) so host writes
-- keep working, including on legacy rows with a null programme_id.
DROP POLICY IF EXISTS "Authenticated users can view cost models" ON public.cost_models;

DROP POLICY IF EXISTS "cost_models_host_read" ON public.cost_models;
CREATE POLICY "cost_models_host_read" ON public.cost_models
  FOR SELECT TO authenticated
  USING (public.is_host(auth.uid()));

-- Member: scenarios for institutions in a programme they belong to. Joined
-- through institutions.programme_id so legacy rows resolve even before the
-- programme_id backfill above touches them.
DROP POLICY IF EXISTS "cost_models_member_read" ON public.cost_models;
CREATE POLICY "cost_models_member_read" ON public.cost_models
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = cost_models.institution_id
      AND i.programme_id IN (SELECT public.user_programme_ids(auth.uid()))
  ));

-- Write: host, the programme's manager, or a lead/editor member of the
-- owning institution's programme.
DROP POLICY IF EXISTS "cost_models_edit_manage" ON public.cost_models;
CREATE POLICY "cost_models_edit_manage" ON public.cost_models
  FOR ALL TO authenticated
  USING (public.can_edit_programme(
           auth.uid(),
           (SELECT i.programme_id FROM public.institutions i WHERE i.id = cost_models.institution_id)))
  WITH CHECK (public.can_edit_programme(
           auth.uid(),
           (SELECT i.programme_id FROM public.institutions i WHERE i.id = cost_models.institution_id)));

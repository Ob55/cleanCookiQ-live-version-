-- ============================================================
-- Budget line refinements + programme engagement log.
--
-- Budget lines gain a free-text description and an optional link to a specific
-- institution in the programme (so a spend can be attributed to a site). The
-- programmes.total_budget_ksh "total budget" concept is being dropped from the
-- UI, so budget lines are now standalone named allocations, not a draw-down.
--
-- programme_engagements is a lightweight log of engagements/interactions the
-- team has had during the programme (workshops, meetings, calls with partners
-- or institutions). Repurposes what the "Suppliers" tab used to be.
-- ============================================================

-- ---------- budget lines: description + institution link ----------
ALTER TABLE public.programme_budget_lines
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_programme_budget_lines_institution
  ON public.programme_budget_lines (institution_id);

-- ---------- programme engagements ----------
CREATE TABLE IF NOT EXISTS public.programme_engagements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id    uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  title           text NOT NULL,
  organisation    text,
  engagement_date date,
  notes           text,
  -- optional link to the institution the engagement concerned.
  institution_id  uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  added_by_name   text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_programme_engagements_programme
  ON public.programme_engagements (programme_id);

ALTER TABLE public.programme_engagements ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_programme_engagements_updated_at ON public.programme_engagements;
CREATE TRIGGER trg_programme_engagements_updated_at
  BEFORE UPDATE ON public.programme_engagements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Host / programme manager / lead / editor may write; members read.
DROP POLICY IF EXISTS "pe_edit_manage" ON public.programme_engagements;
CREATE POLICY "pe_edit_manage" ON public.programme_engagements
  FOR ALL TO authenticated
  USING (public.can_edit_programme(auth.uid(), programme_id))
  WITH CHECK (public.can_edit_programme(auth.uid(), programme_id));

DROP POLICY IF EXISTS "pe_member_read" ON public.programme_engagements;
CREATE POLICY "pe_member_read" ON public.programme_engagements
  FOR SELECT TO authenticated
  USING (programme_id IN (SELECT public.user_programme_ids(auth.uid())));

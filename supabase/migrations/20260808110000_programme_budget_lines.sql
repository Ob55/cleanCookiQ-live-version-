-- ============================================================
-- Programme budget lines — allocations that draw down a programme's
-- total_budget_ksh so the team can track committed vs remaining budget.
-- Each line has a name (the allocation / cost type), an amount, and an
-- optional assignee (who the allocation is for). Remaining budget is
-- computed as programmes.total_budget_ksh - SUM(amount_ksh).
--
-- Scoping follows the same host-tenant rules as the rest of the tenancy
-- model (see 20260808100000_programme_tenancy.sql): host manages all,
-- the programme manager manages their own, members read their programme's.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programme_budget_lines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id   uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  name           text NOT NULL,
  amount_ksh     numeric NOT NULL DEFAULT 0,
  assignee       text,
  -- Which co-funder the allocation is drawn from (IRENA grant, partner
  -- cash/in-kind, etc.). Multi-funder engagements need this attribution.
  funding_source text,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- Idempotent: add the column if the table was created before this field existed.
ALTER TABLE public.programme_budget_lines
  ADD COLUMN IF NOT EXISTS funding_source text;
CREATE INDEX IF NOT EXISTS idx_programme_budget_lines_programme
  ON public.programme_budget_lines (programme_id);

ALTER TABLE public.programme_budget_lines ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_programme_budget_lines_updated_at ON public.programme_budget_lines;
CREATE TRIGGER trg_programme_budget_lines_updated_at
  BEFORE UPDATE ON public.programme_budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Host, the programme manager, or a lead/editor member may write.
DROP POLICY IF EXISTS "pbl_host_manage" ON public.programme_budget_lines;
DROP POLICY IF EXISTS "pbl_lead_manage" ON public.programme_budget_lines;
DROP POLICY IF EXISTS "pbl_edit_manage" ON public.programme_budget_lines;
CREATE POLICY "pbl_edit_manage" ON public.programme_budget_lines
  FOR ALL TO authenticated
  USING (public.can_edit_programme(auth.uid(), programme_id))
  WITH CHECK (public.can_edit_programme(auth.uid(), programme_id));

-- Members read their programme's budget lines.
DROP POLICY IF EXISTS "pbl_member_read" ON public.programme_budget_lines;
CREATE POLICY "pbl_member_read" ON public.programme_budget_lines
  FOR SELECT TO authenticated
  USING (programme_id IN (SELECT public.user_programme_ids(auth.uid())));

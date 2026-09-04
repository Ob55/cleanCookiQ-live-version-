-- ============================================================
-- Portfolio programme-scoping — the bundling object that reaches a lender.
--
-- The PRD's "bundle to a financeable scale" requirement reuses the existing
-- portfolios table (name, description, institution_ids uuid[]) and its
-- client-side savings/CO2 aggregation (src/pages/admin/PortfolioAggregation.tsx).
-- Added here: programme scoping, a status lifecycle, an explicit share list
-- for the (deferred) financier view, and the target FI a portfolio is pitched
-- to.
--
-- Scoping follows the host-tenant model: host manages all, the programme's
-- lead/editor edit theirs, members read theirs, and a financier reads only
-- portfolios explicitly shared with them.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.portfolio_status AS ENUM ('draft', 'shared', 'under_review', 'eoi_secured');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status       public.portfolio_status NOT NULL DEFAULT 'draft',
  -- users a portfolio is explicitly shared with (financier_viewer, deferred).
  ADD COLUMN IF NOT EXISTS shared_with  uuid[] NOT NULL DEFAULT '{}',
  -- the FI this portfolio is shaped for. Plain uuid for now — the FK target
  -- (financial_institutions vs organisations) lands with the FI entity in a
  -- later pass, so no REFERENCES here yet.
  ADD COLUMN IF NOT EXISTS target_financial_institution_id uuid;

CREATE INDEX IF NOT EXISTS idx_portfolios_programme ON public.portfolios (programme_id);

-- Keep the existing host-only Admins can read/insert/update/delete policies
-- (permissive-OR). Add programme-member visibility + edit, plus explicit-share
-- read for a future financier user.
DROP POLICY IF EXISTS "portfolios_member_read" ON public.portfolios;
CREATE POLICY "portfolios_member_read" ON public.portfolios
  FOR SELECT TO authenticated
  USING (
    programme_id IN (SELECT public.user_programme_ids(auth.uid()))
    OR auth.uid() = ANY (shared_with)
  );

DROP POLICY IF EXISTS "portfolios_edit_manage" ON public.portfolios;
CREATE POLICY "portfolios_edit_manage" ON public.portfolios
  FOR ALL TO authenticated
  USING (public.can_edit_programme(auth.uid(), programme_id))
  WITH CHECK (public.can_edit_programme(auth.uid(), programme_id));

-- ============================================================
-- Workstream 8: Onboarding & Access Model
--
-- Tables:
--   onboarding_progress  - one row per (user, journey) tracking the
--                          most-recent step the user reached and whether
--                          they finished. Used by dashboards to nudge
--                          users back into incomplete flows.
--
-- All policies use (SELECT auth.uid()).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey         TEXT NOT NULL,        -- 'institution','supplier','funder','researcher','other'
  step_index      INTEGER NOT NULL DEFAULT 0,
  total_steps     INTEGER NOT NULL DEFAULT 1,
  is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  data            JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, journey)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_incomplete ON public.onboarding_progress(user_id) WHERE is_complete = FALSE;

DROP TRIGGER IF EXISTS trg_onboarding_updated_at ON public.onboarding_progress;
CREATE TRIGGER trg_onboarding_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_self_rw"   ON public.onboarding_progress;
DROP POLICY IF EXISTS "onboarding_admin_read" ON public.onboarding_progress;

CREATE POLICY "onboarding_self_rw" ON public.onboarding_progress
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "onboarding_admin_read" ON public.onboarding_progress
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

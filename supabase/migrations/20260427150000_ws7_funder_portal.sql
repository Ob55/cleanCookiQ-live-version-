-- ============================================================
-- Workstream 7: Funder Portal Upgrade
--
-- Tables:
--   funder_preferences        - per-funder filter prefs (counties, fuels,
--                               ticket size, risk appetite, IRR floor)
--   funder_portfolio          - which funder is on which project, with
--                               capital amount + instrument
--   funder_attribution_ledger - per-period attribution of CO2 avoided /
--                               jobs / KSh disbursed back to each funder
--   coinvestment_intros       - intro requests funder A → funder B about a deal
--
-- View:
--   v_funder_deal_flow        - projects enriched with county, fuel, risk
--                               score, carbon forecast, total budget
--                               (the curated deal flow on the dashboard)
-- ============================================================

-- ============================================================
-- 1. FUNDER PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funder_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         UUID NOT NULL UNIQUE REFERENCES public.organisations(id) ON DELETE CASCADE,
  name                    TEXT,
  ticket_size_min         NUMERIC,
  ticket_size_max         NUMERIC,
  ticket_currency         TEXT NOT NULL DEFAULT 'KES',
  preferred_counties      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_fuels         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_instruments   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  max_risk_score          INTEGER CHECK (max_risk_score BETWEEN 1 AND 25),
  min_irr                 NUMERIC,
  esg_focus               TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes                   TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by              UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_funder_preferences_updated_at ON public.funder_preferences;
CREATE TRIGGER trg_funder_preferences_updated_at
  BEFORE UPDATE ON public.funder_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.funder_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "funder_prefs_self_rw"  ON public.funder_preferences;
DROP POLICY IF EXISTS "funder_prefs_admin_all" ON public.funder_preferences;

CREATE POLICY "funder_prefs_self_rw" ON public.funder_preferences
  FOR ALL
  USING (organisation_id IN (
    SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "funder_prefs_admin_all" ON public.funder_preferences
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 2. FUNDER PORTFOLIO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funder_portfolio (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  instrument_id       UUID REFERENCES public.financing_instruments(id) ON DELETE SET NULL,
  capital_amount      NUMERIC NOT NULL,
  capital_currency    TEXT NOT NULL DEFAULT 'KES',
  capital_share_pct   NUMERIC,                          -- 0..1 share of total project capital
  committed_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  disbursed_at        DATE,
  status              TEXT NOT NULL DEFAULT 'committed'
                      CHECK (status IN ('pipeline','committed','disbursed','repaid','written_off')),
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organisation_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_funder_portfolio_org ON public.funder_portfolio(organisation_id);
CREATE INDEX IF NOT EXISTS idx_funder_portfolio_project ON public.funder_portfolio(project_id);
CREATE INDEX IF NOT EXISTS idx_funder_portfolio_status ON public.funder_portfolio(status);

DROP TRIGGER IF EXISTS trg_funder_portfolio_updated_at ON public.funder_portfolio;
CREATE TRIGGER trg_funder_portfolio_updated_at
  BEFORE UPDATE ON public.funder_portfolio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.funder_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_self_read"  ON public.funder_portfolio;
DROP POLICY IF EXISTS "portfolio_admin_all"  ON public.funder_portfolio;

CREATE POLICY "portfolio_self_read" ON public.funder_portfolio
  FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
  ));
CREATE POLICY "portfolio_admin_all" ON public.funder_portfolio
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 3. FUNDER ATTRIBUTION LEDGER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funder_attribution_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  capital_share_pct   NUMERIC NOT NULL CHECK (capital_share_pct BETWEEN 0 AND 1),
  attributable_tco2e  NUMERIC NOT NULL DEFAULT 0,
  attributable_meals  NUMERIC NOT NULL DEFAULT 0,
  attributable_jobs   NUMERIC NOT NULL DEFAULT 0,
  attributable_ksh_savings NUMERIC NOT NULL DEFAULT 0,
  source_methodology  TEXT,
  recorded_by         UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start),
  UNIQUE(organisation_id, project_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_funder_attribution_org ON public.funder_attribution_ledger(organisation_id, period_start DESC);

ALTER TABLE public.funder_attribution_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attribution_self_read"  ON public.funder_attribution_ledger;
DROP POLICY IF EXISTS "attribution_admin_all"  ON public.funder_attribution_ledger;

CREATE POLICY "attribution_self_read" ON public.funder_attribution_ledger
  FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid())
  ));
CREATE POLICY "attribution_admin_all" ON public.funder_attribution_ledger
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 4. CO-INVESTMENT INTRO REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coinvestment_intros (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  target_org_id           UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id              UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  message                 TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','declined','withdrawn')),
  responded_at            TIMESTAMPTZ,
  requester_user_id       UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_org_id <> target_org_id)
);

CREATE INDEX IF NOT EXISTS idx_coinvest_target ON public.coinvestment_intros(target_org_id, status);
CREATE INDEX IF NOT EXISTS idx_coinvest_requester ON public.coinvestment_intros(requester_org_id);

DROP TRIGGER IF EXISTS trg_coinvest_updated_at ON public.coinvestment_intros;
CREATE TRIGGER trg_coinvest_updated_at
  BEFORE UPDATE ON public.coinvestment_intros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.coinvestment_intros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coinvest_party_read"   ON public.coinvestment_intros;
DROP POLICY IF EXISTS "coinvest_self_insert"  ON public.coinvestment_intros;
DROP POLICY IF EXISTS "coinvest_target_update" ON public.coinvestment_intros;
DROP POLICY IF EXISTS "coinvest_admin_all"    ON public.coinvestment_intros;

CREATE POLICY "coinvest_party_read" ON public.coinvestment_intros
  FOR SELECT
  USING (
    requester_org_id IN (SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid()))
    OR target_org_id IN (SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid()))
  );
CREATE POLICY "coinvest_self_insert" ON public.coinvestment_intros
  FOR INSERT
  WITH CHECK (
    requester_user_id = (SELECT auth.uid())
    AND requester_org_id IN (SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid()))
  );
CREATE POLICY "coinvest_target_update" ON public.coinvestment_intros
  FOR UPDATE
  USING (target_org_id IN (SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (target_org_id IN (SELECT organisation_id FROM public.profiles WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "coinvest_admin_all" ON public.coinvestment_intros
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 5. VIEWS
-- ============================================================

-- Curated deal flow: projects enriched with all the dimensions a funder
-- filters on. Anyone can read project-level data through this view per
-- the funder portal needs; sensitive PII stays gated by underlying RLS.
CREATE OR REPLACE VIEW public.v_funder_deal_flow
WITH (security_invoker = true) AS
SELECT
  p.id                                                AS project_id,
  p.title                                             AS project_title,
  p.status                                            AS project_status,
  p.total_budget,
  p.start_date,
  p.target_completion,
  i.id                                                AS institution_id,
  i.name                                              AS institution_name,
  i.county                                            AS county,
  i.institution_type                                  AS institution_type,
  i.current_fuel                                      AS baseline_fuel,
  i.number_of_students                                AS students,
  pr.id                                               AS provider_id,
  pr.name                                             AS provider_name,
  cp.estimated_annual_credits                         AS forecast_annual_tco2e,
  COALESCE(rs.max_score, 0)                           AS max_open_risk_score,
  COALESCE(rs.open_count, 0)                          AS open_risk_count,
  COALESCE(fp.committed_total, 0)                     AS already_committed_capital,
  CASE
    WHEN p.total_budget IS NOT NULL AND p.total_budget > 0
    THEN GREATEST(p.total_budget - COALESCE(fp.committed_total, 0), 0)
    ELSE NULL
  END                                                 AS funding_gap
FROM public.projects p
JOIN public.institutions i ON i.id = p.institution_id
LEFT JOIN public.providers pr ON pr.id = p.provider_id
LEFT JOIN public.carbon_projects cp ON cp.project_id = p.id
LEFT JOIN (
  SELECT project_id, MAX(severity * likelihood) AS max_score, COUNT(*) AS open_count
  FROM public.risk_register
  WHERE status IN ('open','mitigating')
  GROUP BY project_id
) rs ON rs.project_id = p.id
LEFT JOIN (
  SELECT project_id, SUM(capital_amount) AS committed_total
  FROM public.funder_portfolio
  WHERE status IN ('committed','disbursed')
  GROUP BY project_id
) fp ON fp.project_id = p.id;

-- Per-funder portfolio summary
CREATE OR REPLACE VIEW public.v_funder_portfolio_summary
WITH (security_invoker = true) AS
SELECT
  fp.organisation_id,
  COUNT(DISTINCT fp.project_id)                   AS project_count,
  SUM(fp.capital_amount) FILTER (WHERE fp.status IN ('committed','disbursed','repaid')) AS total_committed,
  SUM(fp.capital_amount) FILTER (WHERE fp.status = 'disbursed')                          AS total_disbursed,
  SUM(att.attributable_tco2e)                                                            AS lifetime_tco2e,
  SUM(att.attributable_ksh_savings)                                                      AS lifetime_ksh_savings,
  SUM(att.attributable_meals)                                                            AS lifetime_meals,
  SUM(att.attributable_jobs)                                                             AS lifetime_jobs
FROM public.funder_portfolio fp
LEFT JOIN public.funder_attribution_ledger att
  ON att.organisation_id = fp.organisation_id AND att.project_id = fp.project_id
GROUP BY fp.organisation_id;

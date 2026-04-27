-- ============================================================
-- Workstream 4: TCO + Financing Modeller
--
-- Tables:
--   technology_profiles    - per-fuel CapEx/OpEx/lifetime/maintenance defaults
--   financing_instruments  - 9 instrument types (loan, lease, PAYGO, RBF, ...)
--
-- Both are reference data with public read + admin write. Each row links
-- back to a data_sources row for substantiability (WS0 layer).
-- All views with security_invoker=true; all policies use (SELECT auth.uid()).
-- ============================================================

-- ============================================================
-- 1. TECHNOLOGY PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.technology_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  fuel_type           TEXT NOT NULL,                    -- firewood/charcoal/lpg/biogas/electric/solar/other
  description         TEXT,
  capex_low           NUMERIC NOT NULL,                 -- KSh
  capex_high          NUMERIC NOT NULL,                 -- KSh
  capex_currency      TEXT NOT NULL DEFAULT 'KES',
  opex_per_meal       NUMERIC,                          -- KSh per meal served
  opex_per_unit       NUMERIC,                          -- KSh per kg/m3/kWh
  opex_unit           TEXT,                             -- 'KSh/meal','KSh/kg','KSh/kWh','KSh/m3'
  lifetime_years      INTEGER NOT NULL,
  maintenance_annual  NUMERIC NOT NULL DEFAULT 0,       -- KSh/year typical
  salvage_fraction    NUMERIC NOT NULL DEFAULT 0,       -- 0..1 of capex at end of life
  install_cost_pct    NUMERIC NOT NULL DEFAULT 0.10,    -- install/commissioning add-on as fraction of capex
  efficiency_pct      NUMERIC,                          -- 0..1 — fraction of fuel energy delivered to pot
  emission_metric_key TEXT,                             -- e.g. 'fuel.co2_factor' for lookup against data_points
  applicable_to_org_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  source_id           UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  display_order       INTEGER NOT NULL DEFAULT 100,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (capex_low <= capex_high),
  CHECK (lifetime_years > 0),
  CHECK (salvage_fraction >= 0 AND salvage_fraction <= 1)
);

CREATE INDEX IF NOT EXISTS idx_technology_profiles_active ON public.technology_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_technology_profiles_fuel ON public.technology_profiles(fuel_type);

DROP TRIGGER IF EXISTS trg_technology_profiles_updated_at ON public.technology_profiles;
CREATE TRIGGER trg_technology_profiles_updated_at
  BEFORE UPDATE ON public.technology_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.technology_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tech_profiles_public_read"  ON public.technology_profiles;
DROP POLICY IF EXISTS "tech_profiles_admin_write"  ON public.technology_profiles;

CREATE POLICY "tech_profiles_public_read" ON public.technology_profiles
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "tech_profiles_admin_write" ON public.technology_profiles
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
-- 2. FINANCING INSTRUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financing_instruments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  instrument_type     TEXT NOT NULL
                      CHECK (instrument_type IN
                        ('cash','concessional_loan','lease_to_own','paygo',
                         'rbf','carbon_finance','blended','revolving_fund',
                         'group_purchase','grant')),
  description         TEXT,
  default_terms       JSONB NOT NULL DEFAULT '{}',
  -- e.g. {"interest_rate": 0.08, "tenor_months": 36, "grace_months": 3,
  --       "down_payment_pct": 0.20, "upfront_grant_pct": 0.30}
  bearer_org_types    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],   -- who can offer it
  best_for            TEXT,
  risk_notes          TEXT,
  source_id           UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  display_order       INTEGER NOT NULL DEFAULT 100,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financing_instruments_active ON public.financing_instruments(is_active);
CREATE INDEX IF NOT EXISTS idx_financing_instruments_type ON public.financing_instruments(instrument_type);

DROP TRIGGER IF EXISTS trg_financing_instruments_updated_at ON public.financing_instruments;
CREATE TRIGGER trg_financing_instruments_updated_at
  BEFORE UPDATE ON public.financing_instruments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.financing_instruments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financing_public_read"  ON public.financing_instruments;
DROP POLICY IF EXISTS "financing_admin_write"  ON public.financing_instruments;

CREATE POLICY "financing_public_read" ON public.financing_instruments
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "financing_admin_write" ON public.financing_instruments
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
-- 3. SEED DATA
-- ============================================================

-- Technology profile seeds (capex/opex from CCA + EPRA reference defaults)
WITH src AS (
  SELECT id FROM public.data_sources WHERE slug = 'cca-clean-cooking-benchmarks-2024'
)
INSERT INTO public.technology_profiles
  (slug, name, fuel_type, description, capex_low, capex_high, opex_per_unit, opex_unit,
   lifetime_years, maintenance_annual, salvage_fraction, install_cost_pct, efficiency_pct,
   emission_metric_key, applicable_to_org_types, source_id, display_order)
VALUES
  ('firewood-baseline', 'Firewood (open fire)', 'firewood',
   'Three-stone or simple chimney baseline. Status quo.',
   30000, 80000, 8000, 'KSh/tonne', 5, 5000, 0.0, 0.05, 0.10,
   'fuel.co2_factor', ARRAY['institution'], (SELECT id FROM src), 10),

  ('improved-biomass', 'Improved biomass cookstove', 'firewood',
   'Rocket / institutional cookstove with combustion-air optimisation; ~40% less wood.',
   50000, 150000, 4800, 'KSh/tonne', 5, 8000, 0.0, 0.10, 0.30,
   'fuel.co2_factor', ARRAY['institution'], (SELECT id FROM src), 20),

  ('lpg-institutional', 'LPG institutional cookstove', 'lpg',
   'Bulk LPG with cylinder bank, high-pressure regulator, and KEBS-compliant pipework.',
   250000, 800000, 250, 'KSh/kg', 10, 25000, 0.05, 0.15, 0.55,
   'fuel.co2_factor', ARRAY['institution'], (SELECT id FROM src), 30),

  ('biogas-8m3', 'Biogas digester (8 m3)', 'biogas',
   'Fixed-dome anaerobic digester sized for 200-meal kitchens; long lifetime, low OpEx.',
   800000, 2000000, 50, 'KSh/m3', 15, 30000, 0.10, 0.20, 0.60,
   'fuel.co2_factor', ARRAY['institution'], (SELECT id FROM src), 40),

  ('electric-induction', 'Electric induction (grid)', 'electric',
   'Institutional induction stoves; assumes reliable 3-phase supply.',
   400000, 1200000, 25, 'KSh/kWh', 8, 15000, 0.05, 0.10, 0.85,
   'fuel.co2_factor', ARRAY['institution'], (SELECT id FROM src), 50),

  ('solar-ecook', 'Solar e-cooking (PV + battery)', 'electric',
   'Solar PV with lithium storage and induction load; off-grid capable.',
   1500000, 4000000, 0, 'KSh/kWh', 10, 40000, 0.05, 0.20, 0.75,
   'fuel.co2_factor', ARRAY['institution'], (SELECT id FROM src), 60),

  ('charcoal-improved', 'Improved charcoal stove', 'charcoal',
   'Ceramic-lined institutional charcoal stove; ~30% fuel reduction vs metal jiko.',
   40000, 120000, 84, 'KSh/kg', 5, 6000, 0.0, 0.10, 0.30,
   'fuel.co2_factor', ARRAY['institution'], (SELECT id FROM src), 70)
ON CONFLICT (slug) DO NOTHING;

-- Financing instrument seeds
WITH src AS (
  SELECT id FROM public.data_sources WHERE slug = 'cleancookiq-internal-v1'
)
INSERT INTO public.financing_instruments
  (slug, name, instrument_type, description, default_terms,
   bearer_org_types, best_for, risk_notes, source_id, display_order)
VALUES
  ('cash-purchase', 'Outright cash purchase', 'cash',
   'Institution pays full equipment cost upfront from reserves or budget.',
   '{}'::jsonb,
   ARRAY['institution'],
   'Cash-rich institutions wanting fastest payback and no interest cost.',
   'No financing risk; high opportunity cost on capital.',
   (SELECT id FROM src), 10),

  ('grant-full', 'Full grant', 'grant',
   'Donor or CSR funder covers 100% of capex; institution covers OpEx.',
   '{"upfront_grant_pct": 1.0}'::jsonb,
   ARRAY['funder','csr'],
   'Pilot deployments and humanitarian contexts with no payback expectation.',
   'Behavioral risk: free equipment may receive less institutional buy-in than co-financed.',
   (SELECT id FROM src), 20),

  ('concessional-loan', 'Concessional loan', 'concessional_loan',
   'Below-market interest rate loan with grace period; institution amortises over 3-5 years.',
   '{"interest_rate": 0.08, "tenor_months": 48, "grace_months": 6, "down_payment_pct": 0.10}'::jsonb,
   ARRAY['funder'],
   'Schools and faith-based institutions with predictable revenue.',
   'Default risk concentrated at month 7 when grace ends; covenant a refresher training.',
   (SELECT id FROM src), 30),

  ('lease-to-own', 'Lease-to-own', 'lease_to_own',
   'Supplier or financier retains title until final payment; equipment is collateral.',
   '{"monthly_payment_pct": 0.04, "tenor_months": 30, "buyout_pct": 0.05}'::jsonb,
   ARRAY['supplier','funder'],
   'LPG cylinders, electric cookers, and other repossessable equipment.',
   'Repossession friction; legal title clarity needed for institutional buyers.',
   (SELECT id FROM src), 40),

  ('paygo', 'Pay-as-you-cook (PAYGO)', 'paygo',
   'Institution prepays for cooking via smart meter; equipment locked when balance hits zero.',
   '{"unit_premium_pct": 0.20, "lock_threshold": 0}'::jsonb,
   ARRAY['supplier'],
   'Electric induction and metered LPG with smart-meter integration.',
   'Requires reliable telecom/IoT for metering; meter outages can starve cooks.',
   (SELECT id FROM src), 50),

  ('results-based-finance', 'Results-based finance (RBF)', 'rbf',
   'Donor pays per verified outcome (tonne CO2 avoided, meals served, stove still operating at 12 months).',
   '{"payment_per_tonne_co2": 800, "verification_months": 12}'::jsonb,
   ARRAY['funder'],
   'Donor-funded scale-up where verification of outcomes is contractually feasible.',
   'Verification cost can erode unit economics for small projects; aggregate to amortise.',
   (SELECT id FROM src), 60),

  ('carbon-finance', 'Carbon credit pre-finance', 'carbon_finance',
   'Aggregator advances cash against forecast carbon credits over 5-7 years.',
   '{"price_per_tonne_usd": 8, "discount_factor": 0.6, "credit_horizon_years": 7}'::jsonb,
   ARRAY['funder'],
   'Biogas and improved cookstoves with strong baseline case for additionality.',
   'Carbon price volatility; methodology approval delays.',
   (SELECT id FROM src), 70),

  ('blended-finance', 'Blended finance (grant + loan)', 'blended',
   'Mix of upfront grant and concessional loan to lower effective interest cost.',
   '{"upfront_grant_pct": 0.40, "loan_pct": 0.60, "interest_rate": 0.06, "tenor_months": 36}'::jsonb,
   ARRAY['funder'],
   'Most realistic structure in Kenya; balances affordability with institutional buy-in.',
   'Coordination overhead between grant and loan providers; documentation complexity.',
   (SELECT id FROM src), 80),

  ('revolving-fund', 'Revolving fund', 'revolving_fund',
   'Pooled capital lent at low rates; repayments recycled to fund the next institution.',
   '{"interest_rate": 0.03, "tenor_months": 60, "pool_min": 10000000}'::jsonb,
   ARRAY['funder','csr'],
   'Diocese, county, or regional networks with shared governance.',
   'Pool depletion if recovery rates dip below 90%; needs strong fund manager.',
   (SELECT id FROM src), 90),

  ('group-purchase', 'Group purchase aggregation', 'group_purchase',
   'Cluster of small institutions aggregates demand to negotiate bulk pricing.',
   '{"min_units": 5, "expected_discount_pct": 0.15}'::jsonb,
   ARRAY['institution','funder'],
   'Small schools or PCEA dioceses where individual deal size is sub-optimal.',
   'Coordination risk; one defector can collapse the negotiated price.',
   (SELECT id FROM src), 100)
ON CONFLICT (slug) DO NOTHING;

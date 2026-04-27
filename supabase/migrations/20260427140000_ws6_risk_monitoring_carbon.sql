-- ============================================================
-- Workstream 6: Risk + Monitoring + Carbon
--
-- Tables:
--   risk_register         - per-project risks with bearer + mitigation
--   monitoring_readings   - monthly fuel use / hours / downtime per project
--   carbon_projects       - one per project pursuing carbon credits
--   credit_estimates      - forecast credits per period
--   credit_verifications  - third-party verification events
--
-- Trigger:
--   When a monitoring_reading shows behavioural relapse (clean fuel use
--   below threshold for two consecutive months) raise a refresher
--   training ticket in support_tickets.
--
-- All policies use (SELECT auth.uid()); views with security_invoker=true.
-- ============================================================

-- ============================================================
-- 1. RISK REGISTER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_register (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_type       TEXT NOT NULL
                  CHECK (risk_type IN
                    ('equipment_defect','installation_failure','fuel_price_spike',
                     'demand_drop','behavioural_relapse','currency_import',
                     'counterparty_closure','carbon_non_issuance','cybersecurity',
                     'regulatory','other')),
  bearer          TEXT NOT NULL
                  CHECK (bearer IN ('institution','supplier','installer','funder','platform','shared')),
  severity        INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  likelihood      INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  description     TEXT NOT NULL,
  mitigation      TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','mitigating','accepted','closed','realised')),
  next_review_at  DATE,
  closed_at       TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_register_project ON public.risk_register(project_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_register_status ON public.risk_register(status);

DROP TRIGGER IF EXISTS trg_risk_register_updated_at ON public.risk_register;
CREATE TRIGGER trg_risk_register_updated_at
  BEFORE UPDATE ON public.risk_register
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.risk_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "risk_admin_all"   ON public.risk_register;
DROP POLICY IF EXISTS "risk_party_read"  ON public.risk_register;

CREATE POLICY "risk_admin_all" ON public.risk_register
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ));

CREATE POLICY "risk_party_read" ON public.risk_register
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = (SELECT auth.uid())
            AND pr.organisation_id IN (
              SELECT organisation_id FROM public.institutions WHERE id = p.institution_id
              UNION
              SELECT organisation_id FROM public.providers WHERE id = p.provider_id
            )
        )
    )
  );

-- ============================================================
-- 2. MONITORING READINGS (M&E)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.monitoring_readings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_start             DATE NOT NULL,
  period_end               DATE NOT NULL,
  clean_fuel_units         NUMERIC NOT NULL DEFAULT 0,    -- e.g. kg LPG, kWh, m3 biogas
  clean_fuel_unit          TEXT,                          -- 'kg','kWh','m3'
  baseline_fuel_units      NUMERIC NOT NULL DEFAULT 0,    -- firewood/charcoal still used
  baseline_fuel_unit       TEXT,
  meals_served             INTEGER,
  hours_operated           NUMERIC,
  downtime_hours           NUMERIC NOT NULL DEFAULT 0,
  cook_satisfaction_1to5   INTEGER CHECK (cook_satisfaction_1to5 BETWEEN 1 AND 5),
  notes                    TEXT,
  evidence_photo_urls      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  recorded_by              UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start),
  UNIQUE(project_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_monitoring_project_period ON public.monitoring_readings(project_id, period_start DESC);

DROP TRIGGER IF EXISTS trg_monitoring_readings_updated_at ON public.monitoring_readings;
CREATE TRIGGER trg_monitoring_readings_updated_at
  BEFORE UPDATE ON public.monitoring_readings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.monitoring_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monitoring_admin_all"   ON public.monitoring_readings;
DROP POLICY IF EXISTS "monitoring_party_read"  ON public.monitoring_readings;

CREATE POLICY "monitoring_admin_all" ON public.monitoring_readings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ));

CREATE POLICY "monitoring_party_read" ON public.monitoring_readings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = (SELECT auth.uid())
            AND pr.organisation_id IN (
              SELECT organisation_id FROM public.institutions WHERE id = p.institution_id
              UNION
              SELECT organisation_id FROM public.providers WHERE id = p.provider_id
            )
        )
    )
  );

-- ============================================================
-- 3. BEHAVIOURAL-RELAPSE TRIGGER
--
-- After insert/update of a monitoring_reading, check whether the most
-- recent two readings for this project show clean-fuel share below 50%.
-- If so, open a 'behavioural_relapse' risk row AND a refresher-training
-- ticket — but only if no open one already exists for this project.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_behavioural_relapse()
RETURNS TRIGGER AS $$
DECLARE
  recent_count   INT;
  relapse_share  NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    AVG(
      CASE
        WHEN (clean_fuel_units + baseline_fuel_units) = 0 THEN 1
        ELSE clean_fuel_units::NUMERIC / NULLIF(clean_fuel_units + baseline_fuel_units, 0)
      END
    )
  INTO recent_count, relapse_share
  FROM (
    SELECT clean_fuel_units, baseline_fuel_units
    FROM public.monitoring_readings
    WHERE project_id = NEW.project_id
    ORDER BY period_end DESC
    LIMIT 2
  ) recent;

  IF recent_count = 2 AND relapse_share < 0.50 THEN
    -- Risk row (idempotent on open relapse risk)
    IF NOT EXISTS (
      SELECT 1 FROM public.risk_register
      WHERE project_id = NEW.project_id
        AND risk_type = 'behavioural_relapse'
        AND status IN ('open','mitigating')
    ) THEN
      INSERT INTO public.risk_register
        (project_id, risk_type, bearer, severity, likelihood, description, mitigation, status)
      VALUES
        (NEW.project_id, 'behavioural_relapse', 'institution', 4, 4,
         'Clean-fuel share fell below 50% for two consecutive readings.',
         'Schedule refresher training; verify equipment performance and fuel availability.',
         'open');
    END IF;

    -- Support ticket (idempotent on open ticket for this project + title)
    IF NOT EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE project_id = NEW.project_id
        AND title = 'Refresher training required (relapse detected)'
        AND status IN ('open','in_progress')
    ) THEN
      INSERT INTO public.support_tickets
        (project_id, title, description, priority, status)
      VALUES
        (NEW.project_id, 'Refresher training required (relapse detected)',
         'Two consecutive monitoring readings show clean-fuel share <50%. Send a field agent for refresher training and equipment check.',
         'high', 'open');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_relapse ON public.monitoring_readings;
CREATE TRIGGER trg_check_relapse
  AFTER INSERT OR UPDATE ON public.monitoring_readings
  FOR EACH ROW EXECUTE FUNCTION public.check_behavioural_relapse();

-- ============================================================
-- 4. CARBON PROJECTS + CREDITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.carbon_projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  methodology          TEXT,                       -- e.g. 'Gold Standard TPDDTEC v3.1'
  registry             TEXT,                       -- e.g. 'Gold Standard','Verra','Plan Vivo'
  registry_project_id  TEXT,
  vintage_start        DATE,
  vintage_end          DATE,
  status               TEXT NOT NULL DEFAULT 'design'
                       CHECK (status IN ('design','validation','registered','issued','retired','rejected')),
  baseline_emissions_tco2e   NUMERIC NOT NULL DEFAULT 0,
  project_emissions_tco2e    NUMERIC NOT NULL DEFAULT 0,
  estimated_annual_credits   NUMERIC NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_carbon_projects_updated_at ON public.carbon_projects;
CREATE TRIGGER trg_carbon_projects_updated_at
  BEFORE UPDATE ON public.carbon_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.carbon_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carbon_admin_all"  ON public.carbon_projects;
DROP POLICY IF EXISTS "carbon_party_read" ON public.carbon_projects;

CREATE POLICY "carbon_admin_all" ON public.carbon_projects
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

CREATE POLICY "carbon_party_read" ON public.carbon_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = (SELECT auth.uid())
            AND pr.organisation_id IN (
              SELECT organisation_id FROM public.institutions WHERE id = p.institution_id
              UNION
              SELECT organisation_id FROM public.providers WHERE id = p.provider_id
            )
        )
    )
  );

-- Per-period credit estimates (forecast)
CREATE TABLE IF NOT EXISTS public.credit_estimates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carbon_project_id UUID NOT NULL REFERENCES public.carbon_projects(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  estimated_tco2e  NUMERIC NOT NULL DEFAULT 0,
  methodology_notes TEXT,
  source_id        UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start),
  UNIQUE(carbon_project_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_credit_estimates_project ON public.credit_estimates(carbon_project_id, period_start DESC);

ALTER TABLE public.credit_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_estimates_admin_all" ON public.credit_estimates;
CREATE POLICY "credit_estimates_admin_all" ON public.credit_estimates
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- Verifications (third-party VVB events)
CREATE TABLE IF NOT EXISTS public.credit_verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carbon_project_id UUID NOT NULL REFERENCES public.carbon_projects(id) ON DELETE CASCADE,
  verifier          TEXT NOT NULL,                  -- VVB name (e.g. SCS, TÜV SÜD)
  verified_on       DATE NOT NULL,
  vintage_start     DATE NOT NULL,
  vintage_end       DATE NOT NULL,
  verified_tco2e    NUMERIC NOT NULL,
  serial_range      TEXT,                           -- registry serial numbers
  evidence_url      TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (vintage_end >= vintage_start)
);

CREATE INDEX IF NOT EXISTS idx_credit_verifications_project ON public.credit_verifications(carbon_project_id, verified_on DESC);

ALTER TABLE public.credit_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_verifications_admin_all" ON public.credit_verifications;
CREATE POLICY "credit_verifications_admin_all" ON public.credit_verifications
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

-- Risk register joined with project + risk score
CREATE OR REPLACE VIEW public.v_risk_summary
WITH (security_invoker = true) AS
SELECT
  r.*,
  (r.severity * r.likelihood)         AS risk_score,
  CASE
    WHEN r.severity * r.likelihood >= 16 THEN 'critical'
    WHEN r.severity * r.likelihood >= 9  THEN 'high'
    WHEN r.severity * r.likelihood >= 4  THEN 'medium'
    ELSE 'low'
  END                                  AS risk_band,
  p.title                              AS project_title,
  p.institution_id,
  i.name                               AS institution_name,
  i.county                             AS institution_county
FROM public.risk_register r
JOIN public.projects p     ON p.id = r.project_id
JOIN public.institutions i ON i.id = p.institution_id;

-- Latest monitoring reading per project + clean-fuel share
CREATE OR REPLACE VIEW public.v_monitoring_latest
WITH (security_invoker = true) AS
SELECT DISTINCT ON (mr.project_id)
  mr.id,
  mr.project_id,
  mr.period_start,
  mr.period_end,
  mr.clean_fuel_units,
  mr.clean_fuel_unit,
  mr.baseline_fuel_units,
  mr.baseline_fuel_unit,
  mr.meals_served,
  mr.hours_operated,
  mr.downtime_hours,
  mr.cook_satisfaction_1to5,
  CASE
    WHEN (mr.clean_fuel_units + mr.baseline_fuel_units) = 0 THEN NULL
    ELSE mr.clean_fuel_units::NUMERIC / (mr.clean_fuel_units + mr.baseline_fuel_units)
  END AS clean_fuel_share,
  p.title       AS project_title,
  i.id          AS institution_id,
  i.name        AS institution_name,
  i.county      AS institution_county
FROM public.monitoring_readings mr
JOIN public.projects p     ON p.id = mr.project_id
JOIN public.institutions i ON i.id = p.institution_id
ORDER BY mr.project_id, mr.period_end DESC;

-- Carbon project rollup with verified + estimated totals
CREATE OR REPLACE VIEW public.v_carbon_summary
WITH (security_invoker = true) AS
SELECT
  cp.id,
  cp.project_id,
  cp.methodology,
  cp.registry,
  cp.registry_project_id,
  cp.status,
  cp.baseline_emissions_tco2e,
  cp.project_emissions_tco2e,
  cp.estimated_annual_credits,
  COALESCE(est.total_estimated, 0)   AS total_estimated_tco2e,
  COALESCE(ver.total_verified, 0)    AS total_verified_tco2e,
  p.title                            AS project_title,
  i.name                             AS institution_name,
  i.county                           AS institution_county,
  cp.created_at,
  cp.updated_at
FROM public.carbon_projects cp
JOIN public.projects p     ON p.id = cp.project_id
JOIN public.institutions i ON i.id = p.institution_id
LEFT JOIN (
  SELECT carbon_project_id, SUM(estimated_tco2e) AS total_estimated
  FROM public.credit_estimates
  GROUP BY carbon_project_id
) est ON est.carbon_project_id = cp.id
LEFT JOIN (
  SELECT carbon_project_id, SUM(verified_tco2e) AS total_verified
  FROM public.credit_verifications
  GROUP BY carbon_project_id
) ver ON ver.carbon_project_id = cp.id;

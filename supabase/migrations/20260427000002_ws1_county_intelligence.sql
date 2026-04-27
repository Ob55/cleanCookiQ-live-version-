-- ============================================================
-- Workstream 1: County Intelligence
--
-- Builds the county-level layer on top of WS0:
--   - county_fuel_prices: time-series of fuel prices per county
--                         (a thin shortcut over data_points for the
--                          common case; the canonical record still
--                          lives in data_points)
--   - county_policies:    county-level policies, CIDP commitments,
--                         gazette notices
--   - v_county_metrics:   live-derived metrics from existing tables
--                         (institutions count by stage, dominant fuel,
--                          providers serving the county)
-- ============================================================

-- ---------- COUNTY POLICIES ----------
CREATE TABLE IF NOT EXISTS public.county_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id       UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  jurisdiction    TEXT,                        -- 'county', 'national', 'regional'
  policy_type     TEXT,                        -- 'CIDP', 'bylaw', 'gazette', 'strategy', 'budget_allocation'
  status          TEXT NOT NULL DEFAULT 'in_force'
                  CHECK (status IN ('draft', 'in_force', 'expired', 'repealed', 'proposed')),
  effective_date  DATE,
  expires_date    DATE,
  summary         TEXT,
  full_text_url   TEXT,
  source_id       UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_county_policies_county ON public.county_policies(county_id);
CREATE INDEX IF NOT EXISTS idx_county_policies_status ON public.county_policies(status);

DROP TRIGGER IF EXISTS trg_county_policies_updated_at ON public.county_policies;
CREATE TRIGGER trg_county_policies_updated_at
  BEFORE UPDATE ON public.county_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.county_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "county_policies_public_read" ON public.county_policies
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "county_policies_admin_write" ON public.county_policies
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- ---------- COUNTY FUEL PRICES ----------
-- Convenience table for fast county-level fuel price queries.
-- Each row references a data_source so the value remains substantiable.
CREATE TABLE IF NOT EXISTS public.county_fuel_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id       UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  fuel_type       TEXT NOT NULL,
  price_numeric   NUMERIC NOT NULL,
  unit            TEXT NOT NULL,                -- e.g. 'KSh/kg', 'KSh/m3', 'KSh/kWh'
  source_id       UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
  observed_on     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfp_county_fuel_date
  ON public.county_fuel_prices(county_id, fuel_type, observed_on DESC);

DROP TRIGGER IF EXISTS trg_county_fuel_prices_updated_at ON public.county_fuel_prices;
CREATE TRIGGER trg_county_fuel_prices_updated_at
  BEFORE UPDATE ON public.county_fuel_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.county_fuel_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "county_fuel_prices_public_read" ON public.county_fuel_prices
  FOR SELECT USING (true);

CREATE POLICY "county_fuel_prices_admin_write" ON public.county_fuel_prices
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'field_agent')
  ));

-- ---------- VIEW: latest county fuel price ----------
-- Most-recent observation per (county, fuel) — what the public page renders.
CREATE OR REPLACE VIEW public.v_latest_county_fuel_prices AS
SELECT DISTINCT ON (cfp.county_id, cfp.fuel_type)
  cfp.id,
  cfp.county_id,
  c.code AS county_code,
  c.name AS county_name,
  cfp.fuel_type,
  cfp.price_numeric,
  cfp.unit,
  cfp.observed_on,
  cfp.source_id,
  ds.slug    AS source_slug,
  ds.title   AS source_title,
  ds.publisher AS source_publisher,
  ds.url     AS source_url,
  ds.confidence_level AS source_confidence,
  cfp.notes
FROM public.county_fuel_prices cfp
JOIN public.counties     c  ON c.id = cfp.county_id
JOIN public.data_sources ds ON ds.id = cfp.source_id
WHERE ds.is_active = TRUE
ORDER BY cfp.county_id, cfp.fuel_type, cfp.observed_on DESC;

-- ---------- VIEW: live county metrics ----------
-- Live-derived from existing tables; no scheduled refresh required.
-- Joins by county *name* because institutions.county is TEXT.
CREATE OR REPLACE VIEW public.v_county_metrics AS
WITH inst_agg AS (
  SELECT
    county,
    COUNT(*)                                                              AS institutions_count,
    COUNT(*) FILTER (WHERE pipeline_stage IN ('assessed','matched','negotiation','contracted','installed','monitoring')) AS assessed_or_later_count,
    COUNT(*) FILTER (WHERE pipeline_stage IN ('installed','monitoring'))  AS transitioned_count,
    MODE() WITHIN GROUP (ORDER BY current_fuel)                           AS dominant_fuel,
    COALESCE(SUM(meals_per_day), 0)                                       AS total_meals_per_day,
    COALESCE(SUM(number_of_students), 0)                                  AS total_students
  FROM public.institutions
  WHERE county IS NOT NULL
  GROUP BY county
),
prov_agg AS (
  SELECT
    county_name,
    COUNT(*) AS providers_serving_count
  FROM public.providers,
       LATERAL UNNEST(COALESCE(counties_served, ARRAY[]::TEXT[])) AS county_name
  GROUP BY county_name
)
SELECT
  c.id           AS county_id,
  c.code         AS county_code,
  c.name         AS county_name,
  c.region       AS region,
  c.capital      AS capital,
  COALESCE(ia.institutions_count, 0)        AS institutions_count,
  COALESCE(ia.assessed_or_later_count, 0)   AS assessed_count,
  COALESCE(ia.transitioned_count, 0)        AS transitioned_count,
  ia.dominant_fuel                          AS dominant_fuel,
  COALESCE(ia.total_meals_per_day, 0)       AS total_meals_per_day,
  COALESCE(ia.total_students, 0)            AS total_students,
  COALESCE(pa.providers_serving_count, 0)   AS providers_serving_count
FROM public.counties c
LEFT JOIN inst_agg ia ON ia.county = c.name
LEFT JOIN prov_agg pa ON pa.county_name = c.name;

-- ---------- VIEW: counties with active policy + price counts ----------
CREATE OR REPLACE VIEW public.v_county_intelligence_summary AS
SELECT
  m.*,
  COALESCE(p.policy_count, 0) AS policy_count,
  COALESCE(f.fuel_price_count, 0) AS fuel_price_count
FROM public.v_county_metrics m
LEFT JOIN (
  SELECT county_id, COUNT(*) AS policy_count
  FROM public.county_policies
  WHERE is_active = TRUE
  GROUP BY county_id
) p ON p.county_id = m.county_id
LEFT JOIN (
  SELECT county_id, COUNT(*) AS fuel_price_count
  FROM public.v_latest_county_fuel_prices
  GROUP BY county_id
) f ON f.county_id = m.county_id;

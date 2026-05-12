-- ============================================================
-- Closes methodology gap (e): carbon project totals from monitoring
--
-- Builds a view that aggregates per-period monitoring readings into
-- baseline / project / avoided tCO2e per carbon project. The verified
-- ledger remains the authoritative source for issued credits, but this
-- rollup gives forecasts a live signal grounded in recorded fuel use.
--
-- Emission factors (kg CO2 per kg fuel) match
-- src/lib/institutionDerived.ts so the platform answers consistently.
--
-- DROP-and-create rather than CREATE OR REPLACE so a partial prior
-- run with a different column shape doesn't trip ERROR 42P16.
-- ============================================================

DROP VIEW IF EXISTS public.v_carbon_project_monitoring_rollup CASCADE;

CREATE VIEW public.v_carbon_project_monitoring_rollup
WITH (security_invoker = true) AS
WITH factors AS (
  SELECT 'firewood'::text AS fuel, 1.7::numeric AS factor UNION ALL
  SELECT 'charcoal',         3.3 UNION ALL
  SELECT 'lpg',              3.0 UNION ALL
  SELECT 'electric',         0.5 UNION ALL
  SELECT 'biogas',           0.1 UNION ALL
  SELECT 'other',            1.5
),
per_reading AS (
  SELECT
    cp.id                           AS carbon_project_id,
    cp.project_id                   AS project_id,
    mr.period_start,
    mr.period_end,
    mr.baseline_fuel_units,
    mr.clean_fuel_units,
    -- Map baseline fuel: prefer the reading's recorded baseline_fuel_unit
    -- when it is a known fuel slug, else fall back to the institution's
    -- current_fuel as a last resort.
    -- i.current_fuel is the public.fuel_type ENUM — must cast to text
    -- before LOWER() or the comparison against the TEXT 'fuel' column
    -- in `factors` will fail. The _fuel_unit columns are TEXT already.
    COALESCE(
      (SELECT factor FROM factors WHERE fuel = LOWER(mr.baseline_fuel_unit)),
      (SELECT factor FROM factors WHERE fuel = LOWER(i.current_fuel::text)),
      0
    )                               AS baseline_factor,
    COALESCE(
      (SELECT factor FROM factors WHERE fuel = LOWER(mr.clean_fuel_unit)),
      0.5
    )                               AS project_factor
  FROM public.carbon_projects cp
  JOIN public.projects p           ON p.id = cp.project_id
  JOIN public.institutions i       ON i.id = p.institution_id
  JOIN public.monitoring_readings mr ON mr.project_id = cp.project_id
)
SELECT
  carbon_project_id,
  project_id,
  COUNT(*)                                                          AS reading_count,
  MIN(period_start)                                                 AS first_period_start,
  MAX(period_end)                                                   AS last_period_end,
  SUM(baseline_fuel_units * baseline_factor) / 1000.0               AS baseline_tco2e,
  SUM(clean_fuel_units    * project_factor)  / 1000.0               AS project_tco2e,
  GREATEST(
    (SUM(baseline_fuel_units * baseline_factor)
     - SUM(clean_fuel_units * project_factor)) / 1000.0,
    0
  )                                                                 AS avoided_tco2e
FROM per_reading
GROUP BY carbon_project_id, project_id;

GRANT SELECT ON public.v_carbon_project_monitoring_rollup TO authenticated, anon;

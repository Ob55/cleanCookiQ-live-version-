-- ============================================================
-- Closes methodology gap (c): stored savings figures auto-derived
--
-- Backfills institutions.annual_savings_ksh, co2_reduction_tonnes_pa,
-- and recommended_solution from the same formulas the TS helper uses
-- (see src/lib/institutionDerived.ts):
--
--   annual_savings_ksh   = monthly_fuel_spend * 12 * 0.60
--   co2_reduction_tpa    = consumption_per_term * 3 * factor[fuel] * 0.85 / 1000
--   recommended_solution = lookup by current_fuel
--
-- Going forward, the institution writers (InstitutionSetup,
-- InstitutionProfile) compute these on every save so they stay
-- in sync with their inputs.
-- ============================================================

UPDATE public.institutions
SET annual_savings_ksh = ROUND((monthly_fuel_spend * 12 * 0.60)::numeric)
WHERE monthly_fuel_spend IS NOT NULL
  AND monthly_fuel_spend > 0;

-- current_fuel is the public.fuel_type ENUM, not TEXT. We cast it to
-- text before COALESCE/LOWER so the '' fallback doesn't trigger
-- "invalid input value for enum fuel_type: """ (PG error 22P02).
UPDATE public.institutions
SET co2_reduction_tonnes_pa = ROUND(
      (consumption_per_term * 3 *
        CASE LOWER(COALESCE(current_fuel::text, ''))
          WHEN 'firewood' THEN 1.7
          WHEN 'charcoal' THEN 3.3
          WHEN 'lpg' THEN 3.0
          WHEN 'electric' THEN 0.5
          WHEN 'biogas' THEN 0.1
          WHEN 'other' THEN 1.5
          ELSE 0
        END
        * 0.85 / 1000)::numeric, 2)
WHERE consumption_per_term IS NOT NULL
  AND consumption_per_term > 0
  AND current_fuel IS NOT NULL;

UPDATE public.institutions
SET recommended_solution =
      CASE LOWER(current_fuel::text)
        WHEN 'firewood' THEN 'biogas'
        WHEN 'charcoal' THEN 'biogas'
        WHEN 'lpg' THEN 'electric'
        WHEN 'electric' THEN 'solar_thermal'
        WHEN 'biogas' THEN 'biogas'
        WHEN 'other' THEN 'biogas'
        ELSE recommended_solution
      END
WHERE current_fuel IS NOT NULL
  AND (recommended_solution IS NULL OR recommended_solution = '');

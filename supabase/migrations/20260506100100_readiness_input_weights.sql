-- ============================================================
-- Closes methodology gap (a): admin readiness weights not wired
--
-- The legacy `scoring_weights` row stored 7 abstract dimensions
-- (financial / technical / operational / infrastructure / social /
-- supply_chain / data_quality) that did not map 1:1 to the 8 inputs
-- the actual readiness calculator uses (fuel, consumption, kitchen
-- exists, kitchen condition, financing preference, students, monthly
-- spend, decision maker).
--
-- This migration seeds a new `readiness_input_weights` row keyed on
-- the 8 actual inputs with the same default weights the code has
-- always used (kitchen exists 20, kitchen condition 20, all other
-- six 10), so saved admin changes now flow into the live score.
-- ============================================================

INSERT INTO public.system_config (config_key, config_value, description)
VALUES (
  'readiness_input_weights',
  '{
    "current_fuel": 10,
    "consumption_per_term": 10,
    "has_dedicated_kitchen": 20,
    "kitchen_condition": 20,
    "financing_preference": 10,
    "number_of_students": 10,
    "monthly_fuel_spend": 10,
    "financial_decision_maker": 10
  }',
  'Per-input weights used by calculateAssessmentScore. Must sum to 100.'
)
ON CONFLICT (config_key) DO NOTHING;

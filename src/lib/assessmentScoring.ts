import { supabase } from "@/integrations/supabase/client";

export interface ScoringInput {
  current_fuel: string | null;
  consumption_per_term: number | null;
  has_dedicated_kitchen: boolean | null;
  kitchen_condition: string | null;
  financing_preference: string | null;
  number_of_students: number | null;
  monthly_fuel_spend: number | null;
  financial_decision_maker: string | null;
}

/**
 * Per-input weights used by `calculateAssessmentScore`. Must sum to 1.0.
 * Each value corresponds 1:1 to a sub-score function below.
 */
export interface ReadinessWeights {
  current_fuel: number;
  consumption_per_term: number;
  has_dedicated_kitchen: number;
  kitchen_condition: number;
  financing_preference: number;
  number_of_students: number;
  monthly_fuel_spend: number;
  financial_decision_maker: number;
}

export const DEFAULT_READINESS_WEIGHTS: ReadinessWeights = {
  current_fuel: 0.10,
  consumption_per_term: 0.10,
  has_dedicated_kitchen: 0.20,
  kitchen_condition: 0.20,
  financing_preference: 0.10,
  number_of_students: 0.10,
  monthly_fuel_spend: 0.10,
  financial_decision_maker: 0.10,
};

export const READINESS_WEIGHT_KEYS: ReadonlyArray<keyof ReadinessWeights> = [
  "current_fuel",
  "consumption_per_term",
  "has_dedicated_kitchen",
  "kitchen_condition",
  "financing_preference",
  "number_of_students",
  "monthly_fuel_spend",
  "financial_decision_maker",
];

function fuelScore(fuel: string | null): number {
  const map: Record<string, number> = {
    electric: 100, biogas: 90, other: 75, lpg: 60, charcoal: 40, firewood: 20,
  };
  return map[fuel || ""] ?? 0;
}

function consumptionScore(tonnes: number | null): number {
  if (!tonnes) return 0;
  if (tonnes > 10) return 100;
  if (tonnes >= 5) return 75;
  if (tonnes >= 1) return 50;
  return 25;
}

function kitchenExistsScore(exists: boolean | null): number {
  if (exists === true) return 100;
  return 0;
}

function kitchenConditionScore(condition: string | null): number {
  const map: Record<string, number> = {
    clean_ready: 100, minor_renovation: 60, major_renovation: 20,
  };
  return map[condition || ""] ?? 0;
}

function financingScore(pref: string | null): number {
  const map: Record<string, number> = {
    loan: 100, partial: 75, grant: 40, not_sure: 20,
  };
  return map[pref || ""] ?? 0;
}

function scaleScore(students: number | null): number {
  if (!students) return 0;
  if (students > 1000) return 100;
  if (students >= 500) return 75;
  if (students >= 200) return 50;
  return 25;
}

function spendScore(spend: number | null): number {
  if (!spend) return 0;
  if (spend > 100000) return 100;
  if (spend >= 50000) return 75;
  if (spend >= 20000) return 50;
  return 25;
}

function decisionMakerScore(maker: string | null): number {
  const map: Record<string, number> = {
    head_teacher: 100, board_of_governors: 80, religious_body: 60,
    pta: 40, county_government: 20,
  };
  return map[maker || ""] ?? 0;
}

export function calculateAssessmentScore(
  input: ScoringInput,
  weights: ReadinessWeights = DEFAULT_READINESS_WEIGHTS,
): { score: number; category: string } {
  const score =
    fuelScore(input.current_fuel) * weights.current_fuel +
    consumptionScore(input.consumption_per_term) * weights.consumption_per_term +
    kitchenExistsScore(input.has_dedicated_kitchen) * weights.has_dedicated_kitchen +
    kitchenConditionScore(input.kitchen_condition) * weights.kitchen_condition +
    financingScore(input.financing_preference) * weights.financing_preference +
    scaleScore(input.number_of_students) * weights.number_of_students +
    spendScore(input.monthly_fuel_spend) * weights.monthly_fuel_spend +
    decisionMakerScore(input.financial_decision_maker) * weights.financial_decision_maker;

  const rounded = Math.round(score);
  let category = "Longer-Term Opportunity";
  if (rounded >= 80) category = "Ready Now";
  else if (rounded >= 60) category = "Ready with Minor Actions";
  else if (rounded >= 40) category = "Needs Enabling Support";

  return { score: rounded, category };
}

/**
 * Fetch the live readiness weights from system_config. Falls back to the
 * built-in defaults if the row is missing, malformed, or fetch fails so
 * the assessment never blocks the institution onboarding flow.
 *
 * Stored as percentages (0..100) summing to 100 so the admin screen is
 * easy to read; converted to fractions on the way out.
 */
export async function loadReadinessWeights(): Promise<ReadinessWeights> {
  try {
    const { data, error } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", "readiness_input_weights")
      .maybeSingle();
    if (error || !data?.config_value) return DEFAULT_READINESS_WEIGHTS;

    const raw = data.config_value as Record<string, unknown>;
    const parsed: Partial<ReadinessWeights> = {};
    let total = 0;
    for (const k of READINESS_WEIGHT_KEYS) {
      const v = Number(raw[k]);
      if (!Number.isFinite(v) || v < 0) return DEFAULT_READINESS_WEIGHTS;
      parsed[k] = v;
      total += v;
    }
    if (total <= 0) return DEFAULT_READINESS_WEIGHTS;
    // Normalise — accepts either percentages summing to 100 or fractions to 1.
    const out = {} as ReadinessWeights;
    for (const k of READINESS_WEIGHT_KEYS) out[k] = (parsed[k] as number) / total;
    return out;
  } catch {
    return DEFAULT_READINESS_WEIGHTS;
  }
}

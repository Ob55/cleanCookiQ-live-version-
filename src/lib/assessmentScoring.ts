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

export function calculateAssessmentScore(input: ScoringInput): { score: number; category: string } {
  const score =
    fuelScore(input.current_fuel) * 0.10 +
    consumptionScore(input.consumption_per_term) * 0.10 +
    kitchenExistsScore(input.has_dedicated_kitchen) * 0.20 +
    kitchenConditionScore(input.kitchen_condition) * 0.20 +
    financingScore(input.financing_preference) * 0.10 +
    scaleScore(input.number_of_students) * 0.10 +
    spendScore(input.monthly_fuel_spend) * 0.10 +
    decisionMakerScore(input.financial_decision_maker) * 0.10;

  const rounded = Math.round(score);
  let category = "Longer-Term Opportunity";
  if (rounded >= 80) category = "Ready Now";
  else if (rounded >= 60) category = "Ready with Minor Actions";
  else if (rounded >= 40) category = "Needs Enabling Support";

  return { score: rounded, category };
}

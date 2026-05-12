/**
 * Auto-derive the three "stored impact" fields on the institutions table
 * from the inputs the user supplies during onboarding.
 *
 * Closes methodology gap (c): annual savings, CO₂ reduction and recommended
 * solution were previously typed in by hand. They drive the portfolio dashboards
 * and impact attribution, so honest defaults need to come from the same
 * formulas the "Cooking Counting" calculator uses (§3 of the methodology doc).
 */

/** Fraction of baseline cost that clean cooking costs. Matches §3. */
const CLEAN_COST_MULTIPLIER = 0.40;
/** Fraction of CO₂ avoided when switching. Matches §3. */
const CO2_REDUCTION_FRACTION = 0.85;
/** Terms per year — Kenyan school year. Matches §3. */
const TERMS_PER_YEAR = 3;

/**
 * Coarse CO₂ emission factors in kg CO₂ per kg of fuel for the common
 * baseline fuels. Pulled from IPCC AR6-aligned defaults (the Sourced layer
 * cites these as the upstream source). For consumption recorded in non-kg
 * units the factor is best-effort and may be refined later.
 */
const FUEL_CO2_FACTORS_KG_PER_KG: Record<string, number> = {
  firewood: 1.7,
  charcoal: 3.3,
  lpg: 3.0,
  electric: 0.5,
  biogas: 0.1,
  other: 1.5,
};

/**
 * Default recommended clean technology by current baseline fuel. Matches
 * the Cooking Alchemy table.
 */
const DEFAULT_RECOMMENDATION_BY_FUEL: Record<string, string> = {
  firewood: "biogas",
  charcoal: "biogas",
  lpg: "electric",
  electric: "solar_thermal",
  biogas: "biogas",
  other: "biogas",
};

export interface DerivedImpactInputs {
  current_fuel: string | null;
  monthly_fuel_spend: number | null;
  consumption_per_term: number | null;
}

export interface DerivedImpact {
  annual_savings_ksh: number | null;
  co2_reduction_tonnes_pa: number | null;
  recommended_solution: string | null;
}

export function deriveStoredImpact(input: DerivedImpactInputs): DerivedImpact {
  const fuel = (input.current_fuel || "").toLowerCase();

  const annualBaselineCost =
    input.monthly_fuel_spend && input.monthly_fuel_spend > 0
      ? input.monthly_fuel_spend * 12
      : null;
  const annual_savings_ksh =
    annualBaselineCost === null
      ? null
      : Math.round(annualBaselineCost * (1 - CLEAN_COST_MULTIPLIER));

  const factor = FUEL_CO2_FACTORS_KG_PER_KG[fuel];
  const co2_reduction_tonnes_pa =
    factor !== undefined && input.consumption_per_term && input.consumption_per_term > 0
      ? Math.round(
          ((input.consumption_per_term * TERMS_PER_YEAR * factor * CO2_REDUCTION_FRACTION) /
            1000) *
            100,
        ) / 100
      : null;

  const recommended_solution = fuel ? (DEFAULT_RECOMMENDATION_BY_FUEL[fuel] ?? null) : null;

  return { annual_savings_ksh, co2_reduction_tonnes_pa, recommended_solution };
}

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

// ---------------------------------------------------------------------------
// Cooking-method proposal (admin pipeline step 2) + provider suggestion.
// ---------------------------------------------------------------------------

export interface MethodInputs {
  current_fuel?: string | null;
  grid_connected?: boolean | null;
  outages_per_month?: string | number | null;
  meals_per_day?: number | null;
  meals_served_per_day?: number | null;
  number_of_students?: number | null;
}

export interface MethodProposal { method: string; reason: string }

export const METHOD_LABELS: Record<string, string> = {
  steam: "Steam institutional cooker",
  electric: "Induction institutional cooker",
};

/** Grid counts as reliable for induction at or below this many outages/month. */
const RELIABLE_GRID_MAX_OUTAGES = 7;
/** Above this many meals/day a steam system beats induction (power demand). */
const INDUCTION_MAX_MEALS = 3000;

/**
 * Outages/month as recorded (Kobo buckets like "Less than once", "1-7",
 * "8-14", or a plain number). Ranges resolve to their upper bound so the
 * reliability check stays conservative.
 */
export function parseOutages(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (/less than|never|none|rare/i.test(v)) return 0;
  const nums = v.match(/\d+/g);
  return nums ? Math.max(...nums.map(Number)) : null;
}

/**
 * Best institutional cooker for an institution — steam or induction — with a
 * plain-English reason.
 */
export function recommendCookingMethod(i: MethodInputs): MethodProposal {
  const fuel = (i.current_fuel ?? "").toLowerCase();
  const meals = i.meals_per_day || i.meals_served_per_day || 0;
  const outages = parseOutages(i.outages_per_month);
  const mealsTxt = meals ? `${meals.toLocaleString()} meals/day` : "meal load not recorded";

  const reliableGrid = i.grid_connected === true && (outages === null || outages <= RELIABLE_GRID_MAX_OUTAGES);
  if ((reliableGrid || fuel === "electric") && meals <= INDUCTION_MAX_MEALS) {
    const grid = fuel === "electric" && !reliableGrid ? "Already cooks with electricity"
      : outages === null ? "Grid-connected (outage frequency not recorded — confirm)"
      : `Grid-connected with ${i.outages_per_month} outage(s)/month`;
    return {
      method: "electric",
      reason: `${grid}; ${mealsTxt}. Induction institutional cookers have the lowest running cost, cook fast and produce no smoke.`,
    };
  }

  const why = meals > INDUCTION_MAX_MEALS && reliableGrid
    ? `${mealsTxt} is more than induction can handle without a very large 3-phase supply`
    : i.grid_connected === true ? `grid is unreliable (${i.outages_per_month} outages/month)`
    : i.grid_connected === false ? "no grid connection"
    : "grid access not recorded";
  return {
    method: "steam",
    reason: `${why[0].toUpperCase()}${why.slice(1)}${why.includes("meals/day") ? "" : `; ${mealsTxt}`}. A steam institutional cooker works off-grid on briquettes/pellets, suits bulk boarding meals and cuts fuel use and smoke sharply.`,
  };
}

/** Provider technology keywords that count as offering each method. */
const METHOD_KEYWORDS: Record<string, string[]> = {
  electric: ["induction", "electric", "ecook", "e-cook"],
  steam: ["steam", "boiler"],
};

export interface ProviderForMatch {
  id: string;
  name: string;
  technology_types?: string[] | null;
  counties_served?: string[] | null;
  verified?: boolean | null;
}

/** Top providers for a method + county: tech match 50, county 40, verified 10. */
export function suggestProviders<P extends ProviderForMatch>(
  county: string | null | undefined,
  method: string,
  providers: P[],
  limit = 3,
): (P & { score: number })[] {
  const kws = METHOD_KEYWORDS[method] ?? [method];
  const c = (county ?? "").toLowerCase();
  return providers
    .map((p) => {
      const tech = (p.technology_types ?? []).some((t) => kws.some((k) => t.toLowerCase().includes(k)));
      const inCounty = !!c && (p.counties_served ?? []).some((s) => s.toLowerCase() === c);
      return { ...p, score: (tech ? 50 : 0) + (inCounty ? 40 : 0) + (p.verified ? 10 : 0), tech };
    })
    .filter((p) => p.tech)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ tech: _tech, ...p }) => p as P & { score: number });
}

/**
 * Transition Scenario ↔ TCO engine adapter.
 *
 * Maps a `cost_models` row (a costed pathway for one institution+technology)
 * onto the pure `tco.ts` financing engine and returns the DERIVED scalar
 * fields the scenario stores. Keeping this in one place means the stored
 * payback / ROI / monthly-saving are always a deterministic function of the
 * inputs — a disagreement with Wilson's workbook is a bug here, not a typo in
 * a hand-keyed number.
 *
 * Inputs the scenario carries directly: capex, monthly_opex,
 * current_monthly_fuel_cost. Everything else (lifetime, discount rate,
 * escalations, financing terms) rides in the `assumptions` JSONB so the
 * methodology can evolve per fuel type without a schema change.
 */
import { tcoModel, type TcoInput, type FinancingTerms } from "@/lib/tco";

/** The scenario shape this adapter needs (a subset of a cost_models row). */
export interface ScenarioInputs {
  capex: number | null;
  monthly_opex: number | null;
  current_monthly_fuel_cost: number | null;
  /** Free-form methodology assumptions; keys mirror TcoInput. */
  assumptions?: Record<string, unknown> | null;
}

/** Derived figures written back onto the scenario row after compute. */
export interface ScenarioDerived {
  payback_months: number | null;
  roi_percentage: number | null;
  projected_monthly_savings: number;
  npv: number;
  irr: number | null;
}

const numOr = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Build a TcoInput from a scenario, pulling methodology knobs from assumptions. */
export function scenarioToTcoInput(s: ScenarioInputs): TcoInput {
  const a = (s.assumptions ?? {}) as Record<string, unknown>;
  const financing = (a.financing ?? undefined) as FinancingTerms | undefined;
  return {
    capex: numOr(s.capex, 0),
    installCostPct: a.installCostPct != null ? numOr(a.installCostPct, 0) : undefined,
    opexYear1: numOr(s.monthly_opex, 0) * 12,
    maintenanceYear1: a.maintenanceYear1 != null ? numOr(a.maintenanceYear1, 0) : undefined,
    // Lifetime is required by the engine; 10y is a sane institutional default.
    lifetimeYears: numOr(a.lifetimeYears, 10),
    salvageFraction: a.salvageFraction != null ? numOr(a.salvageFraction, 0) : undefined,
    opexEscalation: a.opexEscalation != null ? numOr(a.opexEscalation, 0) : undefined,
    maintenanceEscalation: a.maintenanceEscalation != null ? numOr(a.maintenanceEscalation, 0) : undefined,
    baselineYear1Cost: numOr(s.current_monthly_fuel_cost, 0) * 12,
    baselineEscalation: a.baselineEscalation != null ? numOr(a.baselineEscalation, 0) : undefined,
    discountRate: a.discountRate != null ? numOr(a.discountRate, 0.12) : undefined,
    financing,
  };
}

/** Compute the derived scenario figures from its inputs via the TCO engine. */
export function computeScenarioDerived(s: ScenarioInputs): ScenarioDerived {
  const out = tcoModel(scenarioToTcoInput(s));
  const year1 = out.yearly.find((y) => y.year === 1);
  const monthlySavings = year1 ? year1.savings / 12 : 0;
  return {
    payback_months:
      out.simplePaybackYears != null ? Math.round(out.simplePaybackYears * 12) : null,
    roi_percentage: out.irr != null ? Math.round(out.irr * 1000) / 10 : null, // % to 1dp
    projected_monthly_savings: Math.round(monthlySavings),
    npv: Math.round(out.npv),
    irr: out.irr,
  };
}

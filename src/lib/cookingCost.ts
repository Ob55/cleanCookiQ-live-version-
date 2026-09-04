/**
 * Fuel-specific cooking-cost calculator.
 *
 * The institution portal shows an institution what it spends on its CURRENT
 * fuel and what it would spend after transitioning to a chosen clean fuel.
 * Because different fuels are sold in different units (firewood by the tonne,
 * LPG by the kg, electricity by the kWh, biogas by the m³), you cannot just
 * apply a flat "clean cooking is 40% cheaper" multiplier and be correct — the
 * answer depends on the target fuel.
 *
 * The physically-correct method is ENERGY EQUIVALENCE:
 *   useful energy delivered = consumption × calorific value × stove efficiency
 * To deliver that same useful cooking energy with a different fuel:
 *   target consumption = useful energy / (target CV × target efficiency)
 *   target cost        = target consumption × target price per unit
 *
 * Prices and CO₂ factors come from the substantiated `v_active_data_points`
 * view (per fuel). The calorific values and stove efficiencies below are
 * standard reference figures (net calorific value; typical institutional
 * stove efficiency) drawn from GIZ / Clean Cooking Alliance / IPCC ranges.
 * They are kept here (not in the DB) as engineering constants; each is the
 * mid-point of the commonly cited range.
 */
import type { FuelKey } from "@/lib/dataPoints";

export interface FuelProperties {
  /** Canonical unit — matches the DB `fuel.cost_per_unit` / `fuel.co2_factor` unit. */
  unit: string;
  /** Net calorific value in MJ per canonical unit. */
  calorificMJ: number;
  /** Typical end-use (stove) thermal efficiency, 0..1. */
  efficiency: number;
  /** Human label. */
  label: string;
}

// FuelKey `other` is used for solid biomass pellets/briquettes in a gasifier.
export const FUEL_PROPERTIES: Record<FuelKey, FuelProperties> = {
  // 16 MJ/kg × 1000 kg/tonne; open-fire / basic institutional efficiency ~12%.
  firewood: { unit: "tonne", calorificMJ: 16000, efficiency: 0.12, label: "Firewood" },
  // 30 MJ/kg; traditional/improved charcoal jiko ~25%.
  charcoal: { unit: "kg", calorificMJ: 30, efficiency: 0.25, label: "Charcoal" },
  // 45.6 MJ/kg; LPG burner ~58%.
  lpg: { unit: "kg", calorificMJ: 45.6, efficiency: 0.58, label: "LPG" },
  // 3.6 MJ/kWh; induction/electric ~82%.
  electric: { unit: "kWh", calorificMJ: 3.6, efficiency: 0.82, label: "Electric (induction)" },
  // 22 MJ/m³; biogas burner ~55%.
  biogas: { unit: "m3", calorificMJ: 22, efficiency: 0.55, label: "Biogas" },
  // 17 MJ/kg; biomass pellets in a gasifier stove ~38%.
  other: { unit: "kg", calorificMJ: 17, efficiency: 0.38, label: "Biomass pellets" },
};

// Map the institution's chosen transition target (institutions.transition_target_fuel)
// onto a costed FuelKey. Targets with no distinct priced fuel resolve to the
// nearest energy carrier (steam & solar-hybrid cook electrically); ethanol and
// "other/undecided" have no priced data point yet → null (caller falls back to
// the generic estimate).
export const TARGET_TO_FUEL: Record<string, FuelKey | null> = {
  lpg: "lpg",
  biogas: "biogas",
  electric: "electric",
  biomass_pellets: "other",
  steam: "electric",
  solar_hybrid: "electric",
  ethanol: null,
  other: null,
};

/** Useful cooking energy (MJ) delivered by burning `consumption` units of `fuel`. */
export function usefulEnergyMJ(fuel: FuelKey, consumption: number): number {
  const p = FUEL_PROPERTIES[fuel];
  return consumption * p.calorificMJ * p.efficiency;
}

/** Units of `fuel` needed to deliver `usefulMJ` of useful cooking energy. */
export function consumptionForEnergy(fuel: FuelKey, usefulMJ: number): number {
  const p = FUEL_PROPERTIES[fuel];
  return usefulMJ / (p.calorificMJ * p.efficiency);
}

export interface CleanCostResult {
  /** Units of the target fuel needed per period. */
  targetConsumption: number;
  /** Cost per period on the target fuel. */
  targetCost: number;
  /** CO₂ per period on the target fuel (same unit as co2Factor input). */
  targetCo2: number;
}

/**
 * Energy-equivalent cost + CO₂ of delivering the same useful cooking energy
 * with a target fuel. All monetary/emission inputs are per the target fuel's
 * canonical unit (from the data-points view).
 */
export function cleanFuelEquivalent(params: {
  currentFuel: FuelKey;
  currentConsumption: number;
  targetFuel: FuelKey;
  targetCostPerUnit: number;
  targetCo2PerUnit: number;
}): CleanCostResult {
  const usefulMJ = usefulEnergyMJ(params.currentFuel, params.currentConsumption);
  const targetConsumption = consumptionForEnergy(params.targetFuel, usefulMJ);
  return {
    targetConsumption,
    targetCost: targetConsumption * params.targetCostPerUnit,
    targetCo2: targetConsumption * params.targetCo2PerUnit,
  };
}

import { describe, it, expect } from "vitest";
import { deriveStoredImpact } from "@/lib/institutionDerived";

describe("deriveStoredImpact — annual savings", () => {
  it("derives 60% × annual baseline cost (clean cost ≈ 40% of baseline)", () => {
    const { annual_savings_ksh } = deriveStoredImpact({
      current_fuel: "firewood",
      monthly_fuel_spend: 10_000,
      consumption_per_term: null,
    });
    expect(annual_savings_ksh).toBe(Math.round(10_000 * 12 * (1 - 0.4)));
  });

  it("returns null savings when monthly spend is missing", () => {
    const { annual_savings_ksh } = deriveStoredImpact({
      current_fuel: "firewood",
      monthly_fuel_spend: null,
      consumption_per_term: 4,
    });
    expect(annual_savings_ksh).toBeNull();
  });

  it("returns null savings when monthly spend is 0", () => {
    const { annual_savings_ksh } = deriveStoredImpact({
      current_fuel: "firewood",
      monthly_fuel_spend: 0,
      consumption_per_term: 4,
    });
    expect(annual_savings_ksh).toBeNull();
  });
});

describe("deriveStoredImpact — CO₂ reduction", () => {
  it("applies the firewood factor × 3 terms × 0.85 reduction × kg→t conversion", () => {
    const consumption = 1000;          // kg / term
    const factor = 1.7;                // kg CO2 per kg firewood
    const expected = (consumption * 3 * factor * 0.85) / 1000;
    const { co2_reduction_tonnes_pa } = deriveStoredImpact({
      current_fuel: "firewood",
      monthly_fuel_spend: null,
      consumption_per_term: consumption,
    });
    expect(co2_reduction_tonnes_pa).toBeCloseTo(Math.round(expected * 100) / 100, 2);
  });

  it("returns null CO₂ when consumption is missing", () => {
    const { co2_reduction_tonnes_pa } = deriveStoredImpact({
      current_fuel: "firewood",
      monthly_fuel_spend: 10_000,
      consumption_per_term: null,
    });
    expect(co2_reduction_tonnes_pa).toBeNull();
  });

  it("returns null CO₂ when fuel is unknown", () => {
    const { co2_reduction_tonnes_pa } = deriveStoredImpact({
      current_fuel: "uranium",
      monthly_fuel_spend: 10_000,
      consumption_per_term: 1000,
    });
    expect(co2_reduction_tonnes_pa).toBeNull();
  });

  it("is case-insensitive on fuel name", () => {
    const a = deriveStoredImpact({
      current_fuel: "FIREWOOD",
      monthly_fuel_spend: null,
      consumption_per_term: 1000,
    });
    const b = deriveStoredImpact({
      current_fuel: "firewood",
      monthly_fuel_spend: null,
      consumption_per_term: 1000,
    });
    expect(a.co2_reduction_tonnes_pa).toBe(b.co2_reduction_tonnes_pa);
  });
});

describe("deriveStoredImpact — recommended solution", () => {
  it.each([
    ["firewood", "biogas"],
    ["charcoal", "biogas"],
    ["lpg", "electric"],
    ["electric", "solar_thermal"],
    ["biogas", "biogas"],
    ["other", "biogas"],
  ])("recommends %s → %s", (fuel, recommendation) => {
    const { recommended_solution } = deriveStoredImpact({
      current_fuel: fuel,
      monthly_fuel_spend: null,
      consumption_per_term: null,
    });
    expect(recommended_solution).toBe(recommendation);
  });

  it("returns null recommendation when fuel is null", () => {
    const { recommended_solution } = deriveStoredImpact({
      current_fuel: null,
      monthly_fuel_spend: null,
      consumption_per_term: null,
    });
    expect(recommended_solution).toBeNull();
  });
});

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

import { recommendCookingMethod, suggestProviders, parseOutages } from "@/lib/institutionDerived";

describe("parseOutages", () => {
  it("reads Kobo buckets conservatively", () => {
    expect(parseOutages("Less than once")).toBe(0);
    expect(parseOutages("1-7")).toBe(7);
    expect(parseOutages("8-14")).toBe(14);
    expect(parseOutages(3)).toBe(3);
    expect(parseOutages(null)).toBeNull();
  });
});

describe("recommendCookingMethod (steam vs induction)", () => {
  it("proposes induction for a reliable grid connection", () => {
    const r = recommendCookingMethod({ current_fuel: "firewood", grid_connected: true, outages_per_month: "1-7", meals_per_day: 1200 });
    expect(r.method).toBe("electric");
    expect(r.reason).toContain("1-7 outage(s)/month");
  });
  it("proposes steam when outages are frequent", () => {
    const r = recommendCookingMethod({ current_fuel: "firewood", grid_connected: true, outages_per_month: "8-14", meals_per_day: 600 });
    expect(r.method).toBe("steam");
    expect(r.reason).toContain("unreliable");
  });
  it("proposes steam off-grid or when grid access is unknown", () => {
    expect(recommendCookingMethod({ current_fuel: "charcoal", grid_connected: false, meals_per_day: 900 }).method).toBe("steam");
    expect(recommendCookingMethod({ current_fuel: "firewood" }).reason).toContain("Grid access not recorded");
  });
  it("proposes steam for very large kitchens even on a good grid", () => {
    const r = recommendCookingMethod({ current_fuel: "firewood", grid_connected: true, outages_per_month: "Less than once", meals_per_day: 4500 });
    expect(r.method).toBe("steam");
    expect(r.reason).toContain("3-phase");
  });
  it("keeps electric cooks on induction", () => {
    expect(recommendCookingMethod({ current_fuel: "electric", meals_per_day: 500 }).method).toBe("electric");
  });
  it("only ever proposes steam or induction, always with a reason", () => {
    for (const f of ["firewood", "charcoal", "lpg", "biogas", "electric", "other", null]) {
      for (const g of [true, false, null]) {
        const r = recommendCookingMethod({ current_fuel: f, grid_connected: g, meals_per_day: 800 });
        expect(["steam", "electric"]).toContain(r.method);
        expect(r.reason.length).toBeGreaterThan(40);
      }
    }
  });
});

describe("suggestProviders", () => {
  const providers = [
    { id: "a", name: "Nairobi Induction", technology_types: ["Induction"], counties_served: ["Nairobi"], verified: true },
    { id: "b", name: "Makueni Electric", technology_types: ["electric"], counties_served: ["Makueni"], verified: false },
    { id: "c", name: "Steam Masters", technology_types: ["steam boilers"], counties_served: ["Makueni"], verified: true },
    { id: "d", name: "Briquette Co", technology_types: ["briquettes"], counties_served: ["Makueni"], verified: true },
  ];
  it("ranks in-county providers of the method first and excludes other technologies", () => {
    const r = suggestProviders("Makueni", "electric", providers);
    expect(r.map((p) => p.id)).toEqual(["b", "a"]);
    expect(r[0].score).toBe(90);
  });
  it("matches steam providers", () => {
    expect(suggestProviders("Makueni", "steam", providers).map((p) => p.id)).toEqual(["c"]);
  });
});

import { describe, it, expect } from "vitest";
import {
  attributionAllocate,
  dealMatchScore,
  formatBigNumber,
  type DealRow,
  type FunderPreferences,
} from "@/lib/funder";

const baseDeal: DealRow = {
  project_id: "p1",
  project_title: "School transition — Kiambu",
  project_status: "planning",
  total_budget: 1_000_000,
  start_date: "2026-06-01",
  target_completion: "2027-06-01",
  institution_id: "i1",
  institution_name: "St Mary's School",
  county: "Kiambu",
  institution_type: "school",
  baseline_fuel: "firewood",
  students: 500,
  provider_id: "pv1",
  provider_name: "Acme Stoves",
  forecast_annual_tco2e: 50,
  max_open_risk_score: 6,
  open_risk_count: 1,
  already_committed_capital: 200_000,
  funding_gap: 800_000,
};

const basePrefs: FunderPreferences = {
  organisation_id: "f1",
  name: "Test Funder",
  ticket_size_min: null,
  ticket_size_max: null,
  ticket_currency: "KES",
  preferred_counties: [],
  preferred_fuels: [],
  preferred_instruments: [],
  max_risk_score: null,
  min_irr: null,
  esg_focus: [],
  notes: null,
  is_active: true,
};

describe("dealMatchScore", () => {
  it("returns 1 when no preferences are set", () => {
    expect(dealMatchScore(baseDeal, basePrefs).total).toBeCloseTo(1, 5);
  });

  it("zeros county when deal county is not preferred", () => {
    const out = dealMatchScore(baseDeal, { ...basePrefs, preferred_counties: ["Mombasa"] });
    expect(out.countyMatch).toBe(0);
    expect(out.hardFails).toContain("county");
    expect(out.total).toBeLessThanOrEqual(0.20);
  });

  it("matches county when deal county is in the preferred list", () => {
    const out = dealMatchScore(baseDeal, { ...basePrefs, preferred_counties: ["Kiambu", "Nairobi"] });
    expect(out.countyMatch).toBe(1);
    expect(out.hardFails).not.toContain("county");
  });

  it("zeros fuel when deal baseline fuel is not preferred", () => {
    const out = dealMatchScore(baseDeal, { ...basePrefs, preferred_fuels: ["charcoal"] });
    expect(out.fuelMatch).toBe(0);
    expect(out.hardFails).toContain("fuel");
  });

  it("ticket fit is 1 when funding gap is within band", () => {
    const out = dealMatchScore(baseDeal, { ...basePrefs, ticket_size_min: 500_000, ticket_size_max: 1_000_000 });
    expect(out.ticketFit).toBe(1);
  });

  it("ticket fit decreases as gap exceeds the max", () => {
    const out = dealMatchScore(baseDeal, { ...basePrefs, ticket_size_min: 0, ticket_size_max: 400_000 });
    expect(out.ticketFit).toBeCloseTo(400_000 / 800_000, 5);
  });

  it("ticket fit decreases as gap is below the min", () => {
    const out = dealMatchScore(baseDeal, { ...basePrefs, ticket_size_min: 2_000_000 });
    expect(out.ticketFit).toBeCloseTo(800_000 / 2_000_000, 5);
  });

  it("risk fit is 1 when within tolerance", () => {
    const out = dealMatchScore(baseDeal, { ...basePrefs, max_risk_score: 10 });
    expect(out.riskFit).toBe(1);
  });

  it("risk fit decays linearly above tolerance", () => {
    const dealHighRisk = { ...baseDeal, max_open_risk_score: 20 };
    const out = dealMatchScore(dealHighRisk, { ...basePrefs, max_risk_score: 10 });
    // slack = 25-10 = 15, over = 20-10 = 10, fit = 1 - 10/15 = 0.333
    expect(out.riskFit).toBeCloseTo(1 - 10 / 15, 5);
  });

  it("ranks fully matching deals higher than partially matching", () => {
    const prefs: FunderPreferences = {
      ...basePrefs,
      preferred_counties: ["Kiambu"],
      preferred_fuels: ["firewood"],
      ticket_size_min: 500_000,
      ticket_size_max: 1_000_000,
      max_risk_score: 10,
    };
    const fullMatch = dealMatchScore(baseDeal, prefs);
    const wrongCounty = dealMatchScore({ ...baseDeal, county: "Mombasa" }, prefs);
    expect(fullMatch.total).toBeGreaterThan(wrongCounty.total);
  });
});

describe("attributionAllocate", () => {
  it("allocates outcome pro-rata to capital", () => {
    const out = attributionAllocate(
      [
        { organisation_id: "f1", capital_amount: 60 },
        { organisation_id: "f2", capital_amount: 40 },
      ],
      100,
    );
    expect(out["f1"]).toBeCloseTo(60, 5);
    expect(out["f2"]).toBeCloseTo(40, 5);
  });

  it("returns empty object for zero total capital", () => {
    expect(attributionAllocate([{ organisation_id: "f1", capital_amount: 0 }], 100)).toEqual({});
  });

  it("aggregates duplicate funders", () => {
    const out = attributionAllocate(
      [
        { organisation_id: "f1", capital_amount: 30 },
        { organisation_id: "f1", capital_amount: 30 },
        { organisation_id: "f2", capital_amount: 40 },
      ],
      100,
    );
    expect(out["f1"]).toBeCloseTo(60, 5);
    expect(out["f2"]).toBeCloseTo(40, 5);
  });
});

describe("formatBigNumber", () => {
  it("compacts thousands and millions", () => {
    expect(formatBigNumber(800)).toBe("800");
    expect(formatBigNumber(2500)).toBe("3K");
    expect(formatBigNumber(1_500_000)).toBe("1.5M");
    expect(formatBigNumber(null)).toBe("—");
    expect(formatBigNumber(NaN)).toBe("—");
  });
});

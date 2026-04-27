import { describe, it, expect } from "vitest";
import {
  cleanFuelShare,
  detectRelapse,
  downtimeFraction,
  estimateAnnualCredits,
  formatTco2e,
  riskBand,
  riskBandColorClass,
  riskScore,
  riskTypeLabel,
} from "@/lib/risk";

describe("riskScore", () => {
  it("multiplies severity × likelihood", () => {
    expect(riskScore(3, 4)).toBe(12);
    expect(riskScore(5, 5)).toBe(25);
  });

  it("clamps inputs to 1..5", () => {
    expect(riskScore(0, 7)).toBe(5);  // clamped to 1*5
    expect(riskScore(10, 10)).toBe(25);
    expect(riskScore(-2, 3)).toBe(3);  // clamped to 1*3
  });

  it("rounds non-integer inputs", () => {
    expect(riskScore(2.4, 3.5)).toBe(2 * 4);
  });
});

describe("riskBand", () => {
  it("matches the SQL view's banding", () => {
    expect(riskBand(25)).toBe("critical");
    expect(riskBand(20)).toBe("critical");
    expect(riskBand(16)).toBe("critical");
    expect(riskBand(15)).toBe("high");
    expect(riskBand(9)).toBe("high");
    expect(riskBand(8)).toBe("medium");
    expect(riskBand(4)).toBe("medium");
    expect(riskBand(3)).toBe("low");
    expect(riskBand(1)).toBe("low");
  });

  it("riskBandColorClass returns a class string for every band", () => {
    expect(riskBandColorClass("critical")).toMatch(/red/);
    expect(riskBandColorClass("low")).toMatch(/emerald/);
  });
});

describe("cleanFuelShare", () => {
  it("returns null when total is zero", () => {
    expect(cleanFuelShare({ cleanFuelUnits: 0, baselineFuelUnits: 0 })).toBeNull();
  });

  it("returns the share fraction", () => {
    expect(cleanFuelShare({ cleanFuelUnits: 60, baselineFuelUnits: 40 })).toBeCloseTo(0.6);
    expect(cleanFuelShare({ cleanFuelUnits: 100, baselineFuelUnits: 0 })).toBe(1);
    expect(cleanFuelShare({ cleanFuelUnits: 0, baselineFuelUnits: 50 })).toBe(0);
  });
});

describe("detectRelapse", () => {
  it("requires at least 2 readings", () => {
    expect(detectRelapse([{ cleanFuelUnits: 0, baselineFuelUnits: 100 }])).toBe(false);
  });

  it("flags when both recent readings have share < threshold", () => {
    const readings = [
      { cleanFuelUnits: 30, baselineFuelUnits: 70 },
      { cleanFuelUnits: 20, baselineFuelUnits: 80 },
      { cleanFuelUnits: 80, baselineFuelUnits: 20 }, // older, ignored
    ];
    expect(detectRelapse(readings)).toBe(true);
  });

  it("does NOT flag when only one recent reading is below threshold", () => {
    expect(detectRelapse([
      { cleanFuelUnits: 30, baselineFuelUnits: 70 },
      { cleanFuelUnits: 80, baselineFuelUnits: 20 },
    ])).toBe(false);
  });

  it("respects custom threshold", () => {
    const readings = [
      { cleanFuelUnits: 60, baselineFuelUnits: 40 },
      { cleanFuelUnits: 65, baselineFuelUnits: 35 },
    ];
    expect(detectRelapse(readings, 0.50)).toBe(false);
    expect(detectRelapse(readings, 0.75)).toBe(true);
  });

  it("ignores no-data periods (total 0)", () => {
    const readings = [
      { cleanFuelUnits: 0, baselineFuelUnits: 0 },
      { cleanFuelUnits: 0, baselineFuelUnits: 0 },
    ];
    expect(detectRelapse(readings)).toBe(false);
  });
});

describe("downtimeFraction", () => {
  it("returns 0 for null/zero hours operated", () => {
    expect(downtimeFraction(5, null)).toBe(0);
    expect(downtimeFraction(5, 0)).toBe(0);
  });

  it("computes the fraction and clamps to [0,1]", () => {
    expect(downtimeFraction(10, 100)).toBe(0.1);
    expect(downtimeFraction(150, 100)).toBe(1);  // clamped
    expect(downtimeFraction(-5, 100)).toBe(0);   // clamped
  });
});

describe("estimateAnnualCredits", () => {
  it("computes annual reduction in tonnes", () => {
    // baseline: 1000 kg firewood @ 1.7 kg CO2/kg = 1700 kg CO2/period
    // project: 200 kg LPG @ 3.0 kg CO2/kg = 600 kg CO2/period
    // reduction = 1100 kg/period × 12 months = 13,200 kg/yr = 13.2 tCO2e
    const out = estimateAnnualCredits({
      baselineUnits: 1000,
      baselineFactor: 1.7,
      projectUnits: 200,
      projectFactor: 3.0,
      periodsPerYear: 12,
    });
    expect(out).toBeCloseTo(13.2, 2);
  });

  it("never returns negative (when project emits more than baseline, returns 0)", () => {
    const out = estimateAnnualCredits({
      baselineUnits: 100,
      baselineFactor: 1.0,
      projectUnits: 100,
      projectFactor: 5.0,
      periodsPerYear: 12,
    });
    expect(out).toBe(0);
  });
});

describe("formatTco2e", () => {
  it("appends the unit and handles null", () => {
    expect(formatTco2e(13.5)).toMatch(/13\.5 tCO/);
    expect(formatTco2e(null)).toBe("—");
    expect(formatTco2e(NaN)).toBe("—");
  });
});

describe("riskTypeLabel", () => {
  it("renders human labels", () => {
    expect(riskTypeLabel("behavioural_relapse")).toBe("Behavioural relapse");
    expect(riskTypeLabel("fuel_price_spike")).toBe("Fuel price spike");
    expect(riskTypeLabel("other")).toBe("Other");
  });
});

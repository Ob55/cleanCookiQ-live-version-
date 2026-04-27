import { describe, it, expect } from "vitest";
import {
  discountedPaybackPeriod,
  formatCurrency,
  formatPercent,
  formatYears,
  irr,
  npv,
  sensitivityTable,
  simplePaybackPeriod,
  tcoModel,
  type TcoInput,
} from "@/lib/tco";

// ============================================================
// Core financial functions
// ============================================================

describe("npv", () => {
  it("equals the sum of cashflows when rate is 0", () => {
    expect(npv(0, [-100, 50, 50, 50])).toBeCloseTo(50, 6);
  });

  it("matches Excel's NPV behavior for a known series", () => {
    // -1000 at t=0, then 300 each year for 4 years, rate 10%
    // NPV = -1000 + 300/(1.1) + 300/(1.21) + 300/(1.331) + 300/(1.4641)
    //     ≈ -1000 + 272.73 + 247.93 + 225.39 + 204.90 = -49.04
    expect(npv(0.1, [-1000, 300, 300, 300, 300])).toBeCloseTo(-49.04, 1);
  });

  it("decreases as rate increases (for positive late cashflows)", () => {
    const cf = [-1000, 200, 300, 400, 500];
    expect(npv(0.05, cf)).toBeGreaterThan(npv(0.20, cf));
  });
});

describe("irr", () => {
  it("returns null for all-positive series", () => {
    expect(irr([100, 200, 300])).toBeNull();
  });

  it("returns null for all-negative series", () => {
    expect(irr([-100, -200, -300])).toBeNull();
  });

  it("matches a known IRR (Excel agrees)", () => {
    // -1000 then 400, 400, 400, 400 → IRR ≈ 21.86%
    const r = irr([-1000, 400, 400, 400, 400]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.2186, 3);
  });

  it("zero NPV at the IRR by definition", () => {
    const cf = [-5000, 1500, 1800, 2100, 2400];
    const r = irr(cf)!;
    expect(npv(r, cf)).toBeCloseTo(0, 4);
  });
});

describe("simplePaybackPeriod", () => {
  it("returns null when never positive", () => {
    expect(simplePaybackPeriod([-100, -50, -20])).toBeNull();
  });

  it("returns 0 when already positive at t=0", () => {
    expect(simplePaybackPeriod([100, 50, 50])).toBe(0);
  });

  it("interpolates within the crossing year", () => {
    // capex 1000 at t=0, then 400/yr → cumulative -1000, -600, -200, +200
    // crosses in t=3: 200 deficit / 400 inflow → 0.5 of year 3 → 3.5
    expect(simplePaybackPeriod([-1000, 400, 400, 400, 400])).toBeCloseTo(3.5, 3);
  });
});

describe("discountedPaybackPeriod", () => {
  it("is longer than simple payback when rate > 0", () => {
    const cf = [-1000, 400, 400, 400, 400];
    const simple = simplePaybackPeriod(cf)!;
    const disc = discountedPaybackPeriod(cf, 0.10)!;
    expect(disc).toBeGreaterThan(simple);
  });
});

// ============================================================
// TCO model
// ============================================================

describe("tcoModel — outright cash purchase", () => {
  const input: TcoInput = {
    capex: 1_000_000,
    installCostPct: 0.10,                  // total capex 1,100,000
    opexYear1: 200_000,
    maintenanceYear1: 20_000,
    lifetimeYears: 10,
    salvageFraction: 0.05,
    opexEscalation: 0.05,
    maintenanceEscalation: 0.03,
    baselineYear1Cost: 600_000,
    baselineEscalation: 0.07,
    discountRate: 0.12,
  };

  const out = tcoModel(input);

  it("year 0 carries the full capex outflow", () => {
    expect(out.yearly[0].capex).toBeCloseTo(-1_100_000, 2);
    expect(out.yearly[0].opex).toBe(0);
  });

  it("year 1+ has opex and baseline applied", () => {
    expect(out.yearly[1].opex).toBeCloseTo(-200_000, 2);
    expect(out.yearly[1].baselineCost).toBeCloseTo(600_000, 2);
  });

  it("salvage applied only in the final year", () => {
    expect(out.yearly[10].salvage).toBeCloseTo(50_000, 2); // 5% of 1M
    expect(out.yearly[5].salvage).toBe(0);
  });

  it("opex escalates year on year", () => {
    expect(out.yearly[2].opex).toBeCloseTo(-200_000 * 1.05, 0);
    expect(out.yearly[3].opex).toBeCloseTo(-200_000 * 1.05 * 1.05, 0);
  });

  it("returns plausible NPV/IRR/payback", () => {
    expect(out.npv).toBeGreaterThan(0);                 // savings outweigh costs at 12%
    expect(out.irr).not.toBeNull();
    expect(out.irr!).toBeGreaterThan(0.12);              // IRR > discount rate
    expect(out.simplePaybackYears).toBeLessThan(out.lifetimeYears);
    expect(out.simplePaybackYears).toBeGreaterThan(1);
  });

  it("cumulative cashflow ends close to (but not equal to) sum of yearly", () => {
    const sum = out.yearly.reduce((a, y) => a + y.netCashFlow, 0);
    const last = out.yearly[out.yearly.length - 1].cumulativeCashFlow;
    expect(last).toBeCloseTo(sum, 2);
  });
});

describe("tcoModel — concessional loan financing", () => {
  const input: TcoInput = {
    capex: 1_000_000,
    installCostPct: 0,
    opexYear1: 200_000,
    lifetimeYears: 5,
    baselineYear1Cost: 500_000,
    discountRate: 0.10,
    financing: {
      loanPct: 1.0,            // full loan, no down payment, no grant
      interestRate: 0.08,
      tenorMonths: 36,
      graceMonths: 0,
    },
  };

  const out = tcoModel(input);

  it("year 0 has no institution capex outflow when loan = 100%", () => {
    expect(out.yearly[0].capex).toBeCloseTo(0, 2);
  });

  it("loan payments appear in years 1..3 then disappear", () => {
    expect(out.yearly[1].loanPayment).toBeLessThan(0);
    expect(out.yearly[2].loanPayment).toBeLessThan(0);
    expect(out.yearly[3].loanPayment).toBeLessThan(0);
    expect(out.yearly[4].loanPayment).toBe(0);
    expect(out.yearly[5].loanPayment).toBe(0);
  });

  it("post-loan years have only opex (no debt service)", () => {
    expect(out.yearly[5].loanPayment).toBe(0);
    expect(out.yearly[5].opex).toBeLessThan(0);
  });
});

describe("tcoModel — full grant", () => {
  const input: TcoInput = {
    capex: 1_000_000,
    installCostPct: 0,
    opexYear1: 100_000,
    lifetimeYears: 3,
    baselineYear1Cost: 200_000,
    discountRate: 0.10,
    financing: { upfrontGrantPct: 1.0 },
  };
  const out = tcoModel(input);

  it("year 0 net cashflow is roughly zero (grant offsets capex)", () => {
    expect(Math.abs(out.yearly[0].netCashFlow)).toBeLessThan(1);
  });

  it("payback is immediate (year 0)", () => {
    expect(out.simplePaybackYears).toBe(0);
  });
});

// ============================================================
// Sensitivity
// ============================================================

describe("sensitivityTable", () => {
  const input: TcoInput = {
    capex: 1_000_000,
    opexYear1: 200_000,
    lifetimeYears: 10,
    baselineYear1Cost: 600_000,
    discountRate: 0.12,
  };

  it("returns one row per knob with up/down NPVs differing from baseline", () => {
    const rows = sensitivityTable(input);
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row.upNpv).not.toBe(row.baselineNpv);
      expect(row.downNpv).not.toBe(row.baselineNpv);
    });
  });

  it("higher operating cost lowers NPV", () => {
    const rows = sensitivityTable(input);
    const opexRow = rows.find((r) => r.knob === "Operating cost")!;
    expect(opexRow.upNpv).toBeLessThan(opexRow.baselineNpv);
    expect(opexRow.downNpv).toBeGreaterThan(opexRow.baselineNpv);
  });
});

// ============================================================
// Formatters
// ============================================================

describe("formatters", () => {
  it("formatCurrency compacts thousands and millions", () => {
    expect(formatCurrency(800)).toBe("KES 800");
    expect(formatCurrency(2500)).toBe("KES 3K");
    expect(formatCurrency(1_500_000)).toBe("KES 1.5M");
    expect(formatCurrency(NaN)).toBe("—");
  });

  it("formatPercent formats fractions", () => {
    expect(formatPercent(0.123)).toBe("12.3%");
    expect(formatPercent(null)).toBe("—");
  });

  it("formatYears uses months for sub-year values", () => {
    expect(formatYears(0.5)).toBe("6.0 mo");
    expect(formatYears(2.3)).toBe("2.3 yr");
    expect(formatYears(null)).toBe("—");
  });
});

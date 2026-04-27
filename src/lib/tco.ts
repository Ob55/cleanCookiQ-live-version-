/**
 * TCO + financing math (Workstream 4).
 *
 * All functions are pure — no Supabase, no React, no I/O. The intent
 * is that every numeric output rendered to a user can be reproduced
 * deterministically from a single TcoInput payload, and any disagreement
 * with an Excel model is a function bug, not a UI bug.
 *
 * Conventions:
 *   - Cash flows use the financial-modelling sign convention:
 *     outflows (capex, opex payments) are NEGATIVE, inflows (savings vs.
 *     baseline, grants received, salvage) are POSITIVE.
 *   - Year 0 is the install year (capex year). Year N is the salvage year.
 *   - All amounts in the institution's local currency (KES by default).
 */

// ============================================================
// CORE FINANCIAL FUNCTIONS
// ============================================================

/** Net Present Value at a given discount rate. cashflows[t] is year t. */
export function npv(rate: number, cashflows: number[]): number {
  return cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

/**
 * Internal Rate of Return via Newton-Raphson. Returns null if it fails
 * to converge (for cashflow series that have no real positive IRR, or
 * are degenerate — e.g. all positive or all negative).
 */
export function irr(
  cashflows: number[],
  guess = 0.1,
  maxIterations = 100,
  tolerance = 1e-7,
): number | null {
  if (cashflows.length < 2) return null;
  const hasPos = cashflows.some((c) => c > 0);
  const hasNeg = cashflows.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;

  let r = guess;
  for (let i = 0; i < maxIterations; i++) {
    const f = npv(r, cashflows);
    // Derivative of NPV w.r.t. rate:  Σ -t * cf_t / (1+r)^(t+1)
    const fPrime = cashflows.reduce(
      (acc, cf, t) => acc - (t * cf) / Math.pow(1 + r, t + 1),
      0,
    );
    if (Math.abs(fPrime) < 1e-12) return null;
    const next = r - f / fPrime;
    if (!Number.isFinite(next)) return null;
    if (Math.abs(next - r) < tolerance) return next;
    r = next;
  }
  return null;
}

/**
 * Simple payback period in years (with linear interpolation within the
 * crossing year). Returns null if cumulative cashflow never goes positive.
 */
export function simplePaybackPeriod(cashflows: number[]): number | null {
  let cumulative = 0;
  for (let t = 0; t < cashflows.length; t++) {
    const next = cumulative + cashflows[t];
    if (next >= 0 && cumulative < 0) {
      // Crosses zero in year t. Fractional year = -cumulative / cashflow_t.
      const fraction = cashflows[t] === 0 ? 0 : -cumulative / cashflows[t];
      return t + fraction;
    }
    cumulative = next;
  }
  return cumulative >= 0 ? 0 : null;
}

/** Discounted payback period at a given rate. */
export function discountedPaybackPeriod(cashflows: number[], rate: number): number | null {
  const discounted = cashflows.map((cf, t) => cf / Math.pow(1 + rate, t));
  return simplePaybackPeriod(discounted);
}

// ============================================================
// TCO MODEL
// ============================================================

export interface FinancingTerms {
  /** Fraction of capex paid as a one-off grant (no repayment). 0..1 */
  upfrontGrantPct?: number;
  /** Fraction of capex covered by debt. 0..1 */
  loanPct?: number;
  /** Annual interest rate for debt. 0..1 */
  interestRate?: number;
  /** Tenor in months for debt. */
  tenorMonths?: number;
  /** Grace period in months at the start of debt. */
  graceMonths?: number;
  /** Down-payment fraction the institution puts in. 0..1 */
  downPaymentPct?: number;
  /** Annual fee/cost not tied to debt (e.g. PAYGO premium). */
  annualFee?: number;
}

export interface TcoInput {
  /** Equipment cost (median or chosen value within capex range). */
  capex: number;
  /** Install / commissioning cost as fraction of capex (typical 5-20%). */
  installCostPct?: number;
  /** Year-1 operating cost (fuel + electricity + consumables). */
  opexYear1: number;
  /** Year-1 maintenance cost. */
  maintenanceYear1?: number;
  /** Lifetime in years. */
  lifetimeYears: number;
  /** Salvage value as fraction of capex at end of lifetime. */
  salvageFraction?: number;
  /** Annual escalation of operating cost (e.g. fuel inflation). 0..1 */
  opexEscalation?: number;
  /** Annual escalation of maintenance cost. 0..1 */
  maintenanceEscalation?: number;
  /** Year-1 baseline cost (e.g. status quo firewood OpEx). 0 disables savings comparison. */
  baselineYear1Cost?: number;
  /** Annual escalation of baseline cost. 0..1 */
  baselineEscalation?: number;
  /** Discount rate for NPV. Default 0.12. */
  discountRate?: number;
  /** Financing structure (defaults to outright cash). */
  financing?: FinancingTerms;
}

export interface YearlyCashFlow {
  year: number;
  capex: number;            // negative (or 0 after year 0)
  opex: number;             // negative
  maintenance: number;      // negative
  baselineCost: number;     // positive (the cost you would have paid otherwise)
  savings: number;          // baselineCost + opex + maintenance (so negative ops eat into positive baseline)
  loanPayment: number;      // negative
  grant: number;            // positive (year 0 only)
  salvage: number;          // positive (final year)
  netCashFlow: number;      // sum of all above
  cumulativeCashFlow: number;
}

export interface TcoOutput {
  yearly: YearlyCashFlow[];
  totalCapex: number;
  totalOpexLifetime: number;
  totalSavingsLifetime: number;
  npv: number;
  irr: number | null;
  simplePaybackYears: number | null;
  discountedPaybackYears: number | null;
  discountRate: number;
  lifetimeYears: number;
}

/**
 * Compute a flat-amortisation monthly debt service. Used for the loan-payment
 * line in the cash-flow series. Annualised by × 12 for annual reporting.
 * If interest rate is 0, returns straight-line repayment.
 */
function annualLoanPayment(principal: number, ratePerYear: number, tenorMonths: number, graceMonths = 0): number {
  if (principal <= 0 || tenorMonths <= 0) return 0;
  const repaymentMonths = Math.max(tenorMonths - graceMonths, 1);
  if (ratePerYear === 0) {
    return (principal / repaymentMonths) * 12;
  }
  const r = ratePerYear / 12;
  const monthly = (principal * r) / (1 - Math.pow(1 + r, -repaymentMonths));
  return monthly * 12;
}

export function tcoModel(input: TcoInput): TcoOutput {
  const {
    capex,
    installCostPct = 0.10,
    opexYear1,
    maintenanceYear1 = 0,
    lifetimeYears,
    salvageFraction = 0,
    opexEscalation = 0.05,
    maintenanceEscalation = 0.03,
    baselineYear1Cost = 0,
    baselineEscalation = 0.07,
    discountRate = 0.12,
    financing = {},
  } = input;

  const totalCapex = capex * (1 + installCostPct);

  // Financing waterfall: grant first, then debt, then institution covers the rest as down-payment in year 0.
  const upfrontGrantPct = clamp(financing.upfrontGrantPct ?? 0, 0, 1);
  const loanPct = clamp(financing.loanPct ?? 0, 0, 1);
  const grantAmount = totalCapex * upfrontGrantPct;
  const loanAmount = totalCapex * loanPct;
  const institutionUpfront = totalCapex - grantAmount - loanAmount;

  const annualDebtService =
    loanAmount > 0
      ? annualLoanPayment(
          loanAmount,
          financing.interestRate ?? 0.08,
          financing.tenorMonths ?? 36,
          financing.graceMonths ?? 0,
        )
      : 0;

  // Years where the loan is being repaid (1..ceil(tenor/12)), accounting for grace.
  const loanFirstRepayYear = 1 + Math.floor((financing.graceMonths ?? 0) / 12);
  const loanLastRepayYear = loanFirstRepayYear + Math.ceil(((financing.tenorMonths ?? 0) - (financing.graceMonths ?? 0)) / 12) - 1;
  const annualFee = financing.annualFee ?? 0;

  const yearly: YearlyCashFlow[] = [];
  let cumulative = 0;

  for (let year = 0; year <= lifetimeYears; year++) {
    const isYear0 = year === 0;
    const isFinalYear = year === lifetimeYears;

    const capexCf = isYear0 ? -institutionUpfront : 0;
    const grantCf = isYear0 ? grantAmount : 0;

    const opexEscalator = year === 0 ? 0 : Math.pow(1 + opexEscalation, year - 1);
    const opexCf = year === 0 ? 0 : -opexYear1 * opexEscalator;
    const maintCf = year === 0 ? 0 : -maintenanceYear1 * Math.pow(1 + maintenanceEscalation, year - 1);
    const baselineCf =
      year === 0 || baselineYear1Cost === 0
        ? 0
        : baselineYear1Cost * Math.pow(1 + baselineEscalation, year - 1);

    const loanPaymentCf =
      year >= loanFirstRepayYear && year <= loanLastRepayYear ? -annualDebtService : 0;
    const annualFeeCf = year === 0 ? 0 : -annualFee;

    const salvageCf = isFinalYear ? capex * salvageFraction : 0;

    const savings = baselineCf + opexCf + maintCf; // net operating savings vs status quo
    // Grant is informational on the row, not summed into net cashflow:
    // grant funds the supplier directly, so the institution's actual cash
    // outflow in year 0 is already -institutionUpfront in capexCf.
    const net =
      capexCf + opexCf + maintCf + baselineCf + loanPaymentCf + annualFeeCf + salvageCf;
    cumulative += net;

    yearly.push({
      year,
      capex: capexCf,
      opex: opexCf + annualFeeCf,
      maintenance: maintCf,
      baselineCost: baselineCf,
      savings,
      loanPayment: loanPaymentCf,
      grant: grantCf,
      salvage: salvageCf,
      netCashFlow: net,
      cumulativeCashFlow: cumulative,
    });
  }

  const cashflowSeries = yearly.map((y) => y.netCashFlow);
  const totalOpex = yearly.reduce((acc, y) => acc + y.opex + y.maintenance, 0);
  const totalSavings = yearly.reduce((acc, y) => acc + y.baselineCost, 0);

  return {
    yearly,
    totalCapex,
    totalOpexLifetime: totalOpex,
    totalSavingsLifetime: totalSavings,
    npv: npv(discountRate, cashflowSeries),
    irr: irr(cashflowSeries),
    simplePaybackYears: simplePaybackPeriod(cashflowSeries),
    discountedPaybackYears: discountedPaybackPeriod(cashflowSeries, discountRate),
    discountRate,
    lifetimeYears,
  };
}

// ============================================================
// SENSITIVITY
// ============================================================

export interface SensitivityKnob {
  label: string;
  /** Fraction to perturb the chosen field by, e.g. 0.20 = ±20%. */
  delta: number;
  /** Apply the perturbation to a copy of the input; return the modified copy. */
  apply: (input: TcoInput, sign: 1 | -1) => TcoInput;
}

export interface SensitivityRow {
  knob: string;
  delta: number;
  baselineNpv: number;
  upNpv: number;
  downNpv: number;
  upPaybackYears: number | null;
  downPaybackYears: number | null;
}

export const STANDARD_SENSITIVITY_KNOBS: SensitivityKnob[] = [
  {
    label: "Operating cost",
    delta: 0.20,
    apply: (i, sign) => ({ ...i, opexYear1: i.opexYear1 * (1 + sign * 0.20) }),
  },
  {
    label: "Equipment lifetime",
    delta: 0.20,
    apply: (i, sign) => ({
      ...i,
      lifetimeYears: Math.max(1, Math.round(i.lifetimeYears * (1 + sign * 0.20))),
    }),
  },
  {
    label: "Discount rate",
    delta: 0.05,
    apply: (i, sign) => ({ ...i, discountRate: Math.max(0, (i.discountRate ?? 0.12) + sign * 0.05) }),
  },
];

export function sensitivityTable(
  input: TcoInput,
  knobs: SensitivityKnob[] = STANDARD_SENSITIVITY_KNOBS,
): SensitivityRow[] {
  const baseline = tcoModel(input);
  return knobs.map((knob) => {
    const up = tcoModel(knob.apply(input, 1));
    const down = tcoModel(knob.apply(input, -1));
    return {
      knob: knob.label,
      delta: knob.delta,
      baselineNpv: baseline.npv,
      upNpv: up.npv,
      downNpv: down.npv,
      upPaybackYears: up.simplePaybackYears,
      downPaybackYears: down.simplePaybackYears,
    };
  });
}

// ============================================================
// HELPERS
// ============================================================

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export function formatCurrency(v: number, currency = "KES"): string {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const compact = abs >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : abs >= 1_000
      ? `${(v / 1_000).toFixed(0)}K`
      : `${v.toFixed(0)}`;
  return `${currency} ${compact}`;
}

export function formatPercent(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatYears(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (v < 1) return `${(v * 12).toFixed(1)} mo`;
  return `${v.toFixed(1)} yr`;
}

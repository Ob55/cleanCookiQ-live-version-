/**
 * Funder portal types + pure helpers (Workstream 7).
 *
 * `dealMatchScore` is the heart of the curated deal flow: it returns
 * a normalised 0..1 score for how well a single deal matches a funder's
 * stated preferences (county, fuel, ticket size, risk, IRR floor).
 * The dashboard sorts deals by this score to surface best fits first.
 */
import { tcoModel, type TcoInput } from "./tco";

export interface FunderPreferences {
  organisation_id: string;
  name: string | null;
  ticket_size_min: number | null;
  ticket_size_max: number | null;
  ticket_currency: string;
  preferred_counties: string[];
  preferred_fuels: string[];
  preferred_instruments: string[];
  max_risk_score: number | null;       // 1..25
  min_irr: number | null;              // 0..1
  esg_focus: string[];
  notes: string | null;
  is_active: boolean;
}

export interface DealRow {
  project_id: string;
  project_title: string;
  project_status: string;
  total_budget: number | null;
  start_date: string | null;
  target_completion: string | null;
  institution_id: string;
  institution_code?: string | null;
  institution_name: string;
  county: string | null;
  institution_type: string | null;
  baseline_fuel: string | null;
  students: number | null;
  provider_id: string | null;
  provider_name: string | null;
  forecast_annual_tco2e: number | null;
  max_open_risk_score: number;
  open_risk_count: number;
  already_committed_capital: number;
  funding_gap: number | null;
  /** Monthly status-quo fuel spend on the institution. Drives baseline savings. */
  monthly_fuel_spend?: number | null;
  /** Stored annual savings figure on the institution (KSh). */
  annual_savings_ksh?: number | null;
}

export interface PortfolioRow {
  id: string;
  organisation_id: string;
  project_id: string;
  instrument_id: string | null;
  capital_amount: number;
  capital_currency: string;
  capital_share_pct: number | null;
  committed_at: string;
  disbursed_at: string | null;
  status: "pipeline" | "committed" | "disbursed" | "repaid" | "written_off";
  notes: string | null;
}

export interface PortfolioSummary {
  organisation_id: string;
  project_count: number;
  total_committed: number | null;
  total_disbursed: number | null;
  lifetime_tco2e: number | null;
  lifetime_ksh_savings: number | null;
  lifetime_meals: number | null;
  lifetime_jobs: number | null;
}

export interface DealScoreBreakdown {
  total: number;          // 0..1
  countyMatch: number;    // 0 or 1
  fuelMatch: number;      // 0 or 1
  ticketFit: number;      // 0..1
  riskFit: number;        // 0..1
  irrFit: number;         // 0..1
  hardFails: string[];    // criteria that disqualify the deal
}

/**
 * Score a deal against funder preferences. Returns total in 0..1 plus
 * a breakdown for "why it matched" UI. Hard fails (preferences flagged
 * as required) zero out the total.
 */
export function dealMatchScore(deal: DealRow, prefs: FunderPreferences): DealScoreBreakdown {
  const hardFails: string[] = [];

  const countyMatch =
    prefs.preferred_counties.length === 0
      ? 1
      : deal.county && prefs.preferred_counties.includes(deal.county) ? 1 : 0;
  if (prefs.preferred_counties.length > 0 && countyMatch === 0) {
    hardFails.push("county");
  }

  const fuelMatch =
    prefs.preferred_fuels.length === 0
      ? 1
      : deal.baseline_fuel && prefs.preferred_fuels.includes(deal.baseline_fuel) ? 1 : 0;
  if (prefs.preferred_fuels.length > 0 && fuelMatch === 0) {
    hardFails.push("fuel");
  }

  // Ticket fit: 1 if funding gap is within [min, max]; falls off linearly
  // as it strays outside the band. If neither bound is set, score is 1.
  const gap = deal.funding_gap ?? deal.total_budget ?? 0;
  const min = prefs.ticket_size_min ?? 0;
  const max = prefs.ticket_size_max ?? Number.POSITIVE_INFINITY;
  let ticketFit: number;
  if (min === 0 && max === Number.POSITIVE_INFINITY) {
    ticketFit = 1;
  } else if (gap >= min && gap <= max) {
    ticketFit = 1;
  } else if (gap < min) {
    ticketFit = clamp(gap / Math.max(min, 1), 0, 1);
  } else {
    ticketFit = clamp(max / gap, 0, 1);
  }

  // Risk fit: 1 if max_open_risk_score <= max_risk_score; falls linearly
  // to 0 as risk score reaches 25. If preference unset, score is 1.
  let riskFit = 1;
  if (prefs.max_risk_score !== null) {
    if (deal.max_open_risk_score <= prefs.max_risk_score) {
      riskFit = 1;
    } else {
      const slack = 25 - prefs.max_risk_score;
      const over = deal.max_open_risk_score - prefs.max_risk_score;
      riskFit = clamp(1 - over / Math.max(slack, 1), 0, 1);
      if (riskFit < 0.25) hardFails.push("risk");
    }
  }

  // IRR fit: when the funder sets a floor, compute the project's forecast IRR
  // from a TCO model built from the deal inputs and compare. If we can't build
  // a model (missing inputs), fall back to 0.5 (uncertain).
  let irrFit = 1;
  if (prefs.min_irr !== null) {
    const projectIrr = forecastIrr(deal);
    if (projectIrr === null) {
      irrFit = 0.5;
    } else if (projectIrr >= prefs.min_irr) {
      irrFit = 1;
    } else {
      // Linear taper from 1 at the floor down to 0 when IRR is at or below 0.
      irrFit = clamp(projectIrr / prefs.min_irr, 0, 1);
      if (irrFit < 0.25) hardFails.push("irr");
    }
  }

  // Weighted sum (countyMatch and fuelMatch get higher weights since
  // they're the most common hard preferences).
  const weighted =
    countyMatch * 0.30 +
    fuelMatch * 0.20 +
    ticketFit * 0.25 +
    riskFit * 0.15 +
    irrFit * 0.10;

  const total = hardFails.length > 0 ? Math.min(weighted, 0.20) : weighted;

  return { total, countyMatch, fuelMatch, ticketFit, riskFit, irrFit, hardFails };
}

/**
 * Allocate an outcome (e.g. tCO2e avoided, jobs, meals) across a list of
 * funders by their capital share. Returns a map funder_id → share_amount.
 */
export function attributionAllocate<T extends { organisation_id: string; capital_amount: number }>(
  contributions: T[],
  outcomeAmount: number,
): Record<string, number> {
  const total = contributions.reduce((acc, c) => acc + c.capital_amount, 0);
  if (total <= 0) return {};
  const out: Record<string, number> = {};
  for (const c of contributions) {
    out[c.organisation_id] = (out[c.organisation_id] ?? 0) + outcomeAmount * (c.capital_amount / total);
  }
  return out;
}

/**
 * Build a TCO input from a deal row and return the forecast IRR.
 * Returns null when the deal lacks the inputs needed for an honest model
 * (no budget, or no baseline fuel spend to compare against).
 *
 * Conventions match the rest of the platform:
 *   - clean cooking opex is ~40% of the firewood/charcoal cost
 *   - default lifetime 10 years, install 10% of capex
 *   - escalations: opex 5%/yr, baseline 7%/yr (same as tcoModel defaults)
 */
export function forecastIrr(deal: DealRow): number | null {
  const capex = deal.total_budget ?? 0;
  const baselineAnnual =
    (deal.monthly_fuel_spend ?? 0) > 0
      ? (deal.monthly_fuel_spend as number) * 12
      : (deal.annual_savings_ksh ?? 0) > 0
        ? (deal.annual_savings_ksh as number) / 0.6  // savings ≈ 60% of baseline cost
        : 0;
  if (capex <= 0 || baselineAnnual <= 0) return null;

  const input: TcoInput = {
    capex,
    opexYear1: baselineAnnual * 0.4, // clean-cost multiplier from §3
    lifetimeYears: 10,
    baselineYear1Cost: baselineAnnual,
  };
  return tcoModel(input).irr;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export function formatBigNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

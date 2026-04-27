/**
 * Funder portal types + pure helpers (Workstream 7).
 *
 * `dealMatchScore` is the heart of the curated deal flow: it returns
 * a normalised 0..1 score for how well a single deal matches a funder's
 * stated preferences (county, fuel, ticket size, risk, IRR floor).
 * The dashboard sorts deals by this score to surface best fits first.
 */

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

  // IRR fit: we don't have project-level IRR here yet, so this is a stub
  // that always returns 1 unless the funder has set an explicit floor and
  // the project doesn't yet have a forecast — in which case we mark it
  // as 0.5 (uncertain).
  const irrFit = prefs.min_irr === null ? 1 : 0.5;

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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export function formatBigNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

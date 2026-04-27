/**
 * Risk + monitoring + carbon helpers (Workstream 6).
 *
 * Pure helpers only — no Supabase, no React. Drives the risk matrix UI,
 * the relapse alert in the monitoring dashboard, and the rough carbon
 * estimate before formal verification lands.
 */

export type RiskBand = "low" | "medium" | "high" | "critical";

export type RiskBearer = "institution" | "supplier" | "installer" | "funder" | "platform" | "shared";

export type RiskStatus = "open" | "mitigating" | "accepted" | "closed" | "realised";

export type RiskType =
  | "equipment_defect"
  | "installation_failure"
  | "fuel_price_spike"
  | "demand_drop"
  | "behavioural_relapse"
  | "currency_import"
  | "counterparty_closure"
  | "carbon_non_issuance"
  | "cybersecurity"
  | "regulatory"
  | "other";

export interface RiskRow {
  id: string;
  project_id: string;
  risk_type: RiskType;
  bearer: RiskBearer;
  severity: number;       // 1..5
  likelihood: number;     // 1..5
  description: string;
  mitigation: string | null;
  status: RiskStatus;
  next_review_at: string | null;
  closed_at: string | null;
  risk_score: number;
  risk_band: RiskBand;
  project_title: string;
  institution_id: string;
  institution_name: string;
  institution_county: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitoringLatest {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  clean_fuel_units: number;
  clean_fuel_unit: string | null;
  baseline_fuel_units: number;
  baseline_fuel_unit: string | null;
  meals_served: number | null;
  hours_operated: number | null;
  downtime_hours: number;
  cook_satisfaction_1to5: number | null;
  clean_fuel_share: number | null;
  project_title: string;
  institution_id: string;
  institution_name: string;
  institution_county: string | null;
}

export interface CarbonSummary {
  id: string;
  project_id: string;
  methodology: string | null;
  registry: string | null;
  registry_project_id: string | null;
  status: "design" | "validation" | "registered" | "issued" | "retired" | "rejected";
  baseline_emissions_tco2e: number;
  project_emissions_tco2e: number;
  estimated_annual_credits: number;
  total_estimated_tco2e: number;
  total_verified_tco2e: number;
  project_title: string;
  institution_name: string;
  institution_county: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// RISK SCORING
// ============================================================

/** Risk score = severity × likelihood, clamped to 1..25. */
export function riskScore(severity: number, likelihood: number): number {
  return clamp(Math.round(severity), 1, 5) * clamp(Math.round(likelihood), 1, 5);
}

/** Map a numeric score to a band matching the SQL view's CASE expression. */
export function riskBand(score: number): RiskBand {
  if (score >= 16) return "critical";
  if (score >= 9) return "high";
  if (score >= 4) return "medium";
  return "low";
}

const RISK_BAND_COLORS: Record<RiskBand, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-emerald-100 text-emerald-700",
};

export function riskBandColorClass(band: RiskBand): string {
  return RISK_BAND_COLORS[band];
}

// ============================================================
// MONITORING / RELAPSE
// ============================================================

export interface RelapseDetectionInput {
  cleanFuelUnits: number;
  baselineFuelUnits: number;
}

/** Clean-fuel share for a single reading. Returns null when total is 0. */
export function cleanFuelShare(reading: RelapseDetectionInput): number | null {
  const total = reading.cleanFuelUnits + reading.baselineFuelUnits;
  if (total === 0) return null;
  return reading.cleanFuelUnits / total;
}

/**
 * Detect behavioural relapse: at least two consecutive readings (most
 * recent first) where clean-fuel share falls below the threshold (default
 * 0.50). Mirrors the SQL trigger so the UI can pre-flag deteriorating
 * projects before the next reading lands.
 */
export function detectRelapse(
  readings: RelapseDetectionInput[],
  threshold = 0.50,
): boolean {
  if (readings.length < 2) return false;
  const recent = readings.slice(0, 2);
  return recent.every((r) => {
    const share = cleanFuelShare(r);
    // No-data periods (total 0) are NOT considered relapses.
    return share !== null && share < threshold;
  });
}

/** Aggregate downtime fraction over a window (0..1). */
export function downtimeFraction(downtimeHours: number, hoursOperated: number | null): number {
  if (!hoursOperated || hoursOperated <= 0) return 0;
  return clamp(downtimeHours / hoursOperated, 0, 1);
}

// ============================================================
// CARBON
// ============================================================

/**
 * Rough annual credits estimate from a single monitoring reading.
 * baselineFactor / projectFactor are kg CO2e per fuel unit.
 *
 * Formula: tCO2e/yr ≈ (baseline_units * baseline_factor − project_units * project_factor) × periods_per_year / 1000
 */
export function estimateAnnualCredits(args: {
  baselineUnits: number;
  baselineFactor: number;        // kg CO2e per baseline unit
  projectUnits: number;
  projectFactor: number;          // kg CO2e per project unit
  periodsPerYear: number;        // e.g. 12 if reading is monthly
}): number {
  const reductionPerPeriodKg =
    args.baselineUnits * args.baselineFactor - args.projectUnits * args.projectFactor;
  const reductionPerYearKg = reductionPerPeriodKg * args.periodsPerYear;
  return Math.max(reductionPerYearKg / 1000, 0);
}

/** Format a tCO2e value with thousands separators and 1 decimal. */
export function formatTco2e(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("en-KE", { maximumFractionDigits: 1 })} tCO₂e`;
}

// ============================================================
// HELPERS
// ============================================================

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

const RISK_TYPE_LABELS: Record<RiskType, string> = {
  equipment_defect: "Equipment defect",
  installation_failure: "Installation failure",
  fuel_price_spike: "Fuel price spike",
  demand_drop: "Demand drop",
  behavioural_relapse: "Behavioural relapse",
  currency_import: "Currency / import shock",
  counterparty_closure: "Counterparty closure",
  carbon_non_issuance: "Carbon non-issuance",
  cybersecurity: "Cybersecurity / data",
  regulatory: "Regulatory",
  other: "Other",
};

export function riskTypeLabel(t: RiskType): string {
  return RISK_TYPE_LABELS[t];
}

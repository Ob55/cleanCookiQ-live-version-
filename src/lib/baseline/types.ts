/**
 * Shared baseline shape backing the programme-detail "baseline" experience
 * (dataset cards, Overview charts, PDF report).
 *
 * A county baseline populates only the sections it actually has data for. The
 * ProgrammeDetail Overview / Institutions tabs and the report render each
 * section *only when present*, so a county whose survey lacks (e.g.) electricity
 * access simply omits those charts rather than showing fabricated figures.
 *
 * Taita Taveta (see ./taitaTaveta.ts) fills the full set (transcribed from a
 * published analyst workbook). Makueni (see ./makueni.ts) fills the survey-backed
 * subset (fuel, geography, level, firewood tonnage & cost) computed directly
 * from the extracted survey rows.
 */
import type { ProgrammeInstitution } from "@/hooks/usePrograms";

export type BaselineGroup = {
  /** Stable key: drives the card icon/accent and the drill-down state. */
  key: string;
  /** Display title used on the dataset cards and report. */
  title: string;
  /**
   * Institution-row field used to bucket the live roster into this group.
   * Defaults to "institution_type" (Taita: school/hotel/hospital/prison);
   * Makueni groups by "sub_type" (the boarding type: Day / Boarding / Day &
   * Boarding).
   */
  matchField?: keyof ProgrammeInstitution;
  /** Values of `matchField` that roll up into this group. */
  institutionTypes: string[];
  /** Survey record count for this group (equals the live DB count). */
  records: number;
  /** Primary cooking fuel, exact % as published/derived. */
  primaryFuel: string;
  /** Electricity access, exact % — optional (omitted when not surveyed). */
  electricityAccess?: string;
  /** Headline survey population metric. */
  keyPopulation: string;
  /** Data-collection funder / implementers — optional. */
  funders?: string;
  /** Optional extra stat line (e.g. Makueni firewood tonnage for the group). */
  extraStat?: { label: string; value: string };
  /** Source sheet / survey descriptor shown under the title. */
  source: string;
};

export type EnergyCategory = {
  category: string;
  nFuel: number;
  fuelTonnes: number;
  nElec: number;
  elecKwh: number;
};

export type AggregateCostRow = {
  institution: string;
  fuelMonthly: number;
  elecMonthly: number;
  combinedAnnual: number;
};

export type GeoDistribution = { subCounty: string; records: number }[];
export type FuelMixByCategory = {
  category: string; firewood: number; charcoal: number; lpg: number; other: number;
}[];
export type ElectricityAccessByCategory = { category: string; accessPct: number }[];

/** Makueni-specific: firewood demand & spend rolled up by sub-county. */
export type FirewoodBySubCounty = {
  subCounty: string; tonnesPerMonth: number; costKshPerMonth: number;
}[];
/** Makueni-specific: institution counts by education level. */
export type LevelDistribution = { level: string; records: number }[];

export type BaselineTotals = {
  institutions: number;
  population: number;
  firewoodTonnesPerMonth: number;
  costKshPerMonth: number;
  /** Free-text note on reporting coverage (survey non-response). */
  dataCompleteness?: string;
};

export type BaselineMeta = {
  county: string;
  title: string;
  subtitle: string;
  organisation: string;
  reference?: string;
  period: string;
  subCounties: string;
  programme: string;
  confidentiality: string;
  totalRecords: number;
  rawVariables?: number;
  /** Cover heading for the PDF report (defaults to a generic baseline title). */
  reportHeading?: string;
};

export type ProgrammeBaseline = {
  groups: BaselineGroup[];
  geoDistribution: GeoDistribution;
  /** Taita-only sections (optional). */
  fuelMixByCategory?: FuelMixByCategory;
  electricityAccessByCategory?: ElectricityAccessByCategory;
  energyByCategory?: EnergyCategory[];
  energyTotals?: { fuelTonnes: number; elecKwh: number };
  energyCoefficients?: { fuel: string; price: string; source: string }[];
  aggregateCost?: AggregateCostRow[];
  aggregateCostTotal?: {
    fuelMonthly: number; elecMonthly: number; combinedMonthly: number; combinedAnnual: number;
  };
  keyFindings?: { n: number; finding: string; detail: string }[];
  /** Makueni-specific sections (optional). */
  firewoodBySubCounty?: FirewoodBySubCounty;
  levelDistribution?: LevelDistribution;
  totals?: BaselineTotals;
  meta: BaselineMeta;
};

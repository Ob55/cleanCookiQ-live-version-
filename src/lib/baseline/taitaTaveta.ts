/**
 * Taita Taveta A2CT baseline — the authoritative figures from the analyst
 * deliverable "Baseline_Analysis_Companion_Workbook (13).xlsx" (Executive
 * Dashboard, Derived Energy Consumption, and Key Findings sheets).
 *
 * These are the exact, published statistics for the four A2CT source datasets
 * that back the 409 "IRENA – Taita Taveta" institutions. They are transcribed
 * verbatim here because most (electricity access %, reporting-restricted fuel
 * %, survey population metrics) are NOT stored per-institution in the DB — they
 * are analysis outputs. The per-dataset record counts, however, DO equal the
 * live DB counts (both derived from the same survey), so the Records shown on
 * screen come from the live query and will match these figures.
 *
 * Scope: only the "IRENA – Taita Taveta" programme has a baseline. Other
 * programmes fall back to the generic programme views — see getProgrammeBaseline().
 */

export type BaselineGroupKey = "learning" | "catering" | "health" | "correctional";

export type BaselineGroup = {
  key: BaselineGroupKey;
  /** Display title used on the dataset cards and report. */
  title: string;
  /** DB institution_type values that roll up into this group. */
  institutionTypes: string[];
  /** Workbook record count (equals the live DB count for this group). */
  records: number;
  /** Primary cooking fuel, exact % as published. */
  primaryFuel: string;
  /** Electricity access, exact % as published. */
  electricityAccess: string;
  /** Headline survey population metric. */
  keyPopulation: string;
  /** Data-collection funder / implementers. */
  funders: string;
  /** Companion workbook source sheet. */
  source: string;
};

/** Shared funder / implementer line across all four datasets. */
const FUNDERS = "UK-PACT (funder); SNV, Gamos East Africa, CCAK (implementers)";

export const DATASET_GROUPS: BaselineGroup[] = [
  {
    key: "learning",
    title: "Learning Institutions",
    institutionTypes: ["school"],
    records: 197,
    primaryFuel: "Firewood: 178/197 (90.4% of all; 95.7% of 186 reporting)",
    electricityAccess: "165/197 (83.76%)",
    keyPopulation: "59,913 students total (mean 304.1, median 190)",
    funders: FUNDERS,
    source: "Source - Learning",
  },
  {
    key: "catering",
    title: "Catering Outlets (SMEs)",
    institutionTypes: ["hotel", "restaurant"],
    records: 195,
    primaryFuel: "Charcoal: 114/195 (58.46%, derived from stove-type field)",
    electricityAccess: "128/195 (65.64%)",
    keyPopulation: "195 businesses; 102 female-owned (52.31%)",
    funders: FUNDERS,
    source: "Source - Catering",
  },
  {
    key: "health",
    title: "Health Facilities",
    institutionTypes: ["hospital"],
    records: 12,
    primaryFuel: "LPG: 8/10 reporting (80.0%); 8/12 of all facilities (66.67%)",
    electricityAccess: "12/12 (100.00%)",
    keyPopulation: "533 beds across 12 facilities",
    funders: FUNDERS,
    source: "Source - Health",
  },
  {
    key: "correctional",
    title: "Correctional Institutions",
    institutionTypes: ["prison"],
    records: 5,
    primaryFuel: "Firewood: 5/5 (100.00%)",
    electricityAccess: "5/5 (100.00%)",
    keyPopulation: "4,520 inmates total (fixed universe of all 5 county prisons)",
    funders: FUNDERS,
    source: "Source - Correctional",
  },
];

/**
 * Table 19 — estimated annual fuel and electricity consumption, by category
 * (Derived Energy Consumption sheet). Drives the Overview energy charts.
 */
export type EnergyCategory = {
  category: string;
  nFuel: number;
  fuelTonnes: number;
  nElec: number;
  elecKwh: number;
};

export const ENERGY_BY_CATEGORY: EnergyCategory[] = [
  { category: "Learning Institutions", nFuel: 128, fuelTonnes: 2585.21, nElec: 161, elecKwh: 717143.48 },
  { category: "Catering Outlets (SMEs)", nFuel: 170, fuelTonnes: 503.73, nElec: 124, elecKwh: 163174.43 },
  { category: "Health Facilities", nFuel: 10, fuelTonnes: 72.19, nElec: 11, elecKwh: 610695.65 },
  { category: "Correctional Institutions", nFuel: 5, fuelTonnes: 864.8, nElec: 5, elecKwh: 269217.39 },
];

export const ENERGY_TOTALS = { fuelTonnes: 4025.93, elecKwh: 1760230.96 };

/**
 * Figure 8 — geographic distribution by sub-county across all 409 records
 * (Cross-Cutting Analysis sheet, canonicalised sub-county names). Drives the
 * Overview pie chart.
 */
export const GEO_DISTRIBUTION: { subCounty: string; records: number }[] = [
  { subCounty: "Voi", records: 132 },
  { subCounty: "Taveta", records: 113 },
  { subCounty: "Mwatate", records: 92 },
  { subCounty: "Wundanyi", records: 65 },
  { subCounty: "Unspecified", records: 7 },
];

/** Table 18 — price coefficients used for the derived consumption estimates. */
export const ENERGY_COEFFICIENTS: { fuel: string; price: string; source: string }[] = [
  { fuel: "Firewood", price: "KES 7.50 / kg", source: "A2CT Survey Report, Table 3" },
  { fuel: "Charcoal", price: "KES 38.00 / kg", source: "A2CT Survey Report, Table 3" },
  { fuel: "LPG", price: "KES 112.50 / kg", source: "Kenya market refill rate, mid-2026" },
  { fuel: "Electricity", price: "KES 23.00 / kWh", source: "A2CT Survey Report, Table 3" },
];

/**
 * Table 20 — aggregate current annual operating cost across the 17 named
 * shortlisted candidate institutions (portfolio sizing). Report only.
 */
export type AggregateCostRow = {
  institution: string;
  fuelMonthly: number;
  elecMonthly: number;
  combinedAnnual: number;
};

export const AGGREGATE_COST: AggregateCostRow[] = [
  { institution: "St Mary's High School Lushangonyi", fuelMonthly: 160000, elecMonthly: 30000, combinedAnnual: 2280000 },
  { institution: "Mwaghogho Secondary School", fuelMonthly: 120000, elecMonthly: 17000, combinedAnnual: 1644000 },
  { institution: "Timbila Senior School", fuelMonthly: 50000, elecMonthly: 75000, combinedAnnual: 1500000 },
  { institution: "Mwangea Secondary School", fuelMonthly: 54000, elecMonthly: 40000, combinedAnnual: 1128000 },
  { institution: "St John High School", fuelMonthly: 60000, elecMonthly: 10500, combinedAnnual: 846000 },
  { institution: "County Hills Junior School", fuelMonthly: 40000, elecMonthly: 1500, combinedAnnual: 498000 },
  { institution: "Njoro Day Primary School", fuelMonthly: 18000, elecMonthly: 15000, combinedAnnual: 396000 },
  { institution: "Mwatate Primary", fuelMonthly: 10000, elecMonthly: 3000, combinedAnnual: 156000 },
  { institution: "County Hills ECDE", fuelMonthly: 30000, elecMonthly: 2000, combinedAnnual: 384000 },
  { institution: "Kitivo ECDE", fuelMonthly: 12000, elecMonthly: 0, combinedAnnual: 144000 },
  { institution: "Taita Taveta National Polytechnic", fuelMonthly: 23000, elecMonthly: 70000, combinedAnnual: 1116000 },
  { institution: "Mwanjila Vocational Training Centre", fuelMonthly: 72000, elecMonthly: 13650, combinedAnnual: 1027800 },
  { institution: "Moi Referral Hospital", fuelMonthly: 500000, elecMonthly: 0, combinedAnnual: 6000000 },
  { institution: "Mwatate Sub-County Hospital", fuelMonthly: 46000, elecMonthly: 40000, combinedAnnual: 1032000 },
  { institution: "Wesu Sub-County Hospital", fuelMonthly: 24000, elecMonthly: 300000, combinedAnnual: 3888000 },
  { institution: "Wundanyi Main Prison", fuelMonthly: 82500, elecMonthly: 19000, combinedAnnual: 1218000 },
  { institution: "Manyani Prison", fuelMonthly: 300000, elecMonthly: 300000, combinedAnnual: 7200000 },
];

export const AGGREGATE_COST_TOTAL = {
  fuelMonthly: 1601500,
  elecMonthly: 936650,
  combinedMonthly: 2538150,
  combinedAnnual: 30457800,
};

/** Key findings requiring field attention (Executive Dashboard). Report only. */
export const KEY_FINDINGS: { n: number; finding: string; detail: string }[] = [
  {
    n: 1,
    finding: "Learning institution electricity connection phase (% of 165 electrified)",
    detail: "Single-phase 58.18% (96/165); Double phase 12.73% (21/165); \"I don't know\" 16.36% (27/165); Other 12.12% (20/165). Connection phase caps how many electric pressure cookers a site can run simultaneously.",
  },
  {
    n: 2,
    finding: "Learning institution barrier: cost",
    detail: "High cost is cited by 191 of 197 institutions (96.95%). Maintenance 39 (19.80%), Space/infrastructure 26 (13.20%), Lack of knowledge 19 (9.64%), Cultural norms 12 (6.09%). The binding constraint is capital cost, not awareness — validating the ESA financing approach.",
  },
  {
    n: 3,
    finding: "Health facility maximum monthly electricity bill",
    detail: "KES 380,000 (Tsavo Comprehensive Hospital, Voi); Wesu Sub-County Hospital's KES 300,000 is the second-highest. Sets the upper bound for electricity cost benchmarking in this segment.",
  },
  {
    n: 4,
    finding: "Catering outlet primary fuel monthly cost",
    detail: "Captured for 175 of 195 outlets (89.7%); mean KES 5,235.71, median KES 2,500, range KES 0–64,000. Tier 2 metric — reduces the supplementary field-collection burden for this segment.",
  },
  {
    n: 5,
    finding: "Learning institution fuel-expenditure narrative classification",
    detail: "Of 197: 120 (60.91%) clean numeric, 8 (4.06%) recoverable numeric, 40 (20.30%) genuine zero-cost/in-kind, 2 (1.02%) anomalies, 27 (13.71%) blank. Distinguishes genuine zero-cash-cost institutions (a distinct ESA case) from non-response.",
  },
  {
    n: 6,
    finding: "Sub-county name standardisation",
    detail: "Of 409 records: Voi 132 (32.3%), Taveta 113 (27.6%), Mwatate 92 (22.5%), Wundanyi 65 (15.9%), unmapped 7 (1.7%). The 7 unmapped records need field confirmation before geographic analysis.",
  },
];

export const BASELINE_META = {
  county: "Taita Taveta County",
  title: "Taita Taveta County A2CT Baseline Data Analysis",
  subtitle: "IRENA Institutional and Commercial Clean Cooking Market Strengthening Project in Kenya",
  organisation: "Ignis Innovation Limited",
  reference: "IRENA Reference: PR/2026/00239 | PO/2026/00749",
  period: "Jan–Mar 2026",
  subCounties: "Voi, Taveta, Mwatate, Wundanyi",
  programme: "A2CT — Accelerating County Cooking Transitions",
  confidentiality: "CONFIDENTIAL",
  totalRecords: 409,
  rawVariables: 1262,
};

export type TaitaTavetaBaseline = {
  groups: BaselineGroup[];
  geoDistribution: typeof GEO_DISTRIBUTION;
  energyByCategory: EnergyCategory[];
  energyTotals: typeof ENERGY_TOTALS;
  energyCoefficients: typeof ENERGY_COEFFICIENTS;
  aggregateCost: AggregateCostRow[];
  aggregateCostTotal: typeof AGGREGATE_COST_TOTAL;
  keyFindings: typeof KEY_FINDINGS;
  meta: typeof BASELINE_META;
};

const TAITA_TAVETA_BASELINE: TaitaTavetaBaseline = {
  groups: DATASET_GROUPS,
  geoDistribution: GEO_DISTRIBUTION,
  energyByCategory: ENERGY_BY_CATEGORY,
  energyTotals: ENERGY_TOTALS,
  energyCoefficients: ENERGY_COEFFICIENTS,
  aggregateCost: AGGREGATE_COST,
  aggregateCostTotal: AGGREGATE_COST_TOTAL,
  keyFindings: KEY_FINDINGS,
  meta: BASELINE_META,
};

/**
 * Returns the baseline for a programme by name, or null if none exists.
 * Only the IRENA – Taita Taveta programme (seeded as "IRENA – Taita Taveta")
 * has a baseline; the match is tolerant of dash/spacing variants.
 */
export function getProgrammeBaseline(name: string | null | undefined): TaitaTavetaBaseline | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("irena") && n.includes("taita")) return TAITA_TAVETA_BASELINE;
  return null;
}

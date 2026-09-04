/**
 * Makueni County institutional-cooking baseline.
 *
 * Unlike Taita Taveta (transcribed from a published analyst workbook), these
 * figures are computed directly from the county survey of 908 institutions
 * (see scripts/extract_makueni_survey.py → scripts/data/makueni_institutions.json,
 * aggregated by scripts/aggregate). The survey captures fuel type, school level,
 * boarding type, sub-county, population, and firewood quantity & cost — but NOT
 * electricity access or GPS — so this baseline populates only the survey-backed
 * sections of ProgrammeBaseline. The Overview/Institutions tabs render each
 * section only when present, so the electricity/energy charts (Taita-only)
 * simply don't appear for Makueni.
 *
 * Dataset cards group by BOARDING TYPE (matchField "sub_type" — Day / Boarding /
 * Day & Boarding), which is where cooking load differs most for schools.
 *
 * Scope: matched by programme name containing "makueni" — see matchesMakueni()
 * and the resolver in ./index.ts.
 */
import type { BaselineGroup, ProgrammeBaseline } from "@/lib/baseline/types";

/**
 * Four survey fields are reported by most but not all institutions (non-response
 * on population / firewood qty / cost). Totals below sum the reported values.
 */
const COMPLETENESS =
  "Population reported by 896 of 908 institutions; firewood quantity & cost by 843.";

export const MAKUENI_GROUPS: BaselineGroup[] = [
  {
    key: "day",
    title: "Day Institutions",
    matchField: "sub_type",
    institutionTypes: ["Day"],
    records: 610,
    primaryFuel: "Firewood: 578/610 (94.8%); remainder no-cooking / mixed",
    keyPopulation: "114,093 learners enrolled",
    extraStat: { label: "Firewood demand", value: "1,385 tonnes / month" },
    source: "Makueni survey — Day",
  },
  {
    key: "boarding",
    title: "Boarding Institutions",
    matchField: "sub_type",
    institutionTypes: ["Boarding"],
    records: 64,
    primaryFuel: "Firewood: 63/64 (98.4%); 1 LPG",
    keyPopulation: "31,902 learners resident",
    extraStat: { label: "Firewood demand", value: "1,062 tonnes / month" },
    source: "Makueni survey — Boarding",
  },
  {
    key: "day_boarding",
    title: "Day & Boarding Institutions",
    matchField: "sub_type",
    institutionTypes: ["Day & Boarding"],
    records: 234,
    primaryFuel: "Firewood: 233/234 (99.6%)",
    keyPopulation: "64,865 learners enrolled",
    extraStat: { label: "Firewood demand", value: "1,427 tonnes / month" },
    source: "Makueni survey — Day & Boarding",
  },
];

/** Geographic distribution by sub-county across all 908 records. */
export const MAKUENI_GEO: ProgrammeBaseline["geoDistribution"] = [
  { subCounty: "Makueni", records: 290 },
  { subCounty: "Mbooni", records: 233 },
  { subCounty: "Kibwezi West", records: 116 },
  { subCounty: "Kilome", records: 111 },
  { subCounty: "Kaiti", records: 83 },
  { subCounty: "Kibwezi East", records: 75 },
];

/** Institution counts by education level. */
export const MAKUENI_LEVELS: ProgrammeBaseline["levelDistribution"] = [
  { level: "Primary / Comprehensive", records: 541 },
  { level: "Secondary", records: 327 },
  { level: "Tertiary / TVET", records: 40 },
];

/** Firewood demand & spend rolled up by sub-county (reported values). */
export const MAKUENI_FIREWOOD_BY_SUBCOUNTY: ProgrammeBaseline["firewoodBySubCounty"] = [
  { subCounty: "Makueni", tonnesPerMonth: 1182.5, costKshPerMonth: 5087620 },
  { subCounty: "Mbooni", tonnesPerMonth: 772.8, costKshPerMonth: 3954530 },
  { subCounty: "Kibwezi West", tonnesPerMonth: 568.6, costKshPerMonth: 2776400 },
  { subCounty: "Kilome", tonnesPerMonth: 540.2, costKshPerMonth: 2898700 },
  { subCounty: "Kibwezi East", tonnesPerMonth: 436.1, costKshPerMonth: 1686450 },
  { subCounty: "Kaiti", tonnesPerMonth: 373.7, costKshPerMonth: 2257600 },
];

export const MAKUENI_BASELINE: ProgrammeBaseline = {
  groups: MAKUENI_GROUPS,
  geoDistribution: MAKUENI_GEO,
  levelDistribution: MAKUENI_LEVELS,
  firewoodBySubCounty: MAKUENI_FIREWOOD_BY_SUBCOUNTY,
  totals: {
    institutions: 908,
    population: 210860,
    firewoodTonnesPerMonth: 3873.9,
    costKshPerMonth: 18661300,
    dataCompleteness: COMPLETENESS,
  },
  meta: {
    county: "Makueni County",
    title: "Makueni County Institutional Cooking Baseline",
    subtitle:
      "Survey of institutional cooking energy use across Makueni County's six sub-counties",
    organisation: "Ignis Innovation Limited",
    period: "2026",
    subCounties: "Makueni, Mbooni, Kibwezi West, Kibwezi East, Kilome, Kaiti",
    programme: "Makueni County Cooking Baseline",
    confidentiality: "CONFIDENTIAL",
    totalRecords: 908,
    reportHeading: "Institutional Cooking Baseline",
  },
};

/** Matches the "Makueni County Cooking Baseline" programme by name. */
export function matchesMakueni(name: string | null | undefined): boolean {
  return !!name && name.toLowerCase().includes("makueni");
}

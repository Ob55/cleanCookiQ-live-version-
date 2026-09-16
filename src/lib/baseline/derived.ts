/**
 * Derived programme baseline — computed live from a programme's own institution
 * rows, for programmes without a hand-authored static baseline (e.g. any project
 * created via the "New from file" upload).
 *
 * A static baseline (see ./makueni.ts, ./taitaTaveta.ts) carries survey-specific
 * figures that can't be inferred from a bare institution sheet — energy tonnage,
 * funder names, published electricity-access %. So this derives only the sections
 * that ARE honestly computable from the rows: the dataset cards (by institution
 * type), the geographic-distribution pie (by sub-county), and the fuel-mix bars.
 * Every Overview/Institutions chart renders only when its section is present, so
 * the non-derivable charts simply don't appear — same convention Makueni uses.
 *
 * The resolver (./index.ts) matches static baselines by name first; ProgrammeDetail
 * falls back to deriveBaseline() only when none match.
 */
import type { BaselineGroup, ProgrammeBaseline } from "@/lib/baseline/types";
import type { ProgrammeInstitution } from "@/hooks/usePrograms";

// Fuel-mix buckets match FUEL_MIX_COLORS in ProgrammeDetail (firewood, charcoal,
// lpg, other). Every other current_fuel enum value (biogas, electric, unset)
// rolls into "other".
type FuelBucket = "firewood" | "charcoal" | "lpg" | "other";
const FUEL_BUCKET = (fuel: string | null | undefined): FuelBucket =>
  fuel === "firewood" || fuel === "charcoal" || fuel === "lpg" ? fuel : "other";

const FUEL_LABEL: Record<FuelBucket, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG", other: "Other",
};

// "faith_based" → "Faith Based"; a plain readable label for institution types.
const humanizeType = (t: string): string =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const headcount = (i: ProgrammeInstitution): number =>
  Number(i.number_of_students ?? i.number_of_staff) || 0;

/** Most-common value in a list, with its count — or null for an empty list. */
function topEntry(values: string[]): { value: string; count: number } | null {
  const tally = new Map<string, number>();
  for (const v of values) tally.set(v, (tally.get(v) ?? 0) + 1);
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of tally) {
    if (!best || count > best.count) best = { value, count };
  }
  return best;
}

/**
 * Build a ProgrammeBaseline from a programme's institutions, or null when there
 * are none (so an empty programme falls back to the generic Overview shell).
 */
export function deriveBaseline(
  institutions: ProgrammeInstitution[],
): ProgrammeBaseline | null {
  if (!institutions.length) return null;
  const total = institutions.length;

  // Dataset cards + fuel-mix: one group per distinct institution_type present,
  // largest first (so the biggest cohort leads the grid).
  const byType = new Map<string, ProgrammeInstitution[]>();
  for (const i of institutions) {
    const t = String(i.institution_type || "other");
    (byType.get(t) ?? byType.set(t, []).get(t)!).push(i);
  }
  const typeEntries = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

  const groups: BaselineGroup[] = typeEntries.map(([type, rows]) => {
    const top = topEntry(rows.map((r) => FUEL_BUCKET(r.current_fuel as string)));
    const people = rows.reduce((s, r) => s + headcount(r), 0);
    const primaryFuel = top
      ? `${FUEL_LABEL[top.value as FuelBucket]}: ${top.count}/${rows.length} (${Math.round((top.count / rows.length) * 100)}%)`
      : "Not recorded";
    return {
      key: type,
      title: humanizeType(type),
      matchField: "institution_type",
      institutionTypes: [type],
      records: rows.length,
      primaryFuel,
      keyPopulation: people ? `${people.toLocaleString()} people` : "Not recorded",
      source: "Uploaded dataset",
    };
  });

  // Fuel mix by category (% of each type-group), same shape the stacked bar wants.
  const fuelMixByCategory = typeEntries.map(([type, rows]) => {
    const share = (bucket: FuelBucket) =>
      (rows.filter((r) => FUEL_BUCKET(r.current_fuel as string) === bucket).length / rows.length) * 100;
    return {
      category: humanizeType(type),
      firewood: share("firewood"),
      charcoal: share("charcoal"),
      lpg: share("lpg"),
      other: share("other"),
    };
  });

  // Geographic distribution by sub-county (fallback county), largest first.
  const byPlace = new Map<string, number>();
  for (const i of institutions) {
    const place = (i.sub_county || i.county || "Unspecified").trim() || "Unspecified";
    byPlace.set(place, (byPlace.get(place) ?? 0) + 1);
  }
  const geoDistribution = [...byPlace.entries()]
    .map(([subCounty, records]) => ({ subCounty, records }))
    .sort((a, b) => b.records - a.records);

  const topCounty = topEntry(
    institutions.map((i) => (i.county || "").trim()).filter(Boolean),
  );

  return {
    groups,
    geoDistribution,
    fuelMixByCategory,
    meta: {
      county: topCounty?.value ?? "Multiple counties",
      title: "Programme institution baseline",
      subtitle: "Computed from this programme's uploaded institutions",
      organisation: "Ignis Innovation Limited",
      period: "live upload",
      subCounties: `${byPlace.size} sub-count${byPlace.size === 1 ? "y" : "ies"}`,
      programme: "",
      confidentiality: "CONFIDENTIAL",
      totalRecords: total,
      derived: true,
    },
  };
}

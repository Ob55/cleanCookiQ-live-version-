import { describe, it, expect } from "vitest";
import { deriveBaseline } from "@/lib/baseline/derived";
import type { ProgrammeInstitution } from "@/hooks/usePrograms";

// Minimal factory: only the fields deriveBaseline reads, cast to the full row
// type (the rest are irrelevant to the derivation).
function inst(over: Partial<ProgrammeInstitution>): ProgrammeInstitution {
  return {
    institution_type: "school",
    current_fuel: "firewood",
    county: "Kitui",
    sub_county: "Kitui Central",
    number_of_students: 100,
    number_of_staff: null,
    ...over,
  } as ProgrammeInstitution;
}

describe("deriveBaseline", () => {
  it("returns null for an empty programme", () => {
    expect(deriveBaseline([])).toBeNull();
  });

  it("marks the baseline as derived and counts records", () => {
    const b = deriveBaseline([inst({}), inst({})])!;
    expect(b.meta.derived).toBe(true);
    expect(b.meta.totalRecords).toBe(2);
  });

  it("groups by institution_type, largest first, with a matchField", () => {
    const b = deriveBaseline([
      inst({ institution_type: "school" }),
      inst({ institution_type: "school" }),
      inst({ institution_type: "hospital" }),
    ])!;
    expect(b.groups.map((g) => g.key)).toEqual(["school", "hospital"]);
    expect(b.groups[0].records).toBe(2);
    expect(b.groups[0].matchField).toBe("institution_type");
    // institutionTypes must round-trip the raw type so the drill-down filter matches.
    expect(b.groups[0].institutionTypes).toEqual(["school"]);
  });

  it("humanises multi-word types for display", () => {
    const b = deriveBaseline([inst({ institution_type: "faith_based" })])!;
    expect(b.groups[0].title).toBe("Faith Based");
  });

  it("reports the group's dominant fuel", () => {
    const b = deriveBaseline([
      inst({ institution_type: "hotel", current_fuel: "lpg" }),
      inst({ institution_type: "hotel", current_fuel: "lpg" }),
      inst({ institution_type: "hotel", current_fuel: "firewood" }),
    ])!;
    expect(b.groups[0].primaryFuel).toContain("LPG");
    expect(b.groups[0].primaryFuel).toContain("2/3");
  });

  it("computes fuel mix per category as percentages summing to ~100", () => {
    const b = deriveBaseline([
      inst({ current_fuel: "firewood" }),
      inst({ current_fuel: "lpg" }),
      inst({ current_fuel: "biogas" }), // → 'other' bucket
      inst({ current_fuel: "charcoal" }),
    ])!;
    const mix = b.fuelMixByCategory![0];
    expect(Math.round(mix.firewood + mix.charcoal + mix.lpg + mix.other)).toBe(100);
    expect(mix.other).toBeCloseTo(25); // biogas folds into "other"
  });

  it("distributes geography by sub-county, largest first, county fallback", () => {
    const b = deriveBaseline([
      inst({ sub_county: "A" }),
      inst({ sub_county: "A" }),
      inst({ sub_county: null, county: "B" }),
    ])!;
    expect(b.geoDistribution[0]).toEqual({ subCounty: "A", records: 2 });
    expect(b.geoDistribution.find((g) => g.subCounty === "B")?.records).toBe(1);
  });

  it("picks the dominant county for meta", () => {
    const b = deriveBaseline([
      inst({ county: "Kitui" }),
      inst({ county: "Kitui" }),
      inst({ county: "Makueni" }),
    ])!;
    expect(b.meta.county).toBe("Kitui");
  });
});

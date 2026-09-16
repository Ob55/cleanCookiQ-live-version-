import { describe, it, expect } from "vitest";
import { read, utils, write } from "xlsx";
import { parseInstitutionSheet } from "@/lib/excelImport";
import { missingFields, toInstitutionInserts } from "@/lib/programmeImport";

// End-to-end test of the "New from file" upload pipeline, exercising the exact
// path the dialog runs: build a workbook → serialise to an array buffer → read
// it back → sheet_to_json → parseInstitutionSheet → toInstitutionInserts.
// Uses deliberately messy, real-world-ish headers/values to prove the auto-mapper
// and the programme-attach/county-fallback behave.

function sheetToInserts(aoa: unknown[][], programmeId = "prog-1", createdBy = "user-1") {
  // Serialise + re-read so we test the real xlsx round-trip, not just the AOA.
  const ws = utils.aoa_to_sheet(aoa);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "institutions");
  const buf = write(wb, { type: "array", bookType: "xlsx" });
  const back = read(buf, { type: "array" });
  const rows = utils.sheet_to_json<unknown[]>(back.Sheets[back.SheetNames[0]], { header: 1, defval: null });
  const parsed = parseInstitutionSheet(rows);
  return { parsed, inserts: toInstitutionInserts(parsed.rows, { programmeId, createdBy }) };
}

describe("New from file upload pipeline", () => {
  it("parses a well-formed sheet and attaches programme + creator to every row", () => {
    const { parsed, inserts } = sheetToInserts([
      ["School Name", "County", "Sub County", "Type", "Current Fuel", "Enrolment", "Meals per day"],
      ["Green Valley Secondary", "Kitui", "Kitui Central", "Secondary School", "Firewood", "820", "2400"],
      ["St Mary Hospital", "Kitui", "Mwingi", "Hospital", "LPG", "", "600"],
    ]);

    expect(parsed.rows).toHaveLength(2);
    expect(inserts).toHaveLength(2);
    expect(inserts.every((i) => i.programme_id === "prog-1" && i.created_by === "user-1")).toBe(true);

    // Column auto-mapping + enum normalisation ("Secondary School" → school, "LPG" → lpg).
    expect(inserts[0]).toMatchObject({
      name: "Green Valley Secondary",
      county: "Kitui",
      sub_county: "Kitui Central",
      institution_type: "school",
      current_fuel: "firewood",
      number_of_students: 820,
      meals_per_day: 2400,
    });
    expect(inserts[1]).toMatchObject({ institution_type: "hospital", current_fuel: "lpg" });
  });

  it("falls back to 'Unspecified' when a row has no county (NOT NULL guard)", () => {
    const { inserts } = sheetToInserts([
      ["name", "county"],
      ["No County School", ""],
      ["Blank County School", null],
    ]);
    expect(inserts).toHaveLength(2);
    expect(inserts.every((i) => i.county === "Unspecified")).toBe(true);
  });

  it("skips rows with no name and reports them, without dropping valid rows", () => {
    const { parsed, inserts } = sheetToInserts([
      ["name", "county"],
      ["Real School", "Machakos"],
      ["", "Machakos"], // no name → skipped
    ]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].name).toBe("Real School");
    expect(parsed.skipped.length).toBe(1);
  });

  it("normalises unknown type/fuel to 'other' rather than failing", () => {
    const { inserts } = sheetToInserts([
      ["name", "county", "institution_type", "current_fuel"],
      ["Odd Place", "Nairobi", "spaceship hangar", "plasma"],
    ]);
    expect(inserts[0].institution_type).toBe("other");
    expect(inserts[0].current_fuel).toBe("other");
  });
});

describe("missingFields", () => {
  const complete = {
    latitude: -1.2,
    longitude: 36.8,
    county: "Nairobi",
    institution_type: "school",
    current_fuel: "firewood",
    number_of_students: 500,
    meals_per_day: 1000,
  };

  it("returns nothing when every category is present", () => {
    expect(missingFields(complete)).toEqual([]);
  });

  it("flags missing GPS when either coordinate is null", () => {
    expect(missingFields({ ...complete, latitude: null })).toContain("GPS");
    expect(missingFields({ ...complete, longitude: null })).toContain("GPS");
  });

  it("flags county when empty or 'Unspecified'", () => {
    expect(missingFields({ ...complete, county: "" })).toContain("county");
    expect(missingFields({ ...complete, county: "Unspecified" })).toContain("county");
  });

  it("flags type/fuel when missing or normalised to 'other'", () => {
    expect(missingFields({ ...complete, institution_type: "other" })).toContain("type");
    expect(missingFields({ ...complete, current_fuel: null })).toContain("fuel");
  });

  it("flags size only when both enrolment and meals are absent", () => {
    expect(missingFields({ ...complete, number_of_students: null })).not.toContain("size");
    expect(
      missingFields({ ...complete, number_of_students: null, meals_per_day: null }),
    ).toContain("size");
  });

  it("reports every missing category at once", () => {
    expect(
      missingFields({
        latitude: null, longitude: null, county: null,
        institution_type: null, current_fuel: null,
        number_of_students: null, meals_per_day: null,
      }),
    ).toEqual(["GPS", "county", "type", "fuel", "size"]);
  });
});

describe("toInstitutionInserts flagging + coord enrichment", () => {
  it("flags rows with missing data and records the reason in notes", () => {
    const { inserts } = sheetToInserts([
      ["name", "county", "institution_type", "current_fuel", "enrolment", "meals per day"],
      ["Complete School", "Kitui", "Secondary School", "firewood", "500", "1200"],
      ["Sparse School", "", "", "", "", ""],
    ]);
    // "Complete School" still lacks GPS (no lat/lng columns), so it's flagged too —
    // but only for GPS, not county/type/fuel/size.
    expect(inserts[0].verification_status).toBe("flagged");
    expect(inserts[0].notes).toContain("GPS");
    expect(inserts[0].notes).not.toContain("county");

    expect(inserts[1].verification_status).toBe("flagged");
    expect(inserts[1].notes).toContain("Data flagged");
    expect(inserts[1].notes).toContain("county");
  });

  it("marks a fully-populated row unverified (not flagged)", () => {
    const rows = [
      {
        rowIndex: 2,
        warnings: [],
        institution: {
          name: "Full School", county: "Nairobi", institution_type: "school",
          current_fuel: "lpg", number_of_students: 400, meals_per_day: 800,
          latitude: -1.2, longitude: 36.8,
        },
      },
    ];
    const [row] = toInstitutionInserts(rows as never, { programmeId: "p1", createdBy: "u1" });
    expect(row.verification_status).toBe("unverified");
    expect(row.notes).toBeNull();
  });

  it("fills coordinates from geocoding results keyed by rowIndex", () => {
    const rows = [
      {
        rowIndex: 5,
        warnings: [],
        institution: { name: "Geo School", county: "Machakos", latitude: null, longitude: null },
      },
    ];
    const [row] = toInstitutionInserts(rows as never, {
      programmeId: "p1",
      createdBy: "u1",
      coordsByRowIndex: { 5: { latitude: -1.5, longitude: 37.2 } },
    });
    expect(row.latitude).toBe(-1.5);
    expect(row.longitude).toBe(37.2);
    // GPS resolved, so it should no longer be flagged for GPS.
    expect(row.notes ?? "").not.toContain("GPS");
  });

  it("prefers sheet coordinates over geocoding when both exist", () => {
    const rows = [
      {
        rowIndex: 1,
        warnings: [],
        institution: { name: "Has Coords", county: "Nairobi", latitude: -1.1, longitude: 36.9 },
      },
    ];
    const [row] = toInstitutionInserts(rows as never, {
      programmeId: "p1",
      createdBy: "u1",
      coordsByRowIndex: { 1: { latitude: 0, longitude: 0 } },
    });
    expect(row.latitude).toBe(-1.1);
    expect(row.longitude).toBe(36.9);
  });
});

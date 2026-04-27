/**
 * Generic Excel → institutions importer.
 *
 * Reads the first sheet's header row, fuzzy-matches columns by canonical
 * names, and produces a list of `Partial<institutions>` rows ready for
 * Supabase upsert. No KoBo-specific assumptions — any spreadsheet with
 * recognisable column names works.
 */

export interface ImportedInstitution {
  name: string;
  institution_type?: string | null;
  county?: string | null;
  sub_county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  current_fuel?: string | null;
  meals_per_day?: number | null;
  number_of_students?: number | null;
  number_of_staff?: number | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
}

export interface ImportRow {
  rowIndex: number;          // 1-based, accounting for header row
  institution: ImportedInstitution;
  warnings: string[];
}

export interface ImportSkip {
  rowIndex: number;
  reason: string;
}

export interface ImportResult {
  rows: ImportRow[];
  skipped: ImportSkip[];
  unmappedHeaders: string[];
}

/**
 * Canonical column name → array of accepted aliases (lower-case, alphanumeric).
 * Match is done after normalising header text by lowercasing and stripping
 * non-alphanumerics, so "Institution Name" matches "institution_name".
 */
const COLUMN_ALIASES: Record<keyof ImportedInstitution, string[]> = {
  name: ["name", "institutionname", "schoolname", "facilityname", "site"],
  institution_type: ["type", "institutiontype", "category", "facilitytype"],
  county: ["county"],
  sub_county: ["subcounty", "subc"],
  latitude: ["lat", "latitude", "ycoord"],
  longitude: ["lng", "long", "longitude", "lon", "xcoord"],
  current_fuel: ["fuel", "currentfuel", "primaryfuel", "cookingfuel"],
  meals_per_day: ["meals", "mealsperday", "dailymeals", "mealsday"],
  number_of_students: ["students", "numberofstudents", "studentcount", "enrolment", "enrollment", "pupils"],
  number_of_staff: ["staff", "numberofstaff", "staffcount"],
  contact_person: ["contact", "contactperson", "contactname", "primarycontact", "headteacher"],
  contact_phone: ["phone", "telephone", "contactphone", "mobile"],
  contact_email: ["email", "contactemail"],
  notes: ["notes", "comments", "remarks"],
};

const ALLOWED_INSTITUTION_TYPES = new Set([
  "school", "hospital", "prison", "factory", "hotel", "restaurant", "faith_based", "other",
]);

const ALLOWED_FUELS = new Set([
  "firewood", "charcoal", "lpg", "biogas", "electric", "other",
]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normaliseInstitutionType(raw: string | null): { value: string | null; warning?: string } {
  if (!raw) return { value: null };
  const candidate = norm(raw).replace(/^[^a-z]+/, "");
  // Friendly mappings
  const map: Record<string, string> = {
    school: "school", primary: "school", secondary: "school", college: "school", university: "school",
    hospital: "hospital", clinic: "hospital", health: "hospital", dispensary: "hospital",
    prison: "prison",
    hotel: "hotel", lodge: "hotel", resort: "hotel",
    restaurant: "restaurant", canteen: "restaurant", caterer: "restaurant",
    factory: "factory", plant: "factory",
    church: "faith_based", mosque: "faith_based", temple: "faith_based", faith: "faith_based", religious: "faith_based",
  };
  for (const [key, val] of Object.entries(map)) {
    if (candidate.includes(key)) return { value: val };
  }
  if (ALLOWED_INSTITUTION_TYPES.has(candidate)) return { value: candidate };
  return { value: "other", warning: `Unknown institution type "${raw}"; using "other"` };
}

function normaliseFuel(raw: string | null): { value: string | null; warning?: string } {
  if (!raw) return { value: null };
  const candidate = norm(raw);
  const map: Record<string, string> = {
    firewood: "firewood", wood: "firewood", logs: "firewood",
    charcoal: "charcoal", jiko: "charcoal",
    lpg: "lpg", gas: "lpg", propane: "lpg", butane: "lpg", cooking_gas: "lpg",
    biogas: "biogas", methane: "biogas",
    electric: "electric", electricity: "electric", induction: "electric", power: "electric",
  };
  for (const [key, val] of Object.entries(map)) {
    if (candidate.includes(key)) return { value: val };
  }
  if (ALLOWED_FUELS.has(candidate)) return { value: candidate };
  return { value: "other", warning: `Unknown fuel "${raw}"; using "other"` };
}

/**
 * Parse a sheet AOA (array-of-arrays where row 0 is the header) into
 * institutions ready to upsert. Pure — easy to unit-test.
 */
export function parseInstitutionSheet(aoa: unknown[][]): ImportResult {
  const rows: ImportRow[] = [];
  const skipped: ImportSkip[] = [];
  const unmappedHeaders: string[] = [];

  if (aoa.length < 2) {
    return { rows, skipped, unmappedHeaders };
  }

  const headerRow = aoa[0].map((h) => (h == null ? "" : String(h)));

  // header column index → canonical field
  const colMap: Map<number, keyof ImportedInstitution> = new Map();
  headerRow.forEach((header, i) => {
    if (!header.trim()) return;
    const n = norm(header);
    let matched = false;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as Array<[keyof ImportedInstitution, string[]]>) {
      if (aliases.some((a) => a === n || n.includes(a))) {
        if (!Array.from(colMap.values()).includes(field)) {
          colMap.set(i, field);
          matched = true;
          break;
        }
      }
    }
    if (!matched) unmappedHeaders.push(header);
  });

  // Verify required field is mapped
  const hasName = Array.from(colMap.values()).includes("name");
  if (!hasName) {
    skipped.push({
      rowIndex: 1,
      reason: "Could not find a 'name' column. Expected one of: name, institution_name, school_name, facility_name, site.",
    });
    return { rows, skipped, unmappedHeaders };
  }

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

    const rec: Partial<ImportedInstitution> = {};
    const warnings: string[] = [];
    colMap.forEach((field, colIdx) => {
      const cell = row[colIdx];
      switch (field) {
        case "name":
        case "county":
        case "sub_county":
        case "contact_person":
        case "contact_phone":
        case "contact_email":
        case "notes":
          rec[field] = asString(cell);
          break;
        case "institution_type": {
          const { value, warning } = normaliseInstitutionType(asString(cell));
          rec.institution_type = value;
          if (warning) warnings.push(warning);
          break;
        }
        case "current_fuel": {
          const { value, warning } = normaliseFuel(asString(cell));
          rec.current_fuel = value;
          if (warning) warnings.push(warning);
          break;
        }
        case "latitude":
        case "longitude":
        case "meals_per_day":
        case "number_of_students":
        case "number_of_staff":
          rec[field] = asNumber(cell);
          break;
      }
    });

    const name = rec.name?.trim();
    if (!name) {
      skipped.push({ rowIndex: r + 1, reason: "Missing institution name" });
      continue;
    }

    rows.push({
      rowIndex: r + 1,
      institution: rec as ImportedInstitution,
      warnings,
    });
  }

  return { rows, skipped, unmappedHeaders };
}

export function exampleTemplateRows(): unknown[][] {
  return [
    ["name", "county", "institution_type", "current_fuel", "meals_per_day", "number_of_students", "contact_person", "contact_phone", "contact_email"],
    ["St Mary's Primary School", "Kiambu", "school", "firewood", 600, 480, "Jane Wanjiru", "+254700000001", "head@stmarys.example"],
    ["Mater Hospital — Eastleigh", "Nairobi", "hospital", "lpg", 1200, null, "Dr Juma", "+254700000002", "admin@mater-eastleigh.example"],
  ];
}

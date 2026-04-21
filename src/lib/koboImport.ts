// Shared KoBo → institutions transform.
// Mirrors scripts/import_kobo_institutions.py — keep both in sync.

import type { Database } from "@/integrations/supabase/types";

type InstitutionInsert = Database["public"]["Tables"]["institutions"]["Insert"];
type InstitutionType = Database["public"]["Enums"]["institution_type"];
type FuelType = Database["public"]["Enums"]["fuel_type"];

// 1-based column indices in the KoBo export.
export const KOBO_COL = {
  lat: 6, lon: 7,
  inst_type: 13, name: 14, school_class: 15,
  county: 16,
  subcounty_a: 17, subcounty_b: 18, subcounty_c: 19, subcounty_d: 20,
  phone: 23,
  students: 24, staff: 28,
  day_board: 35, has_kitchen: 36,
  meals_per_day: 38, meal_cost: 40,
  main_fuel: 67, fuel_sourcing: 68,
  firewood_kg_day: 55, charcoal_kg_day: 56, lpg_kg_day: 63,
  electricity_kwh_month: 64, biomass_pellets_kg_day: 60,
  grid: 98, outages: 100,
  kobo_id: 164, kobo_uuid: 165,
} as const;

// KES — update when local rates move. Matches scripts/import_kobo_institutions.py.
export const FUEL_PRICE_KES: Record<string, number> = {
  firewood: 25,        // per kg
  charcoal: 55,        // per kg
  lpg: 260,            // per kg
  electric: 27,        // per kWh (survey captures kWh/month directly)
  biomass_pellets: 30, // per kg
};

const INST_TYPE_MAP: Record<string, InstitutionType> = {
  school: "school",
  church: "faith_based",
  hospital: "hospital",
  prison: "prison",
  factory: "factory",
  hotel: "hotel",
  restaurant: "restaurant",
};

const FUEL_MAP: Record<string, FuelType> = {
  firewood: "firewood",
  charcoal: "charcoal",
  lpg: "lpg",
  biogas: "biogas",
  electricity: "electric",
  electric: "electric",
  "biomas pellets": "other",
  "biomass pellets": "other",
  ethanol: "other",
  "ethanol/alcohol": "other",
  "ethanol gel": "other",
  coal: "other",
  kerosene: "other",
  "dung cake": "other",
  "crop residue": "other",
};

const NUM_SENTINELS = new Set(["", "n/a", "na", "none", "null", "-", "--"]);

function cleanStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function yesno(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  return ["yes", "true", "1", "y"].includes(s);
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;
  const s = String(v).trim().toLowerCase();
  if (NUM_SENTINELS.has(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toFloat(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().toLowerCase();
  if (NUM_SENTINELS.has(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normPhone(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const digits = String(v).replace(/\D/g, "");
  if (!digits) return null;
  let d = digits;
  if (d.startsWith("254")) d = d;
  else if (d.startsWith("0")) d = "254" + d.slice(1);
  else if (d.length === 9) d = "254" + d;
  return "+" + d;
}

export function computeMonthlyFuelSpend(
  fuel: FuelType | null,
  amounts: {
    firewood_kg_day?: number | null;
    charcoal_kg_day?: number | null;
    lpg_kg_day?: number | null;
    electricity_kwh_month?: number | null;
    biomass_pellets_kg_day?: number | null;
  },
): number | null {
  if (!fuel) return null;
  const price = FUEL_PRICE_KES[fuel];
  if (price === undefined) return null;

  if (fuel === "electric") {
    const kwh = amounts.electricity_kwh_month;
    return kwh != null ? Math.round(kwh * price * 100) / 100 : null;
  }
  const kgPerDay: Record<string, number | null | undefined> = {
    firewood: amounts.firewood_kg_day,
    charcoal: amounts.charcoal_kg_day,
    lpg: amounts.lpg_kg_day,
  };
  const kg = kgPerDay[fuel];
  return kg != null ? Math.round(kg * 30 * price * 100) / 100 : null;
}

export type RowArray = unknown[]; // 0-indexed row from SheetJS (arrays), padded to 174 cells.

export type MappedRow = {
  institution: InstitutionInsert;
  raw: Record<string, unknown>;
  warnings: string[];
};

export type MapResult = {
  rows: MappedRow[];
  skipped: { rowIndex: number; reason: string }[];
};

/**
 * Transform SheetJS AoA (array-of-arrays) → institution inserts.
 * Expects row 0 = headers, rows 1.. = data. Passes all cells through to `raw`.
 */
export function mapKoboRows(aoa: unknown[][]): MapResult {
  if (aoa.length < 2) return { rows: [], skipped: [] };
  const headers = aoa[0].map((h) => (h == null ? "" : String(h)));

  const result: MapResult = { rows: [], skipped: [] };

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    const cell = (col1: number) => row[col1 - 1];

    const name = cleanStr(cell(KOBO_COL.name));
    const lat = toFloat(cell(KOBO_COL.lat));
    const lon = toFloat(cell(KOBO_COL.lon));

    if (!name && lat === null && lon === null) continue; // truly blank row
    if (!name) {
      result.skipped.push({ rowIndex: i + 1, reason: "missing name" });
      continue;
    }
    if (lat === null || lon === null) {
      result.skipped.push({ rowIndex: i + 1, reason: "missing coords" });
      continue;
    }

    const warnings: string[] = [];

    const instTypeRaw = (cleanStr(cell(KOBO_COL.inst_type)) ?? "").toLowerCase();
    const instType = INST_TYPE_MAP[instTypeRaw] ?? "other";
    if (!INST_TYPE_MAP[instTypeRaw]) {
      warnings.push(`institution_type "${instTypeRaw}" mapped to "other"`);
    }

    const mainFuelRaw = (cleanStr(cell(KOBO_COL.main_fuel)) ?? "").toLowerCase();
    const currentFuel: FuelType | null = mainFuelRaw ? FUEL_MAP[mainFuelRaw] ?? null : null;
    if (mainFuelRaw && !FUEL_MAP[mainFuelRaw]) {
      warnings.push(`main_fuel "${mainFuelRaw}" not mapped`);
    }

    const subcounty =
      cleanStr(cell(KOBO_COL.subcounty_a)) ??
      cleanStr(cell(KOBO_COL.subcounty_b)) ??
      cleanStr(cell(KOBO_COL.subcounty_c)) ??
      cleanStr(cell(KOBO_COL.subcounty_d));

    const amounts = {
      firewood_kg_day: toFloat(cell(KOBO_COL.firewood_kg_day)),
      charcoal_kg_day: toFloat(cell(KOBO_COL.charcoal_kg_day)),
      lpg_kg_day: toFloat(cell(KOBO_COL.lpg_kg_day)),
      electricity_kwh_month: toFloat(cell(KOBO_COL.electricity_kwh_month)),
      biomass_pellets_kg_day: toFloat(cell(KOBO_COL.biomass_pellets_kg_day)),
    };
    const monthlyFuelSpend = computeMonthlyFuelSpend(currentFuel, amounts);

    const meals = toInt(cell(KOBO_COL.meals_per_day));
    const institution: InstitutionInsert = {
      name,
      latitude: lat,
      longitude: lon,
      institution_type: instType,
      county: cleanStr(cell(KOBO_COL.county)) ?? "Unknown",
      sub_county: subcounty ?? null,
      contact_phone: normPhone(cell(KOBO_COL.phone)),
      number_of_students: toInt(cell(KOBO_COL.students)),
      number_of_staff: toInt(cell(KOBO_COL.staff)),
      school_type: cleanStr(cell(KOBO_COL.day_board)),
      has_dedicated_kitchen: yesno(cell(KOBO_COL.has_kitchen)),
      meals_per_day: meals,
      meals_served_per_day: meals,
      avg_meal_cost_ksh: toFloat(cell(KOBO_COL.meal_cost)),
      current_fuel: currentFuel,
      fuel_sourcing: cleanStr(cell(KOBO_COL.fuel_sourcing)),
      monthly_fuel_spend: monthlyFuelSpend,
      ownership_type: cleanStr(cell(KOBO_COL.school_class)),
      grid_connected: yesno(cell(KOBO_COL.grid)),
      outages_per_month: cleanStr(cell(KOBO_COL.outages)),
      pipeline_stage: "identified",
      kobo_submission_id: toInt(cell(KOBO_COL.kobo_id)),
      kobo_submission_uuid: cleanStr(cell(KOBO_COL.kobo_uuid)),
    };

    const raw: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (!h) continue;
      raw[h] = row[c] ?? null;
    }

    result.rows.push({ institution, raw, warnings });
  }

  return result;
}

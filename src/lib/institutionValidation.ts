/**
 * Institution data-authenticity checks run on uploaded (Kobo-exported) rows.
 * Pure: the Validation page loads the roster + registry, calls
 * validateInstitutions, and writes verified/flagged back.
 */
import { KENYA_COUNTIES } from "@/lib/counties";
import { COUNTY_BOUNDS } from "@/lib/countyBounds";

export interface ValidatableInstitution {
  id: string;
  name: string | null;
  institution_code?: string | null;
  institution_type?: string | null;
  county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  current_fuel?: string | null;
  meals_per_day?: number | null;
  number_of_students?: number | null;
  number_of_staff?: number | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export interface RegistryEntry {
  name_norm: string;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ValidationIssue {
  code:
    | "missing_field" | "bad_name" | "unknown_county" | "no_coordinates"
    | "outside_kenya" | "outside_county" | "not_in_registry" | "registry_location"
    | "bad_phone" | "bad_email" | "implausible_numbers" | "duplicate";
  message: string;
}

const KENYA_BOX: [number, number, number, number] = [-4.9, 33.8, 5.1, 42.0];
// ~5 km slack: county boxes are coarse and GPS points on borders are common.
const COUNTY_BUFFER_DEG = 0.05;
const REGISTRY_MAX_KM = 2;
const DUP_MAX_M = 50;

const countyKey = (s: string) => s.toLowerCase().replace(/county/g, "").replace(/[^a-z]/g, "");
const COUNTY_BY_KEY = new Map(KENYA_COUNTIES.map((c) => [countyKey(c), c]));

/** Canonical county name, or null if not one of the 47. */
export function canonicalCounty(raw: string | null | undefined): string | null {
  return raw ? COUNTY_BY_KEY.get(countyKey(raw)) ?? null : null;
}

/** Name key for matching: lowercase letters/digits, common words dropped. */
export function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(pri|prim)\b/g, "primary")
    .replace(/\b(sec)\b/g, "secondary")
    .replace(/\b(sch|schl)\b/g, "school")
    .replace(/\b(the|of|and)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
}

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(bLat - aLat) / 2) ** 2 +
    Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

const inBox = (lat: number, lng: number, [s, w, n, e]: number[], buf = 0) =>
  lat >= s - buf && lat <= n + buf && lng >= w - buf && lng <= e + buf;

const PLACEHOLDER = /^(test|n\/?a|none|null|unknown|school|xxx+|abc|-+)$/i;
const PHONE = /^(\+?254|0)[17]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const hasCoords = (i: ValidatableInstitution) =>
  i.latitude != null && i.longitude != null &&
  Number.isFinite(i.latitude) && Number.isFinite(i.longitude) &&
  !(i.latitude === 0 && i.longitude === 0);

function rowIssues(i: ValidatableInstitution, registry: Map<string, RegistryEntry[]>): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const missing: string[] = [];
  if (!i.name?.trim()) missing.push("name");
  if (!i.county?.trim()) missing.push("county");
  if (!i.institution_type) missing.push("institution type");
  if (!i.current_fuel) missing.push("current fuel");
  // No contact is shown under "Missing information", not flagged: it's a data
  // gap, not an authenticity problem (most baseline rosters have none).
  if (missing.length) out.push({ code: "missing_field", message: `Missing: ${missing.join(", ")}` });

  const name = i.name?.trim() ?? "";
  if (name && ((name.match(/[a-z]/gi)?.length ?? 0) < 3 || PLACEHOLDER.test(name))) {
    out.push({ code: "bad_name", message: `Name "${name}" doesn't look like a real institution name` });
  }

  const county = canonicalCounty(i.county);
  if (i.county?.trim() && !county) {
    out.push({ code: "unknown_county", message: `"${i.county}" is not one of Kenya's 47 counties` });
  }

  if (!hasCoords(i)) {
    out.push({ code: "no_coordinates", message: "No GPS coordinates — location can't be verified" });
  } else if (!inBox(i.latitude!, i.longitude!, KENYA_BOX)) {
    out.push({ code: "outside_kenya", message: `Coordinates (${i.latitude}, ${i.longitude}) are outside Kenya` });
  } else if (county && !inBox(i.latitude!, i.longitude!, COUNTY_BOUNDS[county], COUNTY_BUFFER_DEG)) {
    out.push({ code: "outside_county", message: `Coordinates (${i.latitude}, ${i.longitude}) are not in ${county} County` });
  }

  // Registry: only enforced for counties the admin has uploaded a list for.
  const countyRegistry = county ? registry.get(county) : undefined;
  if (countyRegistry?.length && name) {
    const key = normaliseName(name);
    const match = countyRegistry.find((r) => r.name_norm === key);
    if (!match) {
      out.push({ code: "not_in_registry", message: `Not found in the official registry for ${county}` });
    } else if (hasCoords(i) && match.latitude != null && match.longitude != null) {
      const km = haversineM(i.latitude!, i.longitude!, match.latitude, match.longitude) / 1000;
      if (km > REGISTRY_MAX_KM) {
        out.push({ code: "registry_location", message: `Location is ${km.toFixed(1)} km from the registry location` });
      }
    }
  }

  const phone = i.contact_phone?.replace(/[\s\-()]/g, "");
  if (phone && !PHONE.test(phone)) {
    out.push({ code: "bad_phone", message: `Phone "${i.contact_phone}" is not a valid Kenyan number` });
  }
  if (i.contact_email?.trim() && !EMAIL.test(i.contact_email.trim())) {
    out.push({ code: "bad_email", message: `Email "${i.contact_email}" is not valid` });
  }

  const students = i.number_of_students ?? 0;
  const staff = i.number_of_staff ?? 0;
  const meals = i.meals_per_day ?? 0;
  if (students < 0 || staff < 0 || meals < 0) {
    out.push({ code: "implausible_numbers", message: "Negative student, staff or meal counts" });
  } else if (meals > (students + staff) * 4 && students + staff > 0) {
    out.push({ code: "implausible_numbers", message: `${meals} meals/day is more than 4 per person (${students + staff} people)` });
  } else if (i.institution_type === "school" && students === 0 && meals === 0) {
    out.push({ code: "implausible_numbers", message: "School with no students and no meals recorded" });
  }
  return out;
}

/**
 * Validate `rows` against each other and against `roster` (institutions
 * already on the platform, may overlap with rows). Returns issues per row id;
 * an empty array means the row passes. Duplicates flag BOTH records, so the
 * result can include roster ids that weren't in `rows`.
 */
export function validateInstitutions(
  rows: ValidatableInstitution[],
  roster: ValidatableInstitution[] = [],
  registryRows: RegistryEntry[] = [],
): Map<string, ValidationIssue[]> {
  const registry = new Map<string, RegistryEntry[]>();
  for (const r of registryRows) {
    const c = canonicalCounty(r.county);
    if (!c) continue;
    (registry.get(c) ?? registry.set(c, []).get(c)!).push(r);
  }

  const result = new Map<string, ValidationIssue[]>();
  for (const r of rows) result.set(r.id, rowIssues(r, registry));

  // Duplicate detection over rows ∪ roster, O(n) via hash buckets.
  const all = new Map<string, ValidatableInstitution>();
  for (const r of roster) all.set(r.id, r);
  for (const r of rows) all.set(r.id, r);
  const rowIds = new Set(rows.map((r) => r.id));

  const byName = new Map<string, ValidatableInstitution[]>();
  const byCell = new Map<string, ValidatableInstitution[]>(); // ~110 m grid cells
  const cell = (lat: number, lng: number) => `${Math.floor(lat * 1000)}:${Math.floor(lng * 1000)}`;
  for (const i of all.values()) {
    if (!i.name?.trim()) continue;
    const k = `${normaliseName(i.name)}|${canonicalCounty(i.county) ?? i.county ?? ""}`;
    (byName.get(k) ?? byName.set(k, []).get(k)!).push(i);
    if (hasCoords(i)) {
      const c = cell(i.latitude!, i.longitude!);
      (byCell.get(c) ?? byCell.set(c, []).get(c)!).push(i);
    }
  }

  const label = (i: ValidatableInstitution) => i.institution_code || i.name || i.id;
  const flagPair = (a: ValidatableInstitution, b: ValidatableInstitution) => {
    for (const [x, y] of [[a, b], [b, a]]) {
      const list = result.get(x.id) ?? [];
      const message = `Possible duplicate of ${label(y)}`;
      if (!list.some((m) => m.message === message)) list.push({ code: "duplicate", message });
      result.set(x.id, list);
    }
  };

  for (const r of rows) {
    if (!r.name?.trim()) continue;
    const key = normaliseName(r.name);
    const k = `${key}|${canonicalCounty(r.county) ?? r.county ?? ""}`;
    for (const o of byName.get(k) ?? []) if (o.id !== r.id) flagPair(r, o);
    if (!hasCoords(r)) continue;
    const [la, lo] = [Math.floor(r.latitude! * 1000), Math.floor(r.longitude! * 1000)];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const o of byCell.get(`${la + dx}:${lo + dy}`) ?? []) {
        if (o.id === r.id || !o.name) continue;
        const ok = normaliseName(o.name);
        const similar = ok.includes(key) || key.includes(ok);
        if (similar && haversineM(r.latitude!, r.longitude!, o.latitude!, o.longitude!) <= DUP_MAX_M) flagPair(r, o);
      }
    }
  }
  // Keep roster-only ids only when they picked up a duplicate flag.
  for (const [id, issues] of result) if (!rowIds.has(id) && !issues.length) result.delete(id);
  return result;
}

/** Key profile fields that are empty — shown on the institution profile. */
export function missingFields(i: Record<string, unknown>): string[] {
  const fields: [string, string][] = [
    ["contact_person", "Contact person"], ["contact_phone", "Phone"], ["contact_email", "Email"],
    ["sub_county", "Sub-county"], ["latitude", "GPS location"], ["current_fuel", "Current fuel"],
    ["number_of_students", "Students"], ["number_of_staff", "Staff"], ["meals_per_day", "Meals/day"],
    ["monthly_fuel_spend", "Monthly fuel spend"], ["grid_connected", "Grid connection"],
    ["kitchen_condition", "Kitchen condition"], ["financing_preference", "Financing preference"],
  ];
  return fields.filter(([k]) => i[k] == null || i[k] === "" || i[k] === 0).map(([, l]) => l);
}

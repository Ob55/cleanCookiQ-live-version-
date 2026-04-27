/**
 * County intelligence types (Workstream 1).
 *
 * Note: the legacy KENYA_COUNTIES export is preserved for any
 * code that still imports the static list (forms, dropdowns).
 * New code should use the `useCounties` hook instead so the
 * canonical list comes from the database.
 */

export interface County {
  id: string;
  code: string;
  name: string;
  region: string | null;
  capital: string | null;
  population: number | null;
  area_km2: number | null;
}

export interface CountyMetrics {
  county_id: string;
  county_code: string;
  county_name: string;
  region: string | null;
  capital: string | null;
  institutions_count: number;
  assessed_count: number;
  transitioned_count: number;
  dominant_fuel: string | null;
  total_meals_per_day: number;
  total_students: number;
  providers_serving_count: number;
}

export interface CountyIntelligenceSummary extends CountyMetrics {
  policy_count: number;
  fuel_price_count: number;
}

export interface CountyFuelPrice {
  id: string;
  county_id: string;
  county_code: string;
  county_name: string;
  fuel_type: string;
  price_numeric: number;
  unit: string;
  observed_on: string;
  source_id: string;
  source_slug: string;
  source_title: string;
  source_publisher: string | null;
  source_url: string | null;
  source_confidence: "high" | "medium" | "modeled" | "preliminary";
  notes: string | null;
}

export interface CountyPolicy {
  id: string;
  county_id: string;
  title: string;
  jurisdiction: string | null;
  policy_type: string | null;
  status: "draft" | "in_force" | "expired" | "repealed" | "proposed";
  effective_date: string | null;
  expires_date: string | null;
  summary: string | null;
  full_text_url: string | null;
  source_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** URL-safe slug derived from a county name. Pure for testability. */
export function countySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Group an array of counties by their region for index-page rendering.
 * Counties with no region land under 'Other'.
 */
export function groupCountiesByRegion<T extends { region: string | null; name: string }>(
  counties: T[],
): Array<{ region: string; counties: T[] }> {
  const groups = new Map<string, T[]>();
  for (const c of counties) {
    const region = c.region ?? "Other";
    if (!groups.has(region)) groups.set(region, []);
    groups.get(region)!.push(c);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, list]) => ({
      region,
      counties: list.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

// Legacy static list — preserved for forms/dropdowns that still import it.
export const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
  "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
  "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
  "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
  "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
  "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

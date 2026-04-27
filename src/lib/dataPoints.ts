/**
 * Data integrity layer (Workstream 0).
 *
 * Defines the shape of substantiable values served from the
 * `v_active_data_points` view, and helpers for resolving the
 * best available value for a given metric / fuel / county.
 *
 * Resolution preference:
 *   1. county-specific match (fuel-scoped if applicable)
 *   2. fuel-scoped national fallback
 *   3. national-level metric (no fuel scope)
 */

export type FuelKey =
  | "firewood"
  | "charcoal"
  | "lpg"
  | "biogas"
  | "electric"
  | "other";

export type ConfidenceLevel = "high" | "medium" | "modeled" | "preliminary";

export interface DataPoint {
  id: string;
  metric_key: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  fuel_type: FuelKey | null;
  county_id: string | null;
  county_name: string | null;
  county_code: string | null;
  source_id: string;
  source_slug: string;
  source_title: string;
  source_publisher: string | null;
  source_url: string | null;
  source_confidence: ConfidenceLevel;
  valid_from: string;
  valid_until: string | null;
  notes: string | null;
}

export interface DataPointQuery {
  metricKey: string;
  fuel?: FuelKey | null;
  countyId?: string | null;
}

/**
 * Pick the best matching data point from a candidate list.
 * Exported so the resolution rule can be unit-tested without Supabase.
 */
export function resolveDataPoint(
  candidates: DataPoint[],
  query: DataPointQuery,
): DataPoint | null {
  const { metricKey, fuel, countyId } = query;
  const matches = candidates.filter((d) => d.metric_key === metricKey);
  if (matches.length === 0) return null;

  if (countyId && fuel) {
    const exact = matches.find(
      (d) => d.county_id === countyId && d.fuel_type === fuel,
    );
    if (exact) return exact;
  }

  if (countyId) {
    const countyOnly = matches.find(
      (d) => d.county_id === countyId && (fuel ? d.fuel_type === fuel : !d.fuel_type),
    );
    if (countyOnly) return countyOnly;
  }

  if (fuel) {
    const fuelNational = matches.find(
      (d) => d.county_id === null && d.fuel_type === fuel,
    );
    if (fuelNational) return fuelNational;
  }

  const nationalGeneric = matches.find(
    (d) => d.county_id === null && d.fuel_type === null,
  );
  if (nationalGeneric) return nationalGeneric;

  return matches[0];
}

export function formatSourceCitation(dp: DataPoint): string {
  const parts = [dp.source_publisher ?? dp.source_title];
  if (dp.valid_from) {
    parts.push(`as of ${dp.valid_from}`);
  }
  return parts.filter(Boolean).join(" — ");
}

/**
 * Client wrapper for the JWT-gated `geocode-institution` edge function, used by
 * the "New programme from file" upload to fill in GPS for rows that arrived
 * without coordinates. Returns null on any error so one failed lookup never
 * aborts the batch.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ResolvedCoords } from "@/lib/programmeImport";

// Nominatim's usage policy caps lookups at ~1 request/second; the caller spaces
// its sequential calls by this interval.
export const GEOCODE_MIN_INTERVAL_MS = 1100;

export async function geocodeInstitution(input: {
  name: string;
  county?: string | null;
}): Promise<ResolvedCoords | null> {
  try {
    const { data, error } = await supabase.functions.invoke("geocode-institution", {
      body: { name: input.name, county: input.county ?? null },
    });
    if (error) return null;
    const d = data as { latitude?: number | null; longitude?: number | null; error?: string };
    if (d?.error || d?.latitude == null || d?.longitude == null) return null;
    return { latitude: d.latitude, longitude: d.longitude };
  } catch {
    return null;
  }
}

/**
 * Pure mapping from parsed institution-sheet rows to Supabase insert payloads
 * for a programme's "New from file" flow (see
 * components/programme/NewProgrammeFromFileDialog). Kept here — free of React /
 * Supabase imports — so the upload pipeline can be unit-tested end to end.
 */
import type { ImportRow, ImportedInstitution } from "@/lib/excelImport";

/** Resolved GPS looked up for a row that arrived without coordinates. */
export interface ResolvedCoords {
  latitude: number | null;
  longitude: number | null;
}

/**
 * Which data categories are absent from an institution — used both to decide the
 * `verification_status` flag on import and to explain it in the roster tooltip.
 * A row is "flagged" (data missing) when this returns anything.
 *
 * Structural param so it accepts both parsed `ImportedInstitution` rows and full
 * DB institution rows (which carry the same fields, plus extras we ignore).
 */
export function missingFields(inst: {
  latitude?: number | null;
  longitude?: number | null;
  county?: string | null;
  institution_type?: string | null;
  current_fuel?: string | null;
  number_of_students?: number | null;
  meals_per_day?: number | null;
}): string[] {
  const missing: string[] = [];
  if (inst.latitude == null || inst.longitude == null) missing.push("GPS");
  if (!inst.county || inst.county === "Unspecified") missing.push("county");
  if (!inst.institution_type || inst.institution_type === "other") missing.push("type");
  if (!inst.current_fuel || inst.current_fuel === "other") missing.push("fuel");
  if (inst.number_of_students == null && inst.meals_per_day == null) missing.push("size");
  return missing;
}

/**
 * Attach a programme + creator to each parsed row, fold in any GPS resolved by
 * geocoding, and flag rows with missing data. `county` is NOT NULL in the DB, so
 * a row whose sheet omitted it falls back to "Unspecified".
 *
 * @param coordsByRowIndex optional map (keyed by ImportRow.rowIndex) of GPS
 *   looked up for rows that arrived without coordinates.
 */
export function toInstitutionInserts(
  rows: ImportRow[],
  opts: {
    programmeId: string;
    createdBy: string | undefined;
    coordsByRowIndex?: Record<number, ResolvedCoords | null>;
  },
) {
  return rows.map((r) => {
    const resolved = opts.coordsByRowIndex?.[r.rowIndex];
    const latitude = r.institution.latitude ?? resolved?.latitude ?? null;
    const longitude = r.institution.longitude ?? resolved?.longitude ?? null;
    const county = r.institution.county || "Unspecified";

    const inst: ImportedInstitution = { ...r.institution, latitude, longitude, county };
    const missing = missingFields(inst);
    const notes = missing.length
      ? [r.institution.notes, `Data flagged — missing: ${missing.join(", ")}`]
          .filter(Boolean)
          .join(" · ")
      : r.institution.notes ?? null;

    return {
      ...inst,
      notes,
      verification_status: missing.length ? "flagged" : "unverified",
      created_by: opts.createdBy,
      programme_id: opts.programmeId,
    };
  });
}

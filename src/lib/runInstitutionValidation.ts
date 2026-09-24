import { sbAny } from "@/lib/sbAny";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { validateInstitutions, type RegistryEntry, type ValidatableInstitution } from "@/lib/institutionValidation";

const COLS =
  "id, name, institution_code, institution_type, county, latitude, longitude, current_fuel, " +
  "meals_per_day, number_of_students, number_of_staff, contact_phone, contact_email, verification_status";
const WRITE_CHUNK = 500;

type Row = ValidatableInstitution & { verification_status: string };

/**
 * Validate every institution that hasn't passed yet (new uploads, flagged,
 * never-checked), comparing against the whole roster for duplicates, and save
 * Passed/Flagged. `onlyIds` narrows the rows re-checked (e.g. one edited
 * record). Returns ids that passed so callers can run follow-up steps.
 */
export async function runInstitutionValidation(onlyIds?: string[]) {
  const [roster, registry] = await Promise.all([
    fetchAllRows<Row>((from, to) => sbAny.from("institutions").select(COLS).order("id").range(from, to)),
    fetchAllRows<RegistryEntry>((from, to) =>
      sbAny.from("institution_registry").select("name_norm, county, latitude, longitude").range(from, to)),
  ]);
  const only = onlyIds && new Set(onlyIds);
  const rows = roster.filter((r) => (only ? only.has(r.id) : r.verification_status !== "verified"));
  const results = validateInstitutions(rows, roster, registry);

  const payload = [...results].map(([id, issues]) => ({ id, issues }));
  for (let i = 0; i < payload.length; i += WRITE_CHUNK) {
    const { error } = await sbAny.rpc("apply_institution_validation", { _results: payload.slice(i, i + WRITE_CHUNK) });
    if (error) throw error;
  }
  const passedIds = payload.filter((p) => p.issues.length === 0).map((p) => p.id);
  return { checked: payload.length, passed: passedIds.length, flagged: payload.length - passedIds.length, passedIds };
}

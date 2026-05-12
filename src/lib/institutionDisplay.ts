/**
 * Institution display abstraction.
 *
 * The platform's policy is that institution names + identifying details
 * (head-teacher contact, exact address, etc.) are NOT shown to other
 * actors — funders, suppliers, researchers, CSR sponsors, TA providers.
 * Cross-actor views display the institution's anonymised public ID
 * (`institution_code`, e.g. `CCQ-NRB-0042`) instead.
 *
 * Admins are the only role that sees the underlying name. The institution's
 * own users see their own data on their own dashboards.
 *
 * Aggregate fields (county, students, fuel, savings, CO₂) are NOT abstracted
 * — they are needed for funder matching and don't identify the institution.
 *
 * Usage:
 *   import { institutionLabel } from "@/lib/institutionDisplay";
 *   <span>{institutionLabel(deal)}</span>
 *
 * Pass `{ revealName: true }` only from admin pages or the institution's
 * own pages.
 */

export interface InstitutionDisplayInput {
  institution_code?: string | null;
  institution_name?: string | null;
  /** Some rows nest as { name } instead of institution_name (e.g. researcher views). */
  name?: string | null;
  /** Some rows are flat institution rows. */
  code?: string | null;
}

export interface InstitutionLabelOptions {
  /** Set true on admin pages and the institution's own dashboards. */
  revealName?: boolean;
  /** Fallback when no code exists (e.g. legacy rows pre-actor-codes). */
  fallback?: string;
}

/**
 * Return the canonical display string for an institution row.
 *
 *   Cross-actor view : "CCQ-NRB-0042"   (the institution_code)
 *   Admin / own view  : "St Mary's High School"   (the actual name)
 *   Missing code     : "—" (or the supplied fallback)
 */
export function institutionLabel(
  input: InstitutionDisplayInput | null | undefined,
  opts: InstitutionLabelOptions = {},
): string {
  const fallback = opts.fallback ?? "—";
  if (!input) return fallback;

  if (opts.revealName) {
    const name = input.institution_name ?? input.name ?? null;
    if (name && name.trim()) return name;
  }

  const code = input.institution_code ?? input.code ?? null;
  if (code && code.trim()) return code;

  // No code on the row — fall back to fallback rather than leak the name.
  return fallback;
}

/**
 * Variant that returns null when no code is present, so callers can
 * conditionally render markup instead of "—".
 */
export function institutionLabelOrNull(
  input: InstitutionDisplayInput | null | undefined,
  opts: InstitutionLabelOptions = {},
): string | null {
  const v = institutionLabel(input, { ...opts, fallback: "" });
  return v ? v : null;
}

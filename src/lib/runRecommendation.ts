import { sbAny } from "@/lib/sbAny";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { recommendCookingMethod, suggestProviders, type MethodInputs, type ProviderForMatch } from "@/lib/institutionDerived";

// ids go in the URL (?id=in.(...)); 150 uuids keeps it well under proxy limits.
const CHUNK = 150;
const COLS = "id, county, current_fuel, grid_connected, outages_per_month, meals_per_day, meals_served_per_day, number_of_students";

/**
 * Propose a cooking method + top providers for the given institutions and
 * save them (recommended_solution, recommendation_reason, recommended_providers).
 */
export async function proposeForInstitutions(ids: string[]) {
  if (!ids.length) return 0;
  const providers = await fetchAllRows<ProviderForMatch>((f, t) =>
    sbAny.from("providers").select("id, name, technology_types, counties_served, verified").range(f, t));
  let done = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await sbAny.from("institutions").select(COLS).in("id", ids.slice(i, i + CHUNK));
    if (error) throw error;
    const rows = ((data ?? []) as (MethodInputs & { id: string; county: string | null })[]).map((inst) => {
      const { method, reason } = recommendCookingMethod(inst);
      return { id: inst.id, method, reason, providers: suggestProviders(inst.county, method, providers).map((p) => p.id) };
    });
    const { data: n, error: e } = await sbAny.rpc("apply_institution_recommendations", { _rows: rows });
    if (e) throw e;
    done += n ?? 0;
  }
  return done;
}

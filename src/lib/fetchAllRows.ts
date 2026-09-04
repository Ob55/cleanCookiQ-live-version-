/**
 * Fetch EVERY row of a Supabase/PostgREST select, paging past the server's
 * ~1,000-row response cap.
 *
 * PostgREST caps any single response (default `max-rows` = 1000). A query that
 * pulls rows and then counts/sums them client-side therefore silently truncates
 * once a table grows past 1k — which is exactly what capped the homepage "Live
 * pipeline" total and the per-programme institution counts. Use this helper for
 * any "count/aggregate the whole table" read so the limit can never bite again.
 *
 * Pass a builder that applies `.range(from, to)` to your query, e.g.:
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase.from("institutions").select("id, pipeline_stage").range(from, to));
 *
 * On a mid-pagination error it returns whatever was collected so far (these are
 * best-effort stat reads), rather than throwing away the whole result.
 */
const PAGE_SIZE = 1000;

export async function fetchAllRows<T = unknown>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) break;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break; // final page reached
  }
  return all;
}

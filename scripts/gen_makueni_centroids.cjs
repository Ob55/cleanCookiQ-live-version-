/*
 * Approximate Makueni school coordinates for the Leaflet map.
 *
 * The survey PDF has no GPS and free name-geocoding (Nominatim) does not cover
 * these rural schools, so — as an interim, clearly-labelled approximation — each
 * institution is placed near its SUB-COUNTY centre, with a small deterministic
 * spread (seeded by S/No) so 908 pins don't stack on six points. These are
 * regional placements, NOT surveyed locations; each updated row's notes say so.
 * Replace later with real GPS (field collection or the Google-keyed geocoder).
 *
 * Run:  node scripts/gen_makueni_centroids.cjs
 * Output: supabase/migrations/20260904130000_makueni_coordinates.sql
 */
const fs = require("fs");
const path = require("path");

const IN = path.join(__dirname, "data", "makueni_institutions.json");
const OUT = path.join(__dirname, "..", "supabase/migrations/20260904130000_makueni_coordinates.sql");
const PROG_NAME = "Makueni County Cooking Baseline";

// Approximate sub-county centres (lat, lon) — county towns / geographic centres.
const CENTROIDS = {
  "Makueni": [-1.80, 37.63],       // Wote area
  "Mbooni": [-1.63, 37.45],        // Mbooni / Kikima hills
  "Kibwezi West": [-2.28, 37.82],  // Makindu
  "Kibwezi East": [-2.69, 38.17],  // Mtito Andei
  "Kilome": [-1.90, 37.40],        // Salama / Mukaa
  "Kaiti": [-1.86, 37.47],         // Kilungu / Nunguni
};
const SPREAD = 0.14; // ±0.07° ≈ ±7 km deterministic jitter

const sqlStr = (v) => (v == null || v === "" ? "NULL" : "'" + String(v).replace(/'/g, "''") + "'");
const jitter = (sno, mult) => (((sno * mult) % 100) / 100 - 0.5) * SPREAD;

const rows = JSON.parse(fs.readFileSync(IN, "utf8"));
const updates = [];
let placed = 0;
for (const r of rows) {
  const c = CENTROIDS[r.subCounty];
  if (!c) continue;
  const lat = +(c[0] + jitter(r.sno, 37)).toFixed(5);
  const lon = +(c[1] + jitter(r.sno, 73)).toFixed(5);
  placed++;
  updates.push(
    `  UPDATE public.institutions SET latitude = ${lat}, longitude = ${lon}, ` +
      `notes = COALESCE(notes || ' · ', '') || 'Location: approximate (sub-county centroid)' ` +
      `WHERE programme_id = prog_id AND name = ${sqlStr(r.name)} ` +
      `AND sub_county = ${sqlStr(r.subCounty)} AND latitude IS NULL;`,
  );
}

const sql = `-- ============================================================
-- Makueni County Cooking Baseline — approximate school coordinates
--
-- The survey has no GPS. As an interim so the Leaflet map isn't empty, each
-- school is placed near its SUB-COUNTY centre with a small deterministic spread.
-- These are REGIONAL approximations, not surveyed locations (each row's notes
-- record this). Replace with real GPS when available.
--
-- Placed: ${placed} of ${rows.length}. Idempotent: only fills rows whose
-- latitude is still NULL, so re-running is a no-op.
-- ============================================================
DO $$
DECLARE prog_id uuid;
BEGIN
  SELECT id INTO prog_id FROM public.programmes WHERE name = '${PROG_NAME}' LIMIT 1;
  IF prog_id IS NULL THEN RETURN; END IF;
${updates.join("\n")}
END $$;
`;

fs.writeFileSync(OUT, sql);
console.log(`Wrote ${OUT}  (${placed} coordinate updates)`);

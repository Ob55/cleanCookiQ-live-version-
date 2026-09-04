/*
 * One-off generator: reads the four Taita Taveta KoBo survey exports from the
 * Desktop and emits a Supabase seed migration that
 *   (1) creates the "IRENA – Taita Taveta" programme (tenant) if absent, and
 *   (2) inserts the surveyed institutions assigned to it (idempotent — only
 *       seeds when the programme is newly created).
 *
 * Run:  node scripts/gen_taita_taveta_seed.cjs
 * Output: supabase/migrations/20260808140000_seed_taita_taveta_institutions.sql
 *
 * Not part of the app build. Kept in-repo so the import is reproducible.
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const DESKTOP = "/home/brian/Desktop";
const OUT = path.join(
  __dirname,
  "..",
  "supabase/migrations/20260808140000_seed_taita_taveta_institutions.sql",
);

// ---- helpers -------------------------------------------------------------
const str = (v) => {
  if (v === null || v === undefined) return null;
  // Collapse embedded newlines / runs of whitespace so each row is one line.
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length ? s : null;
};
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
};
// Normalise a KoBo phone into a clean Kenyan string (keep digits + leading +).
const phone = (v) => {
  const s = str(v);
  if (!s) return null;
  const cleaned = s.replace(/[^\d+]/g, "");
  return cleaned.length >= 9 ? cleaned : null;
};
// Map a free-text fuel / stove label to the fuel_type enum.
const fuel = (v) => {
  const s = (str(v) || "").toLowerCase();
  if (!s) return null;
  if (s.includes("firewood") || s.includes("fire wood") || s.includes("wood")) return "firewood";
  if (s.includes("charcoal")) return "charcoal";
  if (s.includes("lpg") || s.includes("gas")) return "lpg";
  if (s.includes("biogas")) return "biogas";
  if (s.includes("electric")) return "electric";
  return "other";
};
const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const sqlNum = (v) => (v === null || v === undefined ? "NULL" : String(v));

function readRows(file) {
  const wb = XLSX.readFile(path.join(DESKTOP, file), { sheetRows: 100000 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// GPS columns are shared across every export.
const LAT = "_Record the GPS coordinates of the location:_latitude";
const LNG = "_Record the GPS coordinates of the location:_longitude";

const records = [];

function push(rec) {
  if (!rec.name) return; // a name is the one hard requirement
  records.push(rec);
}

// ---- Learning institutions → school -------------------------------------
// meals/day derived: students × 2 (institutional average, boarding + day).
for (const r of readRows("learning Institutions_Taita Taveta County__all_versions_-_labels_.xlsx")) {
  const students = num(r["What is the total number of students in a normal year"]);
  push({
    name: str(r["Name of learning institution:"]),
    institution_type: "school",
    school_type: str(r["Type/level of learning institution"]),
    ownership_type: str(r["Type of ownership"]),
    sub_county: str(r["Sub-County:"]),
    ward: str(r["Ward:"]),
    village: str(r["Village:"]),
    contact_person: str(r["Name of interviewee:"]),
    designation: str(r["Title or designation of the interviewee:"]),
    contact_phone: phone(r["Phone number of the contact person (optional):"]),
    latitude: num(r[LAT]),
    longitude: num(r[LNG]),
    current_fuel: fuel(r["What is the learning institution primary cooking fuel?"]),
    number_of_students: students,
    meals_per_day: students != null ? students * 2 : null,
  });
}

// ---- Correctional institutions → prison ---------------------------------
// meals/day derived: inmates × 3 (prisons serve three meals daily).
for (const r of readRows("Correctional Institutions_Taita taveta County__all_versions_-_labels_.xlsx")) {
  const inmates = num(r["What is the total number of inmates in a normal year?"]);
  push({
    name: str(r["Name of correctional institution:"]),
    institution_type: "prison",
    school_type: str(r["Level of correctional institution"]),
    sub_county: str(r["Sub-County:"]),
    ward: str(r["Ward:"]),
    village: str(r["Village:"]),
    contact_person: str(r["Name of interviewee:"]),
    designation: str(r["Title or designation of the interviewee:"]),
    contact_phone: phone(r["Phone number of the contact person (optional):"]),
    latitude: num(r[LAT]),
    longitude: num(r[LNG]),
    current_fuel: fuel(r["What is the correctional institution primary cooking fuel?"]),
    number_of_students: inmates,
    meals_per_day: inmates != null ? inmates * 3 : null,
  });
}

// ---- Health facilities → hospital ---------------------------------------
// meals/day derived: beds × 3 (in-patient meals; in-patient count is a range).
for (const r of readRows("Taita Taveta Health Facilities__all_versions_-_labels_.xlsx")) {
  const beds = num(r["What is the total number of beds in the facility?"]);
  push({
    name: str(r["Name of Health Facility:"]),
    institution_type: "hospital",
    school_type: str(r["Type/level of Health Care facility:"]),
    sub_county: str(r["Sub-County:"]),
    ward: str(r["Ward:"]),
    village: str(r["Village:"]),
    contact_person: str(r["Name of interviewee:"]),
    designation: str(r["Title or designation of the interviewee:"]),
    contact_phone: phone(r["Phone number of the contact person (optional):"]),
    latitude: num(r[LAT]),
    longitude: num(r[LNG]),
    current_fuel: fuel(r["What is the health facility primary cooking fuel?"]),
    number_of_students: beds, // beds used as the headcount proxy
    meals_per_day: beds != null ? beds * 3 : null,
  });
}

// ---- Catering outlets → hotel / restaurant ------------------------------
// No headcount of covers is captured, so meals/day is left blank (NULL).
for (const r of readRows("Taita Taveta_Catering_Outlets_Raw _Data.xlsx")) {
  const outletType = (str(r["Type of catering outlet"]) || "").toLowerCase();
  push({
    name: str(r["Name of catering outlet:"]),
    institution_type: outletType.includes("hotel") ? "hotel" : "restaurant",
    school_type: str(r["Type of catering outlet"]),
    ownership_type: str(r["What is the type of ownership of the catering outlet"]),
    sub_county: str(r["Sub-County:"]),
    ward: str(r["Ward:"]),
    village: str(r["Village:"]),
    contact_person: str(r["Name of interviewee:"]),
    designation: str(r["Title or designation of the interviewee:"]),
    contact_phone: phone(r["Phone number of the contact person (optional):"]),
    latitude: num(r[LAT]),
    longitude: num(r[LNG]),
    current_fuel: fuel(r["What type of stove does the catering outlet use as the primary stove?"]),
    number_of_staff: num(r["What is the total number of catering staff you employ? (i.e. directly involved in the kitchen)"]),
    meals_per_day: null,
  });
}

// ---- dedupe --------------------------------------------------------------
// The KoBo exports contain a few repeat submissions (same outlet surveyed
// twice with GPS jitter and/or a different enumerator contact). Inspection
// showed most same-name rows are DIFFERENT outlets in different wards, so we
// collapse only true repeats: same name AND same location. "Same location" =
// GPS rounded to ~1 km when coordinates exist, else same sub-county + village.
// This catches the real repeats (Baraka hotel, Sowene secondary school) while
// keeping distinct same-name outlets (e.g. the several "Neema hotel"s).
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const round2 = (n) => (n == null ? null : Number(n).toFixed(2));
const dedupeKey = (r) => {
  const lat = round2(r.latitude), lng = round2(r.longitude);
  const loc = lat != null && lng != null ? `${lat},${lng}` : `${norm(r.sub_county)}|${norm(r.village)}`;
  return `${norm(r.name)}@@${loc}`;
};

const seen = new Set();
const deduped = [];
const removedRows = [];
for (const r of records) {
  const k = dedupeKey(r);
  if (seen.has(k)) { removedRows.push(r); continue; }
  seen.add(k);
  deduped.push(r);
}
records.length = 0;
records.push(...deduped);
console.log(`Deduped: removed ${removedRows.length} duplicate submission(s):`);
removedRows.forEach((r) => console.log(`  - ${r.name} (${r.sub_county || "?"}/${r.village || "?"})`));

// ---- build SQL -----------------------------------------------------------
// notes carries the ward/village + interviewee designation so nothing is lost.
function notesFor(r) {
  const bits = [];
  if (r.ward) bits.push(`Ward: ${r.ward}`);
  if (r.village) bits.push(`Village: ${r.village}`);
  if (r.designation) bits.push(`Contact role: ${r.designation}`);
  if (r.ownership_type) bits.push(`Ownership: ${r.ownership_type}`);
  return bits.length ? bits.join(" · ") : null;
}

const COLS = [
  "name", "institution_type", "county", "sub_county", "latitude", "longitude",
  "current_fuel", "meals_per_day", "meals_served_per_day", "number_of_students",
  "number_of_staff", "contact_person", "contact_phone", "school_type",
  "ownership_type", "notes", "pipeline_stage",
];

// Direct multi-row VALUES: the programme-id expression leads each tuple and
// the target column types apply, so bare 'school'/'firewood'/'identified'
// literals cast to their enums without explicit ::casts. `pidExpr` is the
// plpgsql variable `prog_id` for the migration, or a literal UUID for the
// one-time remote apply.
const buildTuples = (pidExpr) => records.map((r) => {
  const vals = [
    pidExpr,
    sqlStr(r.name),
    sqlStr(r.institution_type),
    sqlStr("Taita Taveta"),
    sqlStr(r.sub_county),
    sqlNum(r.latitude),
    sqlNum(r.longitude),
    sqlStr(r.current_fuel),
    sqlNum(r.meals_per_day),
    sqlNum(r.meals_per_day), // meals_served_per_day mirrors the estimate
    sqlNum(r.number_of_students ?? null),
    sqlNum(r.number_of_staff ?? null),
    sqlStr(r.contact_person),
    sqlStr(r.contact_phone),
    sqlStr(r.school_type),
    sqlStr(r.ownership_type ?? null),
    sqlStr(notesFor(r)),
    "'identified'",
  ];
  return "      (" + vals.join(", ") + ")";
});
const valuesRows = buildTuples("prog_id");

const byType = records.reduce((m, r) => ((m[r.institution_type] = (m[r.institution_type] || 0) + 1), m), {});

const header = `-- ============================================================
-- Seed: IRENA – Taita Taveta institutions (Phase 1 engagement data)
--
-- Imported from the Taita Taveta County baseline survey (A2CT / UK-PACT,
-- SNV · GAMOS EA · CCAK) KoBo exports:
--   * learning institutions  → school   (students × 2 = est. meals/day)
--   * correctional            → prison   (inmates  × 3 = est. meals/day)
--   * health facilities       → hospital (beds     × 3 = est. meals/day)
--   * catering outlets        → hotel/restaurant (meals/day not surveyed → NULL)
--
-- meals_per_day / meals_served_per_day are DERIVED ESTIMATES (the surveys
-- capture headcount, not covers) so they can be edited once real figures
-- are known. Ward/village + contact role are preserved in notes.
--
-- Total rows: ${records.length}  (${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(", ")})
--
-- Idempotent: institutions are only seeded when the programme row is newly
-- created, so re-running this migration is a no-op.
-- ============================================================
DO $$
DECLARE
  prog_id uuid;
  is_new  boolean := false;
BEGIN
  SELECT id INTO prog_id FROM public.programmes WHERE name = 'IRENA – Taita Taveta' LIMIT 1;

  IF prog_id IS NULL THEN
    INSERT INTO public.programmes (name, description, status, county_scope, target_institution_count)
    VALUES (
      'IRENA – Taita Taveta',
      'IRENA assignment delivered with Gamos, CCAK and the Taita Taveta County government — clean-cooking transition pipeline for surveyed institutions.',
      'active',
      ARRAY['Taita Taveta'],
      ${records.length}
    )
    RETURNING id INTO prog_id;
    is_new := true;
  END IF;

  IF is_new THEN
    INSERT INTO public.institutions
      (programme_id, ${COLS.join(", ")})
    VALUES
${valuesRows.join(",\n")};
  END IF;
END $$;
`;

fs.writeFileSync(OUT, header);
console.log(`Wrote ${OUT}`);
console.log(`Records: ${records.length}`, byType);

// One-time remote apply: when REMOTE_PID is set, emit a script that swaps the
// existing programme's institutions (e.g. demo placeholders) for this real
// set, in a transaction, WITHOUT recreating the programme (preserves its id +
// members). Written to /tmp so it never lands in the committed migrations.
if (process.env.REMOTE_PID) {
  const pid = process.env.REMOTE_PID;
  const remote = `BEGIN;
DELETE FROM public.institutions WHERE programme_id = '${pid}';
INSERT INTO public.institutions
  (programme_id, ${COLS.join(", ")})
VALUES
${buildTuples(`'${pid}'`).join(",\n")};
UPDATE public.programmes SET target_institution_count = ${records.length} WHERE id = '${pid}';
COMMIT;
`;
  fs.writeFileSync("/tmp/taita_remote_apply.sql", remote);
  console.log(`Wrote /tmp/taita_remote_apply.sql for programme ${pid}`);
}

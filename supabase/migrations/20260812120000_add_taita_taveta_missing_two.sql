-- ============================================================
-- Add back the 2 rows the Taita Taveta seed collapsed as duplicates (407 → 409)
--
-- The seed importer (scripts/gen_taita_taveta_seed.cjs) loaded 407 of the 409
-- raw KoBo rows, dropping 2 as duplicate submissions (same name + GPS within
-- ~1 km) — see docs/taita-taveta-record-reconciliation.md. Per decision, both
-- are treated as distinct records and re-added so the roster matches the raw
-- file count of 409:
--
--   1. 'sowene secondary school'  (learning file) — full data recovered from
--      the surviving learning-institutions export.
--   2. 'Baraka hotel'             (catering file) — catering source file no
--      longer available, so only the fields known from the reconciliation doc
--      are populated; current_fuel / contact_phone / ownership_type are NULL.
--
-- Idempotent: each row is inserted only WHERE NOT EXISTS (programme + name +
-- latitude), so re-running — or running against a DB that already has them — is
-- a no-op. The seed migration is left untouched.
-- ============================================================
DO $$
DECLARE
  prog_id uuid;
BEGIN
  SELECT id INTO prog_id FROM public.programmes WHERE name = 'IRENA – Taita Taveta' LIMIT 1;

  IF prog_id IS NULL THEN
    RAISE NOTICE 'Programme "IRENA – Taita Taveta" not found; skipping.';
    RETURN;
  END IF;

  -- Row 1 — Sowene secondary school (Taveta/Bomeni, interviewee "mr sariko").
  -- meals/day = 700 students × 2, matching the importer's learning rule.
  INSERT INTO public.institutions
    (programme_id, name, institution_type, county, sub_county, latitude, longitude,
     current_fuel, meals_per_day, meals_served_per_day, number_of_students, number_of_staff,
     contact_person, contact_phone, school_type, ownership_type, notes, pipeline_stage, segment)
  SELECT
    prog_id, 'sowene secondary school', 'school', 'Taita Taveta', 'taveta', -3.3921417, 37.6690167,
    'firewood', 1400, 1400, 700, NULL,
    'mr sariko', '0716278172', 'Day secondary school', 'Public',
    'Ward: bomeni · Village: taveta town · Contact role: Teacher · Ownership: Public',
    'identified', 'institutional'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.institutions
    WHERE programme_id = prog_id AND name = 'sowene secondary school' AND latitude = -3.3921417
  );

  -- Row 2 — Baraka hotel (Mata/Timbila, interviewee "Selina Joab"). Catering
  -- source file is gone; fuel / phone / ownership unknown → left NULL.
  INSERT INTO public.institutions
    (programme_id, name, institution_type, county, sub_county, latitude, longitude,
     current_fuel, meals_per_day, meals_served_per_day, number_of_students, number_of_staff,
     contact_person, contact_phone, school_type, ownership_type, notes, pipeline_stage, segment)
  SELECT
    prog_id, 'Baraka hotel', 'hotel', 'Taita Taveta', 'Taveta', -3.3897208, 37.7140746,
    NULL, NULL, NULL, NULL, 2,
    'Selina Joab', NULL, 'Hotel', NULL,
    'Ward: Mata · Village: Timbila',
    'identified', 'commercial'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.institutions
    WHERE programme_id = prog_id AND name = 'Baraka hotel' AND latitude = -3.3897208
  );

  UPDATE public.programmes SET target_institution_count = 409 WHERE id = prog_id;
END $$;

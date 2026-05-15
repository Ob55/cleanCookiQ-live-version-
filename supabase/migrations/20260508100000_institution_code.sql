-- ============================================================
-- Institution code: stable, human-readable, auto-assigned identifier.
--
-- Format:  CCQ-{COUNTY3}-{TYPE3}-{NNNN}
--   CCQ          fixed brand prefix (cleancookIQ)
--   COUNTY3      3-digit official Kenya county code from public.counties.code
--                (e.g. 047 = Nairobi). Falls back to '000' if county name
--                does not match a row in counties.
--   TYPE3        3-letter abbreviation of institution_type:
--                  school        → SCH        hotel      → HTL
--                  hospital      → HOS        restaurant → RST
--                  prison        → PRS        faith_based→ FTH
--                  factory       → FCT        other      → OTH
--   NNNN         zero-padded 4-digit sequence counter scoped to (COUNTY3, TYPE3)
--
-- Example:  CCQ-047-SCH-0042  →  "the 42nd school registered in Nairobi"
--
-- The code is assigned by a BEFORE INSERT trigger so the user never types it.
-- It is immutable in practice (UPDATEs that change county or type do not
-- regenerate the code — that would break references; if you need a new code,
-- create a new row).
-- ============================================================

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS institution_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_institutions_code
  ON public.institutions(institution_code)
  WHERE institution_code IS NOT NULL;

-- Map institution_type enum → 3-letter abbreviation.
CREATE OR REPLACE FUNCTION public.institution_type_abbrev(t public.institution_type)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE t::text
    WHEN 'school'       THEN 'SCH'
    WHEN 'hospital'     THEN 'HOS'
    WHEN 'prison'       THEN 'PRS'
    WHEN 'factory'      THEN 'FCT'
    WHEN 'hotel'        THEN 'HTL'
    WHEN 'restaurant'   THEN 'RST'
    WHEN 'faith_based'  THEN 'FTH'
    ELSE 'OTH'
  END;
$$;

-- pg_trgm gives us similarity(a,b) for fuzzy county-name matching, so users
-- can type "Nairobi County", "nairobi", "Naiobi" (typo) and still land on 047.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Look up the official 3-digit county code for a (possibly messy) county name.
-- Resolution strategy:
--   1. Normalise: lowercase, trim, strip "county"/"city" suffixes, drop punctuation.
--   2. Exact match against counties.name after the same normalisation.
--   3. Fuzzy trigram match if no exact hit, with a similarity threshold of 0.6
--      (high enough that "Nakuru" doesn't snap to "Nairobi", low enough to catch
--      single-character typos and apostrophe variants like "Muranga" / "Murang'a").
-- Returns '000' when no match clears the threshold — those are the rows worth
-- auditing in the admin tool, not silent failures.
CREATE OR REPLACE FUNCTION public.county_code_for_name(p_name TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_clean TEXT;
  v_code  TEXT;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN '000';
  END IF;

  v_clean := lower(btrim(p_name));
  v_clean := regexp_replace(v_clean, '\s+(county|city)\s*$', '');  -- strip suffix
  v_clean := regexp_replace(v_clean, '[''`-]', '', 'g');           -- drop apostrophes/hyphens
  v_clean := regexp_replace(v_clean, '\s+', ' ', 'g');             -- collapse whitespace
  v_clean := btrim(v_clean);

  -- 1. Exact match after normalisation.
  SELECT code INTO v_code
  FROM public.counties
  WHERE regexp_replace(lower(name), '[''`-]', '', 'g') = v_clean
  LIMIT 1;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- 2. Fuzzy trigram match. Order by similarity DESC so the closest county wins.
  SELECT code INTO v_code
  FROM public.counties
  WHERE similarity(lower(name), v_clean) > 0.6
  ORDER BY similarity(lower(name), v_clean) DESC
  LIMIT 1;

  RETURN COALESCE(v_code, '000');
END;
$$;

-- Generate the next institution_code for a (county, type) bucket.
-- Reads max(seq) in the bucket from existing rows and increments.
CREATE OR REPLACE FUNCTION public.next_institution_code(
  p_county_name TEXT,
  p_type public.institution_type
)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_county_code TEXT := public.county_code_for_name(p_county_name);
  v_type_abbrev TEXT := public.institution_type_abbrev(p_type);
  v_prefix      TEXT;
  v_next        INT;
BEGIN
  v_prefix := 'CCQ-' || v_county_code || '-' || v_type_abbrev || '-';

  -- Pull the highest existing 4-digit suffix in this bucket.
  SELECT COALESCE(MAX(NULLIF(regexp_replace(institution_code, '^' || v_prefix, ''), '')::INT), 0) + 1
    INTO v_next
  FROM public.institutions
  WHERE institution_code LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next::TEXT, 4, '0');
END;
$$;

-- BEFORE INSERT trigger: auto-assign institution_code when not provided.
CREATE OR REPLACE FUNCTION public.set_institution_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.institution_code IS NULL OR NEW.institution_code = '' THEN
    NEW.institution_code := public.next_institution_code(NEW.county, NEW.institution_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_institution_code ON public.institutions;
CREATE TRIGGER trg_set_institution_code
  BEFORE INSERT ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.set_institution_code();

-- ============================================================
-- Backfill existing rows.
--
-- Processes oldest rows first so an institution's number reflects its
-- registration order within its (county, type) bucket. Skips rows that
-- already have a code (idempotent).
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, county, institution_type
    FROM public.institutions
    WHERE institution_code IS NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.institutions
    SET institution_code = public.next_institution_code(r.county, r.institution_type)
    WHERE id = r.id;
  END LOOP;
END $$;

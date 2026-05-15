-- ============================================================
-- Auto-assigned codes for the remaining five actor types.
--
-- Mirrors the institution_code design (see 20260508100000):
--   - Add a code column (text, unique).
--   - Provide a per-table next_*_code() generator that scans existing
--     codes in the bucket and increments.
--   - BEFORE INSERT trigger fills the code when NULL/empty.
--   - Backfill existing rows oldest-first so sequence reflects
--     registration order.
--   - Code is immutable in practice (trigger only fires on INSERT).
--
-- Final scheme:
--   institutions   CCQ-{COUNTY3}-{TYPE3}-{NNNN}  (already shipped)
--   providers      CCQ-SUP-{NNNN}
--   organisations  CCQ-{FND|CSR|RES}-{NNNN}      (prefix by org_type)
--   ta_providers   CCQ-TAP-{NNNN}
--
-- Individual users (auth.users / profiles) intentionally get no code.
-- ============================================================

-- ===== 1. Providers (suppliers) =====
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS provider_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_providers_code
  ON public.providers(provider_code)
  WHERE provider_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.next_provider_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_prefix CONSTANT TEXT := 'CCQ-SUP-';
  v_next   INT;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(provider_code, '^' || v_prefix, ''), '')::INT),
    0
  ) + 1
    INTO v_next
  FROM public.providers
  WHERE provider_code LIKE v_prefix || '%';
  RETURN v_prefix || lpad(v_next::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_provider_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provider_code IS NULL OR NEW.provider_code = '' THEN
    NEW.provider_code := public.next_provider_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_provider_code ON public.providers;
CREATE TRIGGER trg_set_provider_code
  BEFORE INSERT ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.set_provider_code();

-- Backfill
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.providers
    WHERE provider_code IS NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.providers
      SET provider_code = public.next_provider_code()
      WHERE id = r.id;
  END LOOP;
END $$;


-- ===== 2. Organisations (funder / csr / researcher) =====
-- Single code column; prefix derived from org_type. Institutions in this
-- table (org_type='institution') are not given an org_code here because
-- they already carry the richer institution_code on the institutions row.
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS org_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_organisations_code
  ON public.organisations(org_code)
  WHERE org_code IS NOT NULL;

-- Note: supplier org_type intentionally returns NULL. Suppliers carry their
-- code on the providers row (provider_code = CCQ-SUP-NNNN). Issuing a parallel
-- CCQ-SUP-NNNN sequence on organisations would create namespace collision.
-- Institutions also return NULL — they carry institution_code on the
-- institutions row (CCQ-{COUNTY}-{TYPE}-NNNN).
CREATE OR REPLACE FUNCTION public.org_type_abbrev(t public.org_type)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE t::text
    WHEN 'funder'     THEN 'FND'
    WHEN 'csr'        THEN 'CSR'
    WHEN 'researcher' THEN 'RES'
    ELSE NULL  -- institution / supplier / anything else → no org_code
  END;
$$;

CREATE OR REPLACE FUNCTION public.next_org_code(p_type public.org_type)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_abbrev TEXT := public.org_type_abbrev(p_type);
  v_prefix TEXT;
  v_next   INT;
BEGIN
  IF v_abbrev IS NULL THEN
    RETURN NULL;
  END IF;
  v_prefix := 'CCQ-' || v_abbrev || '-';
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(org_code, '^' || v_prefix, ''), '')::INT),
    0
  ) + 1
    INTO v_next
  FROM public.organisations
  WHERE org_code LIKE v_prefix || '%';
  RETURN v_prefix || lpad(v_next::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_org_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.org_code IS NULL OR NEW.org_code = '') THEN
    NEW.org_code := public.next_org_code(NEW.org_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_org_code ON public.organisations;
CREATE TRIGGER trg_set_org_code
  BEFORE INSERT ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.set_org_code();

-- Backfill (only for org_types that have an abbreviation)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, org_type FROM public.organisations
    WHERE org_code IS NULL
      AND public.org_type_abbrev(org_type) IS NOT NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.organisations
      SET org_code = public.next_org_code(r.org_type)
      WHERE id = r.id;
  END LOOP;
END $$;


-- ===== 3. TA Providers =====
ALTER TABLE public.ta_providers
  ADD COLUMN IF NOT EXISTS ta_provider_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ta_providers_code
  ON public.ta_providers(ta_provider_code)
  WHERE ta_provider_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.next_ta_provider_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_prefix CONSTANT TEXT := 'CCQ-TAP-';
  v_next   INT;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(ta_provider_code, '^' || v_prefix, ''), '')::INT),
    0
  ) + 1
    INTO v_next
  FROM public.ta_providers
  WHERE ta_provider_code LIKE v_prefix || '%';
  RETURN v_prefix || lpad(v_next::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ta_provider_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ta_provider_code IS NULL OR NEW.ta_provider_code = '' THEN
    NEW.ta_provider_code := public.next_ta_provider_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ta_provider_code ON public.ta_providers;
CREATE TRIGGER trg_set_ta_provider_code
  BEFORE INSERT ON public.ta_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_ta_provider_code();

-- Backfill
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.ta_providers
    WHERE ta_provider_code IS NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.ta_providers
      SET ta_provider_code = public.next_ta_provider_code()
      WHERE id = r.id;
  END LOOP;
END $$;

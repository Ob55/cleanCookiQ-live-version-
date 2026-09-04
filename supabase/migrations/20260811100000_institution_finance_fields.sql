-- ============================================================
-- Institution finance / segmentation / governance fields
--
-- Aligns the institution record with the investment-pipeline PRD (v1.0):
--   * segment / sub_type  — split the roster into institutional vs commercial
--     so ToR thresholds and Deliverable-A segmentation are reportable
--     (institutional = schools/prisons/health; commercial = catering SMEs).
--   * verification_*      — Task 2 field visits verify the inherited A2CT
--     baseline; every figure must be traceable/verifiable.
--   * consent_*           — Ignis is data controller (Kenya DPA 2019); consent
--     status is recorded per data subject.
--   * women_led           — gender-disaggregated reporting at every milestone.
--   * data_source         — provenance of each record (QA traceability gate).
--
-- All additive + idempotent; rides the existing institutions RLS policies
-- (host/member/actor reads from 20260808100000_programme_tenancy.sql), so no
-- policy changes here. current_fuel stays a single fuel_type enum — a
-- multi-select is a separate change touching every reader.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.institution_segment AS ENUM ('institutional', 'commercial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('unverified', 'verified', 'flagged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_status AS ENUM ('pending', 'granted', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.data_source AS ENUM ('field_survey', 'self_reported', 'partner_import', 'estimated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS segment             public.institution_segment,
  -- sub_type is validated in-app against per-programme config (system_config),
  -- not a DB enum, so a new programme can define its own institution sub-types.
  ADD COLUMN IF NOT EXISTS sub_type            text,
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_by         uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at         timestamptz,
  ADD COLUMN IF NOT EXISTS consent_status      public.consent_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS consent_date        timestamptz,
  ADD COLUMN IF NOT EXISTS women_led           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source         public.data_source NOT NULL DEFAULT 'field_survey';

-- Backfill segment from the existing institution_type for rows not yet set.
UPDATE public.institutions SET segment = 'institutional'
  WHERE segment IS NULL AND institution_type IN ('school', 'prison', 'hospital', 'faith_based');
UPDATE public.institutions SET segment = 'commercial'
  WHERE segment IS NULL AND institution_type IN ('hotel', 'restaurant', 'factory');

CREATE INDEX IF NOT EXISTS idx_institutions_segment ON public.institutions (segment);

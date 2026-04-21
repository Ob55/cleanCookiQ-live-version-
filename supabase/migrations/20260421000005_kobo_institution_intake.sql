-- Survey-intake columns on institutions + raw staging table for the
-- 150+ survey fields we don't model yet. Safe to re-run.

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS avg_meal_cost_ksh     numeric,
  ADD COLUMN IF NOT EXISTS fuel_sourcing         text,
  ADD COLUMN IF NOT EXISTS grid_connected        boolean,
  ADD COLUMN IF NOT EXISTS outages_per_month     text,
  ADD COLUMN IF NOT EXISTS kobo_submission_id    bigint,
  ADD COLUMN IF NOT EXISTS kobo_submission_uuid  text;

-- Partial unique index: only enforced when uuid is present, so rows
-- entered through the app without a KoBo uuid don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS institutions_kobo_uuid_uniq
  ON public.institutions (kobo_submission_uuid)
  WHERE kobo_submission_uuid IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.kobo_submissions_raw (
  id                 uuid primary key default gen_random_uuid(),
  kobo_submission_id bigint,
  kobo_uuid          text unique,
  payload            jsonb not null,
  imported_at        timestamptz default now(),
  institution_id     uuid references public.institutions(id) on delete set null
);

ALTER TABLE public.kobo_submissions_raw ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write raw submissions.
DROP POLICY IF EXISTS kobo_submissions_admin_all ON public.kobo_submissions_raw;
CREATE POLICY kobo_submissions_admin_all
  ON public.kobo_submissions_raw
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

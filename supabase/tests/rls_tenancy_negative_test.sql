-- ============================================================
-- RLS negative test for programme tenancy.
--
-- Confirms, at the DATABASE layer, that a scoped user (e.g. a Taita Taveta
-- county_pipeline_viewer) cannot read another programme's data — not just
-- that the UI hides it. Run in the Supabase SQL editor AFTER applying the
-- tenancy migrations and creating at least two programmes with institutions.
--
-- How it works: RLS reads auth.uid() from request.jwt.claims. We impersonate
-- a user by setting that claim, then switch to the `authenticated` role so the
-- policies actually apply (as the postgres/service role, RLS is bypassed).
--
-- Fill in the three UUIDs below before running.
-- ============================================================

-- \set county_user  '00000000-0000-0000-0000-000000000000'   -- a county_pipeline_viewer's user_id
-- \set their_prog   '00000000-0000-0000-0000-000000000000'   -- the programme they ARE a member of
-- \set other_prog   '00000000-0000-0000-0000-000000000000'   -- a programme they are NOT a member of

BEGIN;

-- Impersonate the county user.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'county_user', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

-- EXPECT: > 0  (they can see their own programme's institutions)
SELECT 'own programme (expect > 0)' AS check, count(*) AS rows
FROM public.institutions WHERE programme_id = :'their_prog';

-- EXPECT: 0  (they must NOT see another programme's institutions)
SELECT 'other programme (expect 0)' AS check, count(*) AS rows
FROM public.institutions WHERE programme_id = :'other_prog';

-- EXPECT: 0  (child data is scoped through institutions too)
SELECT 'other programme assessments (expect 0)' AS check, count(*) AS rows
FROM public.assessments a
JOIN public.institutions i ON i.id = a.institution_id
WHERE i.programme_id = :'other_prog';

RESET ROLE;
ROLLBACK;

-- Sanity: as the host/service role (no jwt claim), every programme is visible.
-- Run this separately as the default role to confirm host cross-tenant access.
-- SELECT programme_id, count(*) FROM public.institutions
-- WHERE programme_id IS NOT NULL GROUP BY programme_id;

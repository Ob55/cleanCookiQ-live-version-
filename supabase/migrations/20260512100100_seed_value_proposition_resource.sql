-- ============================================================
-- Seed the "value-proposition" resource referenced by /about.
--
-- This is the canonical slot for Liz's value-prop document.
-- requires_signin = false so the About page can render it for
-- anonymous prospects. file_url is left NULL — an admin uploads
-- the actual PDF via AdminResources, which fills file_url
-- without anyone needing to redeploy.
--
-- ON CONFLICT (slug) DO NOTHING — re-running the migration won't
-- clobber an admin's uploaded URL.
-- ============================================================

INSERT INTO public.resources (
  slug,
  title,
  resource_type,
  audience,
  description,
  requires_signin,
  is_published,
  tags
)
VALUES (
  'value-proposition',
  'Why CleanCookIQ — Value Proposition',
  'guide',
  ARRAY['public', 'institution', 'supplier', 'funder', 'researcher']::TEXT[],
  'A plain-language brief on why CleanCookIQ exists, who it serves, and the value each stakeholder gets from the platform.',
  FALSE,
  TRUE,
  ARRAY['value-proposition', 'about', 'overview']::TEXT[]
)
ON CONFLICT (slug) DO NOTHING;

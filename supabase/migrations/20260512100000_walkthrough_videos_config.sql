-- ============================================================
-- Walkthrough videos surfaced on /book-demo.
--
-- Public read so unauthenticated prospects can watch the role
-- walkthroughs before deciding to book a demo. Admin write.
-- Stored separately from system_config (which is auth-only) so
-- no auth round-trip is needed on the public marketing page.
--
-- video_url accepts any embeddable URL (Loom share URL,
-- YouTube link, Vimeo, etc.). The client derives the embed URL.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.walkthrough_videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key      TEXT NOT NULL UNIQUE,           -- 'institution', 'supplier', 'funder', 'csr', 'researcher', 'admin'
  title         TEXT NOT NULL,
  description   TEXT,
  video_url     TEXT,                            -- null/empty hides the tile
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_walkthrough_videos_order
  ON public.walkthrough_videos(display_order, role_key)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_walkthrough_videos_updated_at ON public.walkthrough_videos;
CREATE TRIGGER trg_walkthrough_videos_updated_at
  BEFORE UPDATE ON public.walkthrough_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.walkthrough_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "walkthrough_videos_public_read"  ON public.walkthrough_videos;
DROP POLICY IF EXISTS "walkthrough_videos_admin_write"  ON public.walkthrough_videos;

CREATE POLICY "walkthrough_videos_public_read"
  ON public.walkthrough_videos
  FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "walkthrough_videos_admin_write"
  ON public.walkthrough_videos
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Seed the six role tiles. video_url is null so each tile renders a
-- "video coming soon" placeholder until an admin pastes in a Loom URL.
INSERT INTO public.walkthrough_videos (role_key, title, description, display_order)
VALUES
  ('institution', 'For Institutions',
   'How a school or hospital signs up, gets a readiness score, and gets matched with suppliers and funders.', 1),
  ('supplier', 'For Suppliers',
   'How a TA provider lists products, completes CSCC compliance, and responds to opportunities.', 2),
  ('funder', 'For Funders',
   'How a financing partner sets preferences, browses curated deal flow, and tracks portfolio impact.', 3),
  ('csr', 'For CSR Sponsors',
   'How a corporate sponsor browses opportunities, funds grant slices, and tracks attributed impact.', 4),
  ('researcher', 'For Researchers',
   'How researchers access anonymised institution and outcome data for sector studies.', 5),
  ('admin', 'Platform Overview',
   'A walkthrough of the staff console: pipeline, assessments, deliveries, risk, carbon, and reference data.', 6)
ON CONFLICT (role_key) DO NOTHING;

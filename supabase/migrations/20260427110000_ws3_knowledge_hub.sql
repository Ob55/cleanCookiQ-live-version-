-- ============================================================
-- Workstream 3: Policy & Knowledge Hub
--
-- Tables:
--   policies            - national/sectoral policies (county-level
--                         policies stay in county_policies from WS1)
--   resources           - downloadable docs (guides, standards, etc.)
--   resource_downloads  - per-user download log
--   news_articles       - admin-authored editorial content
--   events              - calendar of summits/webinars/workshops
--   event_registrations - RSVPs (gated to authenticated users)
--
-- All policies use the (SELECT auth.uid()) pattern from the start.
-- All views are created WITH (security_invoker = true).
-- ============================================================

-- ============================================================
-- 1. POLICIES (national / sectoral)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  jurisdiction    TEXT NOT NULL DEFAULT 'national'
                  CHECK (jurisdiction IN ('national','regional','sectoral','international')),
  policy_type     TEXT,                          -- 'act','bill','regulation','strategy','tax','tariff','standard'
  status          TEXT NOT NULL DEFAULT 'in_force'
                  CHECK (status IN ('draft','proposed','in_force','expired','repealed')),
  effective_date  DATE,
  expires_date    DATE,
  summary         TEXT,
  full_text_url   TEXT,
  source_id       UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  applies_to_org_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  applies_to_fuels     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  tags            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_active ON public.policies(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_policies_tags   ON public.policies USING GIN (tags);

DROP TRIGGER IF EXISTS trg_policies_updated_at ON public.policies;
CREATE TRIGGER trg_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policies_public_read"   ON public.policies;
DROP POLICY IF EXISTS "policies_admin_write"   ON public.policies;

CREATE POLICY "policies_public_read" ON public.policies
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "policies_admin_write" ON public.policies
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 2. RESOURCES (downloadable library)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  resource_type     TEXT NOT NULL DEFAULT 'guide'
                    CHECK (resource_type IN
                      ('guide','standard','template','report','case_study',
                       'training_module','toolkit','dataset','presentation','other')),
  audience          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],   -- 'institution','supplier','funder','researcher','public'
  description       TEXT,
  file_url          TEXT,
  external_url      TEXT,                                       -- when hosted off-platform
  file_size_bytes   BIGINT,
  mime_type         TEXT,
  page_count        INTEGER,
  thumbnail_url     TEXT,
  source_id         UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  tags              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  requires_signin   BOOLEAN NOT NULL DEFAULT TRUE,
  view_count        INTEGER NOT NULL DEFAULT 0,
  download_count    INTEGER NOT NULL DEFAULT 0,
  is_published      BOOLEAN NOT NULL DEFAULT TRUE,
  published_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_type        ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_published   ON public.resources(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_tags        ON public.resources USING GIN (tags);

DROP TRIGGER IF EXISTS trg_resources_updated_at ON public.resources;
CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_public_read"  ON public.resources;
DROP POLICY IF EXISTS "resources_admin_write"  ON public.resources;

CREATE POLICY "resources_public_read" ON public.resources
  FOR SELECT USING (is_published = TRUE);
CREATE POLICY "resources_admin_write" ON public.resources
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- Per-user download log so we can attribute downloads + audit
CREATE TABLE IF NOT EXISTS public.resource_downloads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id   UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_resource_downloads_resource ON public.resource_downloads(resource_id, downloaded_at DESC);

ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_downloads_self_insert" ON public.resource_downloads;
DROP POLICY IF EXISTS "resource_downloads_admin_read"  ON public.resource_downloads;

CREATE POLICY "resource_downloads_self_insert" ON public.resource_downloads
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));
CREATE POLICY "resource_downloads_admin_read" ON public.resource_downloads
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 3. NEWS ARTICLES (editorial content)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.news_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  summary         TEXT,
  body_markdown   TEXT,
  hero_image_url  TEXT,
  author_name     TEXT,
  author_user_id  UUID REFERENCES auth.users(id),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published','archived')),
  published_at    TIMESTAMPTZ,
  tags            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  county_id       UUID REFERENCES public.counties(id) ON DELETE SET NULL,
  view_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_articles_status_pub ON public.news_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_tags       ON public.news_articles USING GIN (tags);

DROP TRIGGER IF EXISTS trg_news_articles_updated_at ON public.news_articles;
CREATE TRIGGER trg_news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_public_read"   ON public.news_articles;
DROP POLICY IF EXISTS "news_admin_write"   ON public.news_articles;

CREATE POLICY "news_public_read" ON public.news_articles
  FOR SELECT USING (status = 'published');
CREATE POLICY "news_admin_write" ON public.news_articles
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 4. EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT,
  event_type            TEXT NOT NULL DEFAULT 'webinar'
                        CHECK (event_type IN
                          ('summit','webinar','workshop','training','launch','field_visit','other')),
  start_at              TIMESTAMPTZ NOT NULL,
  end_at                TIMESTAMPTZ,
  timezone              TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  location_type         TEXT NOT NULL DEFAULT 'in_person'
                        CHECK (location_type IN ('in_person','virtual','hybrid')),
  venue_name            TEXT,
  venue_address         TEXT,
  county_id             UUID REFERENCES public.counties(id) ON DELETE SET NULL,
  virtual_url           TEXT,
  registration_required BOOLEAN NOT NULL DEFAULT TRUE,
  capacity              INTEGER,
  hero_image_url        TEXT,
  recording_url         TEXT,
  status                TEXT NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('draft','upcoming','past','cancelled')),
  organiser             TEXT,
  contact_email         TEXT,
  tags                  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_published          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status   ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_county   ON public.events(county_id);

DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_read" ON public.events;
DROP POLICY IF EXISTS "events_admin_write" ON public.events;

CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (is_published = TRUE);
CREATE POLICY "events_admin_write" ON public.events
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 5. EVENT REGISTRATIONS (RSVPs — sign-up gated)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  organisation    TEXT,
  role            TEXT,
  attended        BOOLEAN,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON public.event_registrations(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user  ON public.event_registrations(user_id);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_reg_self_read"   ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_self_insert" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_admin_all"   ON public.event_registrations;

CREATE POLICY "event_reg_self_read" ON public.event_registrations
  FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "event_reg_self_insert" ON public.event_registrations
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "event_reg_admin_all" ON public.event_registrations
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 6. VIEWS
-- ============================================================

-- Event registration counts
CREATE OR REPLACE VIEW public.v_event_summary
WITH (security_invoker = true) AS
SELECT
  e.*,
  c.name AS county_name,
  c.code AS county_code,
  COALESCE(reg.registration_count, 0) AS registration_count,
  CASE
    WHEN e.capacity IS NULL THEN NULL
    ELSE GREATEST(e.capacity - COALESCE(reg.registration_count, 0), 0)
  END AS seats_remaining,
  CASE WHEN e.start_at < NOW() THEN TRUE ELSE FALSE END AS is_past
FROM public.events e
LEFT JOIN public.counties c ON c.id = e.county_id
LEFT JOIN (
  SELECT event_id, COUNT(*) AS registration_count
  FROM public.event_registrations
  GROUP BY event_id
) reg ON reg.event_id = e.id;

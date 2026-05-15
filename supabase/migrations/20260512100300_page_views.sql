-- ============================================================
-- Engagement analytics: in-house page_views table.
--
-- One row per navigation. We capture enough to answer:
--   - Who (user, org, role) visited which page (path)
--   - From where (referrer)
--   - How often, and how recently per organisation
--   - Rough session segmentation (session_id is a client-generated UUID)
--
-- Anonymous visitors are recorded with NULL user_id/org_type/role.
-- duration_ms is filled in by a follow-up update when the user leaves
-- the page (best-effort — beforeunload is not guaranteed).
--
-- RLS: writes are wide open (we want anonymous visitors counted too,
-- and there is nothing sensitive in a row). Reads are admin-only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.page_views (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organisation_id UUID,                          -- soft FK; orgs live across multiple tables
  org_type       TEXT,                            -- 'institution', 'supplier', 'funder', 'csr', 'researcher', 'admin', NULL
  role           TEXT,                            -- primary role at time of visit
  session_id     UUID NOT NULL,
  path           TEXT NOT NULL,
  referrer       TEXT,
  user_agent     TEXT,
  duration_ms    INTEGER,                         -- filled in on unload
  viewed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at  ON public.page_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_user       ON public.page_views(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path       ON public.page_views(path, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_org_type   ON public.page_views(org_type, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session    ON public.page_views(session_id, viewed_at);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_views_insert_any"   ON public.page_views;
DROP POLICY IF EXISTS "page_views_update_own"   ON public.page_views;
DROP POLICY IF EXISTS "page_views_admin_read"   ON public.page_views;

-- Anyone (including anon) can insert their own page-view rows.
-- This is a write-only table from the client's perspective.
CREATE POLICY "page_views_insert_any"
  ON public.page_views
  FOR INSERT
  WITH CHECK (TRUE);

-- A user can update their own most recent page-view row (to fill in duration_ms).
CREATE POLICY "page_views_update_own"
  ON public.page_views
  FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Admin/manager only reads.
CREATE POLICY "page_views_admin_read"
  ON public.page_views
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- ============================================================
-- Rollup views used by the engagement dashboard.
-- ============================================================

-- Top paths, last 30 days.
CREATE OR REPLACE VIEW public.v_engagement_top_paths
  WITH (security_invoker = true) AS
SELECT
  path,
  COUNT(*)                                                  AS view_count,
  COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS unique_visitors,
  AVG(duration_ms)::INTEGER                                 AS avg_duration_ms,
  MAX(viewed_at)                                            AS last_viewed_at
FROM public.page_views
WHERE viewed_at >= NOW() - INTERVAL '30 days'
GROUP BY path;

-- Engagement by org_type, last 30 days.
CREATE OR REPLACE VIEW public.v_engagement_by_org_type
  WITH (security_invoker = true) AS
SELECT
  COALESCE(org_type, 'anonymous')                           AS org_type,
  COUNT(*)                                                  AS view_count,
  COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS unique_visitors,
  COUNT(DISTINCT user_id)                                   AS signed_in_visitors
FROM public.page_views
WHERE viewed_at >= NOW() - INTERVAL '30 days'
GROUP BY COALESCE(org_type, 'anonymous');

-- Per-organisation recency: when did each org last show up, and how active
-- have they been in the window. Useful for spotting churn risk.
CREATE OR REPLACE VIEW public.v_engagement_org_recency
  WITH (security_invoker = true) AS
SELECT
  organisation_id,
  org_type,
  COUNT(*)                                                  AS view_count_30d,
  COUNT(DISTINCT user_id)                                   AS active_users_30d,
  COUNT(DISTINCT date_trunc('day', viewed_at))              AS active_days_30d,
  MAX(viewed_at)                                            AS last_viewed_at
FROM public.page_views
WHERE viewed_at >= NOW() - INTERVAL '30 days'
  AND organisation_id IS NOT NULL
GROUP BY organisation_id, org_type;

-- Daily volume series for the trend chart.
CREATE OR REPLACE VIEW public.v_engagement_daily_volume
  WITH (security_invoker = true) AS
SELECT
  date_trunc('day', viewed_at)::date                        AS day,
  COUNT(*)                                                  AS view_count,
  COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS unique_visitors
FROM public.page_views
WHERE viewed_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', viewed_at)::date
ORDER BY day;

GRANT SELECT ON public.v_engagement_top_paths     TO authenticated;
GRANT SELECT ON public.v_engagement_by_org_type   TO authenticated;
GRANT SELECT ON public.v_engagement_org_recency   TO authenticated;
GRANT SELECT ON public.v_engagement_daily_volume  TO authenticated;

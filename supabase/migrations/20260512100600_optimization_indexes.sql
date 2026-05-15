-- ============================================================
-- Hot-path indexes for the new tables introduced this sprint.
--
-- The page_views table will grow fast — the dashboard fires four
-- aggregating queries on every refresh. The existing indexes from
-- 20260512100300 cover (viewed_at), (user_id, viewed_at),
-- (path, viewed_at), (org_type, viewed_at), (session_id, viewed_at).
--
-- Two more indexes worth adding:
--   - (organisation_id, viewed_at) for the org-recency rollup view
--   - The daily-volume view groups by date_trunc('day', viewed_at),
--     covered by the existing viewed_at index.
--
-- ticket_messages: existing (ticket_id, created_at). Author lookup
-- is rare, no index needed there.
--
-- walkthrough_videos: small table (~6 rows), no indexes needed
-- beyond the role_key uniqueness and (display_order) the migration
-- already created.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_page_views_org_viewed_at
  ON public.page_views(organisation_id, viewed_at DESC)
  WHERE organisation_id IS NOT NULL;

-- The (path, viewed_at) index from 20260512100300 already covers
-- the top-paths aggregation. The COUNT(DISTINCT user_id || session_id)
-- pattern can't be served by an index but the row volume per path
-- in a 30-day window is small.

-- For the by-org-type rollup, an index on (org_type, viewed_at)
-- already exists from 20260512100300. Confirmed by name match below
-- — this is a no-op safety check that fires only if a prior migration
-- was rolled back partway.
CREATE INDEX IF NOT EXISTS idx_page_views_org_type
  ON public.page_views(org_type, viewed_at DESC);

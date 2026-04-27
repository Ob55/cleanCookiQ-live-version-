-- ============================================================
-- Workstream 2 patch — superseded.
--
-- This file is now a no-op. The cscc_submissions table and the
-- v_supplier_storefronts view are both created by the rewritten,
-- fully-idempotent 20260427000003_ws2_marketplace.sql.
-- Kept as a placeholder so migration history isn't disturbed on
-- environments that already applied the earlier patch.
-- ============================================================

SELECT 1 AS noop;

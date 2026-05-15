-- ============================================================
-- Closes methodology gap (b): two parallel cost models
--
-- Marks the legacy `cost_parameters` row in system_config as
-- deprecated. The platform now uses `technology_profiles` as
-- the single source of truth for per-technology cost data.
-- The row is left in place so historical analyses that still
-- read it don't error, but the description flags its status.
-- ============================================================

UPDATE public.system_config
SET description = 'DEPRECATED — superseded by technology_profiles. Retained for backward compatibility only; not consulted by live calculations.'
WHERE config_key = 'cost_parameters';

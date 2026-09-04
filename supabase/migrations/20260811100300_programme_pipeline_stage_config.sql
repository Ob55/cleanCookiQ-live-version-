-- ============================================================
-- Config-driven pipeline stages + scenario technologies (config-not-code).
--
-- The PRD requires a finance-shaped pipeline (Identified → Assessed →
-- Qualified → Matched → Financed → Installed) WITHOUT hardcoding it, so a
-- deployment programme and a finance programme run on the same code with
-- different config rows. No pipeline_stage enum change is needed — the 14
-- existing enum values already cover these; "Qualified" is a grouping of
-- scored / least_cost_path_assigned.
--
-- Stored in system_config (the existing readiness_input_weights pattern):
--   programme_stages:default         — the current 4-group fallback
--   programme_stages:<programme_id>  — the finance regroup for a programme
--   scenario_technologies:default    — allowed/excluded/benchmark_only techs
--   scenario_technologies:<programme_id>
--
-- ON CONFLICT DO NOTHING so re-running never clobbers an edited config.
-- ============================================================

-- Default stage grouping — byte-identical to the current PIPELINE_STAGES const
-- in src/pages/programme/ProgrammePipelinePage.tsx (the code fallback).
INSERT INTO public.system_config (config_key, config_value, description)
VALUES (
  'programme_stages:default',
  '{"stages": [
     {"label": "Identified",        "keys": ["identified"]},
     {"label": "Assessed / Scored", "keys": ["assessed", "scored"]},
     {"label": "Contracted",        "keys": ["contracted", "in_delivery"]},
     {"label": "Installed",         "keys": ["installed"]}
   ]}'::jsonb,
  'Default programme pipeline stage grouping (fallback for the tenant pipeline board).'
)
ON CONFLICT (config_key) DO NOTHING;

-- IRENA – Taita Taveta finance pipeline regroup.
INSERT INTO public.system_config (config_key, config_value, description)
VALUES (
  'programme_stages:5e68b375-210b-4881-9f18-46c515c4b8ac',
  '{"stages": [
     {"label": "Identified", "keys": ["identified", "contacted"]},
     {"label": "Assessed",   "keys": ["assessed"]},
     {"label": "Qualified",  "keys": ["scored", "least_cost_path_assigned"]},
     {"label": "Matched",    "keys": ["matched", "provider_matched"]},
     {"label": "Financed",   "keys": ["financed"]},
     {"label": "Installed",  "keys": ["installed", "in_delivery", "monitoring", "monitored_dmrv"]}
   ]}'::jsonb,
  'IRENA – Taita Taveta finance-shaped pipeline stages.'
)
ON CONFLICT (config_key) DO NOTHING;

-- Default technology set: everything allowed, nothing excluded, ICS benchmark.
INSERT INTO public.system_config (config_key, config_value, description)
VALUES (
  'scenario_technologies:default',
  '{"allowed": ["biogas", "electric", "biomass_pellets", "briquettes", "ethanol", "lpg"],
    "excluded": [],
    "benchmark_only": ["ics"]}'::jsonb,
  'Default transition-scenario technology set (benchmark_only techs can never be recommended).'
)
ON CONFLICT (config_key) DO NOTHING;

-- IRENA – Taita Taveta: renewable-first, LPG deliberately excluded (not in the
-- proposal''s renewable-first list / against IRENA''s mandate); ICS benchmark.
INSERT INTO public.system_config (config_key, config_value, description)
VALUES (
  'scenario_technologies:5e68b375-210b-4881-9f18-46c515c4b8ac',
  '{"allowed": ["biogas", "electric", "biomass_pellets", "briquettes", "ethanol"],
    "excluded": ["lpg"],
    "benchmark_only": ["ics"]}'::jsonb,
  'IRENA – Taita Taveta renewable-first technology set (LPG excluded, ICS benchmark-only).'
)
ON CONFLICT (config_key) DO NOTHING;

-- Budget line refinements:
--   * category      — expense categorization (Transport, Equipment, Worker pay, ...)
--                     a dropdown value chosen in the UI.
--   * added_by_name — the display name of the user who added the line, captured
--                     at insert time for tracking ("Added by <name>").
-- Both nullable; existing rows keep working.
ALTER TABLE public.programme_budget_lines
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS added_by_name text;

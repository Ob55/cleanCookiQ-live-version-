-- Add all columns referenced in the app but missing from the institutions table
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS consumption_per_term numeric,
  ADD COLUMN IF NOT EXISTS consumption_unit text,
  ADD COLUMN IF NOT EXISTS setup_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ownership_type text,
  ADD COLUMN IF NOT EXISTS wishes_to_transition_steam boolean,
  ADD COLUMN IF NOT EXISTS fuel_of_choice text,
  ADD COLUMN IF NOT EXISTS recommended_solution text,
  ADD COLUMN IF NOT EXISTS annual_savings_ksh numeric,
  ADD COLUMN IF NOT EXISTS co2_reduction_tonnes_pa numeric,
  ADD COLUMN IF NOT EXISTS meals_served_per_day integer,
  ADD COLUMN IF NOT EXISTS ta_required boolean,
  ADD COLUMN IF NOT EXISTS ta_resource_window_start date,
  ADD COLUMN IF NOT EXISTS ta_resource_window_end date,
  ADD COLUMN IF NOT EXISTS ta_type_needed text[];

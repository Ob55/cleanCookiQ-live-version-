-- Add transition target fuel column for institutions
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS transition_target_fuel TEXT;

COMMENT ON COLUMN public.institutions.transition_target_fuel
  IS 'Clean fuel the institution wants to transition to (steam, lpg, biogas, electric, ethanol, biomass_pellets, solar_hybrid, other)';

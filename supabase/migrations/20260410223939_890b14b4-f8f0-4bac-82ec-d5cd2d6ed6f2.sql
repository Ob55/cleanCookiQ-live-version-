
-- System configuration table for scoring weights and cost parameters
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system config"
  ON public.system_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view system config"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default scoring weights
INSERT INTO public.system_config (config_key, config_value, description) VALUES
  ('scoring_weights', '{
    "financial": 20,
    "technical": 20,
    "operational": 15,
    "infrastructure": 15,
    "social": 10,
    "supply_chain": 10,
    "data_quality": 10
  }', 'Readiness scoring dimension weights (must sum to 100)'),
  ('cost_parameters', '{
    "biogas": {"capex_per_student": 1500, "opex_monthly_per_student": 50, "co2_factor": 0.003},
    "electric": {"capex_per_student": 800, "opex_monthly_per_student": 80, "co2_factor": 0.001},
    "lpg": {"capex_per_student": 500, "opex_monthly_per_student": 120, "co2_factor": 0.002},
    "briquettes": {"capex_per_student": 600, "opex_monthly_per_student": 60, "co2_factor": 0.004},
    "solar_thermal": {"capex_per_student": 2000, "opex_monthly_per_student": 30, "co2_factor": 0.0005}
  }', 'Cost parameters per technology type for least-cost engine');

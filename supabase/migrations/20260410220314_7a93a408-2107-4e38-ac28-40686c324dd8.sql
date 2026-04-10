
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'field_agent', 'viewer');
CREATE TYPE public.org_type AS ENUM ('institution', 'supplier', 'funder', 'csr', 'researcher');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.pipeline_stage AS ENUM ('identified', 'assessed', 'matched', 'negotiation', 'contracted', 'installed', 'monitoring');
CREATE TYPE public.institution_type AS ENUM ('school', 'hospital', 'prison', 'factory', 'hotel', 'restaurant', 'other');
CREATE TYPE public.fuel_type AS ENUM ('firewood', 'charcoal', 'lpg', 'biogas', 'electric', 'other');
CREATE TYPE public.assessment_status AS ENUM ('draft', 'submitted', 'reviewed', 'approved');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  org_type public.org_type,
  organisation_id UUID,
  approval_status public.approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Organisations
CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type public.org_type NOT NULL,
  county TEXT,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Add FK from profiles to organisations
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_organisation FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE SET NULL;

-- Institutions
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  institution_type public.institution_type NOT NULL DEFAULT 'other',
  county TEXT NOT NULL,
  sub_county TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  pipeline_stage public.pipeline_stage NOT NULL DEFAULT 'identified',
  meals_per_day INTEGER DEFAULT 0,
  current_fuel public.fuel_type DEFAULT 'firewood',
  number_of_students INTEGER DEFAULT 0,
  number_of_staff INTEGER DEFAULT 0,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Providers
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  services TEXT[],
  technology_types TEXT[],
  counties_served TEXT[],
  rating NUMERIC(3,2) DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Assessments
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assessor_id UUID REFERENCES auth.users(id),
  status public.assessment_status NOT NULL DEFAULT 'draft',
  cooking_patterns JSONB DEFAULT '{}',
  energy_consumption JSONB DEFAULT '{}',
  infrastructure_condition JSONB DEFAULT '{}',
  kitchen_details JSONB DEFAULT '{}',
  documents TEXT[],
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Readiness scores
CREATE TABLE public.readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  overall_score NUMERIC(5,2) DEFAULT 0,
  infrastructure_score NUMERIC(5,2) DEFAULT 0,
  financial_score NUMERIC(5,2) DEFAULT 0,
  operational_score NUMERIC(5,2) DEFAULT 0,
  technical_score NUMERIC(5,2) DEFAULT 0,
  social_score NUMERIC(5,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.readiness_scores ENABLE ROW LEVEL SECURITY;

-- Cost models
CREATE TABLE public.cost_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  technology_type TEXT NOT NULL,
  capex NUMERIC(12,2) DEFAULT 0,
  monthly_opex NUMERIC(10,2) DEFAULT 0,
  current_monthly_fuel_cost NUMERIC(10,2) DEFAULT 0,
  projected_monthly_savings NUMERIC(10,2) DEFAULT 0,
  payback_months INTEGER DEFAULT 0,
  roi_percentage NUMERIC(5,2) DEFAULT 0,
  assumptions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_models ENABLE ROW LEVEL SECURITY;

-- Opportunities
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  technology_required TEXT,
  estimated_value NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open',
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Expressions of interest
CREATE TABLE public.expressions_of_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  proposal_text TEXT,
  proposed_cost NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expressions_of_interest ENABLE ROW LEVEL SECURITY;

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id),
  opportunity_id UUID REFERENCES public.opportunities(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  start_date DATE,
  target_completion DATE,
  actual_completion DATE,
  total_budget NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Project milestones
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER FUNCTION ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_organisations_updated_at BEFORE UPDATE ON public.organisations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cost_models_updated_at BEFORE UPDATE ON public.cost_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, org_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'org_type')::public.org_type, 'institution')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- User roles (admin-only management)
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Organisations
CREATE POLICY "Authenticated users can view organisations" ON public.organisations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage organisations" ON public.organisations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Institutions
CREATE POLICY "Authenticated users can view institutions" ON public.institutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage institutions" ON public.institutions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can manage institutions" ON public.institutions FOR ALL USING (public.has_role(auth.uid(), 'manager'));

-- Providers
CREATE POLICY "Authenticated users can view providers" ON public.providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage providers" ON public.providers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Assessments
CREATE POLICY "Authenticated users can view assessments" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage assessments" ON public.assessments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Field agents can create assessments" ON public.assessments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'field_agent'));
CREATE POLICY "Field agents can update own assessments" ON public.assessments FOR UPDATE USING (auth.uid() = assessor_id);

-- Readiness scores
CREATE POLICY "Authenticated users can view scores" ON public.readiness_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage scores" ON public.readiness_scores FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Cost models
CREATE POLICY "Authenticated users can view cost models" ON public.cost_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage cost models" ON public.cost_models FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Opportunities
CREATE POLICY "Authenticated users can view opportunities" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage opportunities" ON public.opportunities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- EOIs
CREATE POLICY "Authenticated users can view EOIs" ON public.expressions_of_interest FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage EOIs" ON public.expressions_of_interest FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Projects
CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Project milestones
CREATE POLICY "Authenticated users can view milestones" ON public.project_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage milestones" ON public.project_milestones FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit log (admin read-only)
CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ============ INDEXES ============
CREATE INDEX idx_institutions_county ON public.institutions(county);
CREATE INDEX idx_institutions_pipeline_stage ON public.institutions(pipeline_stage);
CREATE INDEX idx_institutions_type ON public.institutions(institution_type);
CREATE INDEX idx_assessments_institution ON public.assessments(institution_id);
CREATE INDEX idx_readiness_scores_institution ON public.readiness_scores(institution_id);
CREATE INDEX idx_cost_models_institution ON public.cost_models(institution_id);
CREATE INDEX idx_opportunities_institution ON public.opportunities(institution_id);
CREATE INDEX idx_projects_institution ON public.projects(institution_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX idx_profiles_approval ON public.profiles(approval_status);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.institutions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

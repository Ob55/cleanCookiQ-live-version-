
-- 1. New columns on institutions table
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS transition_interest text,
  ADD COLUMN IF NOT EXISTS transition_needs text,
  ADD COLUMN IF NOT EXISTS assessment_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assessment_category text,
  ADD COLUMN IF NOT EXISTS has_dedicated_kitchen boolean,
  ADD COLUMN IF NOT EXISTS kitchen_condition text,
  ADD COLUMN IF NOT EXISTS financing_preference text,
  ADD COLUMN IF NOT EXISTS monthly_fuel_spend numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS financial_decision_maker text;

-- 2. New column on opportunities table
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS created_by_name text;

-- 3. Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Funder profiles table
CREATE TABLE public.funder_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organisation_name text NOT NULL,
  full_name text NOT NULL,
  funding_type text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.funder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own funder profile"
  ON public.funder_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own funder profile"
  ON public.funder_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own funder profile"
  ON public.funder_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage funder profiles"
  ON public.funder_profiles FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Funder institution links table
CREATE TABLE public.funder_institution_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funder_id uuid NOT NULL REFERENCES public.funder_profiles(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  UNIQUE(funder_id, institution_id)
);
ALTER TABLE public.funder_institution_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funders can view own links"
  ON public.funder_institution_links FOR SELECT
  TO authenticated
  USING (funder_id IN (SELECT id FROM public.funder_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Funders can create links"
  ON public.funder_institution_links FOR INSERT
  TO authenticated
  WITH CHECK (funder_id IN (SELECT id FROM public.funder_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage links"
  ON public.funder_institution_links FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_funder_profiles_user_id ON public.funder_profiles(user_id);
CREATE INDEX idx_funder_institution_links_funder ON public.funder_institution_links(funder_id);
CREATE INDEX idx_funder_institution_links_institution ON public.funder_institution_links(institution_id);
CREATE INDEX idx_institutions_transition_interest ON public.institutions(transition_interest);

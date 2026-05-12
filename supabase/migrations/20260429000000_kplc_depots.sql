-- Add 'kplc_depot' to org_type enum
ALTER TYPE public.org_type ADD VALUE IF NOT EXISTS 'kplc_depot';

-- Add 'kplc_depot_admin' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kplc_depot_admin';

-- KPLC Depots table
CREATE TABLE IF NOT EXISTS public.kplc_depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  depot_name TEXT NOT NULL,
  depot_type TEXT NOT NULL CHECK (depot_type IN ('regional_office', 'service_depot', 'substation')),
  kplc_license_number TEXT NOT NULL,
  branch_manager_name TEXT NOT NULL,
  county TEXT NOT NULL,
  sub_county TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  setup_completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kplc_depots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "kplc_depots_admin_all" ON public.kplc_depots
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kplc_depots_owner_read" ON public.kplc_depots
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "kplc_depots_owner_insert" ON public.kplc_depots
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "kplc_depots_owner_update" ON public.kplc_depots
  FOR UPDATE USING (created_by = auth.uid());

-- Update the role assignment trigger to handle kplc_depot
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_type text;
  _role public.app_role;
BEGIN
  _org_type := NEW.raw_user_meta_data->>'org_type';

  IF _org_type = 'institution' THEN
    _role := 'institution_admin';
  ELSIF _org_type = 'supplier' THEN
    _role := 'ta_provider';
  ELSIF _org_type = 'funder' THEN
    _role := 'financing_partner';
  ELSIF _org_type = 'kplc_depot' THEN
    _role := 'kplc_depot_admin';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- KPLC depot users default to pending approval
-- (The profiles table default is already 'approved' but we want KPLC to be pending)
-- We handle this in the app by setting approval_status = 'pending' on registration

-- Indexes for kplc_depots
CREATE INDEX IF NOT EXISTS idx_kplc_depots_created_by ON public.kplc_depots(created_by);
CREATE INDEX IF NOT EXISTS idx_kplc_depots_county ON public.kplc_depots(county);
CREATE INDEX IF NOT EXISTS idx_kplc_depots_organisation_id ON public.kplc_depots(organisation_id);


-- Add provider award tracking to opportunities
ALTER TABLE public.opportunities
  ADD COLUMN awarded_provider_id uuid REFERENCES public.providers(id),
  ADD COLUMN awarded_provider_name text,
  ADD COLUMN awarded_provider_contact text;

-- Create institution documents table
CREATE TABLE public.institution_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated can view
CREATE POLICY "Authenticated can view institution documents"
  ON public.institution_documents FOR SELECT TO authenticated USING (true);

-- Uploaders can insert
CREATE POLICY "Users can upload institution documents"
  ON public.institution_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Uploaders can delete their own (not admin)
CREATE POLICY "Users can delete own institution documents"
  ON public.institution_documents FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by);

-- Allow suppliers to update opportunities (take them)
CREATE POLICY "Authenticated can update open opportunities"
  ON public.opportunities FOR UPDATE TO authenticated
  USING (status = 'open');

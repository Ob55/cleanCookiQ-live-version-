-- Create mou_ipa_documents table
CREATE TABLE IF NOT EXISTS public.mou_ipa_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('institution', 'supplier')),
  document_type TEXT NOT NULL CHECK (document_type IN ('mou', 'ipa')),
  organisation_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
  signed_file_url TEXT,
  uploaded_by UUID,
  sign_requested_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organisation_id, document_type)
);

-- Enable RLS
ALTER TABLE public.mou_ipa_documents ENABLE ROW LEVEL SECURITY;

-- Admin/manager/field_agent can do everything
CREATE POLICY "admins_all" ON public.mou_ipa_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'field_agent')
    )
  );

-- Institutions can view/upsert their own IPA
CREATE POLICY "institutions_own_ipa" ON public.mou_ipa_documents
  FOR ALL USING (
    document_type = 'ipa'
    AND organisation_id IN (
      SELECT i.id FROM public.institutions i
      JOIN public.profiles p ON p.organisation_id = i.organisation_id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT i2.id FROM public.institutions i2
      WHERE i2.created_by = auth.uid()
    )
  );

-- Suppliers can view/upsert their own MOU
CREATE POLICY "suppliers_own_mou" ON public.mou_ipa_documents
  FOR ALL USING (
    document_type = 'mou'
    AND organisation_id IN (
      SELECT pr.id FROM public.providers pr
      JOIN public.profiles p ON p.organisation_id = pr.organisation_id
      WHERE p.user_id = auth.uid()
    )
  );

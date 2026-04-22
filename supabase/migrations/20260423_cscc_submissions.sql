-- CSCC (Supplier Certification Checklist) submissions table
CREATE TABLE IF NOT EXISTS public.cscc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL UNIQUE,
  selections JSONB NOT NULL DEFAULT '{}',
  submitted_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.cscc_submissions ENABLE ROW LEVEL SECURITY;

-- Suppliers can read/write their own submission
CREATE POLICY "Suppliers manage own cscc"
  ON public.cscc_submissions
  FOR ALL
  USING (
    provider_id IN (
      SELECT p.id FROM providers p
      JOIN profiles pr ON pr.organisation_id = p.organisation_id
      WHERE pr.user_id = auth.uid()
    )
  );

-- Admins can read all
CREATE POLICY "Admins read all cscc"
  ON public.cscc_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

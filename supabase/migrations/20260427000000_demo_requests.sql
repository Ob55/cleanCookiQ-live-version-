-- Demo booking requests submitted from the public /book-demo page
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demo_requests_created_at_idx
  ON public.demo_requests (created_at DESC);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Inserts go through the book-demo edge function (service role), which bypasses RLS.
-- Admins can read submissions from the dashboard.
CREATE POLICY "Admins read demo requests"
  ON public.demo_requests
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));


CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers
FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
FOR INSERT TO anon, authenticated WITH CHECK (true);

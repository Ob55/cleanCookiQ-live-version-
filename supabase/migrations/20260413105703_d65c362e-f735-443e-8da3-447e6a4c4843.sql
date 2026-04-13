-- Allow anonymous/public users to view institutions (for the public map)
CREATE POLICY "Public can view institutions"
ON public.institutions
FOR SELECT
TO anon
USING (true);

-- Allow anonymous/public users to view organisations (for the public map)
CREATE POLICY "Public can view organisations"
ON public.organisations
FOR SELECT
TO anon
USING (true);

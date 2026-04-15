CREATE POLICY "Authenticated can view all links"
ON public.funder_institution_links
FOR SELECT
TO authenticated
USING (true);
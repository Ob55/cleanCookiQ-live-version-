CREATE POLICY "Funders can delete own links"
ON public.funder_institution_links
FOR DELETE
TO authenticated
USING (funder_id IN (
  SELECT id FROM public.funder_profiles WHERE user_id = auth.uid()
));
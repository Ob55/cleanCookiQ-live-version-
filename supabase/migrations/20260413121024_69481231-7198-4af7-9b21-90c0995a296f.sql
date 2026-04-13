
-- Allow authenticated users to insert providers (for supplier setup)
CREATE POLICY "Authenticated users can create providers"
ON public.providers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own org's provider
CREATE POLICY "Users can update own org providers"
ON public.providers
FOR UPDATE
TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

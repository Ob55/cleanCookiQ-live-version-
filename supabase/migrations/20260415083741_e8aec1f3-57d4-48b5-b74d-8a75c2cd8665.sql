
DROP POLICY "Authenticated can update open opportunities" ON public.opportunities;

CREATE POLICY "Authenticated can update open opportunities"
ON public.opportunities
FOR UPDATE
TO authenticated
USING (status = 'open')
WITH CHECK (true);

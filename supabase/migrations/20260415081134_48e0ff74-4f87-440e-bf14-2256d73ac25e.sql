
ALTER TABLE public.support_tickets 
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.support_tickets 
  ADD COLUMN IF NOT EXISTS raised_by_email text,
  ADD COLUMN IF NOT EXISTS raised_by_name text,
  ADD COLUMN IF NOT EXISTS raised_by_role text,
  ADD COLUMN IF NOT EXISTS admin_reply text;

-- Allow users to view their own tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = raised_by);

-- Allow users to create tickets
CREATE POLICY "Users can create tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = raised_by);

-- Allow admins to update tickets (already covered by ALL policy)

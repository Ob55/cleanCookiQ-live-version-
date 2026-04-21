-- Allow institution_admin and institution_user to INSERT their own institution record
CREATE POLICY "Institution users can create own institution"
  ON public.institutions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'institution_admin'::app_role)
      OR public.has_role(auth.uid(), 'institution_user'::app_role)
    )
  );

-- Allow institution_admin and institution_user to UPDATE institutions they created
CREATE POLICY "Institution users can update own institution"
  ON public.institutions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'institution_admin'::app_role)
      OR public.has_role(auth.uid(), 'institution_user'::app_role)
    )
  )
  WITH CHECK (
    auth.uid() = created_by
  );

-- Allow institution users to SELECT their own institution (in addition to the existing general auth policy)
CREATE POLICY "Institution users can select own institution"
  ON public.institutions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

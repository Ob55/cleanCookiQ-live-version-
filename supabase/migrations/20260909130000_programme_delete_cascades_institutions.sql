-- Deleting a programme should also delete its institutions, not orphan them.
--
-- Originally institutions.programme_id was ON DELETE SET NULL, so removing a
-- programme kept its institutions as unassigned rows. That silently inflated the
-- national pipeline counts (Total Institutions, funnel) with data the user
-- thought they had removed. Switch it to ON DELETE CASCADE so a programme delete
-- cleanly removes the institutions it owns.
ALTER TABLE public.institutions
  DROP CONSTRAINT IF EXISTS institutions_programme_id_fkey;
ALTER TABLE public.institutions
  ADD CONSTRAINT institutions_programme_id_fkey
  FOREIGN KEY (programme_id) REFERENCES public.programmes(id) ON DELETE CASCADE;

-- Every other FK to institutions already cascades or sets null, EXCEPT
-- financing_applications (NO ACTION) — which would abort the cascade for any
-- institution that has an application. Cascade it too so institution deletion
-- (directly, or via the programme cascade above) also clears its applications.
ALTER TABLE public.financing_applications
  DROP CONSTRAINT IF EXISTS financing_applications_institution_id_fkey;
ALTER TABLE public.financing_applications
  ADD CONSTRAINT financing_applications_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;

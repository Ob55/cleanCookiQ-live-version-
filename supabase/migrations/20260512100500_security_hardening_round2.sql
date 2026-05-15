-- ============================================================
-- Round-2 security hardening.
--
-- Closes findings from the second deeper audit:
--
--   1. SECURITY DEFINER functions written in earlier hardening
--      passes were missing `SET search_path = public`. Mutable
--      search paths in SECURITY DEFINER bodies are a classic
--      privilege-escalation vector (Postgres lint advisory 0011).
--      Patched: enforce_ticket_author, notify_on_ticket_message.
--
--   2. rfq_responses had a wide-open SELECT policy ("Authenticated
--      can view responses USING (true)") — supplier quote pricing
--      was visible to every authenticated user, including
--      competing suppliers. Tightened to: admin + responding
--      supplier only.
--
--   3. opportunities had a wide-open UPDATE policy ("Authenticated
--      can update open opportunities USING (status='open')") —
--      any authenticated user could mutate any open opportunity.
--      Tightened to: admin/manager only.
--
--   4. Storage buckets (institution-assets, supplier-assets)
--      allowed any authenticated user to UPDATE/DELETE anyone
--      else's files because the policy only matched bucket_id.
--      Tightened to: the first folder component must equal the
--      caller's auth.uid().
--
--   5. Public storage buckets had no file_size_limit. Added a
--      10 MB cap so the buckets cannot be abused for arbitrary
--      hosting / cost-amplification.
--
-- Findings NOT fixed in this migration (flagged for follow-up):
--
--   - Many tables still carry "Authenticated USING (true)" SELECT
--     policies (institutions, providers, projects, opportunities,
--     institution_documents, financing_applications, etc.).
--     Whether this is "by design" (visible-pipeline platform) or
--     a leak depends on per-table sensitivity. institution_documents
--     and financing_applications carry PII / financial data and
--     should be tightened in a follow-up that maps every reader's
--     legitimate access path.
--
--   - readiness_scores and assessments leak institutional
--     competitive data to every authenticated user. Likely worth
--     tightening to "the institution itself + admin + funder
--     evaluating the deal".
--
--   - storage bucket public-read on institution-assets means signed
--     IPA documents are world-readable by URL. Recommend moving
--     to a private bucket with signed-URL access.
-- ============================================================

-- ---------- 1. SECURITY DEFINER search_path fixes ----------
CREATE OR REPLACE FUNCTION public.enforce_ticket_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.raised_by IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.raised_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_ticket_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  excerpt       TEXT;
BEGIN
  SELECT id, title, raised_by, raised_by_name
    INTO ticket_record
    FROM public.support_tickets
    WHERE id = NEW.ticket_id;

  excerpt := CASE
    WHEN length(NEW.body) > 140 THEN substring(NEW.body FROM 1 FOR 137) || '…'
    ELSE NEW.body
  END;

  IF NEW.author_role = 'staff' THEN
    IF ticket_record.raised_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body)
      VALUES (
        ticket_record.raised_by,
        'New reply on: ' || ticket_record.title,
        excerpt
      );
    END IF;
  ELSE
    INSERT INTO public.notifications (user_id, title, body)
    SELECT ur.user_id,
           'New ticket message: ' || ticket_record.title,
           COALESCE(ticket_record.raised_by_name, 'A user') || ': ' || excerpt
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'manager')
      AND ur.user_id <> NEW.author_id;
  END IF;

  UPDATE public.support_tickets
    SET updated_at = NOW()
    WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$;

-- ---------- 2. rfq_responses SELECT tightening ----------
-- rfq_responses has no created_by column. The link from the caller to
-- "their" responses goes through:
--   auth.uid()  →  profiles.user_id
--   profiles.organisation_id  →  providers.organisation_id
--   providers.id  =  rfq_responses.provider_id
DROP POLICY IF EXISTS "Authenticated can view responses"          ON public.rfq_responses;
DROP POLICY IF EXISTS "rfq_responses_supplier_or_admin_read"      ON public.rfq_responses;

CREATE POLICY "rfq_responses_supplier_or_admin_read"
  ON public.rfq_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers prov
      JOIN public.profiles pr ON pr.organisation_id = prov.organisation_id
      WHERE prov.id = rfq_responses.provider_id
        AND pr.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- ---------- 3. opportunities UPDATE tightening ----------
DROP POLICY IF EXISTS "Authenticated can update open opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_admin_update"                  ON public.opportunities;

CREATE POLICY "opportunities_admin_update"
  ON public.opportunities
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- ---------- 4. Storage UPDATE/DELETE tightening ----------
-- Path convention used across the frontend:
--   {category}/{user_id}/{timestamp}.{ext}
--   e.g. "documents/<uuid>/1715593200000.pdf"
--   e.g. "ipa-signed/<uuid>/1715593200000.docx"
-- So the user's UUID is the SECOND folder element.
-- See https://supabase.com/docs/guides/storage/security/access-control.

-- Drop both the old (wide) policy names AND the new (narrow) ones so
-- this block is idempotent on re-run.
DROP POLICY IF EXISTS "Authenticated users can update institution assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update own supplier assets"      ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete own supplier assets"      ON storage.objects;
DROP POLICY IF EXISTS "institution_assets_owner_update"                   ON storage.objects;
DROP POLICY IF EXISTS "institution_assets_owner_delete"                   ON storage.objects;
DROP POLICY IF EXISTS "supplier_assets_owner_update"                      ON storage.objects;
DROP POLICY IF EXISTS "supplier_assets_owner_delete"                      ON storage.objects;

CREATE POLICY "institution_assets_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'institution-assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "institution_assets_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'institution-assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "supplier_assets_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'supplier-assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "supplier_assets_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'supplier-assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Also restrict INSERT path-prefix so a user cannot upload INTO
-- another user's namespace. Replace the wide-open inserts.
-- Drop both old and new names for idempotence.
DROP POLICY IF EXISTS "Authenticated users can upload institution assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload supplier assets"          ON storage.objects;
DROP POLICY IF EXISTS "institution_assets_owner_insert"                   ON storage.objects;
DROP POLICY IF EXISTS "supplier_assets_owner_insert"                      ON storage.objects;

CREATE POLICY "institution_assets_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'institution-assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "supplier_assets_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-assets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ---------- 5. Storage size caps ----------
-- 10 MB / file. Adjust upward if scanned-document uploads need more.
UPDATE storage.buckets
  SET file_size_limit = 10 * 1024 * 1024
  WHERE id IN ('institution-assets', 'supplier-assets')
    AND (file_size_limit IS NULL OR file_size_limit > 10 * 1024 * 1024);

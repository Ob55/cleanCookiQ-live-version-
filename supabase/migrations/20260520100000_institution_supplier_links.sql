-- ============================================================
-- Institution ↔ Supplier link table
--
-- Admin operators select a supplier (provider) + an optional subset of
-- products and link them to a specific institution. The institution then
-- sees those suppliers / products on their "Supplier Details" page, and
-- gets a bell notification the moment the link is created.
--
-- RLS:
--   - admin / manager / field_agent → full access
--   - institution owner (created_by or profile.organisation_id) → SELECT own
--   - supplier (provider org) → SELECT their own outbound links
--
-- A trigger creates a notifications row for the institution owner on insert.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.institution_supplier_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT institution_supplier_links_unique UNIQUE (institution_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_supplier_links_institution_id
  ON public.institution_supplier_links (institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_supplier_links_provider_id
  ON public.institution_supplier_links (provider_id);

ALTER TABLE public.institution_supplier_links ENABLE ROW LEVEL SECURITY;

-- Admins / managers / field agents — full access
DROP POLICY IF EXISTS "Admins manage institution_supplier_links" ON public.institution_supplier_links;
CREATE POLICY "Admins manage institution_supplier_links" ON public.institution_supplier_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'field_agent')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'field_agent')
    )
  );

-- Institution owner — read links to their own institution
DROP POLICY IF EXISTS "Institutions read own supplier links" ON public.institution_supplier_links;
CREATE POLICY "Institutions read own supplier links" ON public.institution_supplier_links
  FOR SELECT
  USING (
    institution_id IN (
      SELECT id FROM public.institutions WHERE created_by = auth.uid()
      UNION
      SELECT organisation_id FROM public.profiles
      WHERE user_id = auth.uid() AND organisation_id IS NOT NULL
    )
  );

-- Supplier — read links sent to their org (so they know they've been shared)
DROP POLICY IF EXISTS "Suppliers read own outbound links" ON public.institution_supplier_links;
CREATE POLICY "Suppliers read own outbound links" ON public.institution_supplier_links
  FOR SELECT
  USING (
    provider_id IN (
      SELECT p.id FROM public.providers p
      JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
      WHERE pr.user_id = auth.uid()
    )
  );

-- ============================================================
-- Notification trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_institution_on_supplier_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  profile_owner_id UUID;
  provider_name TEXT;
BEGIN
  SELECT created_by INTO owner_id
  FROM public.institutions
  WHERE id = NEW.institution_id;

  -- Fallback to any user whose profile.organisation_id matches
  IF owner_id IS NULL THEN
    SELECT user_id INTO profile_owner_id
    FROM public.profiles
    WHERE organisation_id = NEW.institution_id
    LIMIT 1;
    owner_id := profile_owner_id;
  END IF;

  SELECT name INTO provider_name
  FROM public.providers
  WHERE id = NEW.provider_id;

  IF owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      owner_id,
      'New Supplier Shared With You',
      format(
        'Admin has linked %s to your institution. Open the Supplier Details page to view their products and contacts.',
        COALESCE(provider_name, 'a supplier')
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_institution_on_supplier_link
  ON public.institution_supplier_links;
CREATE TRIGGER trg_notify_institution_on_supplier_link
  AFTER INSERT ON public.institution_supplier_links
  FOR EACH ROW EXECUTE FUNCTION public.notify_institution_on_supplier_link();

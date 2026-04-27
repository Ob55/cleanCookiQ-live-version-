-- ============================================================
-- Allow anonymous (logged-out) visitors to read VERIFIED providers
-- on the public /providers page. Pre-existing policy required
-- authentication.
--
-- Only verified=TRUE rows are exposed publicly.
-- Existing authenticated-read policy continues to apply for the
-- broader provider directory in admin/supplier portals.
-- ============================================================

DROP POLICY IF EXISTS "Verified providers public read" ON public.providers;
CREATE POLICY "Verified providers public read" ON public.providers
  FOR SELECT
  USING (verified = TRUE);

-- Also allow anon to read the supplier-storefront view (which already
-- filters by what the underlying providers RLS allows). Granting SELECT
-- in case the default privilege didn't carry over.
GRANT SELECT ON public.v_supplier_storefronts TO anon;
GRANT SELECT ON public.providers              TO anon;

-- ============================================================
-- Workstream 2: Marketplace Surface
--
-- FULLY IDEMPOTENT — safe to re-run after a partial failure.
-- Every CREATE POLICY is preceded by DROP POLICY IF EXISTS.
-- Every CREATE TABLE uses IF NOT EXISTS.
-- Every ALTER TABLE uses ADD COLUMN IF NOT EXISTS.
-- Every CREATE VIEW uses CREATE OR REPLACE.
-- cscc_submissions is created defensively because the supplier-
-- storefront view depends on it.
--
-- Tables:
--   cscc_submissions   - (created if missing) supplier compliance checklist
--   product_categories - taxonomy (Biogas, LPG, Electric, ...)
--   provider_products  - extended with category, sku, certification, etc.
--   product_images     - multiple photos per product
--   quote_requests     - public RFQ flow (institution -> supplier)
--   quote_messages     - threaded message log per request
--   product_reviews    - buyer reviews; verified-buyer flag derived
-- ============================================================

-- ============================================================
-- 0. cscc_submissions (defensive — needed by the storefront view)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cscc_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   TEXT NOT NULL UNIQUE,
  selections    JSONB NOT NULL DEFAULT '{}',
  submitted_by  UUID REFERENCES auth.users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cscc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suppliers manage own cscc"            ON public.cscc_submissions;
DROP POLICY IF EXISTS "Admins read all cscc"                 ON public.cscc_submissions;
DROP POLICY IF EXISTS "cscc_public_read_for_storefront"      ON public.cscc_submissions;

CREATE POLICY "Suppliers manage own cscc" ON public.cscc_submissions
  FOR ALL USING (
    provider_id IN (
      SELECT p.id::text FROM public.providers p
      JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
      WHERE pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins read all cscc" ON public.cscc_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "cscc_public_read_for_storefront" ON public.cscc_submissions
  FOR SELECT USING (true);

-- ============================================================
-- 1. PRODUCT CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  parent_id    UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  description  TEXT,
  display_order INTEGER NOT NULL DEFAULT 100,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_active ON public.product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_id);

DROP TRIGGER IF EXISTS trg_product_categories_updated_at ON public.product_categories;
CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_public_read" ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_admin_write" ON public.product_categories;

CREATE POLICY "product_categories_public_read" ON public.product_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "product_categories_admin_write" ON public.product_categories
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- ============================================================
-- 2. EXTEND provider_products
-- ============================================================
ALTER TABLE public.provider_products
  ADD COLUMN IF NOT EXISTS category_id      UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slug             TEXT,
  ADD COLUMN IF NOT EXISTS sku              TEXT,
  ADD COLUMN IF NOT EXISTS price_currency   TEXT NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS specifications   JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS datasheet_url    TEXT,
  ADD COLUMN IF NOT EXISTS warranty_months  INTEGER,
  ADD COLUMN IF NOT EXISTS in_stock         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_listed        BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_provider_products_category ON public.provider_products(category_id);
CREATE INDEX IF NOT EXISTS idx_provider_products_listed
  ON public.provider_products(is_listed) WHERE is_listed = TRUE;
CREATE INDEX IF NOT EXISTS idx_provider_products_slug ON public.provider_products(slug);

DROP POLICY IF EXISTS "Listed products public read" ON public.provider_products;
CREATE POLICY "Listed products public read" ON public.provider_products
  FOR SELECT USING (is_listed = TRUE);

-- ============================================================
-- 3. PRODUCT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.provider_products(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  alt_text      TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, display_order);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_images_public_read"     ON public.product_images;
DROP POLICY IF EXISTS "product_images_supplier_write"  ON public.product_images;

CREATE POLICY "product_images_public_read" ON public.product_images
  FOR SELECT USING (true);

CREATE POLICY "product_images_supplier_write" ON public.product_images
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.provider_products pp
    WHERE pp.id = product_id AND pp.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.provider_products pp
    WHERE pp.id = product_id AND pp.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- ============================================================
-- 4. QUOTE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES public.provider_products(id) ON DELETE SET NULL,
  provider_id       UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  buyer_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_org_id      UUID,
  buyer_county      TEXT,
  quantity          INTEGER NOT NULL DEFAULT 1,
  message           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','quoted','accepted','rejected','withdrawn','expired')),
  quoted_amount     NUMERIC,
  quoted_currency   TEXT NOT NULL DEFAULT 'KES',
  quoted_at         TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  opportunity_id    UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_provider ON public.quote_requests(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_buyer ON public.quote_requests(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON public.quote_requests(status);

DROP TRIGGER IF EXISTS trg_quote_requests_updated_at ON public.quote_requests;
CREATE TRIGGER trg_quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_requests_buyer_read"      ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_buyer_insert"    ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_buyer_withdraw"  ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_supplier_access" ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_admin_all"       ON public.quote_requests;

CREATE POLICY "quote_requests_buyer_read" ON public.quote_requests
  FOR SELECT USING (buyer_user_id = auth.uid());

CREATE POLICY "quote_requests_buyer_insert" ON public.quote_requests
  FOR INSERT WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "quote_requests_buyer_withdraw" ON public.quote_requests
  FOR UPDATE
  USING (buyer_user_id = auth.uid())
  WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "quote_requests_supplier_access" ON public.quote_requests
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.providers p
    JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
    WHERE p.id = provider_id AND pr.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers p
    JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
    WHERE p.id = provider_id AND pr.user_id = auth.uid()
  ));

CREATE POLICY "quote_requests_admin_all" ON public.quote_requests
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- ============================================================
-- 5. QUOTE MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id  UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  sender_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role       TEXT NOT NULL CHECK (sender_role IN ('buyer','supplier','admin')),
  body              TEXT NOT NULL,
  attachment_url    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_messages_request ON public.quote_messages(quote_request_id, created_at);

ALTER TABLE public.quote_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_messages_participant_access" ON public.quote_messages;

CREATE POLICY "quote_messages_participant_access" ON public.quote_messages
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quote_requests q
    WHERE q.id = quote_request_id
      AND (
        q.buyer_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.providers p
          JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
          WHERE p.id = q.provider_id AND pr.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role IN ('admin','manager')
        )
      )
  ))
  WITH CHECK (sender_user_id = auth.uid());

-- ============================================================
-- 6. PRODUCT REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.provider_products(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT,
  is_verified_buyer BOOLEAN NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id, is_published);

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER trg_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_reviews_public_read" ON public.product_reviews;
DROP POLICY IF EXISTS "product_reviews_self_write"  ON public.product_reviews;
DROP POLICY IF EXISTS "product_reviews_admin_all"   ON public.product_reviews;

CREATE POLICY "product_reviews_public_read" ON public.product_reviews
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "product_reviews_self_write" ON public.product_reviews
  FOR ALL
  USING (reviewer_user_id = auth.uid())
  WITH CHECK (reviewer_user_id = auth.uid());

CREATE POLICY "product_reviews_admin_all" ON public.product_reviews
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','manager')
  ));

-- ============================================================
-- 7. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.v_product_review_stats AS
SELECT
  product_id,
  ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
  COUNT(*)                       AS review_count,
  COUNT(*) FILTER (WHERE is_verified_buyer) AS verified_buyer_count
FROM public.product_reviews
WHERE is_published = TRUE
GROUP BY product_id;

CREATE OR REPLACE VIEW public.v_marketplace_products AS
SELECT
  pp.id,
  pp.provider_id,
  pp.name,
  pp.description,
  pp.price,
  pp.price_currency,
  pp.image_url,
  pp.slug,
  pp.sku,
  pp.specifications,
  pp.certifications,
  pp.datasheet_url,
  pp.warranty_months,
  pp.in_stock,
  pp.is_listed,
  pp.created_at,
  pp.updated_at,
  pp.category_id,
  pc.slug AS category_slug,
  pc.name AS category_name,
  pr.name AS provider_name,
  pr.counties_served AS provider_counties,
  pr.verified AS provider_verified,
  COALESCE(rs.avg_rating, 0) AS avg_rating,
  COALESCE(rs.review_count, 0) AS review_count
FROM public.provider_products pp
LEFT JOIN public.product_categories pc ON pc.id = pp.category_id
LEFT JOIN public.providers pr ON pr.id = pp.provider_id
LEFT JOIN public.v_product_review_stats rs ON rs.product_id = pp.id
WHERE pp.is_listed = TRUE;

CREATE OR REPLACE VIEW public.v_supplier_storefronts AS
SELECT
  pr.id,
  pr.organisation_id,
  pr.name,
  pr.services,
  pr.technology_types,
  pr.counties_served,
  pr.rating,
  pr.verified,
  pr.contact_person,
  pr.contact_email,
  pr.contact_phone,
  pr.website,
  pr.created_at,
  pr.updated_at,
  cs.selections AS cscc_selections,
  cs.updated_at AS cscc_updated_at,
  (
    SELECT COUNT(*) FROM public.provider_products pp
    WHERE pp.provider_id = pr.id AND pp.is_listed = TRUE
  ) AS listed_product_count,
  (
    SELECT COUNT(*) FROM public.provider_services ps
    WHERE ps.provider_id = pr.id
  ) AS service_count
FROM public.providers pr
LEFT JOIN public.cscc_submissions cs ON cs.provider_id = pr.id::text;

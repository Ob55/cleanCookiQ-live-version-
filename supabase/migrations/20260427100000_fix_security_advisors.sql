-- ============================================================
-- Security Advisor fixes for WS0-WS2 migrations.
--
-- Two classes of issue flagged by Supabase Advisor:
--
-- 1. CRITICAL: SECURITY DEFINER views (default Postgres behavior).
--    Views run with the creator's privileges (postgres superuser),
--    bypassing RLS on underlying tables. Fix: WITH (security_invoker=true)
--    so each view runs with the caller's privileges and RLS is enforced
--    on the underlying tables.
--
-- 2. WARN: Auth RLS Initialization Plan.
--    Inline auth.uid() inside RLS predicates is re-evaluated per row.
--    Fix: wrap in (SELECT auth.uid()) so it is evaluated once per query.
--
-- Scope: only the 7 views and 12 tables introduced by WS0-WS2.
-- Pre-existing tables (profiles, user_roles, etc.) are out of scope
-- here and would be touched by a separate migration on the platform's
-- existing baseline.
-- ============================================================

-- ============================================================
-- 1. RECREATE VIEWS WITH security_invoker=true
-- ============================================================

DROP VIEW IF EXISTS public.v_county_intelligence_summary;
DROP VIEW IF EXISTS public.v_county_metrics;
DROP VIEW IF EXISTS public.v_latest_county_fuel_prices;
DROP VIEW IF EXISTS public.v_active_data_points;
DROP VIEW IF EXISTS public.v_marketplace_products;
DROP VIEW IF EXISTS public.v_supplier_storefronts;
DROP VIEW IF EXISTS public.v_product_review_stats;

-- WS0: active data points
CREATE VIEW public.v_active_data_points
WITH (security_invoker = true) AS
SELECT
  dp.*,
  c.name  AS county_name,
  c.code  AS county_code,
  ds.slug AS source_slug,
  ds.title AS source_title,
  ds.publisher AS source_publisher,
  ds.url AS source_url,
  ds.confidence_level AS source_confidence
FROM public.data_points dp
JOIN public.data_sources ds ON ds.id = dp.source_id
LEFT JOIN public.counties c ON c.id = dp.county_id
WHERE dp.superseded_by IS NULL
  AND dp.valid_from <= CURRENT_DATE
  AND (dp.valid_until IS NULL OR dp.valid_until >= CURRENT_DATE)
  AND ds.is_active = TRUE;

-- WS1: latest county fuel prices
CREATE VIEW public.v_latest_county_fuel_prices
WITH (security_invoker = true) AS
SELECT DISTINCT ON (cfp.county_id, cfp.fuel_type)
  cfp.id,
  cfp.county_id,
  c.code AS county_code,
  c.name AS county_name,
  cfp.fuel_type,
  cfp.price_numeric,
  cfp.unit,
  cfp.observed_on,
  cfp.source_id,
  ds.slug AS source_slug,
  ds.title AS source_title,
  ds.publisher AS source_publisher,
  ds.url AS source_url,
  ds.confidence_level AS source_confidence,
  cfp.notes
FROM public.county_fuel_prices cfp
JOIN public.counties     c  ON c.id = cfp.county_id
JOIN public.data_sources ds ON ds.id = cfp.source_id
WHERE ds.is_active = TRUE
ORDER BY cfp.county_id, cfp.fuel_type, cfp.observed_on DESC;

-- WS1: live county metrics
CREATE VIEW public.v_county_metrics
WITH (security_invoker = true) AS
WITH inst_agg AS (
  SELECT
    county,
    COUNT(*)                                                              AS institutions_count,
    COUNT(*) FILTER (WHERE pipeline_stage IN ('assessed','matched','negotiation','contracted','installed','monitoring')) AS assessed_or_later_count,
    COUNT(*) FILTER (WHERE pipeline_stage IN ('installed','monitoring'))  AS transitioned_count,
    MODE() WITHIN GROUP (ORDER BY current_fuel)                           AS dominant_fuel,
    COALESCE(SUM(meals_per_day), 0)                                       AS total_meals_per_day,
    COALESCE(SUM(number_of_students), 0)                                  AS total_students
  FROM public.institutions
  WHERE county IS NOT NULL
  GROUP BY county
),
prov_agg AS (
  SELECT
    county_name,
    COUNT(*) AS providers_serving_count
  FROM public.providers,
       LATERAL UNNEST(COALESCE(counties_served, ARRAY[]::TEXT[])) AS county_name
  GROUP BY county_name
)
SELECT
  c.id           AS county_id,
  c.code         AS county_code,
  c.name         AS county_name,
  c.region       AS region,
  c.capital      AS capital,
  COALESCE(ia.institutions_count, 0)        AS institutions_count,
  COALESCE(ia.assessed_or_later_count, 0)   AS assessed_count,
  COALESCE(ia.transitioned_count, 0)        AS transitioned_count,
  ia.dominant_fuel                          AS dominant_fuel,
  COALESCE(ia.total_meals_per_day, 0)       AS total_meals_per_day,
  COALESCE(ia.total_students, 0)            AS total_students,
  COALESCE(pa.providers_serving_count, 0)   AS providers_serving_count
FROM public.counties c
LEFT JOIN inst_agg ia ON ia.county = c.name
LEFT JOIN prov_agg pa ON pa.county_name = c.name;

-- WS1: county intelligence summary
CREATE VIEW public.v_county_intelligence_summary
WITH (security_invoker = true) AS
SELECT
  m.*,
  COALESCE(p.policy_count, 0) AS policy_count,
  COALESCE(f.fuel_price_count, 0) AS fuel_price_count
FROM public.v_county_metrics m
LEFT JOIN (
  SELECT county_id, COUNT(*) AS policy_count
  FROM public.county_policies
  WHERE is_active = TRUE
  GROUP BY county_id
) p ON p.county_id = m.county_id
LEFT JOIN (
  SELECT county_id, COUNT(*) AS fuel_price_count
  FROM public.v_latest_county_fuel_prices
  GROUP BY county_id
) f ON f.county_id = m.county_id;

-- WS2: product review stats
CREATE VIEW public.v_product_review_stats
WITH (security_invoker = true) AS
SELECT
  product_id,
  ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
  COUNT(*)                       AS review_count,
  COUNT(*) FILTER (WHERE is_verified_buyer) AS verified_buyer_count
FROM public.product_reviews
WHERE is_published = TRUE
GROUP BY product_id;

-- WS2: marketplace products
CREATE VIEW public.v_marketplace_products
WITH (security_invoker = true) AS
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

-- WS2: supplier storefronts
CREATE VIEW public.v_supplier_storefronts
WITH (security_invoker = true) AS
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

-- ============================================================
-- 2. RE-CREATE POLICIES WITH (SELECT auth.uid()) PATTERN
--    (one block per table; each block drops its own policies first)
-- ============================================================

-- ---------- WS0: counties ----------
DROP POLICY IF EXISTS "counties_public_read"  ON public.counties;
DROP POLICY IF EXISTS "counties_admin_write"  ON public.counties;
CREATE POLICY "counties_public_read" ON public.counties
  FOR SELECT USING (true);
CREATE POLICY "counties_admin_write" ON public.counties
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ));

-- ---------- WS0: data_sources ----------
DROP POLICY IF EXISTS "data_sources_public_read"  ON public.data_sources;
DROP POLICY IF EXISTS "data_sources_admin_write"  ON public.data_sources;
CREATE POLICY "data_sources_public_read" ON public.data_sources
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "data_sources_admin_write" ON public.data_sources
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ));

-- ---------- WS0: data_points ----------
DROP POLICY IF EXISTS "data_points_public_read"  ON public.data_points;
DROP POLICY IF EXISTS "data_points_admin_write"  ON public.data_points;
CREATE POLICY "data_points_public_read" ON public.data_points
  FOR SELECT USING (true);
CREATE POLICY "data_points_admin_write" ON public.data_points
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ));

-- ---------- WS0: evidence_attachments ----------
DROP POLICY IF EXISTS "evidence_admin_all"          ON public.evidence_attachments;
DROP POLICY IF EXISTS "evidence_authenticated_read" ON public.evidence_attachments;
DROP POLICY IF EXISTS "evidence_self_insert"        ON public.evidence_attachments;
CREATE POLICY "evidence_admin_all" ON public.evidence_attachments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager', 'field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager', 'field_agent')
  ));
CREATE POLICY "evidence_authenticated_read" ON public.evidence_attachments
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "evidence_self_insert" ON public.evidence_attachments
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = uploaded_by);

-- ---------- WS1: county_policies ----------
DROP POLICY IF EXISTS "county_policies_public_read"  ON public.county_policies;
DROP POLICY IF EXISTS "county_policies_admin_write"  ON public.county_policies;
CREATE POLICY "county_policies_public_read" ON public.county_policies
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "county_policies_admin_write" ON public.county_policies
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ));

-- ---------- WS1: county_fuel_prices ----------
DROP POLICY IF EXISTS "county_fuel_prices_public_read"  ON public.county_fuel_prices;
DROP POLICY IF EXISTS "county_fuel_prices_admin_write"  ON public.county_fuel_prices;
CREATE POLICY "county_fuel_prices_public_read" ON public.county_fuel_prices
  FOR SELECT USING (true);
CREATE POLICY "county_fuel_prices_admin_write" ON public.county_fuel_prices
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager', 'field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager', 'field_agent')
  ));

-- ---------- WS2: cscc_submissions ----------
DROP POLICY IF EXISTS "Suppliers manage own cscc"            ON public.cscc_submissions;
DROP POLICY IF EXISTS "Admins read all cscc"                 ON public.cscc_submissions;
DROP POLICY IF EXISTS "cscc_public_read_for_storefront"      ON public.cscc_submissions;
CREATE POLICY "Suppliers manage own cscc" ON public.cscc_submissions
  FOR ALL USING (
    provider_id IN (
      SELECT p.id::text FROM public.providers p
      JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
      WHERE pr.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Admins read all cscc" ON public.cscc_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
    )
  );
CREATE POLICY "cscc_public_read_for_storefront" ON public.cscc_submissions
  FOR SELECT USING (true);

-- ---------- WS2: product_categories ----------
DROP POLICY IF EXISTS "product_categories_public_read"  ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_admin_write"  ON public.product_categories;
CREATE POLICY "product_categories_public_read" ON public.product_categories
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "product_categories_admin_write" ON public.product_categories
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ));

-- ---------- WS2: provider_products (the policy WS2 added) ----------
DROP POLICY IF EXISTS "Listed products public read" ON public.provider_products;
CREATE POLICY "Listed products public read" ON public.provider_products
  FOR SELECT USING (is_listed = TRUE);

-- ---------- WS2: product_images ----------
DROP POLICY IF EXISTS "product_images_public_read"     ON public.product_images;
DROP POLICY IF EXISTS "product_images_supplier_write"  ON public.product_images;
CREATE POLICY "product_images_public_read" ON public.product_images
  FOR SELECT USING (true);
CREATE POLICY "product_images_supplier_write" ON public.product_images
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.provider_products pp
    WHERE pp.id = product_id AND pp.created_by = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.provider_products pp
    WHERE pp.id = product_id AND pp.created_by = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ));

-- ---------- WS2: quote_requests ----------
DROP POLICY IF EXISTS "quote_requests_buyer_read"      ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_buyer_insert"    ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_buyer_withdraw"  ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_supplier_access" ON public.quote_requests;
DROP POLICY IF EXISTS "quote_requests_admin_all"       ON public.quote_requests;
CREATE POLICY "quote_requests_buyer_read" ON public.quote_requests
  FOR SELECT USING (buyer_user_id = (SELECT auth.uid()));
CREATE POLICY "quote_requests_buyer_insert" ON public.quote_requests
  FOR INSERT WITH CHECK (buyer_user_id = (SELECT auth.uid()));
CREATE POLICY "quote_requests_buyer_withdraw" ON public.quote_requests
  FOR UPDATE
  USING (buyer_user_id = (SELECT auth.uid()))
  WITH CHECK (buyer_user_id = (SELECT auth.uid()));
CREATE POLICY "quote_requests_supplier_access" ON public.quote_requests
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.providers p
    JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
    WHERE p.id = provider_id AND pr.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers p
    JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
    WHERE p.id = provider_id AND pr.user_id = (SELECT auth.uid())
  ));
CREATE POLICY "quote_requests_admin_all" ON public.quote_requests
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ));

-- ---------- WS2: quote_messages ----------
DROP POLICY IF EXISTS "quote_messages_participant_access" ON public.quote_messages;
CREATE POLICY "quote_messages_participant_access" ON public.quote_messages
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quote_requests q
    WHERE q.id = quote_request_id
      AND (
        q.buyer_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.providers p
          JOIN public.profiles pr ON pr.organisation_id = p.organisation_id
          WHERE p.id = q.provider_id AND pr.user_id = (SELECT auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
        )
      )
  ))
  WITH CHECK (sender_user_id = (SELECT auth.uid()));

-- ---------- WS2: product_reviews ----------
DROP POLICY IF EXISTS "product_reviews_public_read" ON public.product_reviews;
DROP POLICY IF EXISTS "product_reviews_self_write"  ON public.product_reviews;
DROP POLICY IF EXISTS "product_reviews_admin_all"   ON public.product_reviews;
CREATE POLICY "product_reviews_public_read" ON public.product_reviews
  FOR SELECT USING (is_published = TRUE);
CREATE POLICY "product_reviews_self_write" ON public.product_reviews
  FOR ALL
  USING (reviewer_user_id = (SELECT auth.uid()))
  WITH CHECK (reviewer_user_id = (SELECT auth.uid()));
CREATE POLICY "product_reviews_admin_all" ON public.product_reviews
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

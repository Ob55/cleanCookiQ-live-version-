-- ============================================================
-- Grant SELECT on every WS0-WS8 view to anon + authenticated.
--
-- Why: when 20260427100000_fix_security_advisors.sql DROP+CREATE'd the
-- views to add WITH (security_invoker = true), the default-privileges
-- grants from the public schema didn't always carry over for the
-- already-existing anon/authenticated roles. Anonymous users hitting
-- the public /counties page see no rows because the SELECT itself is
-- denied (before RLS even gets a chance to filter).
--
-- This migration is purely additive: it grants SELECT to anon and
-- authenticated on the views. Underlying RLS still gates which rows
-- each role can actually see. Safe to re-run.
-- ============================================================

GRANT SELECT ON public.v_active_data_points          TO anon, authenticated;
GRANT SELECT ON public.v_county_metrics              TO anon, authenticated;
GRANT SELECT ON public.v_latest_county_fuel_prices   TO anon, authenticated;
GRANT SELECT ON public.v_county_intelligence_summary TO anon, authenticated;

GRANT SELECT ON public.v_marketplace_products        TO anon, authenticated;
GRANT SELECT ON public.v_supplier_storefronts        TO anon, authenticated;
GRANT SELECT ON public.v_product_review_stats        TO anon, authenticated;

GRANT SELECT ON public.v_event_summary               TO anon, authenticated;

GRANT SELECT ON public.v_delivery_summary            TO authenticated;
GRANT SELECT ON public.v_risk_summary                TO authenticated;
GRANT SELECT ON public.v_monitoring_latest           TO authenticated;
GRANT SELECT ON public.v_carbon_summary              TO authenticated;

GRANT SELECT ON public.v_funder_deal_flow            TO authenticated;
GRANT SELECT ON public.v_funder_portfolio_summary    TO authenticated;

-- Also grant SELECT on the underlying public-readable tables we added,
-- in case the same default-privileges gap affects them.
GRANT SELECT ON public.counties                            TO anon, authenticated;
GRANT SELECT ON public.data_sources                        TO anon, authenticated;
GRANT SELECT ON public.data_points                         TO anon, authenticated;
GRANT SELECT ON public.county_policies                     TO anon, authenticated;
GRANT SELECT ON public.county_fuel_prices                  TO anon, authenticated;
GRANT SELECT ON public.product_categories                  TO anon, authenticated;
GRANT SELECT ON public.product_images                      TO anon, authenticated;
GRANT SELECT ON public.policies                            TO anon, authenticated;
GRANT SELECT ON public.resources                           TO anon, authenticated;
GRANT SELECT ON public.news_articles                       TO anon, authenticated;
GRANT SELECT ON public.events                              TO anon, authenticated;
GRANT SELECT ON public.product_reviews                     TO anon, authenticated;
GRANT SELECT ON public.commissioning_checklist_templates   TO anon, authenticated;

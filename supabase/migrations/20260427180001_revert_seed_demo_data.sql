-- ============================================================
-- DEMO DATA ROLLBACK — ALL TABLES, ONE MIGRATION.
--
-- Surgical inverse of 20260427180000_seed_demo_data.sql.
-- Wrapped in BEGIN/COMMIT — atomic. Safe to re-run.
--
-- Identifies seed rows by markers, never by mere name overlap:
--   - institutions / providers / installation_crews:
--       contact_email LIKE '%.example'
--   - provider_products:                              sku LIKE 'CCQDEMO-%'
--   - projects:                                       title LIKE '%[CCQ-DEMO]'
--   - deliveries:                                     tracking_ref LIKE 'CCQ-DEMO-%'
--   - carbon_projects:                                registry_project_id LIKE 'CCQDEMO-%'
--   - funder_preferences:                             name LIKE '%[CCQ-DEMO]'
--   - mou_ipa_documents:                              organisation_name LIKE '%[CCQ-DEMO]'
--   - portfolios:                                     name LIKE '[CCQ-DEMO]%'
--   - newsletter_subscribers:                         demo*@example.com
--   - demo_requests:                                  name LIKE '%[CCQ-DEMO]%'
--   - opportunities, institution_needs, quote_requests, evidence_attachments,
--     coinvestment_intros, product_reviews, provider_services, provider_documents:
--                                                     marker LIKE '%[CCQ-DEMO]%'
--   - assessments / monitoring / cost_models / portfolios.description /
--     project_milestones / delivery_events / acceptance_signoffs /
--     credit_verifications / funder_attribution_ledger / supplier_interest /
--     expressions_of_interest / quote_messages / county_fuel_prices.notes /
--     credit_estimates / product_images:
--                                                     marker LIKE '%[seed]%'
--   - resource_downloads:                             user_agent LIKE 'CCQ-DEMO%'
--   - onboarding_progress:                            data::text LIKE '%[CCQ-DEMO]%'
--   - cscc_submissions:                               provider_id matches a demo provider
--   - event_registrations:                            email = 'attendee@example.com'
--   - county_policies / events / news_articles / resources / policies:
--                                                     by exact slug or title
--
-- Anything you created via the UI without these markers is left alone.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABLES WITHOUT CASCADE (delete first, by marker)
-- ============================================================

-- Onboarding
DELETE FROM public.onboarding_progress
WHERE data::text LIKE '%[CCQ-DEMO]%';

-- Funder rollups (cascade from project/org but mark explicit)
DELETE FROM public.funder_attribution_ledger
WHERE source_methodology LIKE '%[seed]%';
DELETE FROM public.funder_portfolio
WHERE notes LIKE '%[CCQ-DEMO]%';
DELETE FROM public.coinvestment_intros
WHERE message LIKE '%[CCQ-DEMO]%';
DELETE FROM public.funder_preferences
WHERE name LIKE '%[CCQ-DEMO]';

-- Evidence + downloads + reviews + registrations + quotes
DELETE FROM public.evidence_attachments
WHERE description LIKE '%[CCQ-DEMO]%';
DELETE FROM public.resource_downloads
WHERE user_agent LIKE 'CCQ-DEMO%';
DELETE FROM public.product_reviews
WHERE title LIKE '%[CCQ-DEMO]%';
DELETE FROM public.event_registrations
WHERE email = 'attendee@example.com';
DELETE FROM public.quote_messages
WHERE body LIKE '%[seed]%';
DELETE FROM public.quote_requests
WHERE message LIKE '%[CCQ-DEMO]%';

-- Subscribers + demo requests + portfolios (independent tables)
DELETE FROM public.newsletter_subscribers
WHERE email IN ('demo1@example.com','demo2@example.com','demo3@example.com','demo4@example.com','demo5@example.com');
DELETE FROM public.demo_requests
WHERE name LIKE '%[CCQ-DEMO]%';
DELETE FROM public.portfolios
WHERE name LIKE '[CCQ-DEMO]%';

-- CSCC submissions — provider_id is TEXT, not FK
DELETE FROM public.cscc_submissions
WHERE provider_id IN (SELECT id::text FROM public.providers WHERE contact_email LIKE '%.example');

-- MOU/IPA docs — organisation_id is plain UUID, not FK
DELETE FROM public.mou_ipa_documents
WHERE organisation_name LIKE '%[CCQ-DEMO]';

-- ============================================================
-- 2. CHILD ROWS WITH CASCADE — explicit cleanup before parents
--    (so the rollback works even if cascades misbehave)
-- ============================================================

DELETE FROM public.acceptance_signoffs    WHERE notes LIKE '%[seed]%';
DELETE FROM public.commissioning_checklists
  WHERE delivery_id IN (SELECT id FROM public.deliveries WHERE tracking_ref LIKE 'CCQ-DEMO-%');
DELETE FROM public.delivery_events        WHERE body  LIKE '%[seed]%';
DELETE FROM public.project_milestones     WHERE title LIKE '%[seed]%';
DELETE FROM public.credit_verifications   WHERE notes LIKE '%[seed]%';
DELETE FROM public.product_images         WHERE alt_text LIKE '%[seed]%';
DELETE FROM public.provider_documents     WHERE title LIKE '%[CCQ-DEMO]%';
DELETE FROM public.provider_services      WHERE name  LIKE '%[CCQ-DEMO]%';
DELETE FROM public.supplier_interest      WHERE message LIKE '%[seed]%';
DELETE FROM public.institution_needs      WHERE description LIKE '%[CCQ-DEMO]%';
DELETE FROM public.expressions_of_interest WHERE proposal_text LIKE '%[seed]%';
DELETE FROM public.opportunities          WHERE title LIKE '%[CCQ-DEMO]%';
DELETE FROM public.cost_models            WHERE assumptions::text LIKE '%[seed]%';
DELETE FROM public.readiness_scores
  WHERE institution_id IN (SELECT id FROM public.institutions WHERE contact_email LIKE '%.example');
DELETE FROM public.assessments            WHERE reviewer_notes LIKE '%[seed]%';

-- The relapse-trigger ticket on the demo project
DELETE FROM public.support_tickets
WHERE title = 'Refresher training required (relapse detected)'
  AND project_id IN (SELECT id FROM public.projects WHERE title LIKE '%[CCQ-DEMO]');

-- ============================================================
-- 3. PARENT ROWS — cascades sweep up anything missed above
-- ============================================================

-- Demo project — cascades to deliveries (and their events/checklists/signoffs),
-- monitoring_readings, risk_register, carbon_projects, credit_estimates,
-- credit_verifications
DELETE FROM public.projects               WHERE title LIKE '%[CCQ-DEMO]';

-- Installation crews
DELETE FROM public.installation_crews     WHERE contact_email LIKE '%.example';

-- Provider products (SKU prefix marker)
DELETE FROM public.provider_products      WHERE sku LIKE 'CCQDEMO-%';

-- Providers + institutions (cascades remaining children)
DELETE FROM public.providers              WHERE contact_email LIKE '%.example';
DELETE FROM public.institutions           WHERE contact_email LIKE '%.example';

-- ============================================================
-- 4. SLUG/TITLE-KEYED CONTENT
-- ============================================================

DELETE FROM public.events
WHERE slug IN (
  'kenya-clean-cooking-summit-2026','biogas-webinar-2026q2','lpg-safety-workshop-mombasa',
  'funders-roundtable-q3','past-launch-event','past-biogas-field-day'
);

DELETE FROM public.news_articles
WHERE slug IN (
  'cleancookiq-launch','kiambu-county-pledge','summit-2026-recap',
  'biogas-pilot-mater','kenya-nationally-determined-contribution-update'
);

DELETE FROM public.resources
WHERE slug IN (
  'institutional-lpg-installation-guide','biogas-feasibility-toolkit',
  'cca-cookstove-benchmarks','mou-template-supplier','case-study-st-marys-kiambu',
  'clean-cooking-101-training','financing-pitch-deck-template','kenya-county-fuel-survey-2025'
);

DELETE FROM public.county_policies
WHERE title IN (
  'Nairobi CIDP 2023-2027 — Energy Pillar',
  'Nairobi Air Quality Bylaws 2024',
  'Kiambu County Education Energy Strategy',
  'Mombasa Coastal Biomass Conservation Notice'
);

DELETE FROM public.policies
WHERE slug IN (
  'epra-lpg-pricing-2026','kebs-cookstove-ks2861','kra-vat-zero-rating-2024',
  'nema-eia-biogas','clean-cooking-bill-2025','ndc-2030-cooking'
);

DELETE FROM public.county_fuel_prices
WHERE notes LIKE '%[seed]';

COMMIT;

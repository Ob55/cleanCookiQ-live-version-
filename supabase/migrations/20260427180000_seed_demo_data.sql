-- ============================================================
-- DEMO DATA SEED — ALL TABLES, ONE MIGRATION.
--
-- Floods every table that can be populated without minting fake users:
--   policies, county_policies, county_fuel_prices, resources, news_articles,
--   events, institutions, providers, provider_products, projects, deliveries,
--   monitoring_readings, carbon_projects, credit_estimates, credit_verifications,
--   installation_crews, assessments, readiness_scores, cost_models,
--   opportunities, expressions_of_interest, institution_needs, supplier_interest,
--   provider_services, provider_documents, product_images, product_reviews,
--   project_milestones, delivery_events, commissioning_checklists,
--   acceptance_signoffs, mou_ipa_documents, cscc_submissions, portfolios,
--   demo_requests, newsletter_subscribers, event_registrations, quote_requests,
--   quote_messages, resource_downloads, evidence_attachments,
--   funder_preferences, funder_portfolio, funder_attribution_ledger,
--   coinvestment_intros, onboarding_progress.
--
-- SAFETY: every demo row carries a marker (`[CCQ-DEMO]`, `[seed]`,
-- `.example` email, `CCQDEMO-` SKU prefix). The matching rollback
-- migration deletes only marker-tagged rows, so anything you created
-- through the UI is untouched.
--
-- Auth-tied tables (event_registrations, quote_*, evidence_attachments,
-- onboarding_progress, supplier_interest, provider_documents,
-- funder_portfolio, funder_attribution_ledger, product_reviews) need a
-- real auth.users id. We pick the FIRST existing user; if there isn't
-- one yet, those inserts are skipped with a NOTICE.
-- ============================================================

-- ============================================================
-- PURE SQL INSERTS (no lookups required)
-- ============================================================

-- ---------- POLICIES (slug-keyed; safe) ----------
INSERT INTO public.policies (slug, title, jurisdiction, policy_type, status, effective_date, summary, full_text_url, applies_to_org_types, applies_to_fuels, tags) VALUES
  ('epra-lpg-pricing-2026','EPRA Maximum Retail Price Schedule for LPG','national','regulation','in_force','2026-01-01',
   'EPRA gazettes the maximum retail price for LPG (13kg, 6kg) and refilling each month.',
   'https://www.epra.go.ke/services/economic-regulation/petroleum/petroleum-pricing/',
   ARRAY['supplier','institution']::text[], ARRAY['lpg']::text[], ARRAY['epra','lpg','pricing']::text[]),
  ('kebs-cookstove-ks2861','KEBS Standard KS 2861 — Performance & Safety of Biomass Cookstoves','sectoral','standard','in_force','2024-09-01',
   'Mandatory performance, safety, and durability requirements for institutional biomass cookstoves.',
   'https://webstore.kebs.org/',
   ARRAY['supplier']::text[], ARRAY['firewood','charcoal']::text[], ARRAY['kebs','biomass','standard']::text[]),
  ('kra-vat-zero-rating-2024','KRA VAT Act Schedule — Clean Cooking Equipment Zero-Rating','national','tax','in_force','2024-07-01',
   'Equipment classified as clean cooking solutions is zero-rated for VAT.',
   'https://kra.go.ke/',
   ARRAY['institution','supplier','funder']::text[], ARRAY[]::text[], ARRAY['kra','vat','tax-incentive']::text[]),
  ('nema-eia-biogas','NEMA EIA Requirements for Biogas Digesters > 10m³','national','regulation','in_force','2018-01-01',
   'Environmental Impact Assessment licence required from NEMA for biogas digesters over 10 cubic metres.',
   'https://www.nema.go.ke/',
   ARRAY['institution','supplier']::text[], ARRAY['biogas']::text[], ARRAY['nema','biogas','eia']::text[]),
  ('clean-cooking-bill-2025','Draft Clean Cooking Bill 2025','national','bill','proposed',NULL,
   'Proposed framework legislation for the clean cooking sector.',
   NULL, ARRAY['institution','supplier','funder']::text[], ARRAY[]::text[], ARRAY['legislation','draft']::text[]),
  ('ndc-2030-cooking','Kenya NDC 2030 — Clean Cooking Targets','international','strategy','in_force','2020-12-01',
   'Universal access to clean cooking solutions by 2030.',
   'https://unfccc.int/', ARRAY['institution','funder']::text[], ARRAY[]::text[], ARRAY['ndc','climate','2030']::text[])
ON CONFLICT (slug) DO NOTHING;

-- ---------- COUNTY POLICIES (no UNIQUE on title — guard by NOT EXISTS) ----------
INSERT INTO public.county_policies (county_id, title, jurisdiction, policy_type, status, effective_date, summary)
SELECT c.id, v.title, v.jurisdiction, v.policy_type, v.status, v.effective_date::date, v.summary
FROM (VALUES
  ('Nairobi','Nairobi CIDP 2023-2027 — Energy Pillar','county','CIDP','in_force','2023-07-01',
   'County allocation of KSh 800M over five years for clean cooking transitions.'),
  ('Nairobi','Nairobi Air Quality Bylaws 2024','county','bylaw','in_force','2024-04-01',
   'Restricts open-fire cooking at institutional facilities.'),
  ('Kiambu','Kiambu County Education Energy Strategy','county','strategy','in_force','2024-01-01',
   'Targets 100% of public secondary schools transitioning to LPG or biogas by end of 2027.'),
  ('Mombasa','Mombasa Coastal Biomass Conservation Notice','county','gazette','in_force','2025-03-15',
   'Restricts charcoal sourcing from coastal mangrove forests.')
) AS v(county_name,title,jurisdiction,policy_type,status,effective_date,summary)
JOIN public.counties c ON c.name = v.county_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.county_policies cp
  WHERE cp.county_id = c.id AND cp.title = v.title
);

-- ---------- COUNTY FUEL PRICES ----------
INSERT INTO public.county_fuel_prices (county_id, fuel_type, price_numeric, unit, source_id, observed_on, notes)
SELECT c.id, v.fuel_type, v.price_numeric, v.unit, ds.id, (CURRENT_DATE - v.days_ago)::date, v.notes
FROM (VALUES
  ('Nairobi','lpg',     265,'KSh/kg', 7,'Westlands wholesale [seed]'),
  ('Nairobi','electric',27, 'KSh/kWh',7,'KPLC SC1 institutional [seed]'),
  ('Nairobi','charcoal',130,'KSh/kg', 7,'Eastleigh market [seed]'),
  ('Kiambu', 'firewood',7500,'KSh/tonne',14,'Limuru farm-gate [seed]'),
  ('Kiambu', 'lpg',     255,'KSh/kg', 14,'Kiambu town [seed]'),
  ('Mombasa','lpg',     270,'KSh/kg', 21,'Mombasa port-discounted [seed]'),
  ('Mombasa','charcoal',110,'KSh/kg', 21,'Likoni [seed]'),
  ('Kisumu', 'lpg',     268,'KSh/kg', 5,'Kisumu town [seed]'),
  ('Kisumu', 'firewood',7200,'KSh/tonne',5,'Kano plains [seed]'),
  ('Nakuru', 'lpg',     258,'KSh/kg', 10,'Nakuru town [seed]'),
  ('Nakuru', 'electric',26, 'KSh/kWh',10,'KPLC SC1 [seed]')
) AS v(county_name, fuel_type, price_numeric, unit, days_ago, notes)
JOIN public.counties c     ON c.name = v.county_name
JOIN public.data_sources ds ON ds.slug = 'epra-petroleum-pricing-2026'
WHERE NOT EXISTS (
  SELECT 1 FROM public.county_fuel_prices cfp
  WHERE cfp.county_id = c.id AND cfp.fuel_type = v.fuel_type AND cfp.notes = v.notes
);

-- ---------- RESOURCES (slug-keyed) ----------
INSERT INTO public.resources (slug, title, resource_type, audience, description, file_url, file_size_bytes, page_count, tags, requires_signin, is_published, published_at) VALUES
  ('institutional-lpg-installation-guide','Institutional LPG Installation Guide','guide',
   ARRAY['supplier','institution']::text[],
   'Step-by-step installation guide for institutional LPG cylinder banks. KEBS-aligned.',
   'https://example.org/lpg-guide.pdf',2400000,42,
   ARRAY['lpg','installation','kebs']::text[],FALSE,TRUE,NOW() - INTERVAL '30 days'),
  ('biogas-feasibility-toolkit','Biogas Feasibility Toolkit','toolkit',
   ARRAY['institution','supplier']::text[],
   'Excel toolkit for sizing institutional biogas digesters from kitchen feed waste estimates.',
   'https://example.org/biogas-toolkit.xlsx',850000,NULL,
   ARRAY['biogas','sizing','feasibility']::text[],TRUE,TRUE,NOW() - INTERVAL '60 days'),
  ('cca-cookstove-benchmarks','CCA Cookstove Benchmarks Report 2024','report',
   ARRAY['funder','researcher']::text[],
   'Annual benchmarks compendium covering stove efficiency, indoor air quality, and household uptake.',
   'https://cleancooking.org/benchmarks-2024.pdf',5100000,96,
   ARRAY['benchmarks','cca','impact']::text[],FALSE,TRUE,NOW() - INTERVAL '90 days'),
  ('mou-template-supplier','MOU Template — Supplier ↔ Institution','template',
   ARRAY['supplier','institution']::text[],
   'Standard MOU template adopted by CleanCookiQ. Editable Word format.',
   'https://example.org/mou-template.docx',120000,8,
   ARRAY['mou','template']::text[],TRUE,TRUE,NOW() - INTERVAL '120 days'),
  ('case-study-st-marys-kiambu','Case Study: St Mary''s Kiambu — Firewood to LPG Transition','case_study',
   ARRAY['institution','funder']::text[],
   '12-month account of a 480-pupil school transition with cash flows and post-install monitoring.',
   'https://example.org/case-st-marys.pdf',1800000,24,
   ARRAY['case-study','lpg','school']::text[],FALSE,TRUE,NOW() - INTERVAL '14 days'),
  ('clean-cooking-101-training','Clean Cooking 101 — Cook Training Module','training_module',
   ARRAY['institution']::text[],
   'Half-day training script for kitchen staff transitioning to a new fuel.',
   'https://example.org/training-101.pdf',920000,18,
   ARRAY['training','cooks','safety']::text[],TRUE,TRUE,NOW() - INTERVAL '45 days'),
  ('financing-pitch-deck-template','Financing Pitch Deck Template','presentation',
   ARRAY['institution']::text[],
   'Editable PowerPoint template institutions can use to pitch to funders.',
   'https://example.org/pitch-deck.pptx',3400000,NULL,
   ARRAY['financing','pitch','template']::text[],TRUE,TRUE,NOW() - INTERVAL '7 days'),
  ('kenya-county-fuel-survey-2025','Kenya County Fuel Price Dataset 2025','dataset',
   ARRAY['researcher','funder']::text[],
   'Quarterly dataset of fuel prices observed across all 47 counties.',
   'https://example.org/county-fuel-2025.csv',480000,NULL,
   ARRAY['dataset','prices','county']::text[],TRUE,TRUE,NOW() - INTERVAL '21 days')
ON CONFLICT (slug) DO NOTHING;

-- ---------- NEWS (slug-keyed) ----------
INSERT INTO public.news_articles (slug, title, summary, body_markdown, author_name, status, published_at, tags) VALUES
  ('cleancookiq-launch','CleanCookiQ launches the Kenyan clean-cooking marketplace',
   'A national platform connecting institutions, suppliers, funders, and researchers in a single coordination layer.',
   'Today we''re launching CleanCookiQ — the first one-stop platform for Kenya''s clean cooking transition...',
   'Ignis Innovation','published',NOW() - INTERVAL '5 days', ARRAY['launch','platform']::text[]),
  ('kiambu-county-pledge','Kiambu commits to 100% clean cooking in secondary schools by 2027',
   'County Government of Kiambu allocates KSh 1.2 billion over four years.',
   'Kiambu Governor announced the multi-year programme at the County Assembly today...',
   'CleanCookiQ Newsroom','published',NOW() - INTERVAL '12 days', ARRAY['kiambu','schools','financing']::text[]),
  ('summit-2026-recap','Recap: Kenya Clean Cooking Summit 2026',
   'Three days, 600 delegates, 24 deals signed.',
   'The third annual Kenya Clean Cooking Summit closed yesterday with...',
   'CleanCookiQ Newsroom','published',NOW() - INTERVAL '20 days', ARRAY['summit','recap','events']::text[]),
  ('biogas-pilot-mater','Mater Hospital biogas pilot delivers 38% LPG cost reduction',
   'Six months in, the institutional biogas digester at Mater Hospital is meeting 38% of demand.',
   'When Mater Hospital partnered with CleanCookiQ in early 2025...',
   'Dr Ann Kimani','published',NOW() - INTERVAL '35 days', ARRAY['biogas','hospital','case-study']::text[]),
  ('kenya-nationally-determined-contribution-update','How Kenya''s updated NDC affects clean cooking funders',
   'A breakdown of what the NDC update means for carbon credit eligibility.',
   'The updated NDC Kenya submitted to UNFCCC last week...',
   'Policy Desk','published',NOW() - INTERVAL '50 days', ARRAY['policy','ndc','carbon']::text[])
ON CONFLICT (slug) DO NOTHING;

-- ---------- EVENTS (slug-keyed) ----------
INSERT INTO public.events (slug, title, description, event_type, start_at, end_at, timezone, location_type, venue_name, venue_address, registration_required, capacity, organiser, contact_email, tags, is_published, status, recording_url) VALUES
  ('kenya-clean-cooking-summit-2026','Kenya Clean Cooking Summit 2026',
   'Annual sector gathering — three days of plenaries, workshops, and an exhibition floor.',
   'summit', NOW() + INTERVAL '60 days', NOW() + INTERVAL '62 days',
   'Africa/Nairobi','in_person','KICC','Harambee Avenue, Nairobi',
   TRUE, 600, 'CleanCookiQ × NREP','summit@cleancookiq.com',
   ARRAY['summit','annual']::text[], TRUE, 'upcoming', NULL),
  ('biogas-webinar-2026q2','Webinar: Sizing institutional biogas digesters',
   'Practical session on sizing, feedstock planning, and ongoing operation.',
   'webinar', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '90 minutes',
   'Africa/Nairobi','virtual', NULL, NULL,
   TRUE, NULL, 'CleanCookiQ Tech Team','webinars@cleancookiq.com',
   ARRAY['webinar','biogas','training']::text[], TRUE, 'upcoming', NULL),
  ('lpg-safety-workshop-mombasa','LPG Safety Workshop — Mombasa',
   'Half-day workshop for kitchen staff on LPG safety.',
   'workshop', NOW() + INTERVAL '21 days', NOW() + INTERVAL '21 days' + INTERVAL '5 hours',
   'Africa/Nairobi','in_person','Sarova Whitesands','Bamburi Road, Mombasa',
   TRUE, 80, 'EPRA × CleanCookiQ','safety@cleancookiq.com',
   ARRAY['workshop','lpg','safety']::text[], TRUE, 'upcoming', NULL),
  ('funders-roundtable-q3','Funders Roundtable: Blended finance for institutional cooking',
   'Closed-door discussion among DFIs, banks, and grant-makers.',
   'workshop', NOW() + INTERVAL '90 days', NOW() + INTERVAL '90 days' + INTERVAL '4 hours',
   'Africa/Nairobi','hybrid','Capital Club','Westlands, Nairobi',
   TRUE, 30, 'CleanCookiQ','funders@cleancookiq.com',
   ARRAY['funders','blended-finance']::text[], TRUE, 'upcoming', NULL),
  ('past-launch-event','Platform Launch Event 2025',
   'Recording of the platform launch event held in Nairobi.',
   'launch', NOW() - INTERVAL '120 days', NOW() - INTERVAL '120 days' + INTERVAL '2 hours',
   'Africa/Nairobi','in_person','iHub','Ngong Road, Nairobi',
   FALSE, 200, 'CleanCookiQ','hello@cleancookiq.com',
   ARRAY['launch','past']::text[], TRUE, 'past', 'https://example.org/recordings/launch-2025.mp4'),
  ('past-biogas-field-day','Biogas Field Day — Mater Hospital',
   'Open day at Mater Hospital showcasing their institutional biogas system.',
   'field_visit', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days' + INTERVAL '6 hours',
   'Africa/Nairobi','in_person','Mater Misericordiae Hospital','Eastleigh, Nairobi',
   FALSE, 50, 'Mater × CleanCookiQ','tours@cleancookiq.com',
   ARRAY['field-day','biogas','past']::text[], TRUE, 'past', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ---------- INSTITUTIONS (guarded by NOT EXISTS on name) ----------
INSERT INTO public.institutions
  (name, institution_type, county, sub_county, current_fuel, meals_per_day, number_of_students, number_of_staff, contact_person, contact_phone, contact_email, pipeline_stage, latitude, longitude)
SELECT v.* FROM (VALUES
  ('St Mary''s Primary School',         'school'::public.institution_type,      'Kiambu',  'Kikuyu',     'firewood'::public.fuel_type, 480,  480, 25, 'Jane Wanjiru',     '+254700000001', 'head@stmarys.example',     'assessed'::public.pipeline_stage,   -1.265, 36.667),
  ('Mater Misericordiae Hospital',     'hospital'::public.institution_type,    'Nairobi', 'Kamukunji',  'lpg'::public.fuel_type,     1500,  NULL, 320, 'Dr Ann Kimani',    '+254700000002', 'admin@mater.example',      'monitoring'::public.pipeline_stage, -1.276, 36.853),
  ('Naivasha Maximum Prison',          'prison'::public.institution_type,      'Nakuru',  'Naivasha',   'firewood'::public.fuel_type, 2400, NULL, 180, 'Officer Mwangi',   '+254700000003', 'naivashamax@kps.example',  'matched'::public.pipeline_stage,    -0.717, 36.430),
  ('PCEA Lang''ata Boys',              'school'::public.institution_type,      'Nairobi', 'Lang''ata',  'charcoal'::public.fuel_type,  800,  600, 45, 'Headmaster Kamau', '+254700000004', 'principal@pcealangata.example', 'identified'::public.pipeline_stage, -1.351, 36.760),
  ('Coast General Hospital',           'hospital'::public.institution_type,    'Mombasa', 'Mvita',      'lpg'::public.fuel_type,     2200,  NULL, 410, 'Sister Atieno',    '+254700000005', 'kitchen@coastgeneral.example', 'contracted'::public.pipeline_stage, -4.063, 39.668),
  ('Kakamega High School',             'school'::public.institution_type,      'Kakamega','Lurambi',    'firewood'::public.fuel_type,1600, 1400, 75, 'Principal Wekesa', '+254700000006', 'principal@kakhigh.example', 'assessed'::public.pipeline_stage,   0.282, 34.751),
  ('Eldoret Polytechnic',              'school'::public.institution_type,      'Uasin Gishu','Eldoret East','lpg'::public.fuel_type, 900,  720, 80, 'Mrs Cherono',      '+254700000007', 'catering@eldoretpoly.example', 'installed'::public.pipeline_stage,  0.519, 35.270),
  ('Kisumu Boys High',                 'school'::public.institution_type,      'Kisumu',  'Kisumu Central','charcoal'::public.fuel_type, 1100, 950, 60, 'Mr Otieno',     '+254700000008', 'admin@kisumuboys.example', 'matched'::public.pipeline_stage,    -0.103, 34.752),
  ('Salvation Army Children''s Home',  'faith_based'::public.institution_type, 'Nairobi', 'Embakasi',   'firewood'::public.fuel_type, 220,  180, 18, 'Sister Ruth',      '+254700000009', 'home@salvarmy.example',    'identified'::public.pipeline_stage, -1.323, 36.890),
  ('Kabete Vet Lab Cafeteria',         'restaurant'::public.institution_type,  'Kiambu',  'Kabete',     'lpg'::public.fuel_type,      350,  NULL, 12, 'Chef David',       '+254700000010', 'chef@kabetevet.example',   'monitoring'::public.pipeline_stage, -1.252, 36.715),
  ('Mombasa Beach Resort',             'hotel'::public.institution_type,       'Mombasa', 'Nyali',      'lpg'::public.fuel_type,      600,  NULL, 95, 'Chef Kiprop',      '+254700000011', 'fb@mombasabeach.example',  'identified'::public.pipeline_stage, -4.025, 39.722),
  ('Kitale Tea Factory Canteen',       'factory'::public.institution_type,     'Trans Nzoia','Kwanza',  'firewood'::public.fuel_type,  450, NULL, 30, 'Supervisor Otto',  '+254700000012', 'canteen@kitaletea.example', 'assessed'::public.pipeline_stage,   1.020, 35.000),
  ('AIC Kapsabet Girls',               'school'::public.institution_type,      'Nandi',   'Emgwen',     'firewood'::public.fuel_type, 1200, 1050, 65, 'Mrs Bett',         '+254700000013', 'principal@aickapsabet.example', 'matched'::public.pipeline_stage, 0.203, 35.099),
  ('Pumwani Maternity Hospital',       'hospital'::public.institution_type,    'Nairobi', 'Kamukunji',  'lpg'::public.fuel_type,      900,  NULL, 220, 'Matron Akinyi',    '+254700000014', 'matron@pumwani.example',   'installed'::public.pipeline_stage,  -1.278, 36.852),
  ('Garissa Teachers'' Training',      'school'::public.institution_type,      'Garissa', 'Garissa Township','firewood'::public.fuel_type, 650, 480, 40, 'Mr Hassan',     '+254700000015', 'principal@gtt.example',    'identified'::public.pipeline_stage, -0.453, 39.646)
) AS v(name, institution_type, county, sub_county, current_fuel, meals_per_day, number_of_students, number_of_staff, contact_person, contact_phone, contact_email, pipeline_stage, latitude, longitude)
WHERE NOT EXISTS (SELECT 1 FROM public.institutions i WHERE i.name = v.name);

-- ---------- PROVIDERS (guarded by NOT EXISTS) ----------
INSERT INTO public.providers
  (name, services, technology_types, counties_served, rating, verified, contact_person, contact_email, contact_phone, website)
SELECT v.* FROM (VALUES
  ('EcoMoto Industries',     ARRAY['supply','installation']::text[],            ARRAY['solar','electric']::text[], ARRAY['Mombasa','Kilifi','Kwale','Lamu']::text[],         4.7, TRUE,  'Anne Mwangale','sales@ecomoto.example','+254710000001','https://ecomoto.example'),
  ('GreenStove Africa',      ARRAY['supply','training']::text[],                ARRAY['firewood','charcoal']::text[], ARRAY['Nakuru','Nyandarua','Nyeri','Kiambu']::text[], 4.4, TRUE,  'Peter Kamau',  'hello@greenstove.example','+254710000002','https://greenstove.example'),
  ('SafariGas Ltd',          ARRAY['supply','installation','maintenance']::text[], ARRAY['lpg']::text[], ARRAY['Nairobi','Kiambu','Machakos','Kajiado']::text[], 4.5, TRUE,  'Mary Wamboi',  'orders@safarigas.example','+254710000003','https://safarigas.example'),
  ('Biogas Solutions Kenya', ARRAY['installation','design']::text[],            ARRAY['biogas']::text[], ARRAY['Kiambu','Murang''a','Nyeri','Meru','Embu']::text[], 4.6, TRUE,  'Eng. James Kiplagat','eng@biogasolutions.example','+254710000004','https://biogasolutions.example'),
  ('Induction Kenya',        ARRAY['supply','installation','training']::text[], ARRAY['electric']::text[], ARRAY['Nairobi','Kiambu','Nakuru','Eldoret']::text[],  4.3, FALSE, 'Caroline Ng''ang''a','sales@inductionkenya.example','+254710000005','https://inductionkenya.example'),
  ('Western Briquettes Co',  ARRAY['supply']::text[],                            ARRAY['other']::text[],   ARRAY['Kakamega','Vihiga','Bungoma','Busia']::text[],  4.0, FALSE, 'Brian Wafula', 'hello@westernbriq.example','+254710000006','https://westernbriq.example')
) AS v(name, services, technology_types, counties_served, rating, verified, contact_person, contact_email, contact_phone, website)
WHERE NOT EXISTS (SELECT 1 FROM public.providers p WHERE p.name = v.name);

-- ---------- PROVIDER PRODUCTS (guarded by SKU) ----------
WITH categories AS (SELECT slug, id FROM public.product_categories),
     demo_providers AS (SELECT id, name FROM public.providers WHERE contact_email LIKE '%.example')
INSERT INTO public.provider_products
  (provider_id, name, description, price, price_currency, image_url, category_id, sku, certifications, warranty_months, in_stock, is_listed, created_by)
SELECT
  pr.id, v.name, v.description, v.price, 'KES', v.image_url,
  (SELECT id FROM categories WHERE slug = v.category_slug),
  v.sku, v.certifications, v.warranty_months, TRUE, TRUE,
  '00000000-0000-0000-0000-000000000000'::uuid
FROM demo_providers pr
JOIN (VALUES
  ('EcoMoto Industries',    'ECOCA Solar Cooker 001',          'Solar PV + lithium battery + induction',                              184999, 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800', 'solar',           'CCQDEMO-ECOCA-001', ARRAY['KEBS','EPRA']::text[], 24),
  ('EcoMoto Industries',    'Electric Pressure Cookstove 700W','6L institutional electric pressure cookstove',                       249999, 'https://images.unsplash.com/photo-1556909114-44e3e9399a2e?w=800', 'electric',        'CCQDEMO-EPC-700',   ARRAY['KEBS']::text[],         18),
  ('GreenStove Africa',     'Rocket Institutional Stove L',    'Rocket-elbow firewood stove for 500-meal kitchens; ~40% wood saving',  85000, 'https://images.unsplash.com/photo-1562184760-f5e64d59b3a4?w=800', 'improved-biomass','CCQDEMO-RKT-L',     ARRAY['KEBS KS 2861']::text[], 24),
  ('GreenStove Africa',     'Ceramic Charcoal Stove M',        'Refractory-lined charcoal stove for 200-meal kitchens',                42000, 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800', 'improved-biomass','CCQDEMO-CRC-M',     ARRAY['KEBS']::text[],         24),
  ('SafariGas Ltd',         'Bulk LPG Cylinder Bank 6×50kg',   'Six-cylinder bank with high-pressure regulator and KEBS-compliant pipework', 380000, 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800', 'lpg', 'CCQDEMO-LPG-BANK-6',  ARRAY['KEBS','EPRA license']::text[], 36),
  ('SafariGas Ltd',         'LPG Single Burner Institutional', 'Heavy-duty single burner with safety shutoff',                           28000, 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800', 'lpg',             'CCQDEMO-LPG-SB1',   ARRAY['KEBS']::text[],         24),
  ('Biogas Solutions Kenya','8m³ Fixed-Dome Biogas Digester',  'Brick-and-mortar fixed-dome digester sized for 200-meal kitchens',     1450000, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', 'biogas',          'CCQDEMO-BIO-FD-8',  ARRAY['KEBS','NEMA EIA']::text[], 60),
  ('Biogas Solutions Kenya','Biogas Burner — Twin',            'Twin-flame biogas burner suitable for institutional pots',              22000, 'https://images.unsplash.com/photo-1599058918144-1ddc4ee2e8c0?w=800', 'biogas',          'CCQDEMO-BIO-BNT',   ARRAY['KEBS']::text[],         18),
  ('Induction Kenya',       '5kW Induction Hob Trio',          'Three-zone 5kW induction hob; works with grid or PV',                   195000, 'https://images.unsplash.com/photo-1556909190-eccf4a8bf97a?w=800', 'electric',        'CCQDEMO-IND-5K-3',  ARRAY['KEBS']::text[],         24),
  ('Western Briquettes Co', 'Sawdust Briquettes — 50kg bag',   'Compressed sawdust briquettes for institutional charcoal stoves',         2100, 'https://images.unsplash.com/photo-1518562923414-67c3df41acca?w=800', 'briquettes',      'CCQDEMO-BRQ-50',    ARRAY[]::text[],               0)
) AS v(provider_name, name, description, price, image_url, category_slug, sku, certifications, warranty_months)
  ON pr.name = v.provider_name
WHERE NOT EXISTS (SELECT 1 FROM public.provider_products pp WHERE pp.sku = v.sku);

-- ---------- DEMO REQUESTS (independent) ----------
INSERT INTO public.demo_requests (name, email, phone, created_at)
VALUES
  ('Jane Anyango [CCQ-DEMO]',  'jane@example.com',   '+254712000001', NOW() - INTERVAL '2 days'),
  ('Peter Kibe [CCQ-DEMO]',    'peter@example.com',  '+254712000002', NOW() - INTERVAL '5 days'),
  ('Faith Nguyo [CCQ-DEMO]',   'faith@example.com',  '+254712000003', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- ---------- NEWSLETTER SUBSCRIBERS (UNIQUE on email) ----------
INSERT INTO public.newsletter_subscribers (full_name, email)
VALUES
  ('Demo Subscriber One',   'demo1@example.com'),
  ('Demo Subscriber Two',   'demo2@example.com'),
  ('Demo Subscriber Three', 'demo3@example.com'),
  ('Demo Subscriber Four',  'demo4@example.com'),
  ('Demo Subscriber Five',  'demo5@example.com')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- LOOKUPS + EVERYTHING THAT NEEDS THEM (one big DO block)
-- ============================================================
DO $$
DECLARE
  v_user_id      UUID;
  v_funder_org   UUID;
  v_provider_id  UUID;
  v_supplier_id  UUID;
  v_inst_eldoret UUID;
  v_inst_mater   UUID;
  v_inst_kakam   UUID;
  v_inst_pcea    UUID;
  v_proj_eldoret UUID;
  v_delivery_id  UUID;
  v_carbon_id    UUID;
  v_lpg_template UUID;
  v_lpg_product  UUID;
  v_biogas_prod  UUID;
  v_event_summit UUID;
  v_event_webinar UUID;
  v_resource_lpg UUID;
  v_need_id      UUID;
  v_opp_id       UUID;
  v_qr_id        UUID;
BEGIN
  ----------------------------------------------------------------
  -- LOOKUPS
  ----------------------------------------------------------------
  SELECT id INTO v_user_id      FROM auth.users LIMIT 1;
  SELECT id INTO v_funder_org   FROM public.organisations WHERE org_type = 'funder' LIMIT 1;

  SELECT id INTO v_provider_id  FROM public.providers WHERE name = 'SafariGas Ltd'        AND contact_email LIKE '%.example';
  SELECT id INTO v_supplier_id  FROM public.providers WHERE name = 'Biogas Solutions Kenya' AND contact_email LIKE '%.example';

  SELECT id INTO v_inst_eldoret FROM public.institutions WHERE name = 'Eldoret Polytechnic'         AND contact_email LIKE '%.example';
  SELECT id INTO v_inst_mater   FROM public.institutions WHERE name = 'Mater Misericordiae Hospital' AND contact_email LIKE '%.example';
  SELECT id INTO v_inst_kakam   FROM public.institutions WHERE name = 'Kakamega High School'        AND contact_email LIKE '%.example';
  SELECT id INTO v_inst_pcea    FROM public.institutions WHERE name = 'PCEA Lang''ata Boys'         AND contact_email LIKE '%.example';

  SELECT id INTO v_lpg_template FROM public.commissioning_checklist_templates WHERE slug = 'lpg-institutional';
  SELECT id INTO v_lpg_product  FROM public.provider_products WHERE sku = 'CCQDEMO-LPG-BANK-6';
  SELECT id INTO v_biogas_prod  FROM public.provider_products WHERE sku = 'CCQDEMO-BIO-FD-8';
  SELECT id INTO v_event_summit FROM public.events WHERE slug = 'kenya-clean-cooking-summit-2026';
  SELECT id INTO v_event_webinar FROM public.events WHERE slug = 'biogas-webinar-2026q2';
  SELECT id INTO v_resource_lpg FROM public.resources WHERE slug = 'institutional-lpg-installation-guide';

  IF v_provider_id IS NULL THEN
    RAISE NOTICE '[CCQ seed] No demo provider found (your DB already has a "SafariGas Ltd" without the .example email). Skipping all lookup-dependent inserts.';
    RETURN;
  END IF;

  ----------------------------------------------------------------
  -- PROJECT + DELIVERY + COMMISSIONING + MONITORING + CARBON (Eldoret)
  --   Only runs if Eldoret was inserted by the seed (i.e. you didn't
  --   already have an institution with that exact name). If Eldoret
  --   pre-existed in your DB without the .example email, we skip this
  --   block entirely so we never touch your real institution.
  ----------------------------------------------------------------
  IF v_inst_eldoret IS NOT NULL THEN
    SELECT id INTO v_proj_eldoret FROM public.projects WHERE title = 'Eldoret Polytechnic — LPG Transition [CCQ-DEMO]';
    IF v_proj_eldoret IS NULL THEN
      INSERT INTO public.projects (institution_id, provider_id, title, status, start_date, target_completion, total_budget, notes)
      VALUES (v_inst_eldoret, v_provider_id, 'Eldoret Polytechnic — LPG Transition [CCQ-DEMO]', 'in_progress',
              CURRENT_DATE - 90, CURRENT_DATE + 30, 950000,
              'Bulk LPG cylinder bank + 4 institutional burners + cook training. [seed]')
      RETURNING id INTO v_proj_eldoret;
    END IF;

    SELECT id INTO v_delivery_id FROM public.deliveries WHERE tracking_ref = 'CCQ-DEMO-WF-12345';
    IF v_delivery_id IS NULL THEN
      INSERT INTO public.deliveries
        (project_id, stage, carrier, tracking_ref, delivery_county, delivery_address,
         planned_dispatch_at, actual_dispatch_at, planned_arrival_at, actual_arrival_at,
         planned_install_at, actual_install_at, commissioned_at, acceptance_due_at, notes)
      VALUES (v_proj_eldoret, 'commissioned', 'Wells Fargo Couriers', 'CCQ-DEMO-WF-12345',
              'Uasin Gishu', 'Eldoret Polytechnic, Eldoret East',
              CURRENT_DATE - 60, CURRENT_DATE - 58, CURRENT_DATE - 55, CURRENT_DATE - 53,
              CURRENT_DATE - 30, CURRENT_DATE - 28, CURRENT_DATE - 14, CURRENT_DATE + 16,
              'Cylinders staged in dedicated outdoor cage; pipework run pending inspection.')
      RETURNING id INTO v_delivery_id;
    END IF;

    -- 3 monitoring readings — third one trips the relapse trigger
    INSERT INTO public.monitoring_readings
      (project_id, period_start, period_end, clean_fuel_units, clean_fuel_unit, baseline_fuel_units, baseline_fuel_unit, meals_served, hours_operated, downtime_hours, cook_satisfaction_1to5, notes)
    SELECT v_proj_eldoret, CURRENT_DATE - 90, CURRENT_DATE - 60, 450, 'kg', 0,   'kg', 27000, 250, 4,  4, 'Month 1 — full LPG operation [seed]'
    WHERE NOT EXISTS (SELECT 1 FROM public.monitoring_readings WHERE project_id = v_proj_eldoret AND period_start = CURRENT_DATE - 90);
    INSERT INTO public.monitoring_readings
      (project_id, period_start, period_end, clean_fuel_units, clean_fuel_unit, baseline_fuel_units, baseline_fuel_unit, meals_served, hours_operated, downtime_hours, cook_satisfaction_1to5, notes)
    SELECT v_proj_eldoret, CURRENT_DATE - 60, CURRENT_DATE - 30, 420, 'kg', 80,  'kg', 27000, 240, 8,  3, 'Month 2 — minor firewood backup [seed]'
    WHERE NOT EXISTS (SELECT 1 FROM public.monitoring_readings WHERE project_id = v_proj_eldoret AND period_start = CURRENT_DATE - 60);
    INSERT INTO public.monitoring_readings
      (project_id, period_start, period_end, clean_fuel_units, clean_fuel_unit, baseline_fuel_units, baseline_fuel_unit, meals_served, hours_operated, downtime_hours, cook_satisfaction_1to5, notes)
    SELECT v_proj_eldoret, CURRENT_DATE - 30, CURRENT_DATE,       180, 'kg', 380, 'kg', 27000, 230, 14, 2, 'Month 3 — cylinder shortage; cooks reverted [seed]'
    WHERE NOT EXISTS (SELECT 1 FROM public.monitoring_readings WHERE project_id = v_proj_eldoret AND period_start = CURRENT_DATE - 30);

    -- Carbon project + estimate
    SELECT id INTO v_carbon_id FROM public.carbon_projects WHERE registry_project_id = 'CCQDEMO-GS-EP-2026-001';
    IF v_carbon_id IS NULL THEN
      INSERT INTO public.carbon_projects
        (project_id, methodology, registry, registry_project_id, vintage_start, vintage_end, status,
         baseline_emissions_tco2e, project_emissions_tco2e, estimated_annual_credits, notes)
      VALUES (v_proj_eldoret, 'Gold Standard TPDDTEC v3.1', 'Gold Standard', 'CCQDEMO-GS-EP-2026-001',
              CURRENT_DATE - 90, CURRENT_DATE + 365 * 7, 'validation',
              84.0, 18.0, 66.0, 'Validation in progress with VVB. [seed]')
      RETURNING id INTO v_carbon_id;
    END IF;

    INSERT INTO public.credit_estimates (carbon_project_id, period_start, period_end, estimated_tco2e, methodology_notes)
    SELECT v_carbon_id, CURRENT_DATE, CURRENT_DATE + 365, 66.0, 'Annualised based on first three monitoring periods. [seed]'
    WHERE NOT EXISTS (SELECT 1 FROM public.credit_estimates WHERE carbon_project_id = v_carbon_id);
  END IF;

  ----------------------------------------------------------------
  -- INSTALLATION CREW (cascades from provider)
  ----------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.installation_crews WHERE name = 'SafariGas Crew Alpha [CCQ-DEMO]') THEN
    INSERT INTO public.installation_crews
      (provider_id, name, lead_name, contact_phone, contact_email, certifications, insurance_valid_until,
       counties_served, technology_types, active_jobs_capacity, rating)
    VALUES (v_provider_id, 'SafariGas Crew Alpha [CCQ-DEMO]', 'James Mwangi', '+254710888001', 'crew-alpha@safarigas.example',
            ARRAY['EPRA Class A','KEBS Installer L2']::text[], CURRENT_DATE + 180,
            ARRAY['Nairobi','Kiambu','Nakuru','Uasin Gishu']::text[], ARRAY['lpg']::text[], 4, 4.6);
  END IF;

  ----------------------------------------------------------------
  -- ASSESSMENTS (4) + READINESS SCORES (4) + COST MODELS (4)
  ----------------------------------------------------------------
  INSERT INTO public.assessments (institution_id, status, cooking_patterns, energy_consumption, infrastructure_condition, kitchen_details, reviewer_notes, submitted_at, reviewed_at)
  SELECT i.id, 'reviewed',
         '{"meals_per_day": 480, "cooking_time_min": 240, "primary_cook_count": 3}'::jsonb,
         '{"firewood_kg_per_term": 1800, "monthly_spend_ksh": 14000}'::jsonb,
         '{"kitchen_size_sqm": 65, "ventilation": "adequate", "chimney": true}'::jsonb,
         '{"has_dedicated_kitchen": true, "fuel_storage": "outdoor"}'::jsonb,
         '[seed] Approved for matching. Kitchen meets KEBS clearance requirements.',
         NOW() - INTERVAL '60 days', NOW() - INTERVAL '45 days'
  FROM (VALUES (v_inst_eldoret), (v_inst_mater), (v_inst_kakam), (v_inst_pcea)) AS t(id)
  JOIN public.institutions i ON i.id = t.id
  WHERE NOT EXISTS (SELECT 1 FROM public.assessments a WHERE a.institution_id = i.id AND a.reviewer_notes LIKE '%[seed]%');

  -- Readiness scores — filter NULL institution variables (any that
  -- pre-existed in your DB without the .example marker were skipped).
  INSERT INTO public.readiness_scores (institution_id, overall_score, infrastructure_score, financial_score, operational_score, technical_score, social_score)
  SELECT t.inst_id, t.overall, t.infra, t.fin, t.op, t.tech, t.social
  FROM (VALUES
    (v_inst_eldoret, 78, 82, 70, 80, 85, 75),
    (v_inst_mater,   88, 92, 85, 90, 90, 82),
    (v_inst_kakam,   65, 70, 55, 70, 65, 70),
    (v_inst_pcea,    58, 60, 50, 65, 55, 62)
  ) AS t(inst_id, overall, infra, fin, op, tech, social)
  WHERE t.inst_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.readiness_scores rs WHERE rs.institution_id = t.inst_id);

  -- Cost models — same NULL-filter pattern
  INSERT INTO public.cost_models (institution_id, technology_type, capex, monthly_opex, current_monthly_fuel_cost, projected_monthly_savings, payback_months, roi_percentage, assumptions)
  SELECT t.inst_id, t.tech, t.capex, t.opex, t.fuel_cost, t.savings, t.payback, t.roi, t.assumptions::jsonb
  FROM (VALUES
    (v_inst_eldoret, 'lpg',              950000, 78000, 144000, 66000, 14, 18.5, '{"source":"[seed]","fuel_inflation_pct":7}'),
    (v_inst_mater,   'biogas',          1800000, 35000, 220000,185000, 10, 26.0, '{"source":"[seed]","feedstock":"kitchen_waste_plus_cattle"}'),
    (v_inst_kakam,   'lpg',             1100000, 95000, 168000, 73000, 16, 14.2, '{"source":"[seed]"}'),
    (v_inst_pcea,    'improved-biomass', 120000, 65000,  96000, 31000,  4, 31.0, '{"source":"[seed]"}')
  ) AS t(inst_id, tech, capex, opex, fuel_cost, savings, payback, roi, assumptions)
  WHERE t.inst_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.cost_models cm WHERE cm.institution_id = t.inst_id AND cm.assumptions::text LIKE '%[seed]%');

  ----------------------------------------------------------------
  -- OPPORTUNITIES + EXPRESSIONS OF INTEREST
  ----------------------------------------------------------------
  INSERT INTO public.opportunities (institution_id, title, description, technology_required, estimated_value, status, deadline)
  SELECT t.inst_id, t.title, t.description, t.tech, t.value, 'open', NOW() + (t.days || ' days')::interval
  FROM (VALUES
    (v_inst_kakam, '[CCQ-DEMO] Kakamega LPG retrofit — RFP', 'School of 1400 pupils seeking turn-key LPG installer.', 'lpg', 1100000, 21),
    (v_inst_pcea, '[CCQ-DEMO] PCEA Lang''ata improved-biomass tender', 'Phase-1 deployment of 4 institutional rocket stoves.', 'improved-biomass', 380000, 14),
    (v_inst_mater, '[CCQ-DEMO] Mater biogas expansion phase 2', 'Add 4m³ digester capacity to existing 8m³ system.', 'biogas', 650000, 45)
  ) AS t(inst_id, title, description, tech, value, days)
  WHERE t.inst_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.opportunities o WHERE o.title = t.title);

  SELECT id INTO v_opp_id FROM public.opportunities WHERE title = '[CCQ-DEMO] Kakamega LPG retrofit — RFP';
  IF v_opp_id IS NOT NULL THEN
    INSERT INTO public.expressions_of_interest (opportunity_id, provider_id, proposal_text, proposed_cost, status)
    SELECT v_opp_id, v_provider_id,
           '[seed] We propose a 6×50kg cylinder bank, 3 institutional burners, and full cook-staff training over 4 weeks.',
           1080000, 'submitted'
    WHERE NOT EXISTS (SELECT 1 FROM public.expressions_of_interest WHERE opportunity_id = v_opp_id AND provider_id = v_provider_id);
  END IF;

  SELECT id INTO v_opp_id FROM public.opportunities WHERE title = '[CCQ-DEMO] Mater biogas expansion phase 2';
  IF v_opp_id IS NOT NULL AND v_supplier_id IS NOT NULL THEN
    INSERT INTO public.expressions_of_interest (opportunity_id, provider_id, proposal_text, proposed_cost, status)
    SELECT v_opp_id, v_supplier_id,
           '[seed] Modular 4m³ extension with shared gas-handling infrastructure.',
           620000, 'submitted'
    WHERE NOT EXISTS (SELECT 1 FROM public.expressions_of_interest WHERE opportunity_id = v_opp_id AND provider_id = v_supplier_id);
  END IF;

  ----------------------------------------------------------------
  -- INSTITUTION NEEDS + SUPPLIER INTEREST
  ----------------------------------------------------------------
  INSERT INTO public.institution_needs (institution_id, description, technology_type, status)
  SELECT t.inst_id, t.description, t.tech, 'open'
  FROM (VALUES
    (v_inst_kakam, '[CCQ-DEMO] Need: KEBS-certified LPG cylinder bank for 1400-pupil school.', 'lpg'),
    (v_inst_pcea, '[CCQ-DEMO] Need: Refractory-lined institutional charcoal stove × 2.', 'charcoal')
  ) AS t(inst_id, description, tech)
  WHERE t.inst_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.institution_needs n WHERE n.description = t.description);

  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_need_id FROM public.institution_needs WHERE description LIKE '%KEBS-certified LPG cylinder bank for 1400-pupil%' LIMIT 1;
    IF v_need_id IS NOT NULL THEN
      INSERT INTO public.supplier_interest (need_id, provider_id, user_id, message, status)
      VALUES (v_need_id, v_provider_id, v_user_id, '[seed] Interested. Can mobilise within 4 weeks.', 'expressed')
      ON CONFLICT (need_id, provider_id) DO NOTHING;
    END IF;
  END IF;

  ----------------------------------------------------------------
  -- PROVIDER SERVICES + DOCUMENTS
  ----------------------------------------------------------------
  INSERT INTO public.provider_services (provider_id, name, details, price, created_by)
  SELECT v_provider_id, '[CCQ-DEMO] LPG installation service',
         'Turn-key cylinder bank installation, regulator setup, KEBS-compliant pipework, leak testing.',
         85000, COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  WHERE NOT EXISTS (SELECT 1 FROM public.provider_services WHERE provider_id = v_provider_id AND name LIKE '%[CCQ-DEMO]%');

  INSERT INTO public.provider_services (provider_id, name, details, price, created_by)
  SELECT v_supplier_id, '[CCQ-DEMO] Biogas commissioning + 12-month support',
         'On-site digester commissioning, slurry monitoring, operator training, 12-month maintenance.',
         140000, COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  WHERE v_supplier_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.provider_services WHERE provider_id = v_supplier_id AND name LIKE '%[CCQ-DEMO]%');

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.provider_documents (provider_id, title, file_url, document_type, created_by)
    SELECT v_provider_id, '[CCQ-DEMO] EPRA Class A Licence', 'https://example.org/safarigas-epra.pdf', 'certificate', v_user_id
    WHERE NOT EXISTS (SELECT 1 FROM public.provider_documents WHERE provider_id = v_provider_id AND title LIKE '%[CCQ-DEMO]%');
  END IF;

  ----------------------------------------------------------------
  -- PRODUCT IMAGES + REVIEWS
  ----------------------------------------------------------------
  IF v_lpg_product IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, url, alt_text, display_order)
    SELECT v_lpg_product, 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=1200', '[seed] Cylinder bank — front view', 1
    WHERE NOT EXISTS (SELECT 1 FROM public.product_images WHERE product_id = v_lpg_product AND alt_text LIKE '%[seed]%');
    INSERT INTO public.product_images (product_id, url, alt_text, display_order)
    SELECT v_lpg_product, 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1200', '[seed] Cylinder bank — regulator detail', 2
    WHERE NOT EXISTS (SELECT 1 FROM public.product_images WHERE product_id = v_lpg_product AND display_order = 2);
  END IF;
  IF v_biogas_prod IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, url, alt_text, display_order)
    SELECT v_biogas_prod, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200', '[seed] Digester — site installation', 1
    WHERE NOT EXISTS (SELECT 1 FROM public.product_images WHERE product_id = v_biogas_prod AND alt_text LIKE '%[seed]%');
  END IF;

  IF v_user_id IS NOT NULL AND v_lpg_product IS NOT NULL THEN
    INSERT INTO public.product_reviews (product_id, reviewer_user_id, rating, title, body, is_verified_buyer, is_published)
    VALUES (v_lpg_product, v_user_id, 5, '[CCQ-DEMO] Reliable for high-volume kitchens',
            '[seed] Installed at our school six months ago. Cylinders last 3 weeks of full-meal service.',
            TRUE, TRUE)
    ON CONFLICT (product_id, reviewer_user_id) DO NOTHING;
  END IF;

  ----------------------------------------------------------------
  -- PROJECT MILESTONES + DELIVERY EVENTS + COMMISSIONING + SIGNOFF + VERIFICATION
  --   All depend on the demo project + delivery being created above.
  ----------------------------------------------------------------
  IF v_proj_eldoret IS NOT NULL THEN
    INSERT INTO public.project_milestones (project_id, title, description, due_date, completed_at, status, sort_order)
    SELECT v_proj_eldoret, v.title, v.description, (CURRENT_DATE + v.due_offset)::date, v.completed_at, v.status, v.sort_order
    FROM (VALUES
      ('Site survey & MOU sign-off [seed]',  'Walk-through, kitchen measurements, MOU executed.',                    -75, (NOW() - INTERVAL '70 days')::timestamptz, 'completed', 1),
      ('Cylinder bank manufacture [seed]',   'Cylinders + regulator + pipework procured.',                            -55, (NOW() - INTERVAL '50 days')::timestamptz, 'completed', 2),
      ('On-site installation [seed]',        'Cylinder cage, pipework, burners installed and leak-tested.',           -28, (NOW() - INTERVAL '25 days')::timestamptz, 'completed', 3),
      ('Cook training & handover [seed]',    'Two cook-training sessions; head-teacher signed acceptance form.',      -14, (NOW() - INTERVAL '14 days')::timestamptz, 'completed', 4),
      ('30-day post-install review [seed]',  'Verify usage, check for leaks, refresher training if needed.',          16, NULL, 'pending', 5)
    ) AS v(title, description, due_offset, completed_at, status, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM public.project_milestones m WHERE m.project_id = v_proj_eldoret AND m.title = v.title);
  END IF;

  IF v_delivery_id IS NOT NULL THEN
    INSERT INTO public.delivery_events (delivery_id, event_type, stage, body, occurred_at, recorded_by)
    SELECT v_delivery_id, v.event_type, v.stage, v.body, v.occurred_at, v_user_id
    FROM (VALUES
      ('stage_change', 'manufacturing', '[seed] Cylinders procured at SafariGas Athi River yard.',     (NOW() - INTERVAL '60 days')::timestamptz),
      ('stage_change', 'dispatched',    '[seed] Loaded onto Wells Fargo truck WF-12345.',               (NOW() - INTERVAL '58 days')::timestamptz),
      ('photo',         NULL,            '[seed] Cylinder bank assembled on-site (photo attached).',    (NOW() - INTERVAL '28 days')::timestamptz),
      ('stage_change', 'commissioned',  '[seed] Leak test passed. Burners running blue flame.',         (NOW() - INTERVAL '14 days')::timestamptz)
    ) AS v(event_type, stage, body, occurred_at)
    WHERE NOT EXISTS (SELECT 1 FROM public.delivery_events e WHERE e.delivery_id = v_delivery_id AND e.body = v.body);

    IF v_lpg_template IS NOT NULL THEN
      INSERT INTO public.commissioning_checklists (delivery_id, template_id, responses, completed_items, total_items, is_complete, completed_at, completed_by)
      SELECT v_delivery_id, v_lpg_template,
             '{"cyl_count":{"checked":true},"regulator":{"checked":true},"leak_test":{"checked":true},"shutoff":{"checked":true},"ppe":{"checked":true},"first_cook":{"checked":true},"docs":{"checked":true}}'::jsonb,
             7, 7, TRUE, NOW() - INTERVAL '14 days', v_user_id
      WHERE NOT EXISTS (SELECT 1 FROM public.commissioning_checklists WHERE delivery_id = v_delivery_id);
    END IF;

    INSERT INTO public.acceptance_signoffs (delivery_id, signed_by_name, signed_by_role, signed_by_phone, signed_by_email, signed_at, evidence_photo_urls, status, recorded_by, notes)
    SELECT v_delivery_id, 'Mrs Cherono [CCQ-DEMO]', 'principal', '+254700000007', 'catering@eldoretpoly.example',
           NOW() - INTERVAL '13 days',
           ARRAY['https://images.unsplash.com/photo-1556909114-44e3e9399a2e?w=800']::text[],
           'accepted', v_user_id, '[seed] Acceptance signed; equipment fully operational.'
    WHERE NOT EXISTS (SELECT 1 FROM public.acceptance_signoffs WHERE delivery_id = v_delivery_id);
  END IF;

  IF v_carbon_id IS NOT NULL THEN
    INSERT INTO public.credit_verifications (carbon_project_id, verifier, verified_on, vintage_start, vintage_end, verified_tco2e, serial_range, notes)
    SELECT v_carbon_id, 'TÜV SÜD South Asia', CURRENT_DATE - 30, CURRENT_DATE - 365, CURRENT_DATE - 30, 58.5,
           'GS-EP-2026-0001 to GS-EP-2026-0058', '[seed] First validation cycle complete; minor non-conformities resolved.'
    WHERE NOT EXISTS (SELECT 1 FROM public.credit_verifications WHERE carbon_project_id = v_carbon_id AND notes LIKE '%[seed]%');
  END IF;

  ----------------------------------------------------------------
  -- MOU / IPA + CSCC SUBMISSIONS
  ----------------------------------------------------------------
  IF v_inst_eldoret IS NOT NULL THEN
    INSERT INTO public.mou_ipa_documents (organisation_id, org_type, document_type, organisation_name, status, signed_file_url, sign_requested_at, signed_at)
    SELECT v_inst_eldoret, 'institution', 'ipa', 'Eldoret Polytechnic [CCQ-DEMO]', 'signed',
           'https://example.org/ipa-eldoret-signed.pdf', NOW() - INTERVAL '90 days', NOW() - INTERVAL '85 days'
    WHERE NOT EXISTS (SELECT 1 FROM public.mou_ipa_documents WHERE organisation_id = v_inst_eldoret AND document_type = 'ipa');
  END IF;

  INSERT INTO public.mou_ipa_documents (organisation_id, org_type, document_type, organisation_name, status, signed_file_url, sign_requested_at, signed_at)
  SELECT v_provider_id, 'supplier', 'mou', 'SafariGas Ltd [CCQ-DEMO]', 'signed',
         'https://example.org/mou-safarigas-signed.pdf', NOW() - INTERVAL '120 days', NOW() - INTERVAL '110 days'
  WHERE NOT EXISTS (SELECT 1 FROM public.mou_ipa_documents WHERE organisation_id = v_provider_id AND document_type = 'mou');

  IF v_supplier_id IS NOT NULL THEN
    INSERT INTO public.mou_ipa_documents (organisation_id, org_type, document_type, organisation_name, status, sign_requested_at)
    SELECT v_supplier_id, 'supplier', 'mou', 'Biogas Solutions Kenya [CCQ-DEMO]', 'pending', NOW() - INTERVAL '7 days'
    WHERE NOT EXISTS (SELECT 1 FROM public.mou_ipa_documents WHERE organisation_id = v_supplier_id AND document_type = 'mou');
  END IF;

  INSERT INTO public.cscc_submissions (provider_id, selections, submitted_by)
  SELECT v_provider_id::text,
         '{"section_a":{"biz_reg":true,"kra_pin":true,"physical_addr":true,"tax_compliant":true},
           "section_e":{"epra_license":true,"safety_brief":true,"emergency_kit":true},
           "section_f":{"tier2_in_progress":false,"tier3_uncertified":false}}'::jsonb,
         v_user_id
  WHERE NOT EXISTS (SELECT 1 FROM public.cscc_submissions WHERE provider_id = v_provider_id::text);

  IF v_supplier_id IS NOT NULL THEN
    INSERT INTO public.cscc_submissions (provider_id, selections, submitted_by)
    SELECT v_supplier_id::text,
           '{"section_a":{"biz_reg":true,"kra_pin":true,"physical_addr":true,"tax_compliant":true},
             "section_d":{"pressure_vessel":true,"tech_cert":true,"standards":true},
             "section_f":{"tier2_in_progress":true,"tier3_uncertified":false}}'::jsonb,
           v_user_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cscc_submissions WHERE provider_id = v_supplier_id::text);
  END IF;

  ----------------------------------------------------------------
  -- PORTFOLIOS (admin grouping)
  ----------------------------------------------------------------
  -- Strip NULL institution ids from the array so the portfolio still
  -- inserts even if some demo institutions weren't created.
  INSERT INTO public.portfolios (name, description, institution_ids, created_by)
  SELECT '[CCQ-DEMO] Nairobi pilot cohort 2026',
         '[seed] First wave of Nairobi-based institutions transitioning to clean cooking.',
         ARRAY_REMOVE(ARRAY[v_inst_eldoret, v_inst_mater, v_inst_pcea, v_inst_kakam]::uuid[], NULL),
         v_user_id
  WHERE ARRAY_LENGTH(ARRAY_REMOVE(ARRAY[v_inst_eldoret, v_inst_mater, v_inst_pcea, v_inst_kakam]::uuid[], NULL), 1) > 0
    AND NOT EXISTS (SELECT 1 FROM public.portfolios WHERE name LIKE '[CCQ-DEMO]%');

  ----------------------------------------------------------------
  -- AUTH-TIED tables (event_registrations, quote_*, evidence_attachments, onboarding, funder_*)
  ----------------------------------------------------------------
  IF v_user_id IS NULL THEN
    RAISE NOTICE '[CCQ seed] No auth.users found — skipping event_registrations, quote_*, evidence_attachments, onboarding_progress, funder_portfolio.';
  ELSE
    -- Event registrations
    IF v_event_summit IS NOT NULL THEN
      INSERT INTO public.event_registrations (event_id, user_id, full_name, email, organisation, role)
      SELECT v_event_summit, v_user_id, 'Demo Attendee', 'attendee@example.com', 'CleanCookiQ', 'admin'
      ON CONFLICT (event_id, user_id) DO NOTHING;
    END IF;
    IF v_event_webinar IS NOT NULL THEN
      INSERT INTO public.event_registrations (event_id, user_id, full_name, email, organisation, role)
      SELECT v_event_webinar, v_user_id, 'Demo Attendee', 'attendee@example.com', 'CleanCookiQ', 'admin'
      ON CONFLICT (event_id, user_id) DO NOTHING;
    END IF;

    -- Quote requests + messages
    IF v_lpg_product IS NOT NULL THEN
      INSERT INTO public.quote_requests (product_id, provider_id, buyer_user_id, buyer_county, quantity, message, status, quoted_amount, quoted_at)
      SELECT v_lpg_product, v_provider_id, v_user_id, 'Kakamega', 1,
             '[CCQ-DEMO] Need bank installed before next term opens. Lead time?',
             'quoted', 380000, NOW() - INTERVAL '3 days'
      WHERE NOT EXISTS (SELECT 1 FROM public.quote_requests WHERE buyer_user_id = v_user_id AND product_id = v_lpg_product);

      SELECT id INTO v_qr_id FROM public.quote_requests
      WHERE buyer_user_id = v_user_id AND product_id = v_lpg_product LIMIT 1;
      IF v_qr_id IS NOT NULL THEN
        INSERT INTO public.quote_messages (quote_request_id, sender_user_id, sender_role, body)
        SELECT v_qr_id, v_user_id, 'buyer',  '[seed] Two-week deadline; can you confirm?'
        WHERE NOT EXISTS (SELECT 1 FROM public.quote_messages WHERE quote_request_id = v_qr_id AND sender_role = 'buyer');
        INSERT INTO public.quote_messages (quote_request_id, sender_user_id, sender_role, body)
        SELECT v_qr_id, v_user_id, 'supplier','[seed] Confirmed — installation starts in 9 days. Quote KSh 380,000 inclusive of pipework.'
        WHERE NOT EXISTS (SELECT 1 FROM public.quote_messages WHERE quote_request_id = v_qr_id AND sender_role = 'supplier');
      END IF;
    END IF;

    -- Resource downloads
    IF v_resource_lpg IS NOT NULL THEN
      INSERT INTO public.resource_downloads (resource_id, user_id, user_agent)
      VALUES
        (v_resource_lpg, v_user_id, 'CCQ-DEMO Mozilla/5.0'),
        (v_resource_lpg, NULL,      'CCQ-DEMO Mozilla/5.0 (anonymous)'),
        (v_resource_lpg, NULL,      'CCQ-DEMO curl/8.0');
    END IF;

    -- Evidence attachments — only if the demo institution exists
    IF v_inst_eldoret IS NOT NULL THEN
      INSERT INTO public.evidence_attachments (entity_type, entity_id, kind, description, file_url, mime_type, captured_at, geo_lat, geo_lon, uploaded_by)
      SELECT 'institution', v_inst_eldoret, 'photo',
             '[CCQ-DEMO] Kitchen state photo (pre-installation)',
             'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
             'image/jpeg', NOW() - INTERVAL '90 days', 0.519, 35.270, v_user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.evidence_attachments
        WHERE entity_type = 'institution' AND entity_id = v_inst_eldoret AND description LIKE '%[CCQ-DEMO]%'
      );
    END IF;

    -- Onboarding progress
    INSERT INTO public.onboarding_progress (user_id, journey, step_index, total_steps, is_complete, completed_at, data)
    VALUES (v_user_id, 'admin', 5, 5, TRUE, NOW() - INTERVAL '120 days', '{"source":"[CCQ-DEMO]"}'::jsonb)
    ON CONFLICT (user_id, journey) DO NOTHING;

    -- Funder portfolio + attribution + preferences
    IF v_funder_org IS NOT NULL THEN
      INSERT INTO public.funder_preferences
        (organisation_id, name, ticket_size_min, ticket_size_max, preferred_counties, preferred_fuels, max_risk_score, esg_focus, notes)
      VALUES (v_funder_org, 'Demo Funder Mandate [CCQ-DEMO]', 500000, 5000000,
              ARRAY['Nairobi','Kiambu','Nakuru','Mombasa']::text[],
              ARRAY['lpg','biogas','electric']::text[],
              16, ARRAY['climate','health','livelihoods']::text[],
              'Auto-seeded mandate for showcase. Replace via /funder/onboarding.')
      ON CONFLICT (organisation_id) DO NOTHING;

      -- funder_portfolio + attribution: only if the demo project was created.
      IF v_proj_eldoret IS NOT NULL THEN
        INSERT INTO public.funder_portfolio
          (organisation_id, project_id, capital_amount, capital_currency, capital_share_pct, committed_at, disbursed_at, status, notes)
        SELECT v_funder_org, v_proj_eldoret, 600000, 'KES', 0.63, CURRENT_DATE - 80, CURRENT_DATE - 60, 'disbursed',
               '[CCQ-DEMO] Concessional loan, 8% over 36 months.'
        WHERE NOT EXISTS (
          SELECT 1 FROM public.funder_portfolio
          WHERE organisation_id = v_funder_org AND project_id = v_proj_eldoret
        );

        INSERT INTO public.funder_attribution_ledger
          (organisation_id, project_id, period_start, period_end, capital_share_pct,
           attributable_tco2e, attributable_meals, attributable_jobs, attributable_ksh_savings,
           source_methodology, recorded_by)
        SELECT v_funder_org, v_proj_eldoret, CURRENT_DATE - 90, CURRENT_DATE, 0.63,
               12.4, 17010, 0.63, 124800,
               '[seed] Pro-rata of monitored CO₂e and KSh savings.', v_user_id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.funder_attribution_ledger
          WHERE organisation_id = v_funder_org AND project_id = v_proj_eldoret
            AND period_start = CURRENT_DATE - 90 AND period_end = CURRENT_DATE
        );
      END IF;
    END IF;
  END IF;

  ----------------------------------------------------------------
  -- COINVESTMENT INTROS — only if 2+ funder orgs exist
  ----------------------------------------------------------------
  IF (SELECT COUNT(*) FROM public.organisations WHERE org_type = 'funder') >= 2
     AND v_user_id IS NOT NULL AND v_proj_eldoret IS NOT NULL THEN
    INSERT INTO public.coinvestment_intros (requester_org_id, target_org_id, project_id, message, status, requester_user_id)
    SELECT requester.id, target.id, v_proj_eldoret,
           '[CCQ-DEMO] Looking for a co-investor on this LPG transition; happy to share the underwriting note.',
           'pending', v_user_id
    FROM (SELECT id FROM public.organisations WHERE org_type = 'funder' ORDER BY created_at LIMIT 1) requester,
         (SELECT id FROM public.organisations WHERE org_type = 'funder' ORDER BY created_at OFFSET 1 LIMIT 1) target
    WHERE NOT EXISTS (SELECT 1 FROM public.coinvestment_intros WHERE message LIKE '%[CCQ-DEMO]%');
  END IF;

END$$;

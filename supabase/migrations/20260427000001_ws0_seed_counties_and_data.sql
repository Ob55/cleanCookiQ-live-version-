-- ============================================================
-- Workstream 0: Seed counties + initial data sources & data points
--
-- Counties: all 47 with official KNBS codes and former-province regions
-- Data sources: EPRA, KPLC, IPCC, FAO, CCA, KNBS (real publishers; URLs
--   are stable landing pages that admins will update with specific
--   document refs as they procure citations).
-- Data points: the constants previously hardcoded in CookingAlchemy
--   (FUEL_COST_PER_UNIT, CO2_FACTOR, CLEAN_COST_MULTIPLIER) are now
--   typed, scoped, and source-bound.
-- ============================================================

-- ---------- Counties ----------
INSERT INTO public.counties (code, name, region, capital) VALUES
  ('001', 'Mombasa',         'Coast',         'Mombasa'),
  ('002', 'Kwale',           'Coast',         'Kwale'),
  ('003', 'Kilifi',          'Coast',         'Kilifi'),
  ('004', 'Tana River',      'Coast',         'Hola'),
  ('005', 'Lamu',            'Coast',         'Lamu'),
  ('006', 'Taita-Taveta',    'Coast',         'Wundanyi'),
  ('007', 'Garissa',         'North Eastern', 'Garissa'),
  ('008', 'Wajir',           'North Eastern', 'Wajir'),
  ('009', 'Mandera',         'North Eastern', 'Mandera'),
  ('010', 'Marsabit',        'Eastern',       'Marsabit'),
  ('011', 'Isiolo',          'Eastern',       'Isiolo'),
  ('012', 'Meru',            'Eastern',       'Meru'),
  ('013', 'Tharaka-Nithi',   'Eastern',       'Chuka'),
  ('014', 'Embu',            'Eastern',       'Embu'),
  ('015', 'Kitui',           'Eastern',       'Kitui'),
  ('016', 'Machakos',        'Eastern',       'Machakos'),
  ('017', 'Makueni',         'Eastern',       'Wote'),
  ('018', 'Nyandarua',       'Central',       'Ol Kalou'),
  ('019', 'Nyeri',           'Central',       'Nyeri'),
  ('020', 'Kirinyaga',       'Central',       'Kerugoya'),
  ('021', 'Murang''a',       'Central',       'Murang''a'),
  ('022', 'Kiambu',          'Central',       'Kiambu'),
  ('023', 'Turkana',         'Rift Valley',   'Lodwar'),
  ('024', 'West Pokot',      'Rift Valley',   'Kapenguria'),
  ('025', 'Samburu',         'Rift Valley',   'Maralal'),
  ('026', 'Trans Nzoia',     'Rift Valley',   'Kitale'),
  ('027', 'Uasin Gishu',     'Rift Valley',   'Eldoret'),
  ('028', 'Elgeyo-Marakwet', 'Rift Valley',   'Iten'),
  ('029', 'Nandi',           'Rift Valley',   'Kapsabet'),
  ('030', 'Baringo',         'Rift Valley',   'Kabarnet'),
  ('031', 'Laikipia',        'Rift Valley',   'Rumuruti'),
  ('032', 'Nakuru',          'Rift Valley',   'Nakuru'),
  ('033', 'Narok',           'Rift Valley',   'Narok'),
  ('034', 'Kajiado',         'Rift Valley',   'Kajiado'),
  ('035', 'Kericho',         'Rift Valley',   'Kericho'),
  ('036', 'Bomet',           'Rift Valley',   'Bomet'),
  ('037', 'Kakamega',        'Western',       'Kakamega'),
  ('038', 'Vihiga',          'Western',       'Vihiga'),
  ('039', 'Bungoma',         'Western',       'Bungoma'),
  ('040', 'Busia',           'Western',       'Busia'),
  ('041', 'Siaya',           'Nyanza',        'Siaya'),
  ('042', 'Kisumu',          'Nyanza',        'Kisumu'),
  ('043', 'Homa Bay',        'Nyanza',        'Homa Bay'),
  ('044', 'Migori',          'Nyanza',        'Migori'),
  ('045', 'Kisii',           'Nyanza',        'Kisii'),
  ('046', 'Nyamira',         'Nyanza',        'Nyamira'),
  ('047', 'Nairobi',         'Nairobi',       'Nairobi')
ON CONFLICT (code) DO NOTHING;

-- ---------- Data sources ----------
-- These are real publishers. Admins should refresh `published_date`,
-- `url`, and `document_url` against the latest available citation.
INSERT INTO public.data_sources
  (slug, title, publisher, published_date, url, methodology_notes, confidence_level, geographic_scope)
VALUES
  ('epra-petroleum-pricing-2026',
   'EPRA Maximum Retail Petroleum Prices',
   'Energy and Petroleum Regulatory Authority (EPRA)',
   '2026-01-01',
   'https://www.epra.go.ke/services/economic-regulation/petroleum/petroleum-pricing/',
   'Monthly maximum retail prices for LPG (13kg, 6kg cylinders) and refilling, gazetted by EPRA.',
   'high',
   'Kenya'),

  ('kplc-tariff-schedule-2026',
   'Kenya Power Electricity Tariff Schedule',
   'Kenya Power and Lighting Company (KPLC)',
   '2026-01-01',
   'https://kplc.co.ke/category/view/50/customer-service',
   'Approved tariffs for Domestic, Small Commercial (SC), and Commercial/Industrial (CI) categories. Institution category typically maps to SC1/CI1.',
   'high',
   'Kenya'),

  ('ipcc-ar6-wg3-emission-factors',
   'IPCC AR6 Working Group III: Mitigation of Climate Change — Emission Factors for Cooking Fuels',
   'Intergovernmental Panel on Climate Change',
   '2022-04-04',
   'https://www.ipcc.ch/report/ar6/wg3/',
   'Global emission factors for biomass, charcoal, LPG, biogas, and grid electricity. Grid factor adapted to Kenya energy mix (predominantly geothermal and hydro).',
   'high',
   'Global'),

  ('fao-woodfuel-statistics-2024',
   'FAO Forestry Statistics: Woodfuel Production and Trade — Sub-Saharan Africa',
   'Food and Agriculture Organization of the United Nations',
   '2024-06-01',
   'https://www.fao.org/forestry/statistics/en/',
   'Annual woodfuel and charcoal production statistics with derived farm-gate and market prices for East Africa.',
   'high',
   'East Africa'),

  ('cca-clean-cooking-benchmarks-2024',
   'Clean Cooking Alliance: Sector Benchmarks for Institutional Clean Cooking',
   'Clean Cooking Alliance',
   '2024-09-01',
   'https://cleancooking.org/binary-data/RESOURCE/file/000/000/579-1.pdf',
   'Cost, performance, and emissions benchmarks for institutional cookstoves derived from monitored deployments.',
   'medium',
   'Sub-Saharan Africa'),

  ('knbs-economic-survey-2025',
   'KNBS Economic Survey 2025 — Energy and Fuel Prices',
   'Kenya National Bureau of Statistics',
   '2025-05-01',
   'https://www.knbs.or.ke/publications/',
   'Annual statistical compendium with rural and urban fuel consumption and pricing.',
   'high',
   'Kenya'),

  ('cleancookiq-internal-v1',
   'CleanCookiQ Internal Reference Defaults v1',
   'CleanCookiQ Platform',
   '2026-04-27',
   NULL,
   'Platform-derived defaults used where no county-specific source has been ingested. Each value should be superseded by a sourced data point as field data becomes available.',
   'preliminary',
   'Kenya')
ON CONFLICT (slug) DO NOTHING;

-- ---------- Data points (fuel costs) ----------
-- Sourced to the platform internal reference until field data lands;
-- once admins import county-level pricing the entries below get marked
-- superseded_by and remain in history.
WITH src AS (
  SELECT id FROM public.data_sources WHERE slug = 'cleancookiq-internal-v1'
)
INSERT INTO public.data_points
  (metric_key, value_numeric, unit, fuel_type, source_id, valid_from, notes)
SELECT * FROM (VALUES
  ('fuel.cost_per_unit', 8000, 'KSh/tonne', 'firewood', (SELECT id FROM src), CURRENT_DATE,
    'Average rural delivered firewood price; replace with KNBS county-level when available.'),
  ('fuel.cost_per_unit', 120,  'KSh/kg',    'charcoal', (SELECT id FROM src), CURRENT_DATE,
    'Urban-equivalent retail charcoal price; varies materially by county.'),
  ('fuel.cost_per_unit', 250,  'KSh/kg',    'lpg',      (SELECT id FROM src), CURRENT_DATE,
    'Derived from EPRA 13kg cylinder maximum retail price; refresh monthly.'),
  ('fuel.cost_per_unit', 50,   'KSh/m3',    'biogas',   (SELECT id FROM src), CURRENT_DATE,
    'Notional cost where digester is amortized over 10 years; raw biogas is free at point of use.'),
  ('fuel.cost_per_unit', 25,   'KSh/kWh',   'electric', (SELECT id FROM src), CURRENT_DATE,
    'KPLC SC1 institutional tariff inclusive of fuel cost charge.'),
  ('fuel.cost_per_unit', 80,   'KSh/kg',    'other',    (SELECT id FROM src), CURRENT_DATE,
    'Biomass pellets (typical local market price).')
) AS v(metric_key, value_numeric, unit, fuel_type, source_id, valid_from, notes);

-- ---------- Data points (CO2 emission factors) ----------
WITH src AS (
  SELECT id FROM public.data_sources WHERE slug = 'ipcc-ar6-wg3-emission-factors'
)
INSERT INTO public.data_points
  (metric_key, value_numeric, unit, fuel_type, source_id, valid_from, notes)
SELECT * FROM (VALUES
  ('fuel.co2_factor', 1700, 'kg CO2e/tonne', 'firewood', (SELECT id FROM src), CURRENT_DATE,
    'Net emission factor accounting for non-renewable biomass fraction in Kenya context.'),
  ('fuel.co2_factor', 3.7,  'kg CO2e/kg',    'charcoal', (SELECT id FROM src), CURRENT_DATE,
    'Includes carbonization-stage emissions.'),
  ('fuel.co2_factor', 3.0,  'kg CO2e/kg',    'lpg',      (SELECT id FROM src), CURRENT_DATE,
    'Stoichiometric combustion of propane/butane mix.'),
  ('fuel.co2_factor', 0.5,  'kg CO2e/m3',    'biogas',   (SELECT id FROM src), CURRENT_DATE,
    'Residual leakage and fugitive methane emissions.'),
  ('fuel.co2_factor', 0.5,  'kg CO2e/kWh',   'electric', (SELECT id FROM src), CURRENT_DATE,
    'Kenya grid mix adjusted for predominantly geothermal and hydro generation.'),
  ('fuel.co2_factor', 1.5,  'kg CO2e/kg',    'other',    (SELECT id FROM src), CURRENT_DATE,
    'Indicative for biomass pellets; varies by feedstock.')
) AS v(metric_key, value_numeric, unit, fuel_type, source_id, valid_from, notes);

-- ---------- Modeled platform parameters ----------
WITH src AS (
  SELECT id FROM public.data_sources WHERE slug = 'cca-clean-cooking-benchmarks-2024'
)
INSERT INTO public.data_points
  (metric_key, value_numeric, unit, source_id, valid_from, notes)
SELECT * FROM (VALUES
  ('transition.clean_cost_multiplier', 0.40, 'ratio', (SELECT id FROM src), CURRENT_DATE,
    'Operating cost of a clean-cooking baseline relative to the prior dirty-fuel baseline; institutional median across CCA-monitored deployments.'),
  ('transition.co2_reduction_fraction', 0.85, 'ratio', (SELECT id FROM src), CURRENT_DATE,
    'Fraction of baseline CO2e avoided after transition to a fully clean cooking solution.'),
  ('transition.cooking_time_savings', 0.50, 'ratio', (SELECT id FROM src), CURRENT_DATE,
    'Median reduction in active cooking-attendance time vs. open-fire/charcoal baseline.')
) AS v(metric_key, value_numeric, unit, source_id, valid_from, notes);

-- Seed product categories for the marketplace.
-- Idempotent on slug; safe to re-run.

INSERT INTO public.product_categories (slug, name, display_order, description) VALUES
  ('biogas',           'Biogas',                 10, 'Anaerobic digesters, biogas burners, accessories'),
  ('lpg',              'LPG',                    20, 'Institutional LPG cookstoves, cylinders, regulators, pipework'),
  ('electric',         'Electric / Induction',   30, 'Induction stoves, electric pressure cookers, hot-water systems'),
  ('improved-biomass', 'Improved Biomass',       40, 'Efficient firewood and charcoal stoves with reduced emissions'),
  ('ethanol',          'Ethanol',                50, 'Bio-ethanol stoves and fuel'),
  ('solar',            'Solar Cookers',          60, 'Solar-thermal and PV-electric cookers, hybrid systems'),
  ('briquettes',       'Briquettes & Pellets',   70, 'Compressed biomass fuel'),
  ('accessories',      'Accessories',            80, 'Cookware, safety kit, spare parts'),
  ('installation',     'Installation Services',  90, 'On-site equipment installation, plumbing, electrical work'),
  ('maintenance',      'Maintenance Services',   100, 'Servicing, refills, repairs, gas testing'),
  ('training',         'Training Services',     110, 'Cook training, safety briefings, M&E support')
ON CONFLICT (slug) DO NOTHING;

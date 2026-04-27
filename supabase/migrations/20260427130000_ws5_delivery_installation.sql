-- ============================================================
-- Workstream 5: Delivery & Installation
--
-- Tables:
--   installation_crews           - registered installation teams
--   deliveries                   - one per project that's reached
--                                  the contracted/installed stage
--   delivery_events              - timestamped status events on a delivery
--   commissioning_checklist_templates - per-technology default checklists
--   commissioning_checklists     - filled per-delivery instances
--   acceptance_signoffs          - institution-head sign-off + evidence
--
-- All policies use (SELECT auth.uid()); views with security_invoker=true.
-- ============================================================

-- ============================================================
-- 1. INSTALLATION CREWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.installation_crews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  provider_id         UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  lead_name           TEXT,
  contact_phone       TEXT,
  contact_email       TEXT,
  certifications      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  insurance_valid_until DATE,
  counties_served     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  technology_types    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  active_jobs_capacity INTEGER NOT NULL DEFAULT 5,
  rating              NUMERIC(3,2),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installation_crews_active ON public.installation_crews(is_active);
CREATE INDEX IF NOT EXISTS idx_installation_crews_provider ON public.installation_crews(provider_id);

DROP TRIGGER IF EXISTS trg_installation_crews_updated_at ON public.installation_crews;
CREATE TRIGGER trg_installation_crews_updated_at
  BEFORE UPDATE ON public.installation_crews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.installation_crews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crews_authenticated_read" ON public.installation_crews;
DROP POLICY IF EXISTS "crews_admin_write"        ON public.installation_crews;

CREATE POLICY "crews_authenticated_read" ON public.installation_crews
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "crews_admin_write" ON public.installation_crews
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 2. DELIVERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installation_crew_id  UUID REFERENCES public.installation_crews(id) ON DELETE SET NULL,
  stage                 TEXT NOT NULL DEFAULT 'manufacturing'
                        CHECK (stage IN
                          ('manufacturing','dispatched','in_transit','on_site',
                           'installing','commissioned','handover','acceptance_window',
                           'monitoring','cancelled')),
  carrier               TEXT,
  tracking_ref          TEXT,
  delivery_county       TEXT,
  delivery_address      TEXT,
  planned_dispatch_at   DATE,
  actual_dispatch_at    DATE,
  planned_arrival_at    DATE,
  actual_arrival_at     DATE,
  planned_install_at    DATE,
  actual_install_at     DATE,
  commissioned_at       DATE,
  acceptance_due_at     DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_project ON public.deliveries(project_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_stage   ON public.deliveries(stage);
CREATE INDEX IF NOT EXISTS idx_deliveries_county  ON public.deliveries(delivery_county);

DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_admin_all"       ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_field_agent_rw"  ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_party_read"      ON public.deliveries;

-- Admins/managers: full
CREATE POLICY "deliveries_admin_all" ON public.deliveries
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ));

-- Buyer (institution) and supplier (provider) on the linked project can read
CREATE POLICY "deliveries_party_read" ON public.deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.user_id = (SELECT auth.uid())
              AND (pr.organisation_id = (
                SELECT organisation_id FROM public.institutions WHERE id = p.institution_id
              ))
          )
          OR EXISTS (
            SELECT 1 FROM public.providers pv
            JOIN public.profiles pr ON pr.organisation_id = pv.organisation_id
            WHERE pv.id = p.provider_id AND pr.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================
-- 3. DELIVERY EVENTS (timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id     UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,                   -- 'stage_change','photo','note','exception'
  stage           TEXT,                            -- new stage when type='stage_change'
  body            TEXT,
  attachment_url  TEXT,
  geo_lat         NUMERIC,
  geo_lon         NUMERIC,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery ON public.delivery_events(delivery_id, occurred_at DESC);

ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_events_admin_all"     ON public.delivery_events;
DROP POLICY IF EXISTS "delivery_events_party_read"    ON public.delivery_events;
DROP POLICY IF EXISTS "delivery_events_self_insert"   ON public.delivery_events;

CREATE POLICY "delivery_events_admin_all" ON public.delivery_events
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ));

CREATE POLICY "delivery_events_party_read" ON public.delivery_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_id
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
      )
      OR EXISTS (
        SELECT 1 FROM public.deliveries d
        JOIN public.projects p ON p.id = d.project_id
        WHERE d.id = delivery_id
          AND EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.user_id = (SELECT auth.uid())
              AND pr.organisation_id IN (
                SELECT organisation_id FROM public.institutions WHERE id = p.institution_id
                UNION
                SELECT organisation_id FROM public.providers WHERE id = p.provider_id
              )
          )
      )
    )
  );

CREATE POLICY "delivery_events_self_insert" ON public.delivery_events
  FOR INSERT
  WITH CHECK (recorded_by = (SELECT auth.uid()));

-- ============================================================
-- 4. COMMISSIONING CHECKLIST TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.commissioning_checklist_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  fuel_type       TEXT,
  description     TEXT,
  items           JSONB NOT NULL DEFAULT '[]',  -- [{id, requirement, evidence_required}, ...]
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_commissioning_templates_updated_at ON public.commissioning_checklist_templates;
CREATE TRIGGER trg_commissioning_templates_updated_at
  BEFORE UPDATE ON public.commissioning_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.commissioning_checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissioning_templates_public_read" ON public.commissioning_checklist_templates;
DROP POLICY IF EXISTS "commissioning_templates_admin_write" ON public.commissioning_checklist_templates;

CREATE POLICY "commissioning_templates_public_read" ON public.commissioning_checklist_templates
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "commissioning_templates_admin_write" ON public.commissioning_checklist_templates
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager')
  ));

-- ============================================================
-- 5. COMMISSIONING CHECKLISTS (filled per delivery)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.commissioning_checklists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id     UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES public.commissioning_checklist_templates(id) ON DELETE SET NULL,
  responses       JSONB NOT NULL DEFAULT '{}',  -- {item_id: {checked: bool, note?: string, evidence_url?: string}}
  completed_items INTEGER NOT NULL DEFAULT 0,
  total_items     INTEGER NOT NULL DEFAULT 0,
  is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_commissioning_delivery ON public.commissioning_checklists(delivery_id);

DROP TRIGGER IF EXISTS trg_commissioning_updated_at ON public.commissioning_checklists;
CREATE TRIGGER trg_commissioning_updated_at
  BEFORE UPDATE ON public.commissioning_checklists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.commissioning_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissioning_admin_all"  ON public.commissioning_checklists;
DROP POLICY IF EXISTS "commissioning_party_read" ON public.commissioning_checklists;

CREATE POLICY "commissioning_admin_all" ON public.commissioning_checklists
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ));

CREATE POLICY "commissioning_party_read" ON public.commissioning_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = delivery_id
        AND EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = (SELECT auth.uid())
            AND pr.organisation_id IN (
              SELECT organisation_id FROM public.institutions WHERE id = p.institution_id
              UNION
              SELECT organisation_id FROM public.providers WHERE id = p.provider_id
            )
        )
    )
  );

-- ============================================================
-- 6. ACCEPTANCE SIGNOFFS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.acceptance_signoffs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id         UUID NOT NULL UNIQUE REFERENCES public.deliveries(id) ON DELETE CASCADE,
  signed_by_name      TEXT NOT NULL,
  signed_by_role      TEXT,                          -- 'head_teacher','administrator','principal',...
  signed_by_phone     TEXT,
  signed_by_email     TEXT,
  signed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_image_url TEXT,
  evidence_photo_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'accepted'
                      CHECK (status IN ('accepted','rejected','provisional')),
  recorded_by         UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_acceptance_signoffs_updated_at ON public.acceptance_signoffs;
CREATE TRIGGER trg_acceptance_signoffs_updated_at
  BEFORE UPDATE ON public.acceptance_signoffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.acceptance_signoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signoffs_admin_all"  ON public.acceptance_signoffs;
DROP POLICY IF EXISTS "signoffs_party_read" ON public.acceptance_signoffs;

CREATE POLICY "signoffs_admin_all" ON public.acceptance_signoffs
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','manager','field_agent')
  ));

CREATE POLICY "signoffs_party_read" ON public.acceptance_signoffs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = delivery_id
        AND EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = (SELECT auth.uid())
            AND pr.organisation_id IN (
              SELECT organisation_id FROM public.institutions WHERE id = p.institution_id
              UNION
              SELECT organisation_id FROM public.providers WHERE id = p.provider_id
            )
        )
    )
  );

-- ============================================================
-- 7. SEED COMMISSIONING TEMPLATES
-- ============================================================
INSERT INTO public.commissioning_checklist_templates (slug, name, fuel_type, description, items)
VALUES
  ('lpg-institutional', 'LPG institutional commissioning', 'lpg',
   'Standard sign-off items for LPG cylinder bank installations.',
   '[
     {"id":"cyl_count","requirement":"Cylinder count and capacity match purchase order","evidence_required":"photo"},
     {"id":"regulator","requirement":"High-pressure regulator installed and torque-checked","evidence_required":"photo"},
     {"id":"leak_test","requirement":"Soapy-water leak test passed at all joints","evidence_required":"photo"},
     {"id":"shutoff","requirement":"Emergency shutoff valve accessible and labelled","evidence_required":"photo"},
     {"id":"ppe","requirement":"Cook safety briefing delivered (gloves, eye, fire blanket)","evidence_required":"signature"},
     {"id":"first_cook","requirement":"Witnessed first cooking cycle without anomalies","evidence_required":"photo"},
     {"id":"docs","requirement":"User manual and supplier contact card left on site","evidence_required":"photo"}
   ]'::jsonb),

  ('biogas-fixed-dome', 'Biogas digester commissioning', 'biogas',
   'Sign-off items for fixed-dome biogas digesters at institutional scale.',
   '[
     {"id":"dome_pressure","requirement":"Dome holds pressure for 24h post-charge","evidence_required":"photo"},
     {"id":"slurry_quality","requirement":"Slurry pH within 6.5-7.5 at first read","evidence_required":"reading"},
     {"id":"gas_quality","requirement":"Methane content >55% on portable analyser","evidence_required":"reading"},
     {"id":"flame_test","requirement":"Stable blue flame at burner","evidence_required":"photo"},
     {"id":"safety_training","requirement":"Operator trained on H2S risk and ventilation","evidence_required":"signature"},
     {"id":"feeding_schedule","requirement":"Daily feeding schedule documented and posted","evidence_required":"photo"}
   ]'::jsonb),

  ('electric-induction', 'Electric induction commissioning', 'electric',
   'Sign-off items for institutional electric induction systems.',
   '[
     {"id":"breaker_rating","requirement":"Dedicated circuit breaker rating matches load","evidence_required":"photo"},
     {"id":"earth_test","requirement":"Earth resistance < 1 ohm verified","evidence_required":"reading"},
     {"id":"load_test","requirement":"Sustained 30-minute load test at full capacity","evidence_required":"photo"},
     {"id":"surge_protection","requirement":"Surge protector installed upstream","evidence_required":"photo"},
     {"id":"cookware_check","requirement":"All cookware confirmed induction-compatible","evidence_required":"photo"},
     {"id":"cook_training","requirement":"Cook training on temperature curves delivered","evidence_required":"signature"}
   ]'::jsonb),

  ('improved-biomass', 'Improved biomass stove commissioning', 'firewood',
   'Sign-off items for improved firewood/charcoal cookstoves.',
   '[
     {"id":"chimney_draught","requirement":"Chimney draught test passed","evidence_required":"photo"},
     {"id":"ash_pit","requirement":"Ash pit accessible and emptied","evidence_required":"photo"},
     {"id":"refractory","requirement":"Refractory lining intact and cured","evidence_required":"photo"},
     {"id":"fuel_storage","requirement":"Dry fuel storage area identified","evidence_required":"photo"},
     {"id":"burn_test","requirement":"Witnessed efficiency burn at full pot load","evidence_required":"photo"}
   ]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 8. VIEW: deliveries with project + institution context
-- ============================================================
CREATE OR REPLACE VIEW public.v_delivery_summary
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.project_id,
  d.installation_crew_id,
  d.stage,
  d.carrier,
  d.tracking_ref,
  d.delivery_county,
  d.delivery_address,
  d.planned_dispatch_at,
  d.actual_dispatch_at,
  d.planned_arrival_at,
  d.actual_arrival_at,
  d.planned_install_at,
  d.actual_install_at,
  d.commissioned_at,
  d.acceptance_due_at,
  d.notes,
  d.created_at,
  d.updated_at,
  p.title          AS project_title,
  p.institution_id,
  i.name           AS institution_name,
  i.county         AS institution_county,
  p.provider_id,
  pr.name          AS provider_name,
  ic.name          AS crew_name,
  ic.lead_name     AS crew_lead,
  ic.contact_phone AS crew_phone,
  cc.is_complete   AS commissioning_complete,
  cc.completed_items,
  cc.total_items,
  CASE WHEN s.id IS NOT NULL THEN TRUE ELSE FALSE END AS signed_off,
  s.signed_at      AS signed_off_at,
  s.signed_by_name AS signed_off_by
FROM public.deliveries d
JOIN public.projects p          ON p.id = d.project_id
JOIN public.institutions i      ON i.id = p.institution_id
LEFT JOIN public.providers pr   ON pr.id = p.provider_id
LEFT JOIN public.installation_crews ic ON ic.id = d.installation_crew_id
LEFT JOIN public.commissioning_checklists cc ON cc.delivery_id = d.id
LEFT JOIN public.acceptance_signoffs s ON s.delivery_id = d.id;

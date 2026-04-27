-- ============================================================
-- Workstream 0: Data Integrity Layer
--
-- Adds substantiability infrastructure so every quantitative
-- claim on the platform can be traced to a verifiable source.
--
-- Tables:
--   counties              - Kenya counties as first-class entity
--   data_sources          - citable references (EPRA, IPCC, FAO, etc.)
--   data_points           - typed metric values with source FK
--   evidence_attachments  - polymorphic evidence (photos, PDFs, receipts)
-- ============================================================

-- ---------- helper: updated_at trigger function (idempotent) ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COUNTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.counties (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL UNIQUE,
  region       TEXT,
  population   INTEGER,
  capital      TEXT,
  area_km2     NUMERIC,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counties_region ON public.counties(region);

DROP TRIGGER IF EXISTS trg_counties_updated_at ON public.counties;
CREATE TRIGGER trg_counties_updated_at
  BEFORE UPDATE ON public.counties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counties_public_read" ON public.counties
  FOR SELECT USING (true);

CREATE POLICY "counties_admin_write" ON public.counties
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
-- DATA SOURCES (citable references)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.data_sources (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  publisher            TEXT,
  authors              TEXT,
  published_date       DATE,
  accessed_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  url                  TEXT,
  document_url         TEXT,           -- mirrored copy in storage
  methodology_notes    TEXT,
  confidence_level     TEXT NOT NULL DEFAULT 'medium'
                       CHECK (confidence_level IN ('high', 'medium', 'modeled', 'preliminary')),
  geographic_scope     TEXT,           -- e.g. 'Kenya', 'East Africa', 'Global', or county name
  validity_until       DATE,           -- when the citation should be revisited
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_sources_active ON public.data_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_data_sources_scope ON public.data_sources(geographic_scope);

DROP TRIGGER IF EXISTS trg_data_sources_updated_at ON public.data_sources;
CREATE TRIGGER trg_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_sources_public_read" ON public.data_sources
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "data_sources_admin_write" ON public.data_sources
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
-- DATA POINTS (typed metric values)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.data_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key      TEXT NOT NULL,             -- e.g. 'fuel.firewood.cost_per_tonne_ksh'
  value_numeric   NUMERIC,
  value_text      TEXT,
  unit            TEXT,                      -- e.g. 'KSh/tonne', 'kg CO2e/kg', '%'
  fuel_type       TEXT,                      -- nullable; firewood/charcoal/lpg/biogas/electric/...
  county_id       UUID REFERENCES public.counties(id) ON DELETE SET NULL,
  source_id       UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
  valid_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE,
  superseded_by   UUID REFERENCES public.data_points(id) ON DELETE SET NULL,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (value_numeric IS NOT NULL OR value_text IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_data_points_metric_key ON public.data_points(metric_key);
CREATE INDEX IF NOT EXISTS idx_data_points_county ON public.data_points(county_id);
CREATE INDEX IF NOT EXISTS idx_data_points_fuel ON public.data_points(fuel_type);
CREATE INDEX IF NOT EXISTS idx_data_points_active
  ON public.data_points(metric_key)
  WHERE superseded_by IS NULL;

DROP TRIGGER IF EXISTS trg_data_points_updated_at ON public.data_points;
CREATE TRIGGER trg_data_points_updated_at
  BEFORE UPDATE ON public.data_points
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.data_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_points_public_read" ON public.data_points
  FOR SELECT USING (true);

CREATE POLICY "data_points_admin_write" ON public.data_points
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
-- Convenience view: only currently-valid data points
-- ============================================================
CREATE OR REPLACE VIEW public.v_active_data_points AS
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

-- ============================================================
-- EVIDENCE ATTACHMENTS (polymorphic)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,             -- 'institution', 'project', 'mou_ipa_documents', 'data_point', etc.
  entity_id       UUID NOT NULL,
  kind            TEXT NOT NULL,             -- 'photo', 'receipt', 'certificate', 'meter_reading', 'survey', 'other'
  description     TEXT,
  file_url        TEXT NOT NULL,
  file_hash       TEXT,                      -- sha256 for tamper-detection
  mime_type       TEXT,
  file_size_bytes BIGINT,
  captured_at     TIMESTAMPTZ,               -- when the evidence was created in the real world
  geo_lat         NUMERIC,
  geo_lon         NUMERIC,
  uploaded_by     UUID REFERENCES auth.users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_entity ON public.evidence_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_kind ON public.evidence_attachments(kind);

ALTER TABLE public.evidence_attachments ENABLE ROW LEVEL SECURITY;

-- Admins/managers/field_agents: full access
CREATE POLICY "evidence_admin_all" ON public.evidence_attachments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'field_agent')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'field_agent')
  ));

-- Authenticated users can read evidence (visibility scoping happens at the entity level)
CREATE POLICY "evidence_authenticated_read" ON public.evidence_attachments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can attach evidence to records they uploaded
CREATE POLICY "evidence_self_insert" ON public.evidence_attachments
  FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- =============================================
-- DATABASE INDEXES for performance
-- =============================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organisation_id ON public.profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_type ON public.profiles(org_type);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- institutions
CREATE INDEX IF NOT EXISTS idx_institutions_created_by ON public.institutions(created_by);
CREATE INDEX IF NOT EXISTS idx_institutions_organisation_id ON public.institutions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_institutions_county ON public.institutions(county);
CREATE INDEX IF NOT EXISTS idx_institutions_pipeline_stage ON public.institutions(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_institutions_institution_type ON public.institutions(institution_type);
CREATE INDEX IF NOT EXISTS idx_institutions_setup_completed ON public.institutions(setup_completed);

-- organisations
CREATE INDEX IF NOT EXISTS idx_organisations_org_type ON public.organisations(org_type);

-- providers
CREATE INDEX IF NOT EXISTS idx_providers_organisation_id ON public.providers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON public.providers(verified);

-- assessments
CREATE INDEX IF NOT EXISTS idx_assessments_institution_id ON public.assessments(institution_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_assessor_id ON public.assessments(assessor_id);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_institution_id ON public.projects(institution_id);
CREATE INDEX IF NOT EXISTS idx_projects_provider_id ON public.projects(provider_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_raised_by ON public.support_tickets(raised_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- provider_products
CREATE INDEX IF NOT EXISTS idx_provider_products_provider_id ON public.provider_products(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_products_category_id ON public.provider_products(category_id);
CREATE INDEX IF NOT EXISTS idx_provider_products_is_listed ON public.provider_products(is_listed);

-- quote_requests
CREATE INDEX IF NOT EXISTS idx_quote_requests_institution_id ON public.quote_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_provider_id ON public.quote_requests(provider_id);

-- funder_portfolio
CREATE INDEX IF NOT EXISTS idx_funder_portfolio_organisation_id ON public.funder_portfolio(organisation_id);
CREATE INDEX IF NOT EXISTS idx_funder_portfolio_project_id ON public.funder_portfolio(project_id);

-- onboarding_progress
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);

-- data_points
CREATE INDEX IF NOT EXISTS idx_data_points_metric_key ON public.data_points(metric_key);
CREATE INDEX IF NOT EXISTS idx_data_points_source_id ON public.data_points(source_id);

-- evidence_attachments
CREATE INDEX IF NOT EXISTS idx_evidence_attachments_entity ON public.evidence_attachments(entity_type, entity_id);

-- =============================================
-- AUDIT LOGGING trigger for sensitive tables
-- =============================================

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Audit logging on sensitive tables
DO $$ BEGIN
  CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_organisations
    AFTER INSERT OR UPDATE OR DELETE ON public.organisations
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_institutions
    AFTER INSERT OR UPDATE OR DELETE ON public.institutions
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_kplc_depots
    AFTER INSERT OR UPDATE OR DELETE ON public.kplc_depots
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- New enum types
CREATE TYPE public.provider_category AS ENUM ('equipment_provider', 'installation_technician', 'logistics_provider', 'service_product_provider');
CREATE TYPE public.ta_availability AS ENUM ('available', 'committed', 'unavailable');
CREATE TYPE public.financing_type AS ENUM ('grant', 'concessional_debt', 'commercial_debt', 'equity');
CREATE TYPE public.financing_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'disbursed', 'rejected');
CREATE TYPE public.verification_method AS ENUM ('iot_sensor', 'manual_survey', 'platform_self_report');
CREATE TYPE public.dmrv_status AS ENUM ('pending', 'verified', 'disputed');
CREATE TYPE public.contract_type AS ENUM ('maintenance', 'fuel_supply', 'spare_parts', 'other');
CREATE TYPE public.contract_status AS ENUM ('active', 'expiring_soon', 'expired', 'terminated');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.programme_status AS ENUM ('planning', 'procurement', 'active', 'completed');
CREATE TYPE public.rfq_status AS ENUM ('draft', 'published', 'closed', 'awarded');
CREATE TYPE public.rfq_response_status AS ENUM ('submitted', 'shortlisted', 'awarded', 'rejected');

-- Extend existing enums
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'scored';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'least_cost_path_assigned';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'provider_matched';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'financed';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'in_delivery';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'monitored_dmrv';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ta_provider';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financing_partner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'programme_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dmrv_verifier';

-- New columns on institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS fuel_of_choice text;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS meals_served_per_day integer DEFAULT 0;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS recommended_solution text;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS annual_savings_ksh numeric DEFAULT 0;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS co2_reduction_tonnes_pa numeric DEFAULT 0;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ta_required boolean DEFAULT false;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ta_type_needed text[];
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ta_resource_window_start date;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ta_resource_window_end date;

-- New columns on providers
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS provider_category public.provider_category;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS nda_signed_at timestamptz;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS mou_signed_at timestamptz;

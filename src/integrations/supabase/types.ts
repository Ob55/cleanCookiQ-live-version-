export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          assessor_id: string | null
          cooking_patterns: Json | null
          created_at: string
          documents: string[] | null
          energy_consumption: Json | null
          id: string
          infrastructure_condition: Json | null
          institution_id: string
          kitchen_details: Json | null
          reviewed_at: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assessor_id?: string | null
          cooking_patterns?: Json | null
          created_at?: string
          documents?: string[] | null
          energy_consumption?: Json | null
          id?: string
          infrastructure_condition?: Json | null
          institution_id: string
          kitchen_details?: Json | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assessor_id?: string | null
          cooking_patterns?: Json | null
          created_at?: string
          documents?: string[] | null
          energy_consumption?: Json | null
          id?: string
          infrastructure_condition?: Json | null
          institution_id?: string
          kitchen_details?: Json | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cost_models: {
        Row: {
          assumptions: Json | null
          capex: number | null
          created_at: string
          current_monthly_fuel_cost: number | null
          id: string
          institution_id: string
          monthly_opex: number | null
          payback_months: number | null
          projected_monthly_savings: number | null
          roi_percentage: number | null
          technology_type: string
          updated_at: string
        }
        Insert: {
          assumptions?: Json | null
          capex?: number | null
          created_at?: string
          current_monthly_fuel_cost?: number | null
          id?: string
          institution_id: string
          monthly_opex?: number | null
          payback_months?: number | null
          projected_monthly_savings?: number | null
          roi_percentage?: number | null
          technology_type: string
          updated_at?: string
        }
        Update: {
          assumptions?: Json | null
          capex?: number | null
          created_at?: string
          current_monthly_fuel_cost?: number | null
          id?: string
          institution_id?: string
          monthly_opex?: number | null
          payback_months?: number | null
          projected_monthly_savings?: number | null
          roi_percentage?: number | null
          technology_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_models_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      dmrv_records: {
        Row: {
          co2_verified_tonnes: number | null
          created_at: string
          id: string
          meals_verified: number | null
          project_id: string
          recorded_at: string
          status: Database["public"]["Enums"]["dmrv_status"]
          updated_at: string
          usage_hours: number | null
          verification_method: Database["public"]["Enums"]["verification_method"]
          verifier_id: string | null
        }
        Insert: {
          co2_verified_tonnes?: number | null
          created_at?: string
          id?: string
          meals_verified?: number | null
          project_id: string
          recorded_at?: string
          status?: Database["public"]["Enums"]["dmrv_status"]
          updated_at?: string
          usage_hours?: number | null
          verification_method?: Database["public"]["Enums"]["verification_method"]
          verifier_id?: string | null
        }
        Update: {
          co2_verified_tonnes?: number | null
          created_at?: string
          id?: string
          meals_verified?: number | null
          project_id?: string
          recorded_at?: string
          status?: Database["public"]["Enums"]["dmrv_status"]
          updated_at?: string
          usage_hours?: number | null
          verification_method?: Database["public"]["Enums"]["verification_method"]
          verifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dmrv_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expressions_of_interest: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          proposal_text: string | null
          proposed_cost: number | null
          provider_id: string
          reviewed_at: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          proposal_text?: string | null
          proposed_cost?: number | null
          provider_id: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          proposal_text?: string | null
          proposed_cost?: number | null
          provider_id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expressions_of_interest_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expressions_of_interest_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_applications: {
        Row: {
          amount_requested_ksh: number | null
          created_at: string
          decision_at: string | null
          disbursed_at: string | null
          disbursement_amount_ksh: number | null
          financing_type: Database["public"]["Enums"]["financing_type"]
          funder_organisation_id: string | null
          id: string
          institution_id: string
          status: Database["public"]["Enums"]["financing_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          amount_requested_ksh?: number | null
          created_at?: string
          decision_at?: string | null
          disbursed_at?: string | null
          disbursement_amount_ksh?: number | null
          financing_type: Database["public"]["Enums"]["financing_type"]
          funder_organisation_id?: string | null
          id?: string
          institution_id: string
          status?: Database["public"]["Enums"]["financing_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_requested_ksh?: number | null
          created_at?: string
          decision_at?: string | null
          disbursed_at?: string | null
          disbursement_amount_ksh?: number | null
          financing_type?: Database["public"]["Enums"]["financing_type"]
          funder_organisation_id?: string | null
          id?: string
          institution_id?: string
          status?: Database["public"]["Enums"]["financing_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financing_applications_funder_organisation_id_fkey"
            columns: ["funder_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_applications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      funder_institution_links: {
        Row: {
          funder_id: string
          id: string
          institution_id: string
          linked_at: string
          status: string
        }
        Insert: {
          funder_id: string
          id?: string
          institution_id: string
          linked_at?: string
          status?: string
        }
        Update: {
          funder_id?: string
          id?: string
          institution_id?: string
          linked_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "funder_institution_links_funder_id_fkey"
            columns: ["funder_id"]
            isOneToOne: false
            referencedRelation: "funder_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funder_institution_links_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      funder_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          funding_type: string
          id: string
          organisation_name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          funding_type: string
          id?: string
          organisation_name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          funding_type?: string
          id?: string
          organisation_name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      institution_documents: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          institution_id: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          institution_id?: string | null
          title: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          institution_id?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_documents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_needs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          institution_id: string
          status: string
          technology_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          institution_id: string
          status?: string
          technology_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          institution_id?: string
          status?: string
          technology_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_needs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_selected_products: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "institution_selected_products_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_selected_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "provider_products"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_selected_services: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          quantity: number
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          quantity?: number
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_selected_services_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_selected_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          annual_savings_ksh: number | null
          assessment_category: string | null
          assessment_score: number | null
          co2_reduction_tonnes_pa: number | null
          consumption_per_term: number | null
          consumption_unit: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          cooking_time_minutes: number | null
          county: string
          created_at: string
          created_by: string | null
          current_fuel: Database["public"]["Enums"]["fuel_type"] | null
          financial_decision_maker: string | null
          financing_preference: string | null
          fuel_of_choice: string | null
          has_dedicated_kitchen: boolean | null
          id: string
          institution_type: Database["public"]["Enums"]["institution_type"]
          kitchen_condition: string | null
          kitchen_photo_url: string | null
          latitude: number | null
          longitude: number | null
          meals_per_day: number | null
          meals_served_per_day: number | null
          monthly_fuel_spend: number | null
          name: string
          notes: string | null
          number_of_staff: number | null
          number_of_students: number | null
          organisation_id: string | null
          ownership_type: string | null
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"]
          recommended_solution: string | null
          setup_completed: boolean | null
          sub_county: string | null
          ta_required: boolean | null
          ta_resource_window_end: string | null
          ta_resource_window_start: string | null
          ta_type_needed: string[] | null
          transition_interest: string | null
          transition_needs: string | null
          updated_at: string
          wishes_to_transition_steam: boolean | null
        }
        Insert: {
          annual_savings_ksh?: number | null
          assessment_category?: string | null
          assessment_score?: number | null
          co2_reduction_tonnes_pa?: number | null
          consumption_per_term?: number | null
          consumption_unit?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cooking_time_minutes?: number | null
          county: string
          created_at?: string
          created_by?: string | null
          current_fuel?: Database["public"]["Enums"]["fuel_type"] | null
          financial_decision_maker?: string | null
          financing_preference?: string | null
          fuel_of_choice?: string | null
          has_dedicated_kitchen?: boolean | null
          id?: string
          institution_type?: Database["public"]["Enums"]["institution_type"]
          kitchen_condition?: string | null
          kitchen_photo_url?: string | null
          latitude?: number | null
          longitude?: number | null
          meals_per_day?: number | null
          meals_served_per_day?: number | null
          monthly_fuel_spend?: number | null
          name: string
          notes?: string | null
          number_of_staff?: number | null
          number_of_students?: number | null
          organisation_id?: string | null
          ownership_type?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          recommended_solution?: string | null
          setup_completed?: boolean | null
          sub_county?: string | null
          ta_required?: boolean | null
          ta_resource_window_end?: string | null
          ta_resource_window_start?: string | null
          ta_type_needed?: string[] | null
          transition_interest?: string | null
          transition_needs?: string | null
          updated_at?: string
          wishes_to_transition_steam?: boolean | null
        }
        Update: {
          annual_savings_ksh?: number | null
          assessment_category?: string | null
          assessment_score?: number | null
          co2_reduction_tonnes_pa?: number | null
          consumption_per_term?: number | null
          consumption_unit?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cooking_time_minutes?: number | null
          county?: string
          created_at?: string
          created_by?: string | null
          current_fuel?: Database["public"]["Enums"]["fuel_type"] | null
          financial_decision_maker?: string | null
          financing_preference?: string | null
          fuel_of_choice?: string | null
          has_dedicated_kitchen?: boolean | null
          id?: string
          institution_type?: Database["public"]["Enums"]["institution_type"]
          kitchen_condition?: string | null
          kitchen_photo_url?: string | null
          latitude?: number | null
          longitude?: number | null
          meals_per_day?: number | null
          meals_served_per_day?: number | null
          monthly_fuel_spend?: number | null
          name?: string
          notes?: string | null
          number_of_staff?: number | null
          number_of_students?: number | null
          organisation_id?: string | null
          ownership_type?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          recommended_solution?: string | null
          setup_completed?: boolean | null
          sub_county?: string | null
          ta_required?: boolean | null
          ta_resource_window_end?: string | null
          ta_resource_window_start?: string | null
          ta_type_needed?: string[] | null
          transition_interest?: string | null
          transition_needs?: string | null
          updated_at?: string
          wishes_to_transition_steam?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "institutions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      opex_contracts: {
        Row: {
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          end_date: string | null
          id: string
          monthly_value_ksh: number | null
          project_id: string
          provider_id: string | null
          renewal_alert_days: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_value_ksh?: number | null
          project_id: string
          provider_id?: string | null
          renewal_alert_days?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_value_ksh?: number | null
          project_id?: string
          provider_id?: string | null
          renewal_alert_days?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opex_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opex_contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          awarded_provider_contact: string | null
          awarded_provider_id: string | null
          awarded_provider_name: string | null
          created_at: string
          created_by_name: string | null
          deadline: string | null
          description: string | null
          estimated_value: number | null
          id: string
          institution_id: string
          status: string
          technology_required: string | null
          title: string
          updated_at: string
        }
        Insert: {
          awarded_provider_contact?: string | null
          awarded_provider_id?: string | null
          awarded_provider_name?: string | null
          created_at?: string
          created_by_name?: string | null
          deadline?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          institution_id: string
          status?: string
          technology_required?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          awarded_provider_contact?: string | null
          awarded_provider_id?: string | null
          awarded_provider_name?: string | null
          created_at?: string
          created_by_name?: string | null
          deadline?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          institution_id?: string
          status?: string
          technology_required?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_awarded_provider_id_fkey"
            columns: ["awarded_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          county: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      procurement_rfqs: {
        Row: {
          created_at: string
          id: string
          programme_id: string
          published_at: string | null
          scope_description: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          submission_deadline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          programme_id: string
          published_at?: string | null
          scope_description?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          submission_deadline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          programme_id?: string
          published_at?: string | null
          scope_description?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          submission_deadline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_rfqs_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string
          full_name: string | null
          id: string
          org_type: Database["public"]["Enums"]["org_type"] | null
          organisation_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          full_name?: string | null
          id?: string
          org_type?: Database["public"]["Enums"]["org_type"] | null
          organisation_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          full_name?: string | null
          id?: string
          org_type?: Database["public"]["Enums"]["org_type"] | null
          organisation_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_organisation"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          county_scope: string[] | null
          created_at: string
          description: string | null
          id: string
          name: string
          programme_manager_id: string | null
          status: Database["public"]["Enums"]["programme_status"]
          target_institution_count: number | null
          total_budget_ksh: number | null
          updated_at: string
        }
        Insert: {
          county_scope?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          programme_manager_id?: string | null
          status?: Database["public"]["Enums"]["programme_status"]
          target_institution_count?: number | null
          total_budget_ksh?: number | null
          updated_at?: string
        }
        Update: {
          county_scope?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          programme_manager_id?: string | null
          status?: Database["public"]["Enums"]["programme_status"]
          target_institution_count?: number | null
          total_budget_ksh?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          sort_order: number | null
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          sort_order?: number | null
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          sort_order?: number | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_completion: string | null
          created_at: string
          id: string
          institution_id: string
          notes: string | null
          opportunity_id: string | null
          provider_id: string | null
          start_date: string | null
          status: string
          target_completion: string | null
          title: string
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          actual_completion?: string | null
          created_at?: string
          id?: string
          institution_id: string
          notes?: string | null
          opportunity_id?: string | null
          provider_id?: string | null
          start_date?: string | null
          status?: string
          target_completion?: string | null
          title: string
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          actual_completion?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          notes?: string | null
          opportunity_id?: string | null
          provider_id?: string | null
          start_date?: string | null
          status?: string
          target_completion?: string | null
          title?: string
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_documents: {
        Row: {
          created_at: string
          created_by: string
          document_type: string | null
          file_url: string | null
          id: string
          provider_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_type?: string | null
          file_url?: string | null
          id?: string
          provider_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_type?: string | null
          file_url?: string | null
          id?: string
          provider_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_products: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          created_at: string
          created_by: string
          details: string | null
          id: string
          name: string
          price: number | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          details?: string | null
          id?: string
          name: string
          price?: number | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          details?: string | null
          id?: string
          name?: string
          price?: number | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          counties_served: string[] | null
          created_at: string
          id: string
          mou_signed_at: string | null
          name: string
          nda_signed_at: string | null
          organisation_id: string | null
          provider_category:
            | Database["public"]["Enums"]["provider_category"]
            | null
          rating: number | null
          services: string[] | null
          technology_types: string[] | null
          updated_at: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          counties_served?: string[] | null
          created_at?: string
          id?: string
          mou_signed_at?: string | null
          name: string
          nda_signed_at?: string | null
          organisation_id?: string | null
          provider_category?:
            | Database["public"]["Enums"]["provider_category"]
            | null
          rating?: number | null
          services?: string[] | null
          technology_types?: string[] | null
          updated_at?: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          counties_served?: string[] | null
          created_at?: string
          id?: string
          mou_signed_at?: string | null
          name?: string
          nda_signed_at?: string | null
          organisation_id?: string | null
          provider_category?:
            | Database["public"]["Enums"]["provider_category"]
            | null
          rating?: number | null
          services?: string[] | null
          technology_types?: string[] | null
          updated_at?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_scores: {
        Row: {
          assessment_id: string | null
          calculated_at: string
          created_at: string
          financial_score: number | null
          id: string
          infrastructure_score: number | null
          institution_id: string
          operational_score: number | null
          overall_score: number | null
          social_score: number | null
          technical_score: number | null
        }
        Insert: {
          assessment_id?: string | null
          calculated_at?: string
          created_at?: string
          financial_score?: number | null
          id?: string
          infrastructure_score?: number | null
          institution_id: string
          operational_score?: number | null
          overall_score?: number | null
          social_score?: number | null
          technical_score?: number | null
        }
        Update: {
          assessment_id?: string | null
          calculated_at?: string
          created_at?: string
          financial_score?: number | null
          id?: string
          infrastructure_score?: number | null
          institution_id?: string
          operational_score?: number | null
          overall_score?: number | null
          social_score?: number | null
          technical_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "readiness_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_scores_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_responses: {
        Row: {
          created_at: string
          id: string
          proposal_summary: string | null
          proposed_value_ksh: number | null
          provider_id: string
          rfq_id: string
          status: Database["public"]["Enums"]["rfq_response_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_summary?: string | null
          proposed_value_ksh?: number | null
          provider_id: string
          rfq_id: string
          status?: Database["public"]["Enums"]["rfq_response_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          proposal_summary?: string | null
          proposed_value_ksh?: number | null
          provider_id?: string
          rfq_id?: string
          status?: Database["public"]["Enums"]["rfq_response_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_responses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_responses_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "procurement_rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_interest: {
        Row: {
          created_at: string
          id: string
          message: string | null
          need_id: string
          provider_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          need_id: string
          provider_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          need_id?: string
          provider_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_interest_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "institution_needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_interest_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          assigned_to_provider_id: string | null
          created_at: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          project_id: string | null
          raised_by: string | null
          raised_by_email: string | null
          raised_by_name: string | null
          raised_by_role: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          assigned_to_provider_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          project_id?: string | null
          raised_by?: string | null
          raised_by_email?: string | null
          raised_by_name?: string | null
          raised_by_role?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          assigned_to_provider_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          project_id?: string | null
          raised_by?: string | null
          raised_by_email?: string | null
          raised_by_name?: string | null
          raised_by_role?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_provider_id_fkey"
            columns: ["assigned_to_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ta_providers: {
        Row: {
          availability_status: Database["public"]["Enums"]["ta_availability"]
          counties_served: string[] | null
          created_at: string
          expertise_areas: string[] | null
          id: string
          organisation_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["ta_availability"]
          counties_served?: string[] | null
          created_at?: string
          expertise_areas?: string[] | null
          id?: string
          organisation_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["ta_availability"]
          counties_served?: string[] | null
          created_at?: string
          expertise_areas?: string[] | null
          id?: string
          organisation_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ta_providers_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "field_agent"
        | "viewer"
        | "ta_provider"
        | "financing_partner"
        | "programme_manager"
        | "dmrv_verifier"
        | "institution_admin"
        | "institution_user"
      approval_status: "pending" | "approved" | "rejected"
      assessment_status: "draft" | "submitted" | "reviewed" | "approved"
      contract_status: "active" | "expiring_soon" | "expired" | "terminated"
      contract_type: "maintenance" | "fuel_supply" | "spare_parts" | "other"
      dmrv_status: "pending" | "verified" | "disputed"
      financing_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "disbursed"
        | "rejected"
      financing_type:
        | "grant"
        | "concessional_debt"
        | "commercial_debt"
        | "equity"
      fuel_type:
        | "firewood"
        | "charcoal"
        | "lpg"
        | "biogas"
        | "electric"
        | "other"
      institution_type:
        | "school"
        | "hospital"
        | "prison"
        | "factory"
        | "hotel"
        | "restaurant"
        | "other"
      org_type: "institution" | "supplier" | "funder" | "csr" | "researcher"
      pipeline_stage:
        | "identified"
        | "assessed"
        | "matched"
        | "negotiation"
        | "contracted"
        | "installed"
        | "monitoring"
        | "contacted"
        | "scored"
        | "least_cost_path_assigned"
        | "provider_matched"
        | "financed"
        | "in_delivery"
        | "monitored_dmrv"
      programme_status: "planning" | "procurement" | "active" | "completed"
      provider_category:
        | "equipment_provider"
        | "installation_technician"
        | "logistics_provider"
        | "service_product_provider"
      rfq_response_status: "submitted" | "shortlisted" | "awarded" | "rejected"
      rfq_status: "draft" | "published" | "closed" | "awarded"
      ta_availability: "available" | "committed" | "unavailable"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      verification_method:
        | "iot_sensor"
        | "manual_survey"
        | "platform_self_report"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "field_agent",
        "viewer",
        "ta_provider",
        "financing_partner",
        "programme_manager",
        "dmrv_verifier",
        "institution_admin",
        "institution_user",
      ],
      approval_status: ["pending", "approved", "rejected"],
      assessment_status: ["draft", "submitted", "reviewed", "approved"],
      contract_status: ["active", "expiring_soon", "expired", "terminated"],
      contract_type: ["maintenance", "fuel_supply", "spare_parts", "other"],
      dmrv_status: ["pending", "verified", "disputed"],
      financing_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "disbursed",
        "rejected",
      ],
      financing_type: [
        "grant",
        "concessional_debt",
        "commercial_debt",
        "equity",
      ],
      fuel_type: ["firewood", "charcoal", "lpg", "biogas", "electric", "other"],
      institution_type: [
        "school",
        "hospital",
        "prison",
        "factory",
        "hotel",
        "restaurant",
        "other",
      ],
      org_type: ["institution", "supplier", "funder", "csr", "researcher"],
      pipeline_stage: [
        "identified",
        "assessed",
        "matched",
        "negotiation",
        "contracted",
        "installed",
        "monitoring",
        "contacted",
        "scored",
        "least_cost_path_assigned",
        "provider_matched",
        "financed",
        "in_delivery",
        "monitored_dmrv",
      ],
      programme_status: ["planning", "procurement", "active", "completed"],
      provider_category: [
        "equipment_provider",
        "installation_technician",
        "logistics_provider",
        "service_product_provider",
      ],
      rfq_response_status: ["submitted", "shortlisted", "awarded", "rejected"],
      rfq_status: ["draft", "published", "closed", "awarded"],
      ta_availability: ["available", "committed", "unavailable"],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      verification_method: [
        "iot_sensor",
        "manual_survey",
        "platform_self_report",
      ],
    },
  },
} as const

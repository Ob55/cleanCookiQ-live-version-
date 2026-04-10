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
      institutions: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          county: string
          created_at: string
          created_by: string | null
          current_fuel: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          institution_type: Database["public"]["Enums"]["institution_type"]
          latitude: number | null
          longitude: number | null
          meals_per_day: number | null
          name: string
          notes: string | null
          number_of_staff: number | null
          number_of_students: number | null
          organisation_id: string | null
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"]
          sub_county: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          county: string
          created_at?: string
          created_by?: string | null
          current_fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          institution_type?: Database["public"]["Enums"]["institution_type"]
          latitude?: number | null
          longitude?: number | null
          meals_per_day?: number | null
          name: string
          notes?: string | null
          number_of_staff?: number | null
          number_of_students?: number | null
          organisation_id?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          sub_county?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          county?: string
          created_at?: string
          created_by?: string | null
          current_fuel?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          institution_type?: Database["public"]["Enums"]["institution_type"]
          latitude?: number | null
          longitude?: number | null
          meals_per_day?: number | null
          name?: string
          notes?: string | null
          number_of_staff?: number | null
          number_of_students?: number | null
          organisation_id?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          sub_county?: string | null
          updated_at?: string
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
      opportunities: {
        Row: {
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      providers: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          counties_served: string[] | null
          created_at: string
          id: string
          name: string
          organisation_id: string | null
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
          name: string
          organisation_id?: string | null
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
          name?: string
          organisation_id?: string | null
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
      app_role: "admin" | "manager" | "field_agent" | "viewer"
      approval_status: "pending" | "approved" | "rejected"
      assessment_status: "draft" | "submitted" | "reviewed" | "approved"
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
      app_role: ["admin", "manager", "field_agent", "viewer"],
      approval_status: ["pending", "approved", "rejected"],
      assessment_status: ["draft", "submitted", "reviewed", "approved"],
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
      ],
    },
  },
} as const

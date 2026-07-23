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
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          launched_at: string | null
          legal_status: string | null
          name: string
          organization_id: string
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          launched_at?: string | null
          legal_status?: string | null
          name: string
          organization_id: string
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          launched_at?: string | null
          legal_status?: string | null
          name?: string
          organization_id?: string
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_events: {
        Row: {
          created_at: string
          engine_name: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          message: string
          organization_id: string
          payload: Json
          severity: string
        }
        Insert: {
          created_at?: string
          engine_name: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          message: string
          organization_id: string
          payload?: Json
          severity?: string
        }
        Update: {
          created_at?: string
          engine_name?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          message?: string
          organization_id?: string
          payload?: Json
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          assumptions: Json
          business_model: string | null
          category: string | null
          confidence_score: number | null
          created_at: string
          decision: string
          discovered_at: string
          estimated_monthly_revenue: number | null
          estimated_startup_cost_max: number | null
          estimated_startup_cost_min: number | null
          estimated_time_to_revenue_months: number | null
          id: string
          industry: string | null
          last_analyzed_at: string | null
          monetization_models: Json
          name: string
          organization_id: string
          overall_score: number | null
          problem: string | null
          recommended_builder: string | null
          risks: Json
          scan_id: string | null
          slug: string
          source_snapshot: Json
          status: string
          summary: string | null
          target_customer: string | null
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          business_model?: string | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string
          decision?: string
          discovered_at?: string
          estimated_monthly_revenue?: number | null
          estimated_startup_cost_max?: number | null
          estimated_startup_cost_min?: number | null
          estimated_time_to_revenue_months?: number | null
          id?: string
          industry?: string | null
          last_analyzed_at?: string | null
          monetization_models?: Json
          name: string
          organization_id: string
          overall_score?: number | null
          problem?: string | null
          recommended_builder?: string | null
          risks?: Json
          scan_id?: string | null
          slug: string
          source_snapshot?: Json
          status?: string
          summary?: string | null
          target_customer?: string | null
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          business_model?: string | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string
          decision?: string
          discovered_at?: string
          estimated_monthly_revenue?: number | null
          estimated_startup_cost_max?: number | null
          estimated_startup_cost_min?: number | null
          estimated_time_to_revenue_months?: number | null
          id?: string
          industry?: string | null
          last_analyzed_at?: string | null
          monetization_models?: Json
          name?: string
          organization_id?: string
          overall_score?: number | null
          problem?: string | null
          recommended_builder?: string | null
          risks?: Json
          scan_id?: string | null
          slug?: string
          source_snapshot?: Json
          status?: string
          summary?: string | null
          target_customer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "opportunity_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_evidence: {
        Row: {
          captured_at: string
          created_at: string
          credibility_score: number | null
          evidence_type: string
          extracted_data: Json
          id: string
          metadata: Json
          opportunity_id: string
          organization_id: string
          raw_content: string | null
          relevance_score: number | null
          source_name: string | null
          source_published_at: string | null
          source_url: string | null
          summary: string | null
          supports_opportunity: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          credibility_score?: number | null
          evidence_type: string
          extracted_data?: Json
          id?: string
          metadata?: Json
          opportunity_id: string
          organization_id: string
          raw_content?: string | null
          relevance_score?: number | null
          source_name?: string | null
          source_published_at?: string | null
          source_url?: string | null
          summary?: string | null
          supports_opportunity?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          credibility_score?: number | null
          evidence_type?: string
          extracted_data?: Json
          id?: string
          metadata?: Json
          opportunity_id?: string
          organization_id?: string
          raw_content?: string | null
          relevance_score?: number | null
          source_name?: string | null
          source_published_at?: string | null
          source_url?: string | null
          summary?: string | null
          supports_opportunity?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_evidence_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_scans: {
        Row: {
          completed_at: string | null
          constraints: Json
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          objective: string | null
          opportunities_discovered: number
          organization_id: string
          scan_type: string
          search_scope: Json
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          constraints?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          objective?: string | null
          opportunities_discovered?: number
          organization_id: string
          scan_type: string
          search_scope?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          constraints?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          objective?: string | null
          opportunities_discovered?: number
          organization_id?: string
          scan_type?: string
          search_scope?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_scores: {
        Row: {
          ai_search_score: number | null
          automation_score: number | null
          competition_score: number | null
          confidence_score: number | null
          created_at: string
          defensibility_score: number | null
          demand_score: number | null
          distribution_score: number | null
          id: string
          operational_complexity_score: number | null
          opportunity_id: string
          organization_id: string
          overall_score: number | null
          profitability_score: number | null
          reasoning: string | null
          risk_score: number | null
          scored_at: string
          scoring_version: string
          seo_score: number | null
          startup_cost_score: number | null
          time_to_revenue_score: number | null
          validation_score: number | null
          weighted_breakdown: Json
        }
        Insert: {
          ai_search_score?: number | null
          automation_score?: number | null
          competition_score?: number | null
          confidence_score?: number | null
          created_at?: string
          defensibility_score?: number | null
          demand_score?: number | null
          distribution_score?: number | null
          id?: string
          operational_complexity_score?: number | null
          opportunity_id: string
          organization_id: string
          overall_score?: number | null
          profitability_score?: number | null
          reasoning?: string | null
          risk_score?: number | null
          scored_at?: string
          scoring_version: string
          seo_score?: number | null
          startup_cost_score?: number | null
          time_to_revenue_score?: number | null
          validation_score?: number | null
          weighted_breakdown?: Json
        }
        Update: {
          ai_search_score?: number | null
          automation_score?: number | null
          competition_score?: number | null
          confidence_score?: number | null
          created_at?: string
          defensibility_score?: number | null
          demand_score?: number | null
          distribution_score?: number | null
          id?: string
          operational_complexity_score?: number | null
          opportunity_id?: string
          organization_id?: string
          overall_score?: number | null
          profitability_score?: number | null
          reasoning?: string | null
          risk_score?: number | null
          scored_at?: string
          scoring_version?: string
          seo_score?: number | null
          startup_cost_score?: number | null
          time_to_revenue_score?: number | null
          validation_score?: number | null
          weighted_breakdown?: Json
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_scores_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          owner_user_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          lifecycle_stage: string
          name: string
          objectives: Json
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          budget?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          lifecycle_stage?: string
          name: string
          objectives?: Json
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          lifecycle_stage?: string
          name?: string
          objectives?: Json
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_with_owner: {
        Args: { organization_name: string; organization_slug: string }
        Returns: string
      }
      has_organization_role: {
        Args: { p_organization_id: string; p_roles: string[] }
        Returns: boolean
      }
      is_organization_member: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      organization_has_no_active_members: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      shares_organization_with: {
        Args: { p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

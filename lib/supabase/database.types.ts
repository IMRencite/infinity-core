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
      asset_metrics: {
        Row: {
          asset_id: string
          confidence_score: number | null
          created_at: string
          id: string
          measured_at: string
          metadata: Json
          metric_key: string
          metric_text: string | null
          metric_value: number | null
          organization_id: string
          source: string | null
          unit: string | null
        }
        Insert: {
          asset_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          measured_at: string
          metadata?: Json
          metric_key: string
          metric_text?: string | null
          metric_value?: number | null
          organization_id: string
          source?: string | null
          unit?: string | null
        }
        Update: {
          asset_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          measured_at?: string
          metadata?: Json
          metric_key?: string
          metric_text?: string | null
          metric_value?: number | null
          organization_id?: string
          source?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_metrics_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_relationships: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          organization_id: string
          relationship_type: string
          source_asset_id: string
          strength_score: number | null
          target_asset_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          organization_id: string
          relationship_type: string
          source_asset_id: string
          strength_score?: number | null
          target_asset_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          organization_id?: string
          relationship_type?: string
          source_asset_id?: string
          strength_score?: number | null
          target_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_relationships_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_relationships_target_asset_id_fkey"
            columns: ["target_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_valuations: {
        Row: {
          asset_id: string
          assumptions: Json
          confidence_score: number | null
          created_at: string
          currency: string
          estimated_value: number
          id: string
          inputs: Json
          organization_id: string
          reasoning: string | null
          valuation_method: string
          valuation_type: string
          valuation_version: string
          valued_at: string
        }
        Insert: {
          asset_id: string
          assumptions?: Json
          confidence_score?: number | null
          created_at?: string
          currency: string
          estimated_value: number
          id?: string
          inputs?: Json
          organization_id: string
          reasoning?: string | null
          valuation_method: string
          valuation_type: string
          valuation_version: string
          valued_at?: string
        }
        Update: {
          asset_id?: string
          assumptions?: Json
          confidence_score?: number | null
          created_at?: string
          currency?: string
          estimated_value?: number
          id?: string
          inputs?: Json
          organization_id?: string
          reasoning?: string | null
          valuation_method?: string
          valuation_type?: string
          valuation_version?: string
          valued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_valuations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_valuations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          acquired_at: string | null
          acquisition_cost: number | null
          acquisition_source: string | null
          asset_type: string
          build_cost: number | null
          created_at: string
          currency: string | null
          description: string | null
          estimated_value: number | null
          external_identifier: string | null
          external_url: string | null
          id: string
          initiative_id: string | null
          launched_at: string | null
          lifecycle_stage: string
          metadata: Json
          monthly_operating_cost: number | null
          monthly_revenue: number | null
          name: string
          organization_id: string
          ownership_type: string
          parent_asset_id: string | null
          provider: string | null
          retired_at: string | null
          slug: string
          status: string
          updated_at: string
          valuation_as_of: string | null
          valuation_method: string | null
          valuation_version: string | null
          venture_id: string | null
          verified_value: number | null
        }
        Insert: {
          acquired_at?: string | null
          acquisition_cost?: number | null
          acquisition_source?: string | null
          asset_type: string
          build_cost?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          estimated_value?: number | null
          external_identifier?: string | null
          external_url?: string | null
          id?: string
          initiative_id?: string | null
          launched_at?: string | null
          lifecycle_stage?: string
          metadata?: Json
          monthly_operating_cost?: number | null
          monthly_revenue?: number | null
          name: string
          organization_id: string
          ownership_type?: string
          parent_asset_id?: string | null
          provider?: string | null
          retired_at?: string | null
          slug: string
          status?: string
          updated_at?: string
          valuation_as_of?: string | null
          valuation_method?: string | null
          valuation_version?: string | null
          venture_id?: string | null
          verified_value?: number | null
        }
        Update: {
          acquired_at?: string | null
          acquisition_cost?: number | null
          acquisition_source?: string | null
          asset_type?: string
          build_cost?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          estimated_value?: number | null
          external_identifier?: string | null
          external_url?: string | null
          id?: string
          initiative_id?: string | null
          launched_at?: string | null
          lifecycle_stage?: string
          metadata?: Json
          monthly_operating_cost?: number | null
          monthly_revenue?: number | null
          name?: string
          organization_id?: string
          ownership_type?: string
          parent_asset_id?: string | null
          provider?: string | null
          retired_at?: string | null
          slug?: string
          status?: string
          updated_at?: string
          valuation_as_of?: string | null
          valuation_method?: string | null
          valuation_version?: string | null
          venture_id?: string | null
          verified_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_registry: {
        Row: {
          capability_key: string
          capability_type: string
          cost_metadata: Json
          created_at: string
          description: string | null
          display_name: string
          engine_name: string | null
          health_status: string
          id: string
          implementation_key: string | null
          input_schema: Json
          is_default: boolean
          organization_id: string | null
          output_schema: Json
          policy_requirements: Json
          provider_metadata: Json
          quality_metadata: Json
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          capability_key: string
          capability_type: string
          cost_metadata?: Json
          created_at?: string
          description?: string | null
          display_name: string
          engine_name?: string | null
          health_status?: string
          id?: string
          implementation_key?: string | null
          input_schema?: Json
          is_default?: boolean
          organization_id?: string | null
          output_schema?: Json
          policy_requirements?: Json
          provider_metadata?: Json
          quality_metadata?: Json
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          capability_key?: string
          capability_type?: string
          cost_metadata?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          engine_name?: string | null
          health_status?: string
          id?: string
          implementation_key?: string | null
          input_schema?: Json
          is_default?: boolean
          organization_id?: string | null
          output_schema?: Json
          policy_requirements?: Json
          provider_metadata?: Json
          quality_metadata?: Json
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_registry_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      command_cycles: {
        Row: {
          completed_at: string | null
          correlation_id: string
          created_at: string
          id: string
          mission_id: string
          organization_id: string
          started_at: string
          status: string
          summary: Json
          trigger_source: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          mission_id: string
          organization_id: string
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          mission_id?: string
          organization_id?: string
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_cycles_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decisions: {
        Row: {
          command_cycle_id: string
          confidence: number
          created_at: string
          decision_type: string
          evidence_refs: Json
          id: string
          mission_id: string
          organization_id: string
          outcome: string
          payload: Json
          reasoning: string
          supersedes_id: string | null
        }
        Insert: {
          command_cycle_id: string
          confidence?: number
          created_at?: string
          decision_type: string
          evidence_refs?: Json
          id?: string
          mission_id: string
          organization_id: string
          outcome: string
          payload?: Json
          reasoning: string
          supersedes_id?: string | null
        }
        Update: {
          command_cycle_id?: string
          confidence?: number
          created_at?: string
          decision_type?: string
          evidence_refs?: Json
          id?: string
          mission_id?: string
          organization_id?: string
          outcome?: string
          payload?: Json
          reasoning?: string
          supersedes_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "command_decisions_command_cycle_id_fkey"
            columns: ["command_cycle_id"]
            isOneToOne: false
            referencedRelation: "command_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_decisions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_decisions_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "command_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      engine_jobs: {
        Row: {
          attempt_count: number
          available_at: string
          cancellation_requested_at: string | null
          capability_key: string
          command_cycle_id: string | null
          completed_at: string | null
          correlation_id: string
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          last_error: Json
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          mission_id: string | null
          next_attempt_at: string | null
          organization_id: string
          payload: Json
          plan_id: string | null
          plan_step_id: string | null
          priority: number
          resolved_capability_id: string | null
          resolved_engine_name: string | null
          resolved_version: string | null
          result: Json
          started_at: string | null
          status: string
          timeout_seconds: number
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          available_at?: string
          cancellation_requested_at?: string | null
          capability_key: string
          command_cycle_id?: string | null
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          last_error?: Json
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          mission_id?: string | null
          next_attempt_at?: string | null
          organization_id: string
          payload?: Json
          plan_id?: string | null
          plan_step_id?: string | null
          priority?: number
          resolved_capability_id?: string | null
          resolved_engine_name?: string | null
          resolved_version?: string | null
          result?: Json
          started_at?: string | null
          status?: string
          timeout_seconds?: number
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          available_at?: string
          cancellation_requested_at?: string | null
          capability_key?: string
          command_cycle_id?: string | null
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          last_error?: Json
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          mission_id?: string | null
          next_attempt_at?: string | null
          organization_id?: string
          payload?: Json
          plan_id?: string | null
          plan_step_id?: string | null
          priority?: number
          resolved_capability_id?: string | null
          resolved_engine_name?: string | null
          resolved_version?: string | null
          result?: Json
          started_at?: string | null
          status?: string
          timeout_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_jobs_command_cycle_id_fkey"
            columns: ["command_cycle_id"]
            isOneToOne: false
            referencedRelation: "command_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_jobs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_jobs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_jobs_plan_step_id_fkey"
            columns: ["plan_step_id"]
            isOneToOne: false
            referencedRelation: "plan_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_jobs_resolved_capability_id_fkey"
            columns: ["resolved_capability_id"]
            isOneToOne: false
            referencedRelation: "capability_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      job_attempt_events: {
        Row: {
          created_at: string
          engine_job_id: string
          event_type: string
          id: string
          organization_id: string
          payload: Json
          worker_run_id: string | null
        }
        Insert: {
          created_at?: string
          engine_job_id: string
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
          worker_run_id?: string | null
        }
        Update: {
          created_at?: string
          engine_job_id?: string
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          worker_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_attempt_events_engine_job_id_fkey"
            columns: ["engine_job_id"]
            isOneToOne: false
            referencedRelation: "engine_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_attempt_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_attempt_events_worker_run_id_fkey"
            columns: ["worker_run_id"]
            isOneToOne: false
            referencedRelation: "worker_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_policies: {
        Row: {
          autonomy_level: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          mission_id: string
          organization_id: string
          policy_category: string
          policy_key: string
          updated_at: string
        }
        Insert: {
          autonomy_level?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          mission_id: string
          organization_id: string
          policy_category: string
          policy_key: string
          updated_at?: string
        }
        Update: {
          autonomy_level?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          mission_id?: string
          organization_id?: string
          policy_category?: string
          policy_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_policies_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          activated_at: string | null
          completed_at: string | null
          constraints: Json
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          objectives: Json
          organization_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          completed_at?: string | null
          constraints?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          objectives?: Json
          organization_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          completed_at?: string | null
          constraints?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          objectives?: Json
          organization_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_organization_id_fkey"
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
      plan_steps: {
        Row: {
          capability_key: string
          constraints: Json
          created_at: string
          description: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          step_order: number
          title: string
          updated_at: string
        }
        Insert: {
          capability_key: string
          constraints?: Json
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          step_order: number
          title: string
          updated_at?: string
        }
        Update: {
          capability_key?: string
          constraints?: Json
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          step_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_steps_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          command_cycle_id: string
          command_decision_id: string
          created_at: string
          id: string
          metadata: Json
          mission_id: string
          objectives: Json
          organization_id: string
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          command_cycle_id: string
          command_decision_id: string
          created_at?: string
          id?: string
          metadata?: Json
          mission_id: string
          objectives?: Json
          organization_id: string
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          command_cycle_id?: string
          command_decision_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          mission_id?: string
          objectives?: Json
          organization_id?: string
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plans_command_cycle_id_fkey"
            columns: ["command_cycle_id"]
            isOneToOne: false
            referencedRelation: "command_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_command_decision_id_fkey"
            columns: ["command_decision_id"]
            isOneToOne: false
            referencedRelation: "command_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      worker_runs: {
        Row: {
          attempt_number: number
          capability_id: string | null
          completed_at: string | null
          confidence_score: number | null
          cost_amount: number | null
          cost_currency: string | null
          created_at: string
          duration_ms: number | null
          engine_job_id: string
          engine_name: string
          error: Json
          id: string
          input: Json
          metrics: Json
          mission_id: string | null
          model: string | null
          organization_id: string
          output: Json
          provider: string | null
          quality_score: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          started_at: string | null
          status: string
          updated_at: string
          worker_name: string
          worker_version: string | null
        }
        Insert: {
          attempt_number: number
          capability_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          duration_ms?: number | null
          engine_job_id: string
          engine_name: string
          error?: Json
          id?: string
          input?: Json
          metrics?: Json
          mission_id?: string | null
          model?: string | null
          organization_id: string
          output?: Json
          provider?: string | null
          quality_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_name: string
          worker_version?: string | null
        }
        Update: {
          attempt_number?: number
          capability_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          duration_ms?: number | null
          engine_job_id?: string
          engine_name?: string
          error?: Json
          id?: string
          input?: Json
          metrics?: Json
          mission_id?: string | null
          model?: string | null
          organization_id?: string
          output?: Json
          provider?: string | null
          quality_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_name?: string
          worker_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_runs_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "capability_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_runs_engine_job_id_fkey"
            columns: ["engine_job_id"]
            isOneToOne: false
            referencedRelation: "engine_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_runs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_runs_organization_id_fkey"
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
      claim_engine_job: {
        Args: {
          p_executor_id: string
          p_job_id: string
          p_organization_id: string
        }
        Returns: Json
      }
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

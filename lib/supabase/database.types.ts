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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      allocation_proposals: {
        Row: {
          allocation_type: string
          approved_at: string | null
          approved_resources: Json
          confidence_score: number | null
          created_at: string
          evaluation_id: string | null
          expected_outcome: string
          expected_time_to_value_days: number | null
          expected_value: number | null
          expected_value_currency: string | null
          expires_at: string | null
          id: string
          mission_id: string | null
          opportunity_id: string | null
          organization_id: string
          policy_results: Json
          proposal_key: string
          rationale: string | null
          rejected_at: string | null
          requested_resources: Json
          risk_score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          allocation_type: string
          approved_at?: string | null
          approved_resources?: Json
          confidence_score?: number | null
          created_at?: string
          evaluation_id?: string | null
          expected_outcome: string
          expected_time_to_value_days?: number | null
          expected_value?: number | null
          expected_value_currency?: string | null
          expires_at?: string | null
          id?: string
          mission_id?: string | null
          opportunity_id?: string | null
          organization_id: string
          policy_results?: Json
          proposal_key: string
          rationale?: string | null
          rejected_at?: string | null
          requested_resources?: Json
          risk_score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          allocation_type?: string
          approved_at?: string | null
          approved_resources?: Json
          confidence_score?: number | null
          created_at?: string
          evaluation_id?: string | null
          expected_outcome?: string
          expected_time_to_value_days?: number | null
          expected_value?: number | null
          expected_value_currency?: string | null
          expires_at?: string | null
          id?: string
          mission_id?: string | null
          opportunity_id?: string | null
          organization_id?: string
          policy_results?: Json
          proposal_key?: string
          rationale?: string | null
          rejected_at?: string | null
          requested_resources?: Json
          risk_score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocation_proposals_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "opportunity_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_proposals_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      build_snapshots: {
        Row: {
          build_id: string
          created_at: string
          created_by_worker_result_id: string | null
          file_manifest: Json
          id: string
          organization_id: string
          previous_snapshot_id: string | null
          root_hash: string
          snapshot_version: number
          total_bytes: number
          total_files: number
        }
        Insert: {
          build_id: string
          created_at?: string
          created_by_worker_result_id?: string | null
          file_manifest?: Json
          id?: string
          organization_id: string
          previous_snapshot_id?: string | null
          root_hash: string
          snapshot_version: number
          total_bytes?: number
          total_files?: number
        }
        Update: {
          build_id?: string
          created_at?: string
          created_by_worker_result_id?: string | null
          file_manifest?: Json
          id?: string
          organization_id?: string
          previous_snapshot_id?: string | null
          root_hash?: string
          snapshot_version?: number
          total_bytes?: number
          total_files?: number
        }
        Relationships: [
          {
            foreignKeyName: "build_snapshots_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_snapshots_created_by_worker_result_id_fkey"
            columns: ["created_by_worker_result_id"]
            isOneToOne: false
            referencedRelation: "worker_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_snapshots_previous_snapshot_id_fkey"
            columns: ["previous_snapshot_id"]
            isOneToOne: false
            referencedRelation: "build_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          allocation_proposal_id: string | null
          build_version: string
          cancelled_at: string | null
          completed_at: string | null
          correlation_id: string | null
          created_at: string
          current_snapshot_id: string | null
          error: Json
          failed_at: string | null
          id: string
          idempotency_key: string
          manifest: Json
          manifest_hash: string
          mission_id: string
          opportunity_id: string
          organization_id: string
          plan_id: string | null
          project_type: string
          review_status: string
          runtime_instance_id: string | null
          specification: Json
          specification_hash: string
          specification_version: string
          started_at: string | null
          status: string
          template_key: string
          template_version: string
          updated_at: string
          venture_blueprint_id: string
          workspace_reference: string
        }
        Insert: {
          allocation_proposal_id?: string | null
          build_version?: string
          cancelled_at?: string | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          current_snapshot_id?: string | null
          error?: Json
          failed_at?: string | null
          id?: string
          idempotency_key: string
          manifest?: Json
          manifest_hash?: string
          mission_id: string
          opportunity_id: string
          organization_id: string
          plan_id?: string | null
          project_type: string
          review_status?: string
          runtime_instance_id?: string | null
          specification?: Json
          specification_hash: string
          specification_version?: string
          started_at?: string | null
          status?: string
          template_key: string
          template_version: string
          updated_at?: string
          venture_blueprint_id: string
          workspace_reference?: string
        }
        Update: {
          allocation_proposal_id?: string | null
          build_version?: string
          cancelled_at?: string | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          current_snapshot_id?: string | null
          error?: Json
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          manifest?: Json
          manifest_hash?: string
          mission_id?: string
          opportunity_id?: string
          organization_id?: string
          plan_id?: string | null
          project_type?: string
          review_status?: string
          runtime_instance_id?: string | null
          specification?: Json
          specification_hash?: string
          specification_version?: string
          started_at?: string | null
          status?: string
          template_key?: string
          template_version?: string
          updated_at?: string
          venture_blueprint_id?: string
          workspace_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "builds_allocation_proposal_id_fkey"
            columns: ["allocation_proposal_id"]
            isOneToOne: false
            referencedRelation: "allocation_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_current_snapshot_fkey"
            columns: ["current_snapshot_id"]
            isOneToOne: false
            referencedRelation: "build_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_runtime_instance_id_fkey"
            columns: ["runtime_instance_id"]
            isOneToOne: false
            referencedRelation: "mission_runtime_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_venture_blueprint_id_fkey"
            columns: ["venture_blueprint_id"]
            isOneToOne: false
            referencedRelation: "venture_blueprints"
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
      claim_evidence: {
        Row: {
          claim_id: string
          created_at: string
          evidence_id: string
          id: string
          notes: string | null
          organization_id: string
          relationship: string
          weight_score: number | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          evidence_id: string
          id?: string
          notes?: string | null
          organization_id: string
          relationship: string
          weight_score?: number | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          evidence_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          relationship?: string
          weight_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_evidence_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          claim_type: string
          confidence_score: number | null
          created_at: string
          id: string
          metadata: Json
          object_entity_id: string | null
          object_entity_type: string | null
          object_text: string | null
          organization_id: string
          predicate: string
          reasoning: string | null
          status: string
          subject_id: string | null
          subject_type: string
          superseded_by_claim_id: string | null
          updated_at: string
          validity_end: string | null
          validity_start: string | null
        }
        Insert: {
          claim_type: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          object_entity_id?: string | null
          object_entity_type?: string | null
          object_text?: string | null
          organization_id: string
          predicate: string
          reasoning?: string | null
          status?: string
          subject_id?: string | null
          subject_type: string
          superseded_by_claim_id?: string | null
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
        }
        Update: {
          claim_type?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          object_entity_id?: string | null
          object_entity_type?: string | null
          object_text?: string | null
          organization_id?: string
          predicate?: string
          reasoning?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string
          superseded_by_claim_id?: string | null
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_superseded_by_claim_id_fkey"
            columns: ["superseded_by_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
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
      decision_models: {
        Row: {
          activated_at: string | null
          created_at: string
          decision_thresholds: Json
          deprecated_at: string | null
          description: string | null
          id: string
          name: string
          opportunity_type: string | null
          organization_id: string
          policy_requirements: Json
          scoring_dimensions: Json
          status: string
          updated_at: string
          version: string
          weights: Json
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          decision_thresholds?: Json
          deprecated_at?: string | null
          description?: string | null
          id?: string
          name: string
          opportunity_type?: string | null
          organization_id: string
          policy_requirements?: Json
          scoring_dimensions?: Json
          status?: string
          updated_at?: string
          version: string
          weights?: Json
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          decision_thresholds?: Json
          deprecated_at?: string | null
          description?: string | null
          id?: string
          name?: string
          opportunity_type?: string | null
          organization_id?: string
          policy_requirements?: Json
          scoring_dimensions?: Json
          status?: string
          updated_at?: string
          version?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "decision_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_provider_registry: {
        Row: {
          config: Json
          created_at: string
          display_name: string
          id: string
          implementation_key: string
          metadata: Json
          organization_id: string | null
          provider_key: string
          provider_type: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          config?: Json
          created_at?: string
          display_name: string
          id?: string
          implementation_key: string
          metadata?: Json
          organization_id?: string | null
          provider_key: string
          provider_type: string
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          config?: Json
          created_at?: string
          display_name?: string
          id?: string
          implementation_key?: string
          metadata?: Json
          organization_id?: string | null
          provider_key?: string
          provider_type?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_provider_registry_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_signals: {
        Row: {
          captured_at: string
          created_at: string
          external_signal_id: string | null
          id: string
          metadata: Json
          organization_id: string
          provider_id: string | null
          raw_data: Json
          relevance_score: number | null
          scan_id: string
          signal_hash: string
          signal_type: string
          source_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          external_signal_id?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          provider_id?: string | null
          raw_data?: Json
          relevance_score?: number | null
          scan_id: string
          signal_hash: string
          signal_type: string
          source_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          external_signal_id?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          provider_id?: string | null
          raw_data?: Json
          relevance_score?: number | null
          scan_id?: string
          signal_hash?: string
          signal_type?: string
          source_url?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_signals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "discovery_provider_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_signals_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "opportunity_scans"
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
      enterprise_queue_entries: {
        Row: {
          created_at: string
          entry_status: string
          executive_decision_id: string
          id: string
          opportunity_id: string
          ordering_rationale: Json
          organization_id: string
          planning_eligible: boolean
          queue_position: number
          queue_priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_status?: string
          executive_decision_id: string
          id?: string
          opportunity_id: string
          ordering_rationale?: Json
          organization_id: string
          planning_eligible?: boolean
          queue_position?: number
          queue_priority?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_status?: string
          executive_decision_id?: string
          id?: string
          opportunity_id?: string
          ordering_rationale?: Json
          organization_id?: string
          planning_eligible?: boolean
          queue_position?: number
          queue_priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_queue_entries_executive_decision_id_fkey"
            columns: ["executive_decision_id"]
            isOneToOne: false
            referencedRelation: "executive_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_queue_entries_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_queue_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_records: {
        Row: {
          captured_at: string
          confidence_score: number | null
          content_hash: string | null
          created_at: string
          credibility_score: number | null
          evidence_type: string
          freshness_score: number | null
          id: string
          language: string | null
          metadata: Json
          organization_id: string
          raw_content: string | null
          relevance_score: number | null
          source_id: string
          source_published_at: string | null
          structured_data: Json
          summary: string | null
          supports_claim: boolean | null
          title: string | null
          updated_at: string
        }
        Insert: {
          captured_at?: string
          confidence_score?: number | null
          content_hash?: string | null
          created_at?: string
          credibility_score?: number | null
          evidence_type: string
          freshness_score?: number | null
          id?: string
          language?: string | null
          metadata?: Json
          organization_id: string
          raw_content?: string | null
          relevance_score?: number | null
          source_id: string
          source_published_at?: string | null
          structured_data?: Json
          summary?: string | null
          supports_claim?: boolean | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          captured_at?: string
          confidence_score?: number | null
          content_hash?: string | null
          created_at?: string
          credibility_score?: number | null
          evidence_type?: string
          freshness_score?: number | null
          id?: string
          language?: string | null
          metadata?: Json
          organization_id?: string
          raw_content?: string | null
          relevance_score?: number | null
          source_id?: string
          source_published_at?: string | null
          structured_data?: Json
          summary?: string | null
          supports_claim?: boolean | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "evidence_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_sources: {
        Row: {
          created_at: string
          credibility_score: number | null
          external_identifier: string | null
          external_url: string | null
          first_seen_at: string
          id: string
          last_seen_at: string | null
          metadata: Json
          name: string
          organization_id: string
          provider: string | null
          reliability_status: string
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credibility_score?: number | null
          external_identifier?: string | null
          external_url?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          name: string
          organization_id: string
          provider?: string | null
          reliability_status?: string
          source_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credibility_score?: number | null
          external_identifier?: string | null
          external_url?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          name?: string
          organization_id?: string
          provider?: string | null
          reliability_status?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_decisions: {
        Row: {
          capital_context: Json
          correlation_id: string | null
          created_at: string
          decision: string
          dedup_key: string
          executive_policy_version: string
          id: string
          mission_id: string | null
          opportunity_id: string
          organization_id: string
          planning_eligible: boolean
          policy_results: Json
          priority_score: number
          rationale: Json
          reasoning_version: string
          record_status: string
          supersedes_id: string | null
          validation_run_id: string
        }
        Insert: {
          capital_context?: Json
          correlation_id?: string | null
          created_at?: string
          decision: string
          dedup_key: string
          executive_policy_version: string
          id?: string
          mission_id?: string | null
          opportunity_id: string
          organization_id: string
          planning_eligible?: boolean
          policy_results?: Json
          priority_score?: number
          rationale?: Json
          reasoning_version: string
          record_status?: string
          supersedes_id?: string | null
          validation_run_id: string
        }
        Update: {
          capital_context?: Json
          correlation_id?: string | null
          created_at?: string
          decision?: string
          dedup_key?: string
          executive_policy_version?: string
          id?: string
          mission_id?: string | null
          opportunity_id?: string
          organization_id?: string
          planning_eligible?: boolean
          policy_results?: Json
          priority_score?: number
          rationale?: Json
          reasoning_version?: string
          record_status?: string
          supersedes_id?: string | null
          validation_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_decisions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_decisions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_decisions_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "executive_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_decisions_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
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
      knowledge_records: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          knowledge_type: string
          metadata: Json
          organization_id: string
          scope: Json
          source_claim_ids: Json
          source_evidence_ids: Json
          status: string
          summary: string
          superseded_by_id: string | null
          title: string
          updated_at: string
          validity_end: string | null
          validity_start: string | null
          version: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          knowledge_type: string
          metadata?: Json
          organization_id: string
          scope?: Json
          source_claim_ids?: Json
          source_evidence_ids?: Json
          status?: string
          summary: string
          superseded_by_id?: string | null
          title: string
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
          version: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          knowledge_type?: string
          metadata?: Json
          organization_id?: string
          scope?: Json
          source_claim_ids?: Json
          source_evidence_ids?: Json
          status?: string
          summary?: string
          superseded_by_id?: string | null
          title?: string
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_records_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "knowledge_records"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          applies_to: Json
          confidence_score: number | null
          created_at: string
          id: string
          lesson: string
          lesson_type: string
          organization_id: string
          recommended_action: string | null
          status: string
          supporting_claim_ids: Json
          supporting_memory_ids: Json
          title: string
          updated_at: string
        }
        Insert: {
          applies_to?: Json
          confidence_score?: number | null
          created_at?: string
          id?: string
          lesson: string
          lesson_type: string
          organization_id: string
          recommended_action?: string | null
          status?: string
          supporting_claim_ids?: Json
          supporting_memory_ids?: Json
          title: string
          updated_at?: string
        }
        Update: {
          applies_to?: Json
          confidence_score?: number | null
          created_at?: string
          id?: string
          lesson?: string
          lesson_type?: string
          organization_id?: string
          recommended_action?: string | null
          status?: string
          supporting_claim_ids?: Json
          supporting_memory_ids?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_records: {
        Row: {
          applies_to: Json
          confidence_score: number | null
          content: Json
          created_at: string
          id: string
          importance_score: number | null
          learned_at: string
          memory_type: string
          metadata: Json
          occurred_at: string | null
          organization_id: string
          source_entity_id: string | null
          source_entity_type: string | null
          summary: string
          title: string
        }
        Insert: {
          applies_to?: Json
          confidence_score?: number | null
          content?: Json
          created_at?: string
          id?: string
          importance_score?: number | null
          learned_at?: string
          memory_type: string
          metadata?: Json
          occurred_at?: string | null
          organization_id: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          summary: string
          title: string
        }
        Update: {
          applies_to?: Json
          confidence_score?: number | null
          content?: Json
          created_at?: string
          id?: string
          importance_score?: number | null
          learned_at?: string
          memory_type?: string
          metadata?: Json
          occurred_at?: string | null
          organization_id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      mission_runtime_checkpoints: {
        Row: {
          checkpoint_key: string
          created_at: string
          id: string
          mission_id: string
          organization_id: string
          payload: Json
          runtime_instance_id: string
          stage: string
          state_version: number
          status: string
        }
        Insert: {
          checkpoint_key: string
          created_at?: string
          id?: string
          mission_id: string
          organization_id: string
          payload?: Json
          runtime_instance_id: string
          stage: string
          state_version: number
          status: string
        }
        Update: {
          checkpoint_key?: string
          created_at?: string
          id?: string
          mission_id?: string
          organization_id?: string
          payload?: Json
          runtime_instance_id?: string
          stage?: string
          state_version?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_runtime_checkpoints_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_checkpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_checkpoints_runtime_instance_id_fkey"
            columns: ["runtime_instance_id"]
            isOneToOne: false
            referencedRelation: "mission_runtime_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_runtime_instances: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          context: Json
          correlation_id: string | null
          created_at: string
          current_stage: string
          failed_at: string | null
          heartbeat_at: string | null
          id: string
          last_advanced_at: string | null
          last_error: Json
          lease_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          metadata: Json
          mission_id: string
          organization_id: string
          paused_at: string | null
          previous_stage: string | null
          resumed_at: string | null
          runtime_version: string
          started_at: string | null
          state_version: number
          status: string
          updated_at: string
          wake_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          context?: Json
          correlation_id?: string | null
          created_at?: string
          current_stage?: string
          failed_at?: string | null
          heartbeat_at?: string | null
          id?: string
          last_advanced_at?: string | null
          last_error?: Json
          lease_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json
          mission_id: string
          organization_id: string
          paused_at?: string | null
          previous_stage?: string | null
          resumed_at?: string | null
          runtime_version?: string
          started_at?: string | null
          state_version?: number
          status?: string
          updated_at?: string
          wake_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          context?: Json
          correlation_id?: string | null
          created_at?: string
          current_stage?: string
          failed_at?: string | null
          heartbeat_at?: string | null
          id?: string
          last_advanced_at?: string | null
          last_error?: Json
          lease_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json
          mission_id?: string
          organization_id?: string
          paused_at?: string | null
          previous_stage?: string | null
          resumed_at?: string | null
          runtime_version?: string
          started_at?: string | null
          state_version?: number
          status?: string
          updated_at?: string
          wake_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_runtime_instances_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_runtime_transitions: {
        Row: {
          command_decision_id: string | null
          context_snapshot: Json
          correlation_id: string | null
          engine_job_id: string | null
          from_stage: string | null
          from_status: string | null
          id: string
          mission_id: string
          occurred_at: string
          organization_id: string
          plan_id: string | null
          runtime_instance_id: string
          to_stage: string
          to_status: string
          transition_key: string
          transition_reason: string
          worker_run_id: string | null
        }
        Insert: {
          command_decision_id?: string | null
          context_snapshot?: Json
          correlation_id?: string | null
          engine_job_id?: string | null
          from_stage?: string | null
          from_status?: string | null
          id?: string
          mission_id: string
          occurred_at?: string
          organization_id: string
          plan_id?: string | null
          runtime_instance_id: string
          to_stage: string
          to_status: string
          transition_key: string
          transition_reason: string
          worker_run_id?: string | null
        }
        Update: {
          command_decision_id?: string | null
          context_snapshot?: Json
          correlation_id?: string | null
          engine_job_id?: string | null
          from_stage?: string | null
          from_status?: string | null
          id?: string
          mission_id?: string
          occurred_at?: string
          organization_id?: string
          plan_id?: string | null
          runtime_instance_id?: string
          to_stage?: string
          to_status?: string
          transition_key?: string
          transition_reason?: string
          worker_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_runtime_transitions_command_decision_id_fkey"
            columns: ["command_decision_id"]
            isOneToOne: false
            referencedRelation: "command_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_transitions_engine_job_id_fkey"
            columns: ["engine_job_id"]
            isOneToOne: false
            referencedRelation: "engine_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_transitions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_transitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_transitions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_transitions_runtime_instance_id_fkey"
            columns: ["runtime_instance_id"]
            isOneToOne: false
            referencedRelation: "mission_runtime_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_runtime_transitions_worker_run_id_fkey"
            columns: ["worker_run_id"]
            isOneToOne: false
            referencedRelation: "worker_runs"
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
          discovery_dedup_key: string | null
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
          discovery_dedup_key?: string | null
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
          discovery_dedup_key?: string | null
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
      opportunity_decisions: {
        Row: {
          created_at: string
          decided_by_type: string
          decision: string
          dedup_key: string | null
          id: string
          metadata: Json
          opportunity_id: string
          organization_id: string
          previous_decision: string | null
          reasoning: string | null
        }
        Insert: {
          created_at?: string
          decided_by_type: string
          decision: string
          dedup_key?: string | null
          id?: string
          metadata?: Json
          opportunity_id: string
          organization_id: string
          previous_decision?: string | null
          reasoning?: string | null
        }
        Update: {
          created_at?: string
          decided_by_type?: string
          decision?: string
          dedup_key?: string | null
          id?: string
          metadata?: Json
          opportunity_id?: string
          organization_id?: string
          previous_decision?: string | null
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_decisions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_evaluations: {
        Row: {
          assumptions: Json
          capital_efficiency_score: number | null
          compounding_score: number | null
          confidence_score: number | null
          created_at: string
          decision_model_id: string
          dimension_scores: Json
          evaluated_at: string
          evaluation_key: string
          evaluation_status: string
          expected_value_score: number | null
          id: string
          mission_id: string | null
          opportunity_id: string
          organization_id: string
          overall_score: number | null
          policy_results: Json
          reasoning: string | null
          recommendation: string
          risk_adjusted_score: number | null
          strategic_fit_score: number | null
          uncertainty: Json
        }
        Insert: {
          assumptions?: Json
          capital_efficiency_score?: number | null
          compounding_score?: number | null
          confidence_score?: number | null
          created_at?: string
          decision_model_id: string
          dimension_scores?: Json
          evaluated_at?: string
          evaluation_key: string
          evaluation_status?: string
          expected_value_score?: number | null
          id?: string
          mission_id?: string | null
          opportunity_id: string
          organization_id: string
          overall_score?: number | null
          policy_results?: Json
          reasoning?: string | null
          recommendation: string
          risk_adjusted_score?: number | null
          strategic_fit_score?: number | null
          uncertainty?: Json
        }
        Update: {
          assumptions?: Json
          capital_efficiency_score?: number | null
          compounding_score?: number | null
          confidence_score?: number | null
          created_at?: string
          decision_model_id?: string
          dimension_scores?: Json
          evaluated_at?: string
          evaluation_key?: string
          evaluation_status?: string
          expected_value_score?: number | null
          id?: string
          mission_id?: string | null
          opportunity_id?: string
          organization_id?: string
          overall_score?: number | null
          policy_results?: Json
          reasoning?: string | null
          recommendation?: string
          risk_adjusted_score?: number | null
          strategic_fit_score?: number | null
          uncertainty?: Json
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_evaluations_decision_model_id_fkey"
            columns: ["decision_model_id"]
            isOneToOne: false
            referencedRelation: "decision_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_evaluations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_evaluations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      opportunity_reviews: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          opportunity_id: string
          organization_id: string
          review_type: string
          reviewer_type: string
          verdict: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          opportunity_id: string
          organization_id: string
          review_type: string
          reviewer_type: string
          verdict: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          opportunity_id?: string
          organization_id?: string
          review_type?: string
          reviewer_type?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_reviews_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_reviews_organization_id_fkey"
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
      procedures: {
        Row: {
          capability_key: string | null
          confidence_score: number | null
          created_at: string
          description: string
          expected_outputs: Json
          id: string
          metadata: Json
          name: string
          organization_id: string
          preconditions: Json
          source_lesson_ids: Json
          status: string
          steps: Json
          success_metrics: Json
          updated_at: string
          version: string
        }
        Insert: {
          capability_key?: string | null
          confidence_score?: number | null
          created_at?: string
          description: string
          expected_outputs?: Json
          id?: string
          metadata?: Json
          name: string
          organization_id: string
          preconditions?: Json
          source_lesson_ids?: Json
          status?: string
          steps?: Json
          success_metrics?: Json
          updated_at?: string
          version: string
        }
        Update: {
          capability_key?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          expected_outputs?: Json
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string
          preconditions?: Json
          source_lesson_ids?: Json
          status?: string
          steps?: Json
          success_metrics?: Json
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_organization_id_fkey"
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
      reasoning_sessions: {
        Row: {
          completed_at: string | null
          confidence: number | null
          context_hash: string
          context_manifest: Json
          correlation_id: string | null
          created_at: string
          error: Json
          estimated_cost: number | null
          executive_decision_id: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          latency_ms: number | null
          mission_id: string | null
          mode: string
          model: string
          opportunity_id: string | null
          organization_id: string
          prompt_version: string
          provider: string
          recommendation: string | null
          runtime_instance_id: string | null
          schema_version: string
          started_at: string | null
          status: string
          structured_output: Json
          usage: Json
          validation_run_id: string | null
        }
        Insert: {
          completed_at?: string | null
          confidence?: number | null
          context_hash: string
          context_manifest?: Json
          correlation_id?: string | null
          created_at?: string
          error?: Json
          estimated_cost?: number | null
          executive_decision_id?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key: string
          latency_ms?: number | null
          mission_id?: string | null
          mode: string
          model: string
          opportunity_id?: string | null
          organization_id: string
          prompt_version: string
          provider: string
          recommendation?: string | null
          runtime_instance_id?: string | null
          schema_version: string
          started_at?: string | null
          status?: string
          structured_output?: Json
          usage?: Json
          validation_run_id?: string | null
        }
        Update: {
          completed_at?: string | null
          confidence?: number | null
          context_hash?: string
          context_manifest?: Json
          correlation_id?: string | null
          created_at?: string
          error?: Json
          estimated_cost?: number | null
          executive_decision_id?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          latency_ms?: number | null
          mission_id?: string | null
          mode?: string
          model?: string
          opportunity_id?: string | null
          organization_id?: string
          prompt_version?: string
          provider?: string
          recommendation?: string | null
          runtime_instance_id?: string | null
          schema_version?: string
          started_at?: string | null
          status?: string
          structured_output?: Json
          usage?: Json
          validation_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reasoning_sessions_executive_decision_id_fkey"
            columns: ["executive_decision_id"]
            isOneToOne: false
            referencedRelation: "executive_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reasoning_sessions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reasoning_sessions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reasoning_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reasoning_sessions_runtime_instance_id_fkey"
            columns: ["runtime_instance_id"]
            isOneToOne: false
            referencedRelation: "mission_runtime_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reasoning_sessions_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_pools: {
        Row: {
          consumed_capacity: number
          created_at: string
          currency: string | null
          id: string
          metadata: Json
          name: string
          organization_id: string
          reserved_capacity: number
          reset_at: string | null
          reset_period: string | null
          resource_type: string
          status: string
          total_capacity: number
          updated_at: string
        }
        Insert: {
          consumed_capacity?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json
          name: string
          organization_id: string
          reserved_capacity?: number
          reset_at?: string | null
          reset_period?: string | null
          resource_type: string
          status?: string
          total_capacity: number
          updated_at?: string
        }
        Update: {
          consumed_capacity?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string
          reserved_capacity?: number
          reset_at?: string | null
          reset_period?: string | null
          resource_type?: string
          status?: string
          total_capacity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_pools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_reservations: {
        Row: {
          allocation_proposal_id: string
          amount: number
          consumed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          organization_id: string
          released_at: string | null
          reservation_key: string
          reserved_at: string
          resource_pool_id: string
          status: string
        }
        Insert: {
          allocation_proposal_id: string
          amount: number
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          released_at?: string | null
          reservation_key: string
          reserved_at?: string
          resource_pool_id: string
          status?: string
        }
        Update: {
          allocation_proposal_id?: string
          amount?: number
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          released_at?: string | null
          reservation_key?: string
          reserved_at?: string
          resource_pool_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_reservations_allocation_proposal_id_fkey"
            columns: ["allocation_proposal_id"]
            isOneToOne: false
            referencedRelation: "allocation_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_reservations_resource_pool_id_fkey"
            columns: ["resource_pool_id"]
            isOneToOne: false
            referencedRelation: "resource_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_dimension_results: {
        Row: {
          blocking_issues: Json
          category: string
          confidence: number | null
          created_at: string
          data_status: string
          findings: Json
          id: string
          missing_information: Json
          organization_id: string
          score: number | null
          validation_run_id: string
        }
        Insert: {
          blocking_issues?: Json
          category: string
          confidence?: number | null
          created_at?: string
          data_status?: string
          findings?: Json
          id?: string
          missing_information?: Json
          organization_id: string
          score?: number | null
          validation_run_id: string
        }
        Update: {
          blocking_issues?: Json
          category?: string
          confidence?: number | null
          created_at?: string
          data_status?: string
          findings?: Json
          id?: string
          missing_information?: Json
          organization_id?: string
          score?: number | null
          validation_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_dimension_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_dimension_results_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_findings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          finding_type: string
          id: string
          is_blocking: boolean
          metadata: Json
          organization_id: string
          severity: string
          title: string
          validation_run_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          finding_type?: string
          id?: string
          is_blocking?: boolean
          metadata?: Json
          organization_id: string
          severity?: string
          title: string
          validation_run_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          finding_type?: string
          id?: string
          is_blocking?: boolean
          metadata?: Json
          organization_id?: string
          severity?: string
          title?: string
          validation_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_findings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_findings_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_models: {
        Row: {
          activated_at: string | null
          categories: Json
          created_at: string
          deprecated_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          requirements: Json
          status: string
          thresholds: Json
          updated_at: string
          version: string
        }
        Insert: {
          activated_at?: string | null
          categories?: Json
          created_at?: string
          deprecated_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          requirements?: Json
          status?: string
          thresholds?: Json
          updated_at?: string
          version: string
        }
        Update: {
          activated_at?: string | null
          categories?: Json
          created_at?: string
          deprecated_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          requirements?: Json
          status?: string
          thresholds?: Json
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_requirements: {
        Row: {
          created_at: string
          description: string
          id: string
          metadata: Json
          organization_id: string
          requirement_key: string
          status: string
          validation_run_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          metadata?: Json
          organization_id: string
          requirement_key: string
          status?: string
          validation_run_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          organization_id?: string
          requirement_key?: string
          status?: string
          validation_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_requirements_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_runs: {
        Row: {
          allocation_proposal_id: string | null
          completed_at: string | null
          created_at: string
          evaluation_id: string | null
          id: string
          is_sparse_system_validation: boolean
          mission_id: string | null
          opportunity_id: string
          organization_id: string
          overall_confidence: number | null
          overall_score: number | null
          recommendation: string
          run_key: string
          run_status: string
          started_at: string
          summary: Json
          validation_model_id: string
        }
        Insert: {
          allocation_proposal_id?: string | null
          completed_at?: string | null
          created_at?: string
          evaluation_id?: string | null
          id?: string
          is_sparse_system_validation?: boolean
          mission_id?: string | null
          opportunity_id: string
          organization_id: string
          overall_confidence?: number | null
          overall_score?: number | null
          recommendation: string
          run_key: string
          run_status?: string
          started_at?: string
          summary?: Json
          validation_model_id: string
        }
        Update: {
          allocation_proposal_id?: string | null
          completed_at?: string | null
          created_at?: string
          evaluation_id?: string | null
          id?: string
          is_sparse_system_validation?: boolean
          mission_id?: string | null
          opportunity_id?: string
          organization_id?: string
          overall_confidence?: number | null
          overall_score?: number | null
          recommendation?: string
          run_key?: string
          run_status?: string
          started_at?: string
          summary?: Json
          validation_model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_runs_allocation_proposal_id_fkey"
            columns: ["allocation_proposal_id"]
            isOneToOne: false
            referencedRelation: "allocation_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_runs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "opportunity_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_runs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_runs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_runs_validation_model_id_fkey"
            columns: ["validation_model_id"]
            isOneToOne: false
            referencedRelation: "validation_models"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_blueprints: {
        Row: {
          blueprint: Json
          created_at: string
          id: string
          idempotency_key: string
          opportunity_id: string
          organization_id: string
          schema_version: string
          status: string
          template_key: string
          template_version: string
          updated_at: string
          venture_type: string
        }
        Insert: {
          blueprint?: Json
          created_at?: string
          id?: string
          idempotency_key: string
          opportunity_id: string
          organization_id: string
          schema_version?: string
          status?: string
          template_key: string
          template_version: string
          updated_at?: string
          venture_type: string
        }
        Update: {
          blueprint?: Json
          created_at?: string
          id?: string
          idempotency_key?: string
          opportunity_id?: string
          organization_id?: string
          schema_version?: string
          status?: string
          template_key?: string
          template_version?: string
          updated_at?: string
          venture_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_blueprints_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_blueprints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      website_build_metadata: {
        Row: {
          accessibility_status: string
          build_id: string
          component_manifest: Json
          created_at: string
          framework: string
          id: string
          internal_package_artifact_id: string | null
          metadata_manifest: Json
          organization_id: string
          project_type: string
          qa_status: string
          route_manifest: Json
          security_status: string
          seo_status: string
          sitemap_manifest: Json
          updated_at: string
        }
        Insert: {
          accessibility_status?: string
          build_id: string
          component_manifest?: Json
          created_at?: string
          framework: string
          id?: string
          internal_package_artifact_id?: string | null
          metadata_manifest?: Json
          organization_id: string
          project_type: string
          qa_status?: string
          route_manifest?: Json
          security_status?: string
          seo_status?: string
          sitemap_manifest?: Json
          updated_at?: string
        }
        Update: {
          accessibility_status?: string
          build_id?: string
          component_manifest?: Json
          created_at?: string
          framework?: string
          id?: string
          internal_package_artifact_id?: string | null
          metadata_manifest?: Json
          organization_id?: string
          project_type?: string
          qa_status?: string
          route_manifest?: Json
          security_status?: string
          seo_status?: string
          sitemap_manifest?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_build_metadata_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: true
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_build_metadata_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_artifacts: {
        Row: {
          artifact_type: string
          capability_key: string
          capability_version: string
          created_at: string
          id: string
          mission_id: string | null
          organization_id: string
          payload: Json
          provenance: Json
          schema_version: string
          worker_result_id: string
        }
        Insert: {
          artifact_type: string
          capability_key: string
          capability_version: string
          created_at?: string
          id?: string
          mission_id?: string | null
          organization_id: string
          payload?: Json
          provenance?: Json
          schema_version?: string
          worker_result_id: string
        }
        Update: {
          artifact_type?: string
          capability_key?: string
          capability_version?: string
          created_at?: string
          id?: string
          mission_id?: string | null
          organization_id?: string
          payload?: Json
          provenance?: Json
          schema_version?: string
          worker_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_artifacts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_artifacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_artifacts_worker_result_id_fkey"
            columns: ["worker_result_id"]
            isOneToOne: false
            referencedRelation: "worker_results"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_results: {
        Row: {
          artifact_references: Json
          attempt_number: number
          capability_key: string
          capability_version: string
          completed_at: string | null
          created_at: string
          engine_job_id: string
          error: Json
          execution_key: string
          failed_at: string | null
          id: string
          input_hash: string
          input_manifest: Json
          mission_id: string | null
          organization_id: string
          output_schema_version: string
          plan_id: string | null
          plan_step_id: string | null
          policy_results: Json
          review_status: string
          runtime_instance_id: string | null
          started_at: string | null
          status: string
          structured_output: Json
          updated_at: string
          validation_results: Json
          worker_run_id: string
        }
        Insert: {
          artifact_references?: Json
          attempt_number?: number
          capability_key: string
          capability_version: string
          completed_at?: string | null
          created_at?: string
          engine_job_id: string
          error?: Json
          execution_key: string
          failed_at?: string | null
          id?: string
          input_hash: string
          input_manifest?: Json
          mission_id?: string | null
          organization_id: string
          output_schema_version?: string
          plan_id?: string | null
          plan_step_id?: string | null
          policy_results?: Json
          review_status?: string
          runtime_instance_id?: string | null
          started_at?: string | null
          status?: string
          structured_output?: Json
          updated_at?: string
          validation_results?: Json
          worker_run_id: string
        }
        Update: {
          artifact_references?: Json
          attempt_number?: number
          capability_key?: string
          capability_version?: string
          completed_at?: string | null
          created_at?: string
          engine_job_id?: string
          error?: Json
          execution_key?: string
          failed_at?: string | null
          id?: string
          input_hash?: string
          input_manifest?: Json
          mission_id?: string | null
          organization_id?: string
          output_schema_version?: string
          plan_id?: string | null
          plan_step_id?: string | null
          policy_results?: Json
          review_status?: string
          runtime_instance_id?: string | null
          started_at?: string | null
          status?: string
          structured_output?: Json
          updated_at?: string
          validation_results?: Json
          worker_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_results_engine_job_id_fkey"
            columns: ["engine_job_id"]
            isOneToOne: false
            referencedRelation: "engine_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_results_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_results_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_results_plan_step_id_fkey"
            columns: ["plan_step_id"]
            isOneToOne: false
            referencedRelation: "plan_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_results_runtime_instance_id_fkey"
            columns: ["runtime_instance_id"]
            isOneToOne: false
            referencedRelation: "mission_runtime_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_results_worker_run_id_fkey"
            columns: ["worker_run_id"]
            isOneToOne: false
            referencedRelation: "worker_runs"
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
      claim_mission_runtime_instance: {
        Args: {
          p_lease_seconds?: number
          p_locked_by: string
          p_organization_id: string
          p_runtime_instance_id: string
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
      release_allocation_resources: {
        Args: { p_organization_id: string; p_proposal_id: string }
        Returns: undefined
      }
      release_mission_runtime_instance: {
        Args: {
          p_locked_by: string
          p_organization_id: string
          p_runtime_instance_id: string
        }
        Returns: undefined
      }
      reserve_allocation_resources: {
        Args: {
          p_organization_id: string
          p_proposal_id: string
          p_reservation_key: string
        }
        Returns: {
          allocation_proposal_id: string
          amount: number
          consumed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          organization_id: string
          released_at: string | null
          reservation_key: string
          reserved_at: string
          resource_pool_id: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "resource_reservations"
          isOneToOne: false
          isSetofReturn: true
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

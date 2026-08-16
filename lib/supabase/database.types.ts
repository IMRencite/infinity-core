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
      adversarial_reviews: {
        Row: {
          candidate_selection_evaluation_id: string
          confidence: number | null
          created_at: string
          estimated_cost_usd: number | null
          findings: Json
          id: string
          metadata: Json
          model: string | null
          opportunity_candidate_id: string
          organization_id: string
          provider: string
          reasoning_run_id: string | null
          risk_inputs: Json
          summary: string | null
          token_usage: Json
          venture_selection_run_id: string
        }
        Insert: {
          candidate_selection_evaluation_id: string
          confidence?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          findings?: Json
          id?: string
          metadata?: Json
          model?: string | null
          opportunity_candidate_id: string
          organization_id: string
          provider: string
          reasoning_run_id?: string | null
          risk_inputs?: Json
          summary?: string | null
          token_usage?: Json
          venture_selection_run_id: string
        }
        Update: {
          candidate_selection_evaluation_id?: string
          confidence?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          findings?: Json
          id?: string
          metadata?: Json
          model?: string | null
          opportunity_candidate_id?: string
          organization_id?: string
          provider?: string
          reasoning_run_id?: string | null
          risk_inputs?: Json
          summary?: string | null
          token_usage?: Json
          venture_selection_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adversarial_reviews_candidate_selection_evaluation_id_fkey"
            columns: ["candidate_selection_evaluation_id"]
            isOneToOne: false
            referencedRelation: "candidate_selection_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adversarial_reviews_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adversarial_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adversarial_reviews_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_brain_reasoning_runs: {
        Row: {
          canonical_mission_draft: Json | null
          completed_at: string | null
          correlation_id: string | null
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          failed_at: string | null
          failure_classification: string | null
          id: string
          idempotency_key: string
          input_hash: string
          latency_ms: number | null
          mission_id: string | null
          model: string
          objective: string
          objective_type: string
          organization_id: string
          prompt_version: string
          provider: string
          request_id: string | null
          retry_count: number
          schema_version: string
          started_at: string | null
          status: string
          structured_output: Json
          token_usage: Json
          validation_status: string | null
        }
        Insert: {
          canonical_mission_draft?: Json | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key: string
          input_hash: string
          latency_ms?: number | null
          mission_id?: string | null
          model: string
          objective: string
          objective_type: string
          organization_id: string
          prompt_version: string
          provider: string
          request_id?: string | null
          retry_count?: number
          schema_version: string
          started_at?: string | null
          status?: string
          structured_output?: Json
          token_usage?: Json
          validation_status?: string | null
        }
        Update: {
          canonical_mission_draft?: Json | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key?: string
          input_hash?: string
          latency_ms?: number | null
          mission_id?: string | null
          model?: string
          objective?: string
          objective_type?: string
          organization_id?: string
          prompt_version?: string
          provider?: string
          request_id?: string | null
          retry_count?: number
          schema_version?: string
          started_at?: string | null
          status?: string
          structured_output?: Json
          token_usage?: Json
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_brain_reasoning_runs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_brain_reasoning_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_registry: {
        Row: {
          architecture_capability: number | null
          availability: string
          average_latency_ms: number | null
          average_repair_rate: number | null
          capabilities: Json
          coding_capability: number | null
          context_limit: number | null
          context_window: number | null
          created_at: string
          debugging_capability: number | null
          display_name: string
          enabled: boolean
          estimated_input_cost_per_1k: number | null
          estimated_output_cost_per_1k: number | null
          grounded_search_capability: number | null
          historical_task_success: number | null
          historical_validation_success: number | null
          id: string
          last_verified_at: string | null
          latency_class: string | null
          latency_tier: string | null
          metadata: Json
          model_id: string
          multimodal_capability: number | null
          provider: string
          reasoning_capability: number | null
          research_capability: number | null
          review_capability: number | null
          structured_output: boolean
          tool_use: boolean
        }
        Insert: {
          architecture_capability?: number | null
          availability?: string
          average_latency_ms?: number | null
          average_repair_rate?: number | null
          capabilities?: Json
          coding_capability?: number | null
          context_limit?: number | null
          context_window?: number | null
          created_at?: string
          debugging_capability?: number | null
          display_name: string
          enabled?: boolean
          estimated_input_cost_per_1k?: number | null
          estimated_output_cost_per_1k?: number | null
          grounded_search_capability?: number | null
          historical_task_success?: number | null
          historical_validation_success?: number | null
          id?: string
          last_verified_at?: string | null
          latency_class?: string | null
          latency_tier?: string | null
          metadata?: Json
          model_id: string
          multimodal_capability?: number | null
          provider: string
          reasoning_capability?: number | null
          research_capability?: number | null
          review_capability?: number | null
          structured_output?: boolean
          tool_use?: boolean
        }
        Update: {
          architecture_capability?: number | null
          availability?: string
          average_latency_ms?: number | null
          average_repair_rate?: number | null
          capabilities?: Json
          coding_capability?: number | null
          context_limit?: number | null
          context_window?: number | null
          created_at?: string
          debugging_capability?: number | null
          display_name?: string
          enabled?: boolean
          estimated_input_cost_per_1k?: number | null
          estimated_output_cost_per_1k?: number | null
          grounded_search_capability?: number | null
          historical_task_success?: number | null
          historical_validation_success?: number | null
          id?: string
          last_verified_at?: string | null
          latency_class?: string | null
          latency_tier?: string | null
          metadata?: Json
          model_id?: string
          multimodal_capability?: number | null
          provider?: string
          reasoning_capability?: number | null
          research_capability?: number | null
          review_capability?: number | null
          structured_output?: boolean
          tool_use?: boolean
        }
        Relationships: []
      }
      ai_orchestration_sessions: {
        Row: {
          completed_at: string | null
          correlation_id: string
          created_at: string
          disagreements: Json
          execution_strategy: string
          id: string
          idempotency_key: string
          organization_id: string
          started_at: string | null
          status: string
          synthesis_result: Json | null
          task_characteristics: Json
          task_type: string
          total_estimated_cost_usd: number | null
        }
        Insert: {
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          disagreements?: Json
          execution_strategy: string
          id?: string
          idempotency_key: string
          organization_id: string
          started_at?: string | null
          status?: string
          synthesis_result?: Json | null
          task_characteristics?: Json
          task_type: string
          total_estimated_cost_usd?: number | null
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          disagreements?: Json
          execution_strategy?: string
          id?: string
          idempotency_key?: string
          organization_id?: string
          started_at?: string | null
          status?: string
          synthesis_result?: Json | null
          task_characteristics?: Json
          task_type?: string
          total_estimated_cost_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_orchestration_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_task_disagreements: {
        Row: {
          created_at: string
          evidence: Json
          final_canonical_decision: string | null
          id: string
          orchestration_session_id: string
          organization_id: string
          points_of_agreement: Json
          points_of_disagreement: Json
          positions: Json
          resolution: string | null
          severity: string | null
          synthesizer_model: string | null
          synthesizer_provider: string | null
          topic: string
        }
        Insert: {
          created_at?: string
          evidence?: Json
          final_canonical_decision?: string | null
          id?: string
          orchestration_session_id: string
          organization_id: string
          points_of_agreement?: Json
          points_of_disagreement?: Json
          positions?: Json
          resolution?: string | null
          severity?: string | null
          synthesizer_model?: string | null
          synthesizer_provider?: string | null
          topic: string
        }
        Update: {
          created_at?: string
          evidence?: Json
          final_canonical_decision?: string | null
          id?: string
          orchestration_session_id?: string
          organization_id?: string
          points_of_agreement?: Json
          points_of_disagreement?: Json
          positions?: Json
          resolution?: string | null
          severity?: string | null
          synthesizer_model?: string | null
          synthesizer_provider?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_task_disagreements_orchestration_session_id_fkey"
            columns: ["orchestration_session_id"]
            isOneToOne: false
            referencedRelation: "ai_orchestration_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_task_disagreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_task_executions: {
        Row: {
          brain_role: string
          complexity: string | null
          created_at: string
          estimated_cost_usd: number | null
          id: string
          input_tokens: number
          latency_ms: number | null
          metadata: Json
          model_id: string
          orchestration_session_id: string | null
          organization_id: string
          output: Json
          output_tokens: number
          product_asset_build_run_id: string | null
          provider: string
          repair_attempts: number
          reviewer_score: number | null
          success: boolean
          task_type: string
          validation_result: string | null
        }
        Insert: {
          brain_role: string
          complexity?: string | null
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata?: Json
          model_id: string
          orchestration_session_id?: string | null
          organization_id: string
          output?: Json
          output_tokens?: number
          product_asset_build_run_id?: string | null
          provider: string
          repair_attempts?: number
          reviewer_score?: number | null
          success?: boolean
          task_type: string
          validation_result?: string | null
        }
        Update: {
          brain_role?: string
          complexity?: string | null
          created_at?: string
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata?: Json
          model_id?: string
          orchestration_session_id?: string | null
          organization_id?: string
          output?: Json
          output_tokens?: number
          product_asset_build_run_id?: string | null
          provider?: string
          repair_attempts?: number
          reviewer_score?: number | null
          success?: boolean
          task_type?: string
          validation_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_task_executions_orchestration_session_id_fkey"
            columns: ["orchestration_session_id"]
            isOneToOne: false
            referencedRelation: "ai_orchestration_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_task_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_website_generation_plans: {
        Row: {
          approved_at: string | null
          build_id: string
          build_specification_id: string
          completed_at: string | null
          confidence: number | null
          context_hash: string
          context_manifest: Json
          correlation_id: string | null
          created_at: string
          error: string | null
          estimated_cost: number
          id: string
          idempotency_key: string
          latency_ms: number | null
          mission_id: string
          mode: string
          model: string
          opportunity_id: string
          organization_id: string
          output_hash: string | null
          plan_version: string
          policy_results: Json | null
          prompt_version: string
          provider: string
          reasoning_session_id: string | null
          recommendation: string | null
          rejected_at: string | null
          review_status: string
          runtime_instance_id: string | null
          schema_version: string
          started_at: string | null
          status: string
          structured_plan: Json | null
          translation_hash: string | null
          updated_at: string
          usage: Json | null
          validation_results: Json | null
          venture_blueprint_id: string
        }
        Insert: {
          approved_at?: string | null
          build_id: string
          build_specification_id: string
          completed_at?: string | null
          confidence?: number | null
          context_hash: string
          context_manifest?: Json
          correlation_id?: string | null
          created_at?: string
          error?: string | null
          estimated_cost?: number
          id?: string
          idempotency_key: string
          latency_ms?: number | null
          mission_id: string
          mode: string
          model: string
          opportunity_id: string
          organization_id: string
          output_hash?: string | null
          plan_version?: string
          policy_results?: Json | null
          prompt_version: string
          provider: string
          reasoning_session_id?: string | null
          recommendation?: string | null
          rejected_at?: string | null
          review_status?: string
          runtime_instance_id?: string | null
          schema_version: string
          started_at?: string | null
          status?: string
          structured_plan?: Json | null
          translation_hash?: string | null
          updated_at?: string
          usage?: Json | null
          validation_results?: Json | null
          venture_blueprint_id: string
        }
        Update: {
          approved_at?: string | null
          build_id?: string
          build_specification_id?: string
          completed_at?: string | null
          confidence?: number | null
          context_hash?: string
          context_manifest?: Json
          correlation_id?: string | null
          created_at?: string
          error?: string | null
          estimated_cost?: number
          id?: string
          idempotency_key?: string
          latency_ms?: number | null
          mission_id?: string
          mode?: string
          model?: string
          opportunity_id?: string
          organization_id?: string
          output_hash?: string | null
          plan_version?: string
          policy_results?: Json | null
          prompt_version?: string
          provider?: string
          reasoning_session_id?: string | null
          recommendation?: string | null
          rejected_at?: string | null
          review_status?: string
          runtime_instance_id?: string | null
          schema_version?: string
          started_at?: string | null
          status?: string
          structured_plan?: Json | null
          translation_hash?: string | null
          updated_at?: string
          usage?: Json | null
          validation_results?: Json | null
          venture_blueprint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_website_generation_plans_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_website_generation_plans_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_website_generation_plans_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_website_generation_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_website_generation_plans_reasoning_session_id_fkey"
            columns: ["reasoning_session_id"]
            isOneToOne: false
            referencedRelation: "reasoning_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_website_generation_plans_runtime_instance_id_fkey"
            columns: ["runtime_instance_id"]
            isOneToOne: false
            referencedRelation: "mission_runtime_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_website_generation_plans_venture_blueprint_id_fkey"
            columns: ["venture_blueprint_id"]
            isOneToOne: false
            referencedRelation: "venture_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
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
      build_jobs: {
        Row: {
          allocation_proposal_id: string | null
          approved_capabilities: Json
          blocking_reason: string | null
          build_id: string | null
          build_manifest_id: string
          build_specification_id: string
          build_version: string
          builder_key: string
          builder_version: string
          cancelled_at: string | null
          completed_at: string | null
          correlation_id: string | null
          created_at: string
          executive_decision_id: string | null
          failed_at: string | null
          generic_qa_status: string
          id: string
          idempotency_key: string
          input_manifest: Json
          lifecycle_stage: string | null
          max_repair_attempts: number
          mission_id: string
          opportunity_id: string
          organization_id: string
          output_contracts: Json
          plan_id: string | null
          plan_step_id: string | null
          policy_manifest: Json
          product_qa_status: string
          prohibited_capabilities: Json
          project_type: string
          repair_attempt_count: number
          reproducibility_status: string | null
          required_reviews: Json
          resource_budget: Json
          rollback_mode: string | null
          runtime_budget: Json
          runtime_instance_id: string | null
          started_at: string | null
          status: string
          venture_blueprint_id: string
          workspace_id: string
        }
        Insert: {
          allocation_proposal_id?: string | null
          approved_capabilities?: Json
          blocking_reason?: string | null
          build_id?: string | null
          build_manifest_id?: string
          build_specification_id?: string
          build_version?: string
          builder_key: string
          builder_version: string
          cancelled_at?: string | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          executive_decision_id?: string | null
          failed_at?: string | null
          generic_qa_status?: string
          id?: string
          idempotency_key: string
          input_manifest?: Json
          lifecycle_stage?: string | null
          max_repair_attempts?: number
          mission_id: string
          opportunity_id: string
          organization_id: string
          output_contracts?: Json
          plan_id?: string | null
          plan_step_id?: string | null
          policy_manifest?: Json
          product_qa_status?: string
          prohibited_capabilities?: Json
          project_type: string
          repair_attempt_count?: number
          reproducibility_status?: string | null
          required_reviews?: Json
          resource_budget?: Json
          rollback_mode?: string | null
          runtime_budget?: Json
          runtime_instance_id?: string | null
          started_at?: string | null
          status?: string
          venture_blueprint_id: string
          workspace_id?: string
        }
        Update: {
          allocation_proposal_id?: string | null
          approved_capabilities?: Json
          blocking_reason?: string | null
          build_id?: string | null
          build_manifest_id?: string
          build_specification_id?: string
          build_version?: string
          builder_key?: string
          builder_version?: string
          cancelled_at?: string | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          executive_decision_id?: string | null
          failed_at?: string | null
          generic_qa_status?: string
          id?: string
          idempotency_key?: string
          input_manifest?: Json
          lifecycle_stage?: string | null
          max_repair_attempts?: number
          mission_id?: string
          opportunity_id?: string
          organization_id?: string
          output_contracts?: Json
          plan_id?: string | null
          plan_step_id?: string | null
          policy_manifest?: Json
          product_qa_status?: string
          prohibited_capabilities?: Json
          project_type?: string
          repair_attempt_count?: number
          reproducibility_status?: string | null
          required_reviews?: Json
          resource_budget?: Json
          rollback_mode?: string | null
          runtime_budget?: Json
          runtime_instance_id?: string | null
          started_at?: string | null
          status?: string
          venture_blueprint_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_jobs_allocation_proposal_id_fkey"
            columns: ["allocation_proposal_id"]
            isOneToOne: false
            referencedRelation: "allocation_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_jobs_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_jobs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_jobs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_jobs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_jobs_plan_step_id_fkey"
            columns: ["plan_step_id"]
            isOneToOne: false
            referencedRelation: "plan_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_jobs_runtime_instance_id_fkey"
            columns: ["runtime_instance_id"]
            isOneToOne: false
            referencedRelation: "mission_runtime_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_jobs_venture_blueprint_id_fkey"
            columns: ["venture_blueprint_id"]
            isOneToOne: false
            referencedRelation: "venture_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      build_repair_attempts: {
        Row: {
          attempt_number: number
          build_id: string | null
          build_job_id: string
          created_at: string
          failing_lifecycle_stage: string
          failure_classification: string
          id: string
          organization_id: string
          permitted_capabilities: Json
          result: Json
          snapshot_reference: string | null
          status: string
        }
        Insert: {
          attempt_number: number
          build_id?: string | null
          build_job_id: string
          created_at?: string
          failing_lifecycle_stage: string
          failure_classification: string
          id?: string
          organization_id: string
          permitted_capabilities?: Json
          result?: Json
          snapshot_reference?: string | null
          status?: string
        }
        Update: {
          attempt_number?: number
          build_id?: string | null
          build_job_id?: string
          created_at?: string
          failing_lifecycle_stage?: string
          failure_classification?: string
          id?: string
          organization_id?: string
          permitted_capabilities?: Json
          result?: Json
          snapshot_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_repair_attempts_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_repair_attempts_build_job_id_fkey"
            columns: ["build_job_id"]
            isOneToOne: false
            referencedRelation: "build_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_repair_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      build_rollbacks: {
        Row: {
          audit: Json
          build_id: string
          build_job_id: string
          created_at: string
          id: string
          organization_id: string
          rollback_mode: string
          snapshot_id: string | null
          status: string
        }
        Insert: {
          audit?: Json
          build_id: string
          build_job_id: string
          created_at?: string
          id?: string
          organization_id: string
          rollback_mode?: string
          snapshot_id?: string | null
          status?: string
        }
        Update: {
          audit?: Json
          build_id?: string
          build_job_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          rollback_mode?: string
          snapshot_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_rollbacks_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_rollbacks_build_job_id_fkey"
            columns: ["build_job_id"]
            isOneToOne: false
            referencedRelation: "build_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_rollbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_rollbacks_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "build_snapshots"
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
      buildability_assessments: {
        Row: {
          assessment_inputs: Json
          assessment_notes: Json
          automation_score: number | null
          buildability_score: number
          can_automate_acquisition: boolean
          can_automate_fulfillment: boolean
          can_automate_support: boolean
          can_build_software: boolean
          can_deliver_digitally: boolean
          candidate_selection_evaluation_id: string
          created_at: string
          depends_on_inaccessible_systems: boolean
          depends_on_manual_sales: boolean
          external_dependency_score: number | null
          id: string
          metadata: Json
          operational_autonomy_score: number | null
          opportunity_candidate_id: string
          organization_id: string
          requires_large_upfront_capital: boolean
          requires_licensing: boolean
          requires_physical_inventory: boolean
          requires_specialized_employees: boolean
          venture_selection_run_id: string
        }
        Insert: {
          assessment_inputs?: Json
          assessment_notes?: Json
          automation_score?: number | null
          buildability_score: number
          can_automate_acquisition?: boolean
          can_automate_fulfillment?: boolean
          can_automate_support?: boolean
          can_build_software?: boolean
          can_deliver_digitally?: boolean
          candidate_selection_evaluation_id: string
          created_at?: string
          depends_on_inaccessible_systems?: boolean
          depends_on_manual_sales?: boolean
          external_dependency_score?: number | null
          id?: string
          metadata?: Json
          operational_autonomy_score?: number | null
          opportunity_candidate_id: string
          organization_id: string
          requires_large_upfront_capital?: boolean
          requires_licensing?: boolean
          requires_physical_inventory?: boolean
          requires_specialized_employees?: boolean
          venture_selection_run_id: string
        }
        Update: {
          assessment_inputs?: Json
          assessment_notes?: Json
          automation_score?: number | null
          buildability_score?: number
          can_automate_acquisition?: boolean
          can_automate_fulfillment?: boolean
          can_automate_support?: boolean
          can_build_software?: boolean
          can_deliver_digitally?: boolean
          candidate_selection_evaluation_id?: string
          created_at?: string
          depends_on_inaccessible_systems?: boolean
          depends_on_manual_sales?: boolean
          external_dependency_score?: number | null
          id?: string
          metadata?: Json
          operational_autonomy_score?: number | null
          opportunity_candidate_id?: string
          organization_id?: string
          requires_large_upfront_capital?: boolean
          requires_licensing?: boolean
          requires_physical_inventory?: boolean
          requires_specialized_employees?: boolean
          venture_selection_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildability_assessments_candidate_selection_evaluation_id_fkey"
            columns: ["candidate_selection_evaluation_id"]
            isOneToOne: false
            referencedRelation: "candidate_selection_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildability_assessments_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildability_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildability_assessments_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_registry_entries: {
        Row: {
          builder_key: string
          builder_version: string
          created_at: string
          deprecated_at: string | null
          description: string
          id: string
          metadata: Json
          name: string
          required_capabilities: Json
          side_effect_class: string
          status: string
          supported_project_types: Json
          supported_specification_versions: Json
        }
        Insert: {
          builder_key: string
          builder_version: string
          created_at?: string
          deprecated_at?: string | null
          description?: string
          id?: string
          metadata?: Json
          name: string
          required_capabilities?: Json
          side_effect_class?: string
          status?: string
          supported_project_types?: Json
          supported_specification_versions?: Json
        }
        Update: {
          builder_key?: string
          builder_version?: string
          created_at?: string
          deprecated_at?: string | null
          description?: string
          id?: string
          metadata?: Json
          name?: string
          required_capabilities?: Json
          side_effect_class?: string
          status?: string
          supported_project_types?: Json
          supported_specification_versions?: Json
        }
        Relationships: []
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
      candidate_assumptions: {
        Row: {
          assumption: string
          assumption_type: string
          candidate_selection_evaluation_id: string
          category: string
          confidence: number | null
          created_at: string
          evidence: Json
          fatal_risk_contribution: number | null
          id: string
          impact_if_wrong: string | null
          impact_score: number | null
          metadata: Json
          opportunity_candidate_id: string
          organization_id: string
          source_urls: Json
          uncertainty_score: number | null
          validation_cost_estimate: number | null
          validation_method: string | null
          validation_time_estimate: number | null
          value: string | null
          venture_selection_run_id: string
        }
        Insert: {
          assumption: string
          assumption_type?: string
          candidate_selection_evaluation_id: string
          category?: string
          confidence?: number | null
          created_at?: string
          evidence?: Json
          fatal_risk_contribution?: number | null
          id?: string
          impact_if_wrong?: string | null
          impact_score?: number | null
          metadata?: Json
          opportunity_candidate_id: string
          organization_id: string
          source_urls?: Json
          uncertainty_score?: number | null
          validation_cost_estimate?: number | null
          validation_method?: string | null
          validation_time_estimate?: number | null
          value?: string | null
          venture_selection_run_id: string
        }
        Update: {
          assumption?: string
          assumption_type?: string
          candidate_selection_evaluation_id?: string
          category?: string
          confidence?: number | null
          created_at?: string
          evidence?: Json
          fatal_risk_contribution?: number | null
          id?: string
          impact_if_wrong?: string | null
          impact_score?: number | null
          metadata?: Json
          opportunity_candidate_id?: string
          organization_id?: string
          source_urls?: Json
          uncertainty_score?: number | null
          validation_cost_estimate?: number | null
          validation_method?: string | null
          validation_time_estimate?: number | null
          value?: string | null
          venture_selection_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assumptions_candidate_selection_evaluation_id_fkey"
            columns: ["candidate_selection_evaluation_id"]
            isOneToOne: false
            referencedRelation: "candidate_selection_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assumptions_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assumptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_assumptions_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_selection_evaluations: {
        Row: {
          assumption_uncertainty_score: number | null
          blocking_assumptions: Json
          buildability_score: number | null
          capital_efficiency: Json
          confidence: number | null
          correlation_penalties: Json
          created_at: string
          decision: string
          dependency_tags: Json
          discovery_run_id: string | null
          estimated_capital_required: number | null
          estimated_time_to_revenue: number | null
          evaluated_at: string
          evidence_freshness: string | null
          expected_12_month_profit: number | null
          expected_12_month_revenue: number | null
          expected_roi: number | null
          expected_value_derived: Json
          expected_value_inputs: Json
          fatal_assumption_risk_score: number | null
          id: string
          metadata: Json
          monetization_analysis_id: string | null
          monetization_run_id: string | null
          monetization_score: number | null
          opportunity_candidate_id: string
          opportunity_score: number | null
          organization_id: string
          portfolio_adjusted_score: number | null
          primary_monetization_model: string | null
          primary_plan_id: string | null
          queue_rank: number | null
          queue_reason: string | null
          recheck_after: string | null
          recommended_next_action: string | null
          selection_score: number | null
          speed_to_value: Json
          stale_after: string | null
          validation_dimensions: Json
          validation_score: number | null
          venture_selection_run_id: string
        }
        Insert: {
          assumption_uncertainty_score?: number | null
          blocking_assumptions?: Json
          buildability_score?: number | null
          capital_efficiency?: Json
          confidence?: number | null
          correlation_penalties?: Json
          created_at?: string
          decision: string
          dependency_tags?: Json
          discovery_run_id?: string | null
          estimated_capital_required?: number | null
          estimated_time_to_revenue?: number | null
          evaluated_at?: string
          evidence_freshness?: string | null
          expected_12_month_profit?: number | null
          expected_12_month_revenue?: number | null
          expected_roi?: number | null
          expected_value_derived?: Json
          expected_value_inputs?: Json
          fatal_assumption_risk_score?: number | null
          id?: string
          metadata?: Json
          monetization_analysis_id?: string | null
          monetization_run_id?: string | null
          monetization_score?: number | null
          opportunity_candidate_id: string
          opportunity_score?: number | null
          organization_id: string
          portfolio_adjusted_score?: number | null
          primary_monetization_model?: string | null
          primary_plan_id?: string | null
          queue_rank?: number | null
          queue_reason?: string | null
          recheck_after?: string | null
          recommended_next_action?: string | null
          selection_score?: number | null
          speed_to_value?: Json
          stale_after?: string | null
          validation_dimensions?: Json
          validation_score?: number | null
          venture_selection_run_id: string
        }
        Update: {
          assumption_uncertainty_score?: number | null
          blocking_assumptions?: Json
          buildability_score?: number | null
          capital_efficiency?: Json
          confidence?: number | null
          correlation_penalties?: Json
          created_at?: string
          decision?: string
          dependency_tags?: Json
          discovery_run_id?: string | null
          estimated_capital_required?: number | null
          estimated_time_to_revenue?: number | null
          evaluated_at?: string
          evidence_freshness?: string | null
          expected_12_month_profit?: number | null
          expected_12_month_revenue?: number | null
          expected_roi?: number | null
          expected_value_derived?: Json
          expected_value_inputs?: Json
          fatal_assumption_risk_score?: number | null
          id?: string
          metadata?: Json
          monetization_analysis_id?: string | null
          monetization_run_id?: string | null
          monetization_score?: number | null
          opportunity_candidate_id?: string
          opportunity_score?: number | null
          organization_id?: string
          portfolio_adjusted_score?: number | null
          primary_monetization_model?: string | null
          primary_plan_id?: string | null
          queue_rank?: number | null
          queue_reason?: string | null
          recheck_after?: string | null
          recommended_next_action?: string | null
          selection_score?: number | null
          speed_to_value?: Json
          stale_after?: string | null
          validation_dimensions?: Json
          validation_score?: number | null
          venture_selection_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_selection_evaluations_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "opportunity_discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_selection_evaluations_monetization_analysis_id_fkey"
            columns: ["monetization_analysis_id"]
            isOneToOne: false
            referencedRelation: "monetization_candidate_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_selection_evaluations_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_selection_evaluations_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_selection_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_selection_evaluations_primary_plan_id_fkey"
            columns: ["primary_plan_id"]
            isOneToOne: false
            referencedRelation: "monetization_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_selection_evaluations_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
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
      company_builder_blueprints: {
        Row: {
          acquisition_architecture: Json
          analytics_architecture: Json
          architecture_feedback: Json
          architecture_feedback_action: string | null
          automation_architecture: Json
          blueprint_payload: Json
          blueprint_version: string
          brand_architecture: Json
          build_graph: Json
          build_phases: Json
          build_vs_buy: Json
          business_architecture: Json
          business_summary: string | null
          company_builder_run_id: string
          content_architecture: Json | null
          created_at: string
          data_model: Json
          economic_guardrails: Json
          economics_compliance: string
          failure_criteria: Json
          id: string
          integration_plan: Json
          metadata: Json
          mvp_definition: Json
          opportunity_candidate_id: string | null
          organization_id: string
          primary_monetization_model: string | null
          product_architecture: Json
          revenue_architecture: Json
          secondary_venture_types: Json
          simulation_only: boolean
          source_lineage: Json
          technical_architecture: Json
          venture_name_working: string
          venture_selection_handoff_id: string | null
          venture_type: string
        }
        Insert: {
          acquisition_architecture?: Json
          analytics_architecture?: Json
          architecture_feedback?: Json
          architecture_feedback_action?: string | null
          automation_architecture?: Json
          blueprint_payload?: Json
          blueprint_version?: string
          brand_architecture?: Json
          build_graph?: Json
          build_phases?: Json
          build_vs_buy?: Json
          business_architecture?: Json
          business_summary?: string | null
          company_builder_run_id: string
          content_architecture?: Json | null
          created_at?: string
          data_model?: Json
          economic_guardrails?: Json
          economics_compliance?: string
          failure_criteria?: Json
          id?: string
          integration_plan?: Json
          metadata?: Json
          mvp_definition?: Json
          opportunity_candidate_id?: string | null
          organization_id: string
          primary_monetization_model?: string | null
          product_architecture?: Json
          revenue_architecture?: Json
          secondary_venture_types?: Json
          simulation_only?: boolean
          source_lineage?: Json
          technical_architecture?: Json
          venture_name_working: string
          venture_selection_handoff_id?: string | null
          venture_type: string
        }
        Update: {
          acquisition_architecture?: Json
          analytics_architecture?: Json
          architecture_feedback?: Json
          architecture_feedback_action?: string | null
          automation_architecture?: Json
          blueprint_payload?: Json
          blueprint_version?: string
          brand_architecture?: Json
          build_graph?: Json
          build_phases?: Json
          build_vs_buy?: Json
          business_architecture?: Json
          business_summary?: string | null
          company_builder_run_id?: string
          content_architecture?: Json | null
          created_at?: string
          data_model?: Json
          economic_guardrails?: Json
          economics_compliance?: string
          failure_criteria?: Json
          id?: string
          integration_plan?: Json
          metadata?: Json
          mvp_definition?: Json
          opportunity_candidate_id?: string | null
          organization_id?: string
          primary_monetization_model?: string | null
          product_architecture?: Json
          revenue_architecture?: Json
          secondary_venture_types?: Json
          simulation_only?: boolean
          source_lineage?: Json
          technical_architecture?: Json
          venture_name_working?: string
          venture_selection_handoff_id?: string | null
          venture_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_builder_blueprints_company_builder_run_id_fkey"
            columns: ["company_builder_run_id"]
            isOneToOne: false
            referencedRelation: "company_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_blueprints_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_blueprints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_blueprints_venture_selection_handoff_id_fkey"
            columns: ["venture_selection_handoff_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_builder_packages: {
        Row: {
          blocked_reasons: Json
          build_graph_reference: Json
          company_builder_blueprint_id: string
          company_builder_run_id: string
          created_at: string
          economic_constraints_reference: Json
          id: string
          metadata: Json
          mvp_reference: Json
          organization_id: string
          package_version: number
          readiness_report: Json
          simulation_only: boolean
          source_lineage: Json
          status: string
          technical_architecture_reference: Json
          verification_requirements: Json
        }
        Insert: {
          blocked_reasons?: Json
          build_graph_reference?: Json
          company_builder_blueprint_id: string
          company_builder_run_id: string
          created_at?: string
          economic_constraints_reference?: Json
          id?: string
          metadata?: Json
          mvp_reference?: Json
          organization_id: string
          package_version?: number
          readiness_report?: Json
          simulation_only?: boolean
          source_lineage?: Json
          status?: string
          technical_architecture_reference?: Json
          verification_requirements?: Json
        }
        Update: {
          blocked_reasons?: Json
          build_graph_reference?: Json
          company_builder_blueprint_id?: string
          company_builder_run_id?: string
          created_at?: string
          economic_constraints_reference?: Json
          id?: string
          metadata?: Json
          mvp_reference?: Json
          organization_id?: string
          package_version?: number
          readiness_report?: Json
          simulation_only?: boolean
          source_lineage?: Json
          status?: string
          technical_architecture_reference?: Json
          verification_requirements?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_builder_packages_company_builder_blueprint_id_fkey"
            columns: ["company_builder_blueprint_id"]
            isOneToOne: false
            referencedRelation: "company_builder_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_packages_company_builder_run_id_fkey"
            columns: ["company_builder_run_id"]
            isOneToOne: false
            referencedRelation: "company_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_builder_runs: {
        Row: {
          blocked_packages: number
          blueprint_version: string
          blueprints_created: number
          build_packages_created: number
          builder_report: Json
          completed_at: string | null
          correlation_id: string
          created_at: string
          discovery_run_id: string | null
          engine_version: string
          error_message: string | null
          estimated_cost_usd: number | null
          failed_at: string | null
          failure_classification: string | null
          id: string
          idempotency_key: string
          input_mode: string
          monetization_run_id: string | null
          opportunity_candidate_id: string | null
          organization_id: string
          ready_packages: number
          simulation_only: boolean
          source_lineage: Json
          started_at: string | null
          status: string
          token_usage: Json
          venture_selection_handoff_id: string | null
          venture_selection_run_id: string | null
        }
        Insert: {
          blocked_packages?: number
          blueprint_version?: string
          blueprints_created?: number
          build_packages_created?: number
          builder_report?: Json
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          discovery_run_id?: string | null
          engine_version?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key: string
          input_mode?: string
          monetization_run_id?: string | null
          opportunity_candidate_id?: string | null
          organization_id: string
          ready_packages?: number
          simulation_only?: boolean
          source_lineage?: Json
          started_at?: string | null
          status?: string
          token_usage?: Json
          venture_selection_handoff_id?: string | null
          venture_selection_run_id?: string | null
        }
        Update: {
          blocked_packages?: number
          blueprint_version?: string
          blueprints_created?: number
          build_packages_created?: number
          builder_report?: Json
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          discovery_run_id?: string | null
          engine_version?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key?: string
          input_mode?: string
          monetization_run_id?: string | null
          opportunity_candidate_id?: string | null
          organization_id?: string
          ready_packages?: number
          simulation_only?: boolean
          source_lineage?: Json
          started_at?: string | null
          status?: string
          token_usage?: Json
          venture_selection_handoff_id?: string | null
          venture_selection_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_builder_runs_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "opportunity_discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_runs_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_runs_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_runs_venture_selection_handoff_id_fkey"
            columns: ["venture_selection_handoff_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_handovers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_builder_runs_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media_assets: {
        Row: {
          actual_cost: number | null
          asset_id: string
          asset_payload: Json
          build_package_id: string | null
          checksum: string | null
          created_at: string
          creative_brief_id: string | null
          creative_media_run_id: string
          duration_sec: number | null
          estimated_cost: number | null
          file_path: string
          file_size_bytes: number | null
          generation_task_id: string | null
          height: number | null
          id: string
          media_type: string
          mime_type: string
          model: string | null
          organization_id: string
          production_status: string
          provider: string | null
          provider_job_id: string | null
          quality_status: string
          routing_decision_id: string | null
          usage_rights: string
          width: number | null
        }
        Insert: {
          actual_cost?: number | null
          asset_id: string
          asset_payload?: Json
          build_package_id?: string | null
          checksum?: string | null
          created_at?: string
          creative_brief_id?: string | null
          creative_media_run_id: string
          duration_sec?: number | null
          estimated_cost?: number | null
          file_path: string
          file_size_bytes?: number | null
          generation_task_id?: string | null
          height?: number | null
          id?: string
          media_type: string
          mime_type: string
          model?: string | null
          organization_id: string
          production_status?: string
          provider?: string | null
          provider_job_id?: string | null
          quality_status?: string
          routing_decision_id?: string | null
          usage_rights?: string
          width?: number | null
        }
        Update: {
          actual_cost?: number | null
          asset_id?: string
          asset_payload?: Json
          build_package_id?: string | null
          checksum?: string | null
          created_at?: string
          creative_brief_id?: string | null
          creative_media_run_id?: string
          duration_sec?: number | null
          estimated_cost?: number | null
          file_path?: string
          file_size_bytes?: number | null
          generation_task_id?: string | null
          height?: number | null
          id?: string
          media_type?: string
          mime_type?: string
          model?: string | null
          organization_id?: string
          production_status?: string
          provider?: string | null
          provider_job_id?: string | null
          quality_status?: string
          routing_decision_id?: string | null
          usage_rights?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_assets_build_package_id_fkey"
            columns: ["build_package_id"]
            isOneToOne: false
            referencedRelation: "creative_media_build_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_assets_creative_media_run_id_fkey"
            columns: ["creative_media_run_id"]
            isOneToOne: false
            referencedRelation: "creative_media_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media_build_packages: {
        Row: {
          assets_generated: number
          blocked_reasons: Json
          build_package: Json
          created_at: string
          creative_media_run_id: string
          id: string
          organization_id: string
          package_version: string
          production_ready_count: number
          source_lineage: Json
          status: string
          venture_id: string
        }
        Insert: {
          assets_generated?: number
          blocked_reasons?: Json
          build_package?: Json
          created_at?: string
          creative_media_run_id: string
          id?: string
          organization_id: string
          package_version?: string
          production_ready_count?: number
          source_lineage?: Json
          status?: string
          venture_id: string
        }
        Update: {
          assets_generated?: number
          blocked_reasons?: Json
          build_package?: Json
          created_at?: string
          creative_media_run_id?: string
          id?: string
          organization_id?: string
          package_version?: string
          production_ready_count?: number
          source_lineage?: Json
          status?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_build_packages_creative_media_run_id_fkey"
            columns: ["creative_media_run_id"]
            isOneToOne: false
            referencedRelation: "creative_media_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_build_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media_cost_records: {
        Row: {
          actual_cost_usd: number | null
          asset_id: string | null
          build_package_id: string | null
          created_at: string
          creative_media_run_id: string
          estimated_cost_usd: number | null
          id: string
          job_id: string | null
          model: string
          organization_id: string
          provider: string
          record_id: string
          task_id: string | null
          usage_source: string
        }
        Insert: {
          actual_cost_usd?: number | null
          asset_id?: string | null
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id: string
          estimated_cost_usd?: number | null
          id?: string
          job_id?: string | null
          model: string
          organization_id: string
          provider: string
          record_id: string
          task_id?: string | null
          usage_source?: string
        }
        Update: {
          actual_cost_usd?: number | null
          asset_id?: string | null
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id?: string
          estimated_cost_usd?: number | null
          id?: string
          job_id?: string | null
          model?: string
          organization_id?: string
          provider?: string
          record_id?: string
          task_id?: string | null
          usage_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_cost_records_build_package_id_fkey"
            columns: ["build_package_id"]
            isOneToOne: false
            referencedRelation: "creative_media_build_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_cost_records_creative_media_run_id_fkey"
            columns: ["creative_media_run_id"]
            isOneToOne: false
            referencedRelation: "creative_media_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_cost_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media_generation_jobs: {
        Row: {
          actual_cost: number | null
          build_package_id: string | null
          created_at: string
          creative_media_run_id: string
          estimated_cost: number | null
          id: string
          job_id: string
          job_payload: Json
          model: string
          organization_id: string
          provider: string
          provider_job_id: string | null
          status: string
          task_id: string
        }
        Insert: {
          actual_cost?: number | null
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id: string
          estimated_cost?: number | null
          id?: string
          job_id: string
          job_payload?: Json
          model: string
          organization_id: string
          provider: string
          provider_job_id?: string | null
          status: string
          task_id: string
        }
        Update: {
          actual_cost?: number | null
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id?: string
          estimated_cost?: number | null
          id?: string
          job_id?: string
          job_payload?: Json
          model?: string
          organization_id?: string
          provider?: string
          provider_job_id?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_generation_jobs_build_package_id_fkey"
            columns: ["build_package_id"]
            isOneToOne: false
            referencedRelation: "creative_media_build_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_generation_jobs_creative_media_run_id_fkey"
            columns: ["creative_media_run_id"]
            isOneToOne: false
            referencedRelation: "creative_media_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_generation_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media_production_artifacts: {
        Row: {
          artifact_id: string
          artifact_payload: Json
          asset_ids: Json
          brief_id: string
          build_package_id: string | null
          created_at: string
          creative_media_run_id: string
          id: string
          media_type: string
          organization_id: string
          quality_review_id: string | null
          status: string
          unresolved_critical_count: number
          unresolved_high_count: number
          venture_id: string
        }
        Insert: {
          artifact_id: string
          artifact_payload?: Json
          asset_ids?: Json
          brief_id: string
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id: string
          id?: string
          media_type: string
          organization_id: string
          quality_review_id?: string | null
          status: string
          unresolved_critical_count?: number
          unresolved_high_count?: number
          venture_id: string
        }
        Update: {
          artifact_id?: string
          artifact_payload?: Json
          asset_ids?: Json
          brief_id?: string
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id?: string
          id?: string
          media_type?: string
          organization_id?: string
          quality_review_id?: string | null
          status?: string
          unresolved_critical_count?: number
          unresolved_high_count?: number
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_production_artifacts_build_package_id_fkey"
            columns: ["build_package_id"]
            isOneToOne: false
            referencedRelation: "creative_media_build_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_production_artifacts_creative_media_run_id_fkey"
            columns: ["creative_media_run_id"]
            isOneToOne: false
            referencedRelation: "creative_media_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_production_artifacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media_quality_reviews: {
        Row: {
          asset_id: string
          build_package_id: string | null
          created_at: string
          creative_media_run_id: string
          findings: Json
          gate_scores: Json
          id: string
          organization_id: string
          outcome: string
          review_id: string
        }
        Insert: {
          asset_id: string
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id: string
          findings?: Json
          gate_scores?: Json
          id?: string
          organization_id: string
          outcome: string
          review_id: string
        }
        Update: {
          asset_id?: string
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id?: string
          findings?: Json
          gate_scores?: Json
          id?: string
          organization_id?: string
          outcome?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_quality_reviews_build_package_id_fkey"
            columns: ["build_package_id"]
            isOneToOne: false
            referencedRelation: "creative_media_build_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_quality_reviews_creative_media_run_id_fkey"
            columns: ["creative_media_run_id"]
            isOneToOne: false
            referencedRelation: "creative_media_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_quality_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media_runs: {
        Row: {
          build_packages_created: number
          capability_test: boolean
          completed_at: string | null
          correlation_id: string
          created_at: string
          engine_report: Json
          engine_version: string
          error_message: string | null
          failed_at: string | null
          failure_classification: string | null
          id: string
          idempotency_key: string
          organization_id: string
          simulation_only: boolean
          source_lineage: Json
          started_at: string | null
          status: string
        }
        Insert: {
          build_packages_created?: number
          capability_test?: boolean
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          engine_report?: Json
          engine_version?: string
          error_message?: string | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          simulation_only?: boolean
          source_lineage?: Json
          started_at?: string | null
          status?: string
        }
        Update: {
          build_packages_created?: number
          capability_test?: boolean
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          engine_report?: Json
          engine_version?: string
          error_message?: string | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          simulation_only?: boolean
          source_lineage?: Json
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media_traceability_links: {
        Row: {
          build_package_id: string | null
          created_at: string
          creative_media_run_id: string
          id: string
          link_type: string
          organization_id: string
          source_ref: string
          target_ref: string
        }
        Insert: {
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id: string
          id?: string
          link_type: string
          organization_id: string
          source_ref: string
          target_ref: string
        }
        Update: {
          build_package_id?: string | null
          created_at?: string
          creative_media_run_id?: string
          id?: string
          link_type?: string
          organization_id?: string
          source_ref?: string
          target_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_traceability_links_build_package_id_fkey"
            columns: ["build_package_id"]
            isOneToOne: false
            referencedRelation: "creative_media_build_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_traceability_links_creative_media_run_id_fkey"
            columns: ["creative_media_run_id"]
            isOneToOne: false
            referencedRelation: "creative_media_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_media_traceability_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      executive_contexts: {
        Row: {
          completed_at: string | null
          context_hash: string
          context_manifest: Json
          context_version: number
          correlation_id: string | null
          created_at: string
          decision_thresholds: Json
          error: Json
          escalation_thresholds: Json
          failed_at: string | null
          id: string
          idempotency_key: string
          mission_id: string
          objective: string | null
          opportunity_ids: string[]
          organization_id: string
          policy_version: string
          portfolio_strategy: string | null
          resource_constraints: Json
          risk_constraints: Json
          runtime_instance_id: string
          scoring_model_key: string
          scoring_model_version: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          context_hash: string
          context_manifest?: Json
          context_version?: number
          correlation_id?: string | null
          created_at?: string
          decision_thresholds?: Json
          error?: Json
          escalation_thresholds?: Json
          failed_at?: string | null
          id?: string
          idempotency_key: string
          mission_id: string
          objective?: string | null
          opportunity_ids?: string[]
          organization_id: string
          policy_version?: string
          portfolio_strategy?: string | null
          resource_constraints?: Json
          risk_constraints?: Json
          runtime_instance_id: string
          scoring_model_key?: string
          scoring_model_version?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          context_hash?: string
          context_manifest?: Json
          context_version?: number
          correlation_id?: string | null
          created_at?: string
          decision_thresholds?: Json
          error?: Json
          escalation_thresholds?: Json
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          mission_id?: string
          objective?: string | null
          opportunity_ids?: string[]
          organization_id?: string
          policy_version?: string
          portfolio_strategy?: string | null
          resource_constraints?: Json
          risk_constraints?: Json
          runtime_instance_id?: string
          scoring_model_key?: string
          scoring_model_version?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_contexts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_contexts_organization_id_fkey"
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
      executive_selection_decisions: {
        Row: {
          adjusted_score: number
          ai_advisory_reference_ids: string[]
          blockers: Json
          confidence: number
          constraint_results: Json
          context_hash: string
          created_at: string
          decision: string
          decision_model_key: string
          decision_model_version: string
          deterministic_score: number
          escalation_reasons: Json
          executive_context_id: string
          finalized_at: string | null
          id: string
          idempotency_key: string
          missing_information: Json
          mission_id: string
          opportunity_id: string | null
          organization_id: string
          planning_eligible: boolean
          policy_results: Json
          policy_version: string
          rank: number
          rationale_summary: string
          reasoning_session_ids: string[]
          reversible: boolean
          review_status: string
          risks: Json
          runtime_instance_id: string
          status: string
          supersedes_decision_id: string | null
          supporting_evidence_reference_ids: string[]
          threshold_results: Json
          validation_run_id: string | null
        }
        Insert: {
          adjusted_score?: number
          ai_advisory_reference_ids?: string[]
          blockers?: Json
          confidence?: number
          constraint_results?: Json
          context_hash: string
          created_at?: string
          decision: string
          decision_model_key?: string
          decision_model_version?: string
          deterministic_score?: number
          escalation_reasons?: Json
          executive_context_id: string
          finalized_at?: string | null
          id?: string
          idempotency_key: string
          missing_information?: Json
          mission_id: string
          opportunity_id?: string | null
          organization_id: string
          planning_eligible?: boolean
          policy_results?: Json
          policy_version?: string
          rank?: number
          rationale_summary?: string
          reasoning_session_ids?: string[]
          reversible?: boolean
          review_status?: string
          risks?: Json
          runtime_instance_id: string
          status?: string
          supersedes_decision_id?: string | null
          supporting_evidence_reference_ids?: string[]
          threshold_results?: Json
          validation_run_id?: string | null
        }
        Update: {
          adjusted_score?: number
          ai_advisory_reference_ids?: string[]
          blockers?: Json
          confidence?: number
          constraint_results?: Json
          context_hash?: string
          created_at?: string
          decision?: string
          decision_model_key?: string
          decision_model_version?: string
          deterministic_score?: number
          escalation_reasons?: Json
          executive_context_id?: string
          finalized_at?: string | null
          id?: string
          idempotency_key?: string
          missing_information?: Json
          mission_id?: string
          opportunity_id?: string | null
          organization_id?: string
          planning_eligible?: boolean
          policy_results?: Json
          policy_version?: string
          rank?: number
          rationale_summary?: string
          reasoning_session_ids?: string[]
          reversible?: boolean
          review_status?: string
          risks?: Json
          runtime_instance_id?: string
          status?: string
          supersedes_decision_id?: string | null
          supporting_evidence_reference_ids?: string[]
          threshold_results?: Json
          validation_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_selection_decisions_executive_context_id_fkey"
            columns: ["executive_context_id"]
            isOneToOne: false
            referencedRelation: "executive_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_selection_decisions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_selection_decisions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_selection_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_selection_decisions_supersedes_decision_id_fkey"
            columns: ["supersedes_decision_id"]
            isOneToOne: false
            referencedRelation: "executive_selection_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_selection_decisions_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      external_action_approvals: {
        Row: {
          approval_kind: string
          approver_reference: string | null
          artifact_evaluation: Json | null
          authorization_source: string | null
          authorized_at: string | null
          capability_evaluation: Json | null
          correlation_id: string | null
          cost_evaluation: Json | null
          created_at: string
          credential_evaluation: Json | null
          decided_at: string | null
          decision_reason: Json
          expires_at: string | null
          external_action_id: string
          id: string
          idempotency_key: string | null
          invalidated_at: string | null
          launch_plan_id: string | null
          max_authorized_cost: number | null
          organization_id: string
          payload_hash: string | null
          policy_decision: string | null
          policy_key: string | null
          policy_version: string | null
          provider: string | null
          reason: string | null
          risk_class: string | null
          side_effect_class: string | null
          status: string
          venture_id: string | null
        }
        Insert: {
          approval_kind: string
          approver_reference?: string | null
          artifact_evaluation?: Json | null
          authorization_source?: string | null
          authorized_at?: string | null
          capability_evaluation?: Json | null
          correlation_id?: string | null
          cost_evaluation?: Json | null
          created_at?: string
          credential_evaluation?: Json | null
          decided_at?: string | null
          decision_reason?: Json
          expires_at?: string | null
          external_action_id: string
          id?: string
          idempotency_key?: string | null
          invalidated_at?: string | null
          launch_plan_id?: string | null
          max_authorized_cost?: number | null
          organization_id: string
          payload_hash?: string | null
          policy_decision?: string | null
          policy_key?: string | null
          policy_version?: string | null
          provider?: string | null
          reason?: string | null
          risk_class?: string | null
          side_effect_class?: string | null
          status?: string
          venture_id?: string | null
        }
        Update: {
          approval_kind?: string
          approver_reference?: string | null
          artifact_evaluation?: Json | null
          authorization_source?: string | null
          authorized_at?: string | null
          capability_evaluation?: Json | null
          correlation_id?: string | null
          cost_evaluation?: Json | null
          created_at?: string
          credential_evaluation?: Json | null
          decided_at?: string | null
          decision_reason?: Json
          expires_at?: string | null
          external_action_id?: string
          id?: string
          idempotency_key?: string | null
          invalidated_at?: string | null
          launch_plan_id?: string | null
          max_authorized_cost?: number | null
          organization_id?: string
          payload_hash?: string | null
          policy_decision?: string | null
          policy_key?: string | null
          policy_version?: string | null
          provider?: string | null
          reason?: string | null
          risk_class?: string | null
          side_effect_class?: string | null
          status?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_action_approvals_external_action_id_fkey"
            columns: ["external_action_id"]
            isOneToOne: false
            referencedRelation: "external_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_action_approvals_launch_plan_id_fkey"
            columns: ["launch_plan_id"]
            isOneToOne: false
            referencedRelation: "launch_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_action_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_action_approvals_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_actions: {
        Row: {
          action_type: string
          active_authorization_id: string | null
          adapter_key: string
          approval_policy: string
          approval_status: string
          approved_at: string | null
          approved_payload_hash: string | null
          audit_snapshot: Json
          authorization_source: string | null
          build_id: string | null
          build_snapshot_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          correlation_id: string | null
          cost_confidence: string
          created_at: string
          credential_requirement: Json
          credential_status: string
          currency: string
          depends_on_action_id: string | null
          error: string | null
          estimated_cost: number
          executed_at: string | null
          execution_mode: string
          execution_status: string
          failed_at: string | null
          http_verification_status: string | null
          id: string
          idempotency_key: string
          launch_plan_id: string | null
          launch_stage: string | null
          mission_id: string
          opportunity_id: string | null
          organization_id: string
          payload_manifest: Json
          plan_execution_id: string | null
          policy_version: string
          production_artifact_id: string | null
          provider: string
          provider_execution_mode: string | null
          provider_lifecycle_state: string | null
          requested_at: string
          requested_by_worker_result_id: string | null
          result_manifest: Json | null
          risk_class: string
          rollback_supported: boolean
          rolled_back_at: string | null
          sequence_order: number
          side_effect_class: string
          target: string
          updated_at: string
          venture_assembly_id: string | null
          venture_id: string | null
          verification_status: string | null
          verified_url: string | null
        }
        Insert: {
          action_type: string
          active_authorization_id?: string | null
          adapter_key?: string
          approval_policy?: string
          approval_status?: string
          approved_at?: string | null
          approved_payload_hash?: string | null
          audit_snapshot?: Json
          authorization_source?: string | null
          build_id?: string | null
          build_snapshot_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          correlation_id?: string | null
          cost_confidence?: string
          created_at?: string
          credential_requirement?: Json
          credential_status?: string
          currency?: string
          depends_on_action_id?: string | null
          error?: string | null
          estimated_cost?: number
          executed_at?: string | null
          execution_mode?: string
          execution_status?: string
          failed_at?: string | null
          http_verification_status?: string | null
          id?: string
          idempotency_key: string
          launch_plan_id?: string | null
          launch_stage?: string | null
          mission_id: string
          opportunity_id?: string | null
          organization_id: string
          payload_manifest?: Json
          plan_execution_id?: string | null
          policy_version?: string
          production_artifact_id?: string | null
          provider?: string
          provider_execution_mode?: string | null
          provider_lifecycle_state?: string | null
          requested_at?: string
          requested_by_worker_result_id?: string | null
          result_manifest?: Json | null
          risk_class: string
          rollback_supported?: boolean
          rolled_back_at?: string | null
          sequence_order?: number
          side_effect_class: string
          target: string
          updated_at?: string
          venture_assembly_id?: string | null
          venture_id?: string | null
          verification_status?: string | null
          verified_url?: string | null
        }
        Update: {
          action_type?: string
          active_authorization_id?: string | null
          adapter_key?: string
          approval_policy?: string
          approval_status?: string
          approved_at?: string | null
          approved_payload_hash?: string | null
          audit_snapshot?: Json
          authorization_source?: string | null
          build_id?: string | null
          build_snapshot_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          correlation_id?: string | null
          cost_confidence?: string
          created_at?: string
          credential_requirement?: Json
          credential_status?: string
          currency?: string
          depends_on_action_id?: string | null
          error?: string | null
          estimated_cost?: number
          executed_at?: string | null
          execution_mode?: string
          execution_status?: string
          failed_at?: string | null
          http_verification_status?: string | null
          id?: string
          idempotency_key?: string
          launch_plan_id?: string | null
          launch_stage?: string | null
          mission_id?: string
          opportunity_id?: string | null
          organization_id?: string
          payload_manifest?: Json
          plan_execution_id?: string | null
          policy_version?: string
          production_artifact_id?: string | null
          provider?: string
          provider_execution_mode?: string | null
          provider_lifecycle_state?: string | null
          requested_at?: string
          requested_by_worker_result_id?: string | null
          result_manifest?: Json | null
          risk_class?: string
          rollback_supported?: boolean
          rolled_back_at?: string | null
          sequence_order?: number
          side_effect_class?: string
          target?: string
          updated_at?: string
          venture_assembly_id?: string | null
          venture_id?: string | null
          verification_status?: string | null
          verified_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_actions_active_authorization_id_fkey"
            columns: ["active_authorization_id"]
            isOneToOne: false
            referencedRelation: "external_action_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_build_snapshot_id_fkey"
            columns: ["build_snapshot_id"]
            isOneToOne: false
            referencedRelation: "build_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_depends_on_action_id_fkey"
            columns: ["depends_on_action_id"]
            isOneToOne: false
            referencedRelation: "external_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_launch_plan_id_fkey"
            columns: ["launch_plan_id"]
            isOneToOne: false
            referencedRelation: "launch_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_plan_execution_id_fkey"
            columns: ["plan_execution_id"]
            isOneToOne: false
            referencedRelation: "plan_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_production_artifact_id_fkey"
            columns: ["production_artifact_id"]
            isOneToOne: false
            referencedRelation: "production_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_venture_assembly_id_fkey"
            columns: ["venture_assembly_id"]
            isOneToOne: false
            referencedRelation: "venture_assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actions_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_resources: {
        Row: {
          canonical_name: string
          created_at: string
          created_by_action_id: string
          environment: string
          execution_mode: string
          external_action_id: string
          external_url: string | null
          id: string
          idempotency_key: string
          last_reconciled_at: string | null
          launch_plan_id: string | null
          metadata: Json
          organization_id: string
          provider: string
          provider_resource_id: string
          reconciliation_state: string
          resource_type: string
          status: string
          updated_at: string
          venture_id: string | null
          verified_at: string | null
        }
        Insert: {
          canonical_name: string
          created_at?: string
          created_by_action_id: string
          environment?: string
          execution_mode?: string
          external_action_id: string
          external_url?: string | null
          id?: string
          idempotency_key: string
          last_reconciled_at?: string | null
          launch_plan_id?: string | null
          metadata?: Json
          organization_id: string
          provider: string
          provider_resource_id: string
          reconciliation_state?: string
          resource_type: string
          status?: string
          updated_at?: string
          venture_id?: string | null
          verified_at?: string | null
        }
        Update: {
          canonical_name?: string
          created_at?: string
          created_by_action_id?: string
          environment?: string
          execution_mode?: string
          external_action_id?: string
          external_url?: string | null
          id?: string
          idempotency_key?: string
          last_reconciled_at?: string | null
          launch_plan_id?: string | null
          metadata?: Json
          organization_id?: string
          provider?: string
          provider_resource_id?: string
          reconciliation_state?: string
          resource_type?: string
          status?: string
          updated_at?: string
          venture_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_resources_created_by_action_id_fkey"
            columns: ["created_by_action_id"]
            isOneToOne: false
            referencedRelation: "external_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_resources_external_action_id_fkey"
            columns: ["external_action_id"]
            isOneToOne: false
            referencedRelation: "external_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_resources_launch_plan_id_fkey"
            columns: ["launch_plan_id"]
            isOneToOne: false
            referencedRelation: "launch_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_resources_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      launch_handoff_links: {
        Row: {
          artifact_hash: string | null
          branch_name: string | null
          commit_sha: string | null
          created_at: string
          deployment_id: string | null
          deployment_url: string | null
          external_action_id: string | null
          id: string
          link_type: string
          metadata: Json
          organization_id: string
          production_artifact_id: string | null
          provider: string | null
          provider_resource_id: string | null
          repository_full_name: string | null
          venture_assembly_id: string
          vercel_project_id: string | null
        }
        Insert: {
          artifact_hash?: string | null
          branch_name?: string | null
          commit_sha?: string | null
          created_at?: string
          deployment_id?: string | null
          deployment_url?: string | null
          external_action_id?: string | null
          id?: string
          link_type: string
          metadata?: Json
          organization_id: string
          production_artifact_id?: string | null
          provider?: string | null
          provider_resource_id?: string | null
          repository_full_name?: string | null
          venture_assembly_id: string
          vercel_project_id?: string | null
        }
        Update: {
          artifact_hash?: string | null
          branch_name?: string | null
          commit_sha?: string | null
          created_at?: string
          deployment_id?: string | null
          deployment_url?: string | null
          external_action_id?: string | null
          id?: string
          link_type?: string
          metadata?: Json
          organization_id?: string
          production_artifact_id?: string | null
          provider?: string | null
          provider_resource_id?: string | null
          repository_full_name?: string | null
          venture_assembly_id?: string
          vercel_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_handoff_links_external_action_id_fkey"
            columns: ["external_action_id"]
            isOneToOne: false
            referencedRelation: "external_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_handoff_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_handoff_links_production_artifact_id_fkey"
            columns: ["production_artifact_id"]
            isOneToOne: false
            referencedRelation: "production_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_handoff_links_venture_assembly_id_fkey"
            columns: ["venture_assembly_id"]
            isOneToOne: false
            referencedRelation: "venture_assemblies"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_plans: {
        Row: {
          assembly_version: number
          company_id: string | null
          correlation_id: string | null
          created_at: string
          currency: string
          dependency_graph: Json
          estimated_total_cost: number
          id: string
          idempotency_key: string
          launch_readiness: string | null
          mission_id: string
          organization_id: string
          plan_version: number
          schema_version: string
          simulation_completed_at: string | null
          status: string
          superseded_by: string | null
          updated_at: string
          venture_assembly_id: string
        }
        Insert: {
          assembly_version?: number
          company_id?: string | null
          correlation_id?: string | null
          created_at?: string
          currency?: string
          dependency_graph?: Json
          estimated_total_cost?: number
          id?: string
          idempotency_key: string
          launch_readiness?: string | null
          mission_id: string
          organization_id: string
          plan_version?: number
          schema_version?: string
          simulation_completed_at?: string | null
          status?: string
          superseded_by?: string | null
          updated_at?: string
          venture_assembly_id: string
        }
        Update: {
          assembly_version?: number
          company_id?: string | null
          correlation_id?: string | null
          created_at?: string
          currency?: string
          dependency_graph?: Json
          estimated_total_cost?: number
          id?: string
          idempotency_key?: string
          launch_readiness?: string | null
          mission_id?: string
          organization_id?: string
          plan_version?: number
          schema_version?: string
          simulation_completed_at?: string | null
          status?: string
          superseded_by?: string | null
          updated_at?: string
          venture_assembly_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_plans_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_plans_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "launch_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_plans_venture_assembly_id_fkey"
            columns: ["venture_assembly_id"]
            isOneToOne: false
            referencedRelation: "venture_assemblies"
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
      monetization_assumptions: {
        Row: {
          assumption_category: string
          assumption_key: string
          assumption_value: string
          confidence: number | null
          created_at: string
          id: string
          metadata: Json
          monetization_plan_id: string
          monetization_run_id: string
          organization_id: string
          source_type: string
        }
        Insert: {
          assumption_category?: string
          assumption_key: string
          assumption_value: string
          confidence?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          monetization_plan_id: string
          monetization_run_id: string
          organization_id: string
          source_type?: string
        }
        Update: {
          assumption_category?: string
          assumption_key?: string
          assumption_value?: string
          confidence?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          monetization_plan_id?: string
          monetization_run_id?: string
          organization_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_assumptions_monetization_plan_id_fkey"
            columns: ["monetization_plan_id"]
            isOneToOne: false
            referencedRelation: "monetization_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_assumptions_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_assumptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_candidate_analyses: {
        Row: {
          combined_decision_score: number | null
          created_at: string
          discovery_run_id: string | null
          economic_viability: string
          estimated_startup_capital: number | null
          expected_revenue_mechanism: string | null
          expected_time_to_revenue: string | null
          id: string
          key_economic_assumptions: Json
          largest_economic_risks: Json
          metadata: Json
          monetization_run_id: string
          monetization_score: number | null
          opportunity_candidate_id: string
          opportunity_score: number | null
          organization_id: string
          primary_plan_id: string | null
          recommendation_confidence: number | null
          recommended_acquisition_strategy: string | null
          recommended_customer: string | null
          recommended_pricing_strategy: string | null
          recommended_primary_model: string | null
          recommended_secondary_models: Json
          research_run_ids: Json
        }
        Insert: {
          combined_decision_score?: number | null
          created_at?: string
          discovery_run_id?: string | null
          economic_viability: string
          estimated_startup_capital?: number | null
          expected_revenue_mechanism?: string | null
          expected_time_to_revenue?: string | null
          id?: string
          key_economic_assumptions?: Json
          largest_economic_risks?: Json
          metadata?: Json
          monetization_run_id: string
          monetization_score?: number | null
          opportunity_candidate_id: string
          opportunity_score?: number | null
          organization_id: string
          primary_plan_id?: string | null
          recommendation_confidence?: number | null
          recommended_acquisition_strategy?: string | null
          recommended_customer?: string | null
          recommended_pricing_strategy?: string | null
          recommended_primary_model?: string | null
          recommended_secondary_models?: Json
          research_run_ids?: Json
        }
        Update: {
          combined_decision_score?: number | null
          created_at?: string
          discovery_run_id?: string | null
          economic_viability?: string
          estimated_startup_capital?: number | null
          expected_revenue_mechanism?: string | null
          expected_time_to_revenue?: string | null
          id?: string
          key_economic_assumptions?: Json
          largest_economic_risks?: Json
          metadata?: Json
          monetization_run_id?: string
          monetization_score?: number | null
          opportunity_candidate_id?: string
          opportunity_score?: number | null
          organization_id?: string
          primary_plan_id?: string | null
          recommendation_confidence?: number | null
          recommended_acquisition_strategy?: string | null
          recommended_customer?: string | null
          recommended_pricing_strategy?: string | null
          recommended_primary_model?: string | null
          recommended_secondary_models?: Json
          research_run_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "monetization_candidate_analyses_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "opportunity_discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_candidate_analyses_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_candidate_analyses_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_candidate_analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_candidate_analyses_primary_plan_id_fkey"
            columns: ["primary_plan_id"]
            isOneToOne: false
            referencedRelation: "monetization_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_evidence: {
        Row: {
          claim: string | null
          created_at: string
          evidence_type: string
          extracted_data: Json
          grounded: boolean
          id: string
          metadata: Json
          monetization_plan_id: string | null
          monetization_run_id: string
          opportunity_candidate_id: string | null
          organization_id: string
          research_run_id: string | null
          source_domain: string | null
          source_title: string | null
          source_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          claim?: string | null
          created_at?: string
          evidence_type: string
          extracted_data?: Json
          grounded?: boolean
          id?: string
          metadata?: Json
          monetization_plan_id?: string | null
          monetization_run_id: string
          opportunity_candidate_id?: string | null
          organization_id: string
          research_run_id?: string | null
          source_domain?: string | null
          source_title?: string | null
          source_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          claim?: string | null
          created_at?: string
          evidence_type?: string
          extracted_data?: Json
          grounded?: boolean
          id?: string
          metadata?: Json
          monetization_plan_id?: string | null
          monetization_run_id?: string
          opportunity_candidate_id?: string | null
          organization_id?: string
          research_run_id?: string | null
          source_domain?: string | null
          source_title?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_evidence_monetization_plan_id_fkey"
            columns: ["monetization_plan_id"]
            isOneToOne: false
            referencedRelation: "monetization_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_evidence_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_evidence_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_evidence_research_run_id_fkey"
            columns: ["research_run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_plan_scores: {
        Row: {
          automation_potential_score: number | null
          capital_efficiency_score: number | null
          competition_score: number | null
          created_at: string
          customer_acquisition_feasibility_score: number | null
          evidence_confidence_score: number | null
          id: string
          margin_potential_score: number | null
          monetization_plan_id: string
          monetization_run_id: string
          monetization_score: number
          operational_complexity_score: number | null
          organization_id: string
          platform_dependency_score: number | null
          recurring_revenue_potential_score: number | null
          revenue_potential_score: number | null
          scalability_score: number | null
          scoring_inputs: Json
          scoring_version: string
          speed_to_revenue_score: number | null
          technical_complexity_score: number | null
          weighted_breakdown: Json
        }
        Insert: {
          automation_potential_score?: number | null
          capital_efficiency_score?: number | null
          competition_score?: number | null
          created_at?: string
          customer_acquisition_feasibility_score?: number | null
          evidence_confidence_score?: number | null
          id?: string
          margin_potential_score?: number | null
          monetization_plan_id: string
          monetization_run_id: string
          monetization_score: number
          operational_complexity_score?: number | null
          organization_id: string
          platform_dependency_score?: number | null
          recurring_revenue_potential_score?: number | null
          revenue_potential_score?: number | null
          scalability_score?: number | null
          scoring_inputs?: Json
          scoring_version: string
          speed_to_revenue_score?: number | null
          technical_complexity_score?: number | null
          weighted_breakdown?: Json
        }
        Update: {
          automation_potential_score?: number | null
          capital_efficiency_score?: number | null
          competition_score?: number | null
          created_at?: string
          customer_acquisition_feasibility_score?: number | null
          evidence_confidence_score?: number | null
          id?: string
          margin_potential_score?: number | null
          monetization_plan_id?: string
          monetization_run_id?: string
          monetization_score?: number
          operational_complexity_score?: number | null
          organization_id?: string
          platform_dependency_score?: number | null
          recurring_revenue_potential_score?: number | null
          revenue_potential_score?: number | null
          scalability_score?: number | null
          scoring_inputs?: Json
          scoring_version?: string
          speed_to_revenue_score?: number | null
          technical_complexity_score?: number | null
          weighted_breakdown?: Json
        }
        Relationships: [
          {
            foreignKeyName: "monetization_plan_scores_monetization_plan_id_fkey"
            columns: ["monetization_plan_id"]
            isOneToOne: false
            referencedRelation: "monetization_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_plan_scores_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_plan_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_plans: {
        Row: {
          automation_potential: number | null
          beneficiary: string | null
          billing_frequency: string | null
          break_even_customers: number | null
          contribution_margin_per_customer: number | null
          created_at: string
          customer_acquisition_difficulty: number | null
          customer_description: string | null
          customer_type: string | null
          discovery_run_id: string | null
          economics_derived: Json
          economics_inputs: Json
          estimated_cac: number | null
          estimated_capital_required: number | null
          estimated_customers_year1: number | null
          estimated_fixed_costs: number | null
          estimated_gross_margin_percent: number | null
          estimated_gross_revenue_year1: number | null
          estimated_ltv: number | null
          estimated_months_to_break_even: number | null
          estimated_months_to_first_revenue: number | null
          estimated_price_base: number | null
          estimated_price_high: number | null
          estimated_price_low: number | null
          estimated_revenue_per_customer: number | null
          estimated_variable_costs: number | null
          id: string
          key_assumptions: Json
          ltv_cac_ratio: number | null
          margin_score: number | null
          metadata: Json
          model_name: string
          model_type: string
          monetization_confidence: number | null
          monetization_run_id: string
          monetization_score: number | null
          offer_description: string | null
          operational_complexity: number | null
          opportunity_candidate_id: string
          organization_id: string
          payer: string | null
          plan_role: string
          platform_dependency_risk: number | null
          pricing_model: string | null
          purchase_trigger: string | null
          regulatory_risk: number | null
          research_run_ids: Json
          risks: Json
          scalability_score: number | null
          source_urls: Json
          speed_to_revenue_score: number | null
          technical_complexity: number | null
          updated_at: string
          value_proposition: string | null
        }
        Insert: {
          automation_potential?: number | null
          beneficiary?: string | null
          billing_frequency?: string | null
          break_even_customers?: number | null
          contribution_margin_per_customer?: number | null
          created_at?: string
          customer_acquisition_difficulty?: number | null
          customer_description?: string | null
          customer_type?: string | null
          discovery_run_id?: string | null
          economics_derived?: Json
          economics_inputs?: Json
          estimated_cac?: number | null
          estimated_capital_required?: number | null
          estimated_customers_year1?: number | null
          estimated_fixed_costs?: number | null
          estimated_gross_margin_percent?: number | null
          estimated_gross_revenue_year1?: number | null
          estimated_ltv?: number | null
          estimated_months_to_break_even?: number | null
          estimated_months_to_first_revenue?: number | null
          estimated_price_base?: number | null
          estimated_price_high?: number | null
          estimated_price_low?: number | null
          estimated_revenue_per_customer?: number | null
          estimated_variable_costs?: number | null
          id?: string
          key_assumptions?: Json
          ltv_cac_ratio?: number | null
          margin_score?: number | null
          metadata?: Json
          model_name: string
          model_type: string
          monetization_confidence?: number | null
          monetization_run_id: string
          monetization_score?: number | null
          offer_description?: string | null
          operational_complexity?: number | null
          opportunity_candidate_id: string
          organization_id: string
          payer?: string | null
          plan_role?: string
          platform_dependency_risk?: number | null
          pricing_model?: string | null
          purchase_trigger?: string | null
          regulatory_risk?: number | null
          research_run_ids?: Json
          risks?: Json
          scalability_score?: number | null
          source_urls?: Json
          speed_to_revenue_score?: number | null
          technical_complexity?: number | null
          updated_at?: string
          value_proposition?: string | null
        }
        Update: {
          automation_potential?: number | null
          beneficiary?: string | null
          billing_frequency?: string | null
          break_even_customers?: number | null
          contribution_margin_per_customer?: number | null
          created_at?: string
          customer_acquisition_difficulty?: number | null
          customer_description?: string | null
          customer_type?: string | null
          discovery_run_id?: string | null
          economics_derived?: Json
          economics_inputs?: Json
          estimated_cac?: number | null
          estimated_capital_required?: number | null
          estimated_customers_year1?: number | null
          estimated_fixed_costs?: number | null
          estimated_gross_margin_percent?: number | null
          estimated_gross_revenue_year1?: number | null
          estimated_ltv?: number | null
          estimated_months_to_break_even?: number | null
          estimated_months_to_first_revenue?: number | null
          estimated_price_base?: number | null
          estimated_price_high?: number | null
          estimated_price_low?: number | null
          estimated_revenue_per_customer?: number | null
          estimated_variable_costs?: number | null
          id?: string
          key_assumptions?: Json
          ltv_cac_ratio?: number | null
          margin_score?: number | null
          metadata?: Json
          model_name?: string
          model_type?: string
          monetization_confidence?: number | null
          monetization_run_id?: string
          monetization_score?: number | null
          offer_description?: string | null
          operational_complexity?: number | null
          opportunity_candidate_id?: string
          organization_id?: string
          payer?: string | null
          plan_role?: string
          platform_dependency_risk?: number | null
          pricing_model?: string | null
          purchase_trigger?: string | null
          regulatory_risk?: number | null
          research_run_ids?: Json
          risks?: Json
          scalability_score?: number | null
          source_urls?: Json
          speed_to_revenue_score?: number | null
          technical_complexity?: number | null
          updated_at?: string
          value_proposition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monetization_plans_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "opportunity_discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_plans_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_plans_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_revenue_streams: {
        Row: {
          automation_potential: number | null
          billing_frequency: string | null
          created_at: string
          description: string | null
          estimated_customers_year1: number | null
          estimated_price_base: number | null
          estimated_revenue_year1: number | null
          estimated_share_of_revenue_percent: number | null
          id: string
          metadata: Json
          model_type: string
          monetization_plan_id: string
          monetization_run_id: string
          organization_id: string
          payer: string | null
          pricing_model: string | null
          stream_name: string
          stream_role: string
        }
        Insert: {
          automation_potential?: number | null
          billing_frequency?: string | null
          created_at?: string
          description?: string | null
          estimated_customers_year1?: number | null
          estimated_price_base?: number | null
          estimated_revenue_year1?: number | null
          estimated_share_of_revenue_percent?: number | null
          id?: string
          metadata?: Json
          model_type: string
          monetization_plan_id: string
          monetization_run_id: string
          organization_id: string
          payer?: string | null
          pricing_model?: string | null
          stream_name: string
          stream_role?: string
        }
        Update: {
          automation_potential?: number | null
          billing_frequency?: string | null
          created_at?: string
          description?: string | null
          estimated_customers_year1?: number | null
          estimated_price_base?: number | null
          estimated_revenue_year1?: number | null
          estimated_share_of_revenue_percent?: number | null
          id?: string
          metadata?: Json
          model_type?: string
          monetization_plan_id?: string
          monetization_run_id?: string
          organization_id?: string
          payer?: string | null
          pricing_model?: string | null
          stream_name?: string
          stream_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_revenue_streams_monetization_plan_id_fkey"
            columns: ["monetization_plan_id"]
            isOneToOne: false
            referencedRelation: "monetization_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_revenue_streams_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_revenue_streams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_runs: {
        Row: {
          candidates_analyzed: number
          completed_at: string | null
          correlation_id: string
          cost_uncertainty: string | null
          created_at: string
          discovery_run_ids: Json
          engine_report: Json
          engine_version: string
          error_message: string | null
          estimated_cost_usd: number | null
          failed_at: string | null
          failure_classification: string | null
          grounding_usage: Json
          id: string
          idempotency_key: string
          opportunity_candidate_ids: Json
          organization_id: string
          plans_generated: number
          research_call_count: number
          research_run_ids: Json
          revenue_streams_generated: number
          scoring_version: string
          started_at: string | null
          status: string
          token_usage: Json
        }
        Insert: {
          candidates_analyzed?: number
          completed_at?: string | null
          correlation_id: string
          cost_uncertainty?: string | null
          created_at?: string
          discovery_run_ids?: Json
          engine_report?: Json
          engine_version?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          grounding_usage?: Json
          id?: string
          idempotency_key: string
          opportunity_candidate_ids?: Json
          organization_id: string
          plans_generated?: number
          research_call_count?: number
          research_run_ids?: Json
          revenue_streams_generated?: number
          scoring_version?: string
          started_at?: string | null
          status?: string
          token_usage?: Json
        }
        Update: {
          candidates_analyzed?: number
          completed_at?: string | null
          correlation_id?: string
          cost_uncertainty?: string | null
          created_at?: string
          discovery_run_ids?: Json
          engine_report?: Json
          engine_version?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          grounding_usage?: Json
          id?: string
          idempotency_key?: string
          opportunity_candidate_ids?: Json
          organization_id?: string
          plans_generated?: number
          research_call_count?: number
          research_run_ids?: Json
          revenue_streams_generated?: number
          scoring_version?: string
          started_at?: string | null
          status?: string
          token_usage?: Json
        }
        Relationships: [
          {
            foreignKeyName: "monetization_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_scenarios: {
        Row: {
          assumptions: Json
          created_at: string
          estimated_cost: number | null
          estimated_customers: number | null
          estimated_gross_profit: number | null
          estimated_revenue: number | null
          id: string
          metadata: Json
          milestone_month: number
          monetization_plan_id: string
          monetization_run_id: string
          organization_id: string
          scenario_type: string
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          estimated_cost?: number | null
          estimated_customers?: number | null
          estimated_gross_profit?: number | null
          estimated_revenue?: number | null
          id?: string
          metadata?: Json
          milestone_month: number
          monetization_plan_id: string
          monetization_run_id: string
          organization_id: string
          scenario_type: string
        }
        Update: {
          assumptions?: Json
          created_at?: string
          estimated_cost?: number | null
          estimated_customers?: number | null
          estimated_gross_profit?: number | null
          estimated_revenue?: number | null
          id?: string
          metadata?: Json
          milestone_month?: number
          monetization_plan_id?: string
          monetization_run_id?: string
          organization_id?: string
          scenario_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_scenarios_monetization_plan_id_fkey"
            columns: ["monetization_plan_id"]
            isOneToOne: false
            referencedRelation: "monetization_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_scenarios_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_validation_experiments: {
        Row: {
          created_at: string
          description: string | null
          estimated_cost_usd: number | null
          execution_status: string
          experiment_type: string
          id: string
          metadata: Json
          monetization_plan_id: string | null
          monetization_run_id: string
          opportunity_candidate_id: string
          organization_id: string
          priority: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_cost_usd?: number | null
          execution_status?: string
          experiment_type: string
          id?: string
          metadata?: Json
          monetization_plan_id?: string | null
          monetization_run_id: string
          opportunity_candidate_id: string
          organization_id: string
          priority?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_cost_usd?: number | null
          execution_status?: string
          experiment_type?: string
          id?: string
          metadata?: Json
          monetization_plan_id?: string | null
          monetization_run_id?: string
          opportunity_candidate_id?: string
          organization_id?: string
          priority?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_validation_experimen_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_validation_experiments_monetization_plan_id_fkey"
            columns: ["monetization_plan_id"]
            isOneToOne: false
            referencedRelation: "monetization_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_validation_experiments_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monetization_validation_experiments_organization_id_fkey"
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
      opportunity_candidate_evidence: {
        Row: {
          candidate_id: string
          claim: string | null
          created_at: string
          discovery_run_id: string
          extracted_data: Json
          grounded: boolean
          id: string
          metadata: Json
          organization_id: string
          provider_confidence: number | null
          research_run_id: string | null
          signal_category: string
          signal_type: string
          source_domain: string | null
          source_title: string | null
          source_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          candidate_id: string
          claim?: string | null
          created_at?: string
          discovery_run_id: string
          extracted_data?: Json
          grounded?: boolean
          id?: string
          metadata?: Json
          organization_id: string
          provider_confidence?: number | null
          research_run_id?: string | null
          signal_category: string
          signal_type: string
          source_domain?: string | null
          source_title?: string | null
          source_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          candidate_id?: string
          claim?: string | null
          created_at?: string
          discovery_run_id?: string
          extracted_data?: Json
          grounded?: boolean
          id?: string
          metadata?: Json
          organization_id?: string
          provider_confidence?: number | null
          research_run_id?: string | null
          signal_category?: string
          signal_type?: string
          source_domain?: string | null
          source_title?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_candidate_evidence_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidate_evidence_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "opportunity_discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidate_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidate_evidence_research_run_id_fkey"
            columns: ["research_run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_candidate_scores: {
        Row: {
          automation_score: number | null
          buildability_score: number | null
          candidate_id: string
          capital_efficiency_score: number | null
          competition_opportunity_score: number | null
          created_at: string
          demand_score: number | null
          discovery_run_id: string
          distribution_score: number | null
          evidence_confidence_score: number | null
          id: string
          market_growth_score: number | null
          monetization_potential_score: number | null
          opportunity_score: number
          organization_id: string
          scoring_inputs: Json
          scoring_version: string
          speed_to_revenue_score: number | null
          weighted_breakdown: Json
        }
        Insert: {
          automation_score?: number | null
          buildability_score?: number | null
          candidate_id: string
          capital_efficiency_score?: number | null
          competition_opportunity_score?: number | null
          created_at?: string
          demand_score?: number | null
          discovery_run_id: string
          distribution_score?: number | null
          evidence_confidence_score?: number | null
          id?: string
          market_growth_score?: number | null
          monetization_potential_score?: number | null
          opportunity_score: number
          organization_id: string
          scoring_inputs?: Json
          scoring_version: string
          speed_to_revenue_score?: number | null
          weighted_breakdown?: Json
        }
        Update: {
          automation_score?: number | null
          buildability_score?: number | null
          candidate_id?: string
          capital_efficiency_score?: number | null
          competition_opportunity_score?: number | null
          created_at?: string
          demand_score?: number | null
          discovery_run_id?: string
          distribution_score?: number | null
          evidence_confidence_score?: number | null
          id?: string
          market_growth_score?: number | null
          monetization_potential_score?: number | null
          opportunity_score?: number
          organization_id?: string
          scoring_inputs?: Json
          scoring_version?: string
          speed_to_revenue_score?: number | null
          weighted_breakdown?: Json
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_candidate_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidate_scores_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "opportunity_discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidate_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_candidates: {
        Row: {
          buildability_evidence: Json
          business_model_candidates: Json
          competition_evidence: Json
          created_at: string
          dedup_key: string
          demand_evidence: Json
          discovery_run_id: string
          discovery_strategies: Json
          distribution_evidence: Json
          id: string
          market: string | null
          market_evidence: Json
          merge_group_key: string | null
          metadata: Json
          monetization_evidence: Json
          opportunity_score: number | null
          organization_id: string
          problem: string | null
          rank_position: number | null
          research_run_ids: Json
          research_sources: Json
          revenue_mechanism_candidates: Json
          risks: Json
          summary: string
          target_customer: string | null
          title: string
          unknowns: Json
          updated_at: string
        }
        Insert: {
          buildability_evidence?: Json
          business_model_candidates?: Json
          competition_evidence?: Json
          created_at?: string
          dedup_key: string
          demand_evidence?: Json
          discovery_run_id: string
          discovery_strategies?: Json
          distribution_evidence?: Json
          id?: string
          market?: string | null
          market_evidence?: Json
          merge_group_key?: string | null
          metadata?: Json
          monetization_evidence?: Json
          opportunity_score?: number | null
          organization_id: string
          problem?: string | null
          rank_position?: number | null
          research_run_ids?: Json
          research_sources?: Json
          revenue_mechanism_candidates?: Json
          risks?: Json
          summary: string
          target_customer?: string | null
          title: string
          unknowns?: Json
          updated_at?: string
        }
        Update: {
          buildability_evidence?: Json
          business_model_candidates?: Json
          competition_evidence?: Json
          created_at?: string
          dedup_key?: string
          demand_evidence?: Json
          discovery_run_id?: string
          discovery_strategies?: Json
          distribution_evidence?: Json
          id?: string
          market?: string | null
          market_evidence?: Json
          merge_group_key?: string | null
          metadata?: Json
          monetization_evidence?: Json
          opportunity_score?: number | null
          organization_id?: string
          problem?: string | null
          rank_position?: number | null
          research_run_ids?: Json
          research_sources?: Json
          revenue_mechanism_candidates?: Json
          risks?: Json
          summary?: string
          target_customer?: string | null
          title?: string
          unknowns?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_candidates_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "opportunity_discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      opportunity_discovery_runs: {
        Row: {
          candidates_discovered: number
          candidates_merged: number
          candidates_persisted: number
          completed_at: string | null
          constraints: Json
          correlation_id: string
          cost_uncertainty: string | null
          created_at: string
          error_message: string | null
          estimated_cost_usd: number | null
          failed_at: string | null
          failure_classification: string | null
          grounding_usage: Json
          id: string
          idempotency_key: string
          organization_id: string
          research_call_count: number
          research_run_ids: Json
          scanner_report: Json
          scanner_version: string
          scoring_version: string
          search_scope: Json
          started_at: string | null
          status: string
          strategies: Json
          token_usage: Json
        }
        Insert: {
          candidates_discovered?: number
          candidates_merged?: number
          candidates_persisted?: number
          completed_at?: string | null
          constraints?: Json
          correlation_id: string
          cost_uncertainty?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          grounding_usage?: Json
          id?: string
          idempotency_key: string
          organization_id: string
          research_call_count?: number
          research_run_ids?: Json
          scanner_report?: Json
          scanner_version?: string
          scoring_version?: string
          search_scope?: Json
          started_at?: string | null
          status?: string
          strategies?: Json
          token_usage?: Json
        }
        Update: {
          candidates_discovered?: number
          candidates_merged?: number
          candidates_persisted?: number
          completed_at?: string | null
          constraints?: Json
          correlation_id?: string
          cost_uncertainty?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          grounding_usage?: Json
          id?: string
          idempotency_key?: string
          organization_id?: string
          research_call_count?: number
          research_run_ids?: Json
          scanner_report?: Json
          scanner_version?: string
          scoring_version?: string
          search_scope?: Json
          started_at?: string | null
          status?: string
          strategies?: Json
          token_usage?: Json
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_discovery_runs_organization_id_fkey"
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
      organic_growth_build_packages: {
        Row: {
          approved_page_count: number
          blocked_reasons: Json
          build_package: Json
          company_builder_blueprint_id: string | null
          company_builder_build_package_id: string | null
          created_at: string
          id: string
          organic_growth_run_id: string
          organization_id: string
          package_version: string
          source_lineage: Json
          status: string
          venture_id: string
        }
        Insert: {
          approved_page_count?: number
          blocked_reasons?: Json
          build_package?: Json
          company_builder_blueprint_id?: string | null
          company_builder_build_package_id?: string | null
          created_at?: string
          id?: string
          organic_growth_run_id: string
          organization_id: string
          package_version?: string
          source_lineage?: Json
          status?: string
          venture_id: string
        }
        Update: {
          approved_page_count?: number
          blocked_reasons?: Json
          build_package?: Json
          company_builder_blueprint_id?: string | null
          company_builder_build_package_id?: string | null
          created_at?: string
          id?: string
          organic_growth_run_id?: string
          organization_id?: string
          package_version?: string
          source_lineage?: Json
          status?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organic_growth_build_packages_organic_growth_run_id_fkey"
            columns: ["organic_growth_run_id"]
            isOneToOne: false
            referencedRelation: "organic_growth_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organic_growth_build_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organic_growth_runs: {
        Row: {
          build_packages_created: number
          capability_test: boolean
          completed_at: string | null
          correlation_id: string
          created_at: string
          engine_report: Json
          engine_version: string
          error_message: string | null
          failed_at: string | null
          failure_classification: string | null
          id: string
          idempotency_key: string
          organization_id: string
          simulation_only: boolean
          source_lineage: Json
          started_at: string | null
          status: string
        }
        Insert: {
          build_packages_created?: number
          capability_test?: boolean
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          engine_report?: Json
          engine_version?: string
          error_message?: string | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          simulation_only?: boolean
          source_lineage?: Json
          started_at?: string | null
          status?: string
        }
        Update: {
          build_packages_created?: number
          capability_test?: boolean
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          engine_report?: Json
          engine_version?: string
          error_message?: string | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          simulation_only?: boolean
          source_lineage?: Json
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organic_growth_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organic_human_contribution_requests: {
        Row: {
          contribution_class: string
          contribution_type: string
          contributor_reference: string | null
          created_at: string
          id: string
          organic_growth_build_package_id: string | null
          organic_growth_run_id: string
          organization_id: string
          page_opportunity_id: string
          provenance_reference: string | null
          publication_blocking: boolean
          purpose: string
          request_id: string
          request_payload: Json
          status: string
          supported_claims: Json
          updated_at: string
          venture_id: string
          verification_status: string | null
        }
        Insert: {
          contribution_class: string
          contribution_type: string
          contributor_reference?: string | null
          created_at?: string
          id?: string
          organic_growth_build_package_id?: string | null
          organic_growth_run_id: string
          organization_id: string
          page_opportunity_id: string
          provenance_reference?: string | null
          publication_blocking?: boolean
          purpose: string
          request_id: string
          request_payload?: Json
          status?: string
          supported_claims?: Json
          updated_at?: string
          venture_id: string
          verification_status?: string | null
        }
        Update: {
          contribution_class?: string
          contribution_type?: string
          contributor_reference?: string | null
          created_at?: string
          id?: string
          organic_growth_build_package_id?: string | null
          organic_growth_run_id?: string
          organization_id?: string
          page_opportunity_id?: string
          provenance_reference?: string | null
          publication_blocking?: boolean
          purpose?: string
          request_id?: string
          request_payload?: Json
          status?: string
          supported_claims?: Json
          updated_at?: string
          venture_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organic_human_contribution_re_organic_growth_build_package_fkey"
            columns: ["organic_growth_build_package_id"]
            isOneToOne: false
            referencedRelation: "organic_growth_build_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organic_human_contribution_requests_organic_growth_run_id_fkey"
            columns: ["organic_growth_run_id"]
            isOneToOne: false
            referencedRelation: "organic_growth_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organic_human_contribution_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_external_autonomy_policies: {
        Row: {
          allowed_action_types: Json
          allowed_providers: Json
          created_at: string
          external_autonomy_enabled: boolean
          human_approval_action_types: Json
          max_action_cost_usd: number
          max_auto_risk: string
          max_daily_cost_usd: number
          max_venture_cost_usd: number
          organization_id: string
          policy_version: string
          prohibited_action_types: Json
          updated_at: string
        }
        Insert: {
          allowed_action_types?: Json
          allowed_providers?: Json
          created_at?: string
          external_autonomy_enabled?: boolean
          human_approval_action_types?: Json
          max_action_cost_usd?: number
          max_auto_risk?: string
          max_daily_cost_usd?: number
          max_venture_cost_usd?: number
          organization_id: string
          policy_version?: string
          prohibited_action_types?: Json
          updated_at?: string
        }
        Update: {
          allowed_action_types?: Json
          allowed_providers?: Json
          created_at?: string
          external_autonomy_enabled?: boolean
          human_approval_action_types?: Json
          max_action_cost_usd?: number
          max_auto_risk?: string
          max_daily_cost_usd?: number
          max_venture_cost_usd?: number
          organization_id?: string
          policy_version?: string
          prohibited_action_types?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_external_autonomy_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
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
      plan_executions: {
        Row: {
          active_step_id: string | null
          allocation_proposal_id: string | null
          approved_capabilities: Json
          approved_cost: number
          blocked_step_ids: Json
          blocking_reason: string | null
          build_id: string | null
          build_job_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          completed_step_ids: Json
          correlation_id: string | null
          created_at: string
          current_phase: string
          estimated_cost: number
          executable_step_ids: Json
          execution_policy_version: string
          execution_version: number
          executive_decision_id: string
          failed_at: string | null
          failed_step_ids: Json
          id: string
          idempotency_key: string
          maximum_concurrency: number
          maximum_runtime_ms: number
          mission_id: string
          opportunity_id: string
          organization_id: string
          plan_id: string
          plan_version: number
          prohibited_capabilities: Json
          runtime_instance_id: string | null
          scheduler_policy_version: string
          started_at: string | null
          status: string
          updated_at: string
          venture_blueprint_id: string | null
        }
        Insert: {
          active_step_id?: string | null
          allocation_proposal_id?: string | null
          approved_capabilities?: Json
          approved_cost?: number
          blocked_step_ids?: Json
          blocking_reason?: string | null
          build_id?: string | null
          build_job_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          completed_step_ids?: Json
          correlation_id?: string | null
          created_at?: string
          current_phase?: string
          estimated_cost?: number
          executable_step_ids?: Json
          execution_policy_version?: string
          execution_version?: number
          executive_decision_id: string
          failed_at?: string | null
          failed_step_ids?: Json
          id?: string
          idempotency_key: string
          maximum_concurrency?: number
          maximum_runtime_ms?: number
          mission_id: string
          opportunity_id: string
          organization_id: string
          plan_id: string
          plan_version?: number
          prohibited_capabilities?: Json
          runtime_instance_id?: string | null
          scheduler_policy_version?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          venture_blueprint_id?: string | null
        }
        Update: {
          active_step_id?: string | null
          allocation_proposal_id?: string | null
          approved_capabilities?: Json
          approved_cost?: number
          blocked_step_ids?: Json
          blocking_reason?: string | null
          build_id?: string | null
          build_job_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          completed_step_ids?: Json
          correlation_id?: string | null
          created_at?: string
          current_phase?: string
          estimated_cost?: number
          executable_step_ids?: Json
          execution_policy_version?: string
          execution_version?: number
          executive_decision_id?: string
          failed_at?: string | null
          failed_step_ids?: Json
          id?: string
          idempotency_key?: string
          maximum_concurrency?: number
          maximum_runtime_ms?: number
          mission_id?: string
          opportunity_id?: string
          organization_id?: string
          plan_id?: string
          plan_version?: number
          prohibited_capabilities?: Json
          runtime_instance_id?: string | null
          scheduler_policy_version?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          venture_blueprint_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_executions_allocation_proposal_id_fkey"
            columns: ["allocation_proposal_id"]
            isOneToOne: false
            referencedRelation: "allocation_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_executions_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_executions_build_job_id_fkey"
            columns: ["build_job_id"]
            isOneToOne: false
            referencedRelation: "build_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_executions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_executions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_executions_runtime_instance_id_fkey"
            columns: ["runtime_instance_id"]
            isOneToOne: false
            referencedRelation: "mission_runtime_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_executions_venture_blueprint_id_fkey"
            columns: ["venture_blueprint_id"]
            isOneToOne: false
            referencedRelation: "venture_blueprints"
            referencedColumns: ["id"]
          },
        ]
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
      product_asset_build_intelligence_reports: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          product_asset_builder_run_id: string
          report: Json
          total_ai_cost_usd: number
          total_duration_ms: number
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          product_asset_builder_run_id: string
          report?: Json
          total_ai_cost_usd?: number
          total_duration_ms?: number
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          product_asset_builder_run_id?: string
          report?: Json
          total_ai_cost_usd?: number
          total_duration_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_build_intellige_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_build_intelligence_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_build_task_runs: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          dependencies: Json
          error_message: string | null
          id: string
          metadata: Json
          organization_id: string
          output_hash: string | null
          product_asset_builder_run_id: string
          started_at: string | null
          status: string
          task_id: string
          task_name: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          dependencies?: Json
          error_message?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          output_hash?: string | null
          product_asset_builder_run_id: string
          started_at?: string | null
          status?: string
          task_id: string
          task_name: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          dependencies?: Json
          error_message?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          output_hash?: string | null
          product_asset_builder_run_id?: string
          started_at?: string | null
          status?: string
          task_id?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_build_task_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_build_task_runs_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_build_workspaces: {
        Row: {
          build_package_id: string | null
          created_at: string
          id: string
          organization_id: string
          product_asset_builder_run_id: string
          state: Json
          venture_id: string | null
          workspace_reference: string
        }
        Insert: {
          build_package_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          product_asset_builder_run_id: string
          state?: Json
          venture_id?: string | null
          workspace_reference: string
        }
        Update: {
          build_package_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          product_asset_builder_run_id?: string
          state?: Json
          venture_id?: string | null
          workspace_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_build_workspace_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_build_workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_builder_runs: {
        Row: {
          build_graph_hash: string | null
          builder_report: Json
          company_builder_blueprint_id: string | null
          company_builder_package_id: string | null
          completed_at: string | null
          correlation_id: string
          created_at: string
          cumulative_cost_usd: number
          engine_version: string
          error_message: string | null
          failed_at: string | null
          failure_classification: string | null
          id: string
          idempotency_key: string
          organization_id: string
          simulation_only: boolean
          started_at: string | null
          status: string
          token_usage: Json
          workspace_reference: string | null
        }
        Insert: {
          build_graph_hash?: string | null
          builder_report?: Json
          company_builder_blueprint_id?: string | null
          company_builder_package_id?: string | null
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          cumulative_cost_usd?: number
          engine_version?: string
          error_message?: string | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          simulation_only?: boolean
          started_at?: string | null
          status?: string
          token_usage?: Json
          workspace_reference?: string | null
        }
        Update: {
          build_graph_hash?: string | null
          builder_report?: Json
          company_builder_blueprint_id?: string | null
          company_builder_package_id?: string | null
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          cumulative_cost_usd?: number
          engine_version?: string
          error_message?: string | null
          failed_at?: string | null
          failure_classification?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          simulation_only?: boolean
          started_at?: string | null
          status?: string
          token_usage?: Json
          workspace_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_builder_runs_company_builder_blueprint_id_fkey"
            columns: ["company_builder_blueprint_id"]
            isOneToOne: false
            referencedRelation: "company_builder_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_builder_runs_company_builder_package_id_fkey"
            columns: ["company_builder_package_id"]
            isOneToOne: false
            referencedRelation: "company_builder_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_builder_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_code_change_sets: {
        Row: {
          applied: boolean
          assumptions: Json
          changes: Json
          coding_task_id: string
          created_at: string
          dependency_changes: Json
          expected_behavior: Json
          id: string
          metadata: Json
          migration_changes: Json
          model_id: string
          organization_id: string
          product_asset_builder_run_id: string
          provider: string
          reasoning_summary: string | null
          tests_added: Json
          validation_passed: boolean
        }
        Insert: {
          applied?: boolean
          assumptions?: Json
          changes?: Json
          coding_task_id: string
          created_at?: string
          dependency_changes?: Json
          expected_behavior?: Json
          id?: string
          metadata?: Json
          migration_changes?: Json
          model_id: string
          organization_id: string
          product_asset_builder_run_id: string
          provider: string
          reasoning_summary?: string | null
          tests_added?: Json
          validation_passed?: boolean
        }
        Update: {
          applied?: boolean
          assumptions?: Json
          changes?: Json
          coding_task_id?: string
          created_at?: string
          dependency_changes?: Json
          expected_behavior?: Json
          id?: string
          metadata?: Json
          migration_changes?: Json
          model_id?: string
          organization_id?: string
          product_asset_builder_run_id?: string
          provider?: string
          reasoning_summary?: string | null
          tests_added?: Json
          validation_passed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_code_change_set_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_code_change_sets_coding_task_id_fkey"
            columns: ["coding_task_id"]
            isOneToOne: false
            referencedRelation: "product_asset_coding_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_code_change_sets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_coding_tasks: {
        Row: {
          acceptance_criteria: Json
          allowed_paths: Json
          completed_at: string | null
          complexity: string
          created_at: string
          dependencies: Json
          feature_contract_ids: Json
          forbidden_paths: Json
          id: string
          max_cost_usd: number | null
          max_files_changed: number
          max_tokens: number | null
          metadata: Json
          objective: string
          organization_id: string
          parent_task_id: string | null
          preferred_capabilities: Json
          product_asset_builder_run_id: string
          relevant_files: Json
          repository_context: Json
          requirements: Json
          retry_limit: number
          status: string
          task_type: string
          updated_at: string
          venture_id: string | null
        }
        Insert: {
          acceptance_criteria?: Json
          allowed_paths?: Json
          completed_at?: string | null
          complexity?: string
          created_at?: string
          dependencies?: Json
          feature_contract_ids?: Json
          forbidden_paths?: Json
          id?: string
          max_cost_usd?: number | null
          max_files_changed?: number
          max_tokens?: number | null
          metadata?: Json
          objective: string
          organization_id: string
          parent_task_id?: string | null
          preferred_capabilities?: Json
          product_asset_builder_run_id: string
          relevant_files?: Json
          repository_context?: Json
          requirements?: Json
          retry_limit?: number
          status?: string
          task_type: string
          updated_at?: string
          venture_id?: string | null
        }
        Update: {
          acceptance_criteria?: Json
          allowed_paths?: Json
          completed_at?: string | null
          complexity?: string
          created_at?: string
          dependencies?: Json
          feature_contract_ids?: Json
          forbidden_paths?: Json
          id?: string
          max_cost_usd?: number | null
          max_files_changed?: number
          max_tokens?: number | null
          metadata?: Json
          objective?: string
          organization_id?: string
          parent_task_id?: string | null
          preferred_capabilities?: Json
          product_asset_builder_run_id?: string
          relevant_files?: Json
          repository_context?: Json
          requirements?: Json
          retry_limit?: number
          status?: string
          task_type?: string
          updated_at?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_coding_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_coding_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "product_asset_coding_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_coding_tasks_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_cost_ledger: {
        Row: {
          created_at: string
          estimated_cost_usd: number
          id: string
          input_tokens: number
          metadata: Json
          model_id: string | null
          organization_id: string
          output_tokens: number
          product_asset_builder_run_id: string
          provider: string | null
          task_type: string | null
        }
        Insert: {
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          metadata?: Json
          model_id?: string | null
          organization_id: string
          output_tokens?: number
          product_asset_builder_run_id: string
          provider?: string | null
          task_type?: string | null
        }
        Update: {
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          metadata?: Json
          model_id?: string | null
          organization_id?: string
          output_tokens?: number
          product_asset_builder_run_id?: string
          provider?: string | null
          task_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_cost_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_cost_ledger_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_feature_contracts: {
        Row: {
          acceptance_criteria: Json
          business_purpose: string | null
          created_at: string
          dependencies: Json
          feature_id: string
          feature_name: string
          functional_requirements: Json
          id: string
          metadata: Json
          non_functional_requirements: Json
          organization_id: string
          product_asset_builder_run_id: string
          required_analytics_events: Json
          required_apis: Json
          required_data_entities: Json
          required_error_states: Json
          required_routes: Json
          required_tests: Json
          required_ui_states: Json
          revenue_relationship: string | null
          status: string
          updated_at: string
          user_roles: Json
        }
        Insert: {
          acceptance_criteria?: Json
          business_purpose?: string | null
          created_at?: string
          dependencies?: Json
          feature_id: string
          feature_name: string
          functional_requirements?: Json
          id?: string
          metadata?: Json
          non_functional_requirements?: Json
          organization_id: string
          product_asset_builder_run_id: string
          required_analytics_events?: Json
          required_apis?: Json
          required_data_entities?: Json
          required_error_states?: Json
          required_routes?: Json
          required_tests?: Json
          required_ui_states?: Json
          revenue_relationship?: string | null
          status?: string
          updated_at?: string
          user_roles?: Json
        }
        Update: {
          acceptance_criteria?: Json
          business_purpose?: string | null
          created_at?: string
          dependencies?: Json
          feature_id?: string
          feature_name?: string
          functional_requirements?: Json
          id?: string
          metadata?: Json
          non_functional_requirements?: Json
          organization_id?: string
          product_asset_builder_run_id?: string
          required_analytics_events?: Json
          required_apis?: Json
          required_data_entities?: Json
          required_error_states?: Json
          required_routes?: Json
          required_tests?: Json
          required_ui_states?: Json
          revenue_relationship?: string | null
          status?: string
          updated_at?: string
          user_roles?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_feature_contrac_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_feature_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_file_operations: {
        Row: {
          byte_size: number | null
          content_hash: string | null
          created_at: string
          id: string
          operation: string
          organization_id: string
          product_asset_builder_run_id: string
          relative_path: string
        }
        Insert: {
          byte_size?: number | null
          content_hash?: string | null
          created_at?: string
          id?: string
          operation: string
          organization_id: string
          product_asset_builder_run_id: string
          relative_path: string
        }
        Update: {
          byte_size?: number | null
          content_hash?: string | null
          created_at?: string
          id?: string
          operation?: string
          organization_id?: string
          product_asset_builder_run_id?: string
          relative_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_file_operations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_file_operations_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_production_artifacts: {
        Row: {
          artifact_manifest: Json
          build_cost_usd: number | null
          build_hash: string
          company_builder_package_id: string | null
          created_at: string
          database_manifest: Json
          dependency_manifest: Json
          deployment_prerequisites: Json | null
          feature_contract_coverage: Json | null
          file_count: number
          id: string
          known_limitations: Json | null
          monetization_manifest: Json
          organization_id: string
          product_asset_builder_run_id: string
          provider_provenance: Json | null
          review_verification: Json | null
          route_manifest: Json
          security_verification: Json | null
          source_manifest: Json
          status: string
          technology_manifest: Json
          test_coverage_summary: Json | null
          total_bytes: number
          validation_manifest: Json
          workspace_id: string | null
        }
        Insert: {
          artifact_manifest?: Json
          build_cost_usd?: number | null
          build_hash: string
          company_builder_package_id?: string | null
          created_at?: string
          database_manifest?: Json
          dependency_manifest?: Json
          deployment_prerequisites?: Json | null
          feature_contract_coverage?: Json | null
          file_count?: number
          id?: string
          known_limitations?: Json | null
          monetization_manifest?: Json
          organization_id: string
          product_asset_builder_run_id: string
          provider_provenance?: Json | null
          review_verification?: Json | null
          route_manifest?: Json
          security_verification?: Json | null
          source_manifest?: Json
          status?: string
          technology_manifest?: Json
          test_coverage_summary?: Json | null
          total_bytes?: number
          validation_manifest?: Json
          workspace_id?: string | null
        }
        Update: {
          artifact_manifest?: Json
          build_cost_usd?: number | null
          build_hash?: string
          company_builder_package_id?: string | null
          created_at?: string
          database_manifest?: Json
          dependency_manifest?: Json
          deployment_prerequisites?: Json | null
          feature_contract_coverage?: Json | null
          file_count?: number
          id?: string
          known_limitations?: Json | null
          monetization_manifest?: Json
          organization_id?: string
          product_asset_builder_run_id?: string
          provider_provenance?: Json | null
          review_verification?: Json | null
          route_manifest?: Json
          security_verification?: Json | null
          source_manifest?: Json
          status?: string
          technology_manifest?: Json
          test_coverage_summary?: Json | null
          total_bytes?: number
          validation_manifest?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_production_arti_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_production_artifacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_provider_calls: {
        Row: {
          cached_tokens: number
          coding_task_id: string | null
          created_at: string
          error_message: string | null
          estimated_cost_usd: number
          id: string
          input_tokens: number
          latency_ms: number
          metadata: Json
          model_id: string
          organization_id: string
          output_tokens: number
          product_asset_builder_run_id: string
          provider: string
          reasoning_tokens: number
          role: string
          success: boolean
          task_type: string
          total_tokens: number
          usage_source: string
        }
        Insert: {
          cached_tokens?: number
          coding_task_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          latency_ms?: number
          metadata?: Json
          model_id: string
          organization_id: string
          output_tokens?: number
          product_asset_builder_run_id: string
          provider: string
          reasoning_tokens?: number
          role: string
          success?: boolean
          task_type: string
          total_tokens?: number
          usage_source?: string
        }
        Update: {
          cached_tokens?: number
          coding_task_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          latency_ms?: number
          metadata?: Json
          model_id?: string
          organization_id?: string
          output_tokens?: number
          product_asset_builder_run_id?: string
          provider?: string
          reasoning_tokens?: number
          role?: string
          success?: boolean
          task_type?: string
          total_tokens?: number
          usage_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_provider_calls_coding_task_id_fkey"
            columns: ["coding_task_id"]
            isOneToOne: false
            referencedRelation: "product_asset_coding_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_provider_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_provider_calls_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_repair_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          failure_classification: string
          id: string
          organization_id: string
          product_asset_builder_run_id: string
          repair_action: Json
          success: boolean
        }
        Insert: {
          attempt_number: number
          created_at?: string
          failure_classification: string
          id?: string
          organization_id: string
          product_asset_builder_run_id: string
          repair_action?: Json
          success?: boolean
        }
        Update: {
          attempt_number?: number
          created_at?: string
          failure_classification?: string
          id?: string
          organization_id?: string
          product_asset_builder_run_id?: string
          repair_action?: Json
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_repair_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_repair_attempts_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_repository_map: {
        Row: {
          content_hash: string | null
          created_at: string
          dependencies: Json
          entities: Json
          exports: Json
          feature_ids: Json
          id: string
          module_kind: string | null
          organization_id: string
          product_asset_builder_run_id: string
          relative_path: string
          routes: Json
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          dependencies?: Json
          entities?: Json
          exports?: Json
          feature_ids?: Json
          id?: string
          module_kind?: string | null
          organization_id: string
          product_asset_builder_run_id: string
          relative_path: string
          routes?: Json
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          dependencies?: Json
          entities?: Json
          exports?: Json
          feature_ids?: Json
          id?: string
          module_kind?: string | null
          organization_id?: string
          product_asset_builder_run_id?: string
          relative_path?: string
          routes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_repository_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_repository_map_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_review_defects: {
        Row: {
          created_at: string
          defect_type: string
          description: string
          feature_id: string | null
          id: string
          metadata: Json
          model_id: string | null
          organization_id: string
          product_asset_builder_run_id: string
          provider: string | null
          resolution: string | null
          resolved: boolean
          severity: string
        }
        Insert: {
          created_at?: string
          defect_type: string
          description: string
          feature_id?: string | null
          id?: string
          metadata?: Json
          model_id?: string | null
          organization_id: string
          product_asset_builder_run_id: string
          provider?: string | null
          resolution?: string | null
          resolved?: boolean
          severity: string
        }
        Update: {
          created_at?: string
          defect_type?: string
          description?: string
          feature_id?: string | null
          id?: string
          metadata?: Json
          model_id?: string | null
          organization_id?: string
          product_asset_builder_run_id?: string
          provider?: string | null
          resolution?: string | null
          resolved?: boolean
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_review_defects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_review_defects_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_traceability_links: {
        Row: {
          created_at: string
          id: string
          link_type: string
          metadata: Json
          organization_id: string
          product_asset_builder_run_id: string
          source_ref: string
          target_ref: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_type: string
          metadata?: Json
          organization_id: string
          product_asset_builder_run_id: string
          source_ref: string
          target_ref: string
        }
        Update: {
          created_at?: string
          id?: string
          link_type?: string
          metadata?: Json
          organization_id?: string
          product_asset_builder_run_id?: string
          source_ref?: string
          target_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_traceability_li_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_traceability_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_validation_runs: {
        Row: {
          created_at: string
          details: Json
          id: string
          organization_id: string
          product_asset_builder_run_id: string
          status: string
          validator_name: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          organization_id: string
          product_asset_builder_run_id: string
          status: string
          validator_name: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          organization_id?: string
          product_asset_builder_run_id?: string
          status?: string
          validator_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_validation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_validation_runs_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_workspace_mutations: {
        Row: {
          byte_size_after: number | null
          byte_size_before: number | null
          code_change_set_id: string | null
          coding_task_id: string | null
          content_hash_after: string | null
          content_hash_before: string | null
          created_at: string
          feature_contract_ids: Json
          id: string
          metadata: Json
          model_id: string | null
          operation: string
          organization_id: string
          product_asset_builder_run_id: string
          provider: string | null
          relative_path: string
          rolled_back: boolean
          snapshot_content: string | null
        }
        Insert: {
          byte_size_after?: number | null
          byte_size_before?: number | null
          code_change_set_id?: string | null
          coding_task_id?: string | null
          content_hash_after?: string | null
          content_hash_before?: string | null
          created_at?: string
          feature_contract_ids?: Json
          id?: string
          metadata?: Json
          model_id?: string | null
          operation: string
          organization_id: string
          product_asset_builder_run_id: string
          provider?: string | null
          relative_path: string
          rolled_back?: boolean
          snapshot_content?: string | null
        }
        Update: {
          byte_size_after?: number | null
          byte_size_before?: number | null
          code_change_set_id?: string | null
          coding_task_id?: string | null
          content_hash_after?: string | null
          content_hash_before?: string | null
          created_at?: string
          feature_contract_ids?: Json
          id?: string
          metadata?: Json
          model_id?: string | null
          operation?: string
          organization_id?: string
          product_asset_builder_run_id?: string
          provider?: string | null
          relative_path?: string
          rolled_back?: boolean
          snapshot_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_workspace_mutat_product_asset_builder_run_id_fkey"
            columns: ["product_asset_builder_run_id"]
            isOneToOne: false
            referencedRelation: "product_asset_builder_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_workspace_mutations_code_change_set_id_fkey"
            columns: ["code_change_set_id"]
            isOneToOne: false
            referencedRelation: "product_asset_code_change_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_workspace_mutations_coding_task_id_fkey"
            columns: ["coding_task_id"]
            isOneToOne: false
            referencedRelation: "product_asset_coding_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_asset_workspace_mutations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      production_artifact_files: {
        Row: {
          byte_size: number
          content_hash: string
          content_text: string | null
          file_mode: string
          id: string
          organization_id: string
          production_artifact_id: string
          relative_path: string
        }
        Insert: {
          byte_size?: number
          content_hash: string
          content_text?: string | null
          file_mode?: string
          id?: string
          organization_id: string
          production_artifact_id: string
          relative_path: string
        }
        Update: {
          byte_size?: number
          content_hash?: string
          content_text?: string | null
          file_mode?: string
          id?: string
          organization_id?: string
          production_artifact_id?: string
          relative_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_artifact_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_artifact_files_production_artifact_id_fkey"
            columns: ["production_artifact_id"]
            isOneToOne: false
            referencedRelation: "production_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      production_artifacts: {
        Row: {
          artifact_type: string
          artifact_version: number
          build_id: string
          build_job_id: string | null
          build_snapshot_id: string
          clean_room_build_duration_ms: number | null
          clean_room_build_result: Json | null
          clean_room_install_result: Json | null
          content_hash: string
          created_at: string
          deployment_manifest: Json
          deployment_source_identity: Json | null
          file_count: number
          file_manifest: Json
          framework: string
          framework_detection: Json | null
          id: string
          idempotency_key: string
          last_readiness_evaluated_at: string | null
          mission_id: string
          organization_id: string
          output_summary: Json | null
          package_manager: string | null
          root_directory: string
          total_bytes: number
          updated_at: string
          venture_assembly_id: string | null
          venture_assembly_version: number | null
          vercel_readiness_reasons: Json
          vercel_readiness_status: string
        }
        Insert: {
          artifact_type?: string
          artifact_version?: number
          build_id: string
          build_job_id?: string | null
          build_snapshot_id: string
          clean_room_build_duration_ms?: number | null
          clean_room_build_result?: Json | null
          clean_room_install_result?: Json | null
          content_hash: string
          created_at?: string
          deployment_manifest?: Json
          deployment_source_identity?: Json | null
          file_count?: number
          file_manifest?: Json
          framework: string
          framework_detection?: Json | null
          id?: string
          idempotency_key: string
          last_readiness_evaluated_at?: string | null
          mission_id: string
          organization_id: string
          output_summary?: Json | null
          package_manager?: string | null
          root_directory?: string
          total_bytes?: number
          updated_at?: string
          venture_assembly_id?: string | null
          venture_assembly_version?: number | null
          vercel_readiness_reasons?: Json
          vercel_readiness_status?: string
        }
        Update: {
          artifact_type?: string
          artifact_version?: number
          build_id?: string
          build_job_id?: string | null
          build_snapshot_id?: string
          clean_room_build_duration_ms?: number | null
          clean_room_build_result?: Json | null
          clean_room_install_result?: Json | null
          content_hash?: string
          created_at?: string
          deployment_manifest?: Json
          deployment_source_identity?: Json | null
          file_count?: number
          file_manifest?: Json
          framework?: string
          framework_detection?: Json | null
          id?: string
          idempotency_key?: string
          last_readiness_evaluated_at?: string | null
          mission_id?: string
          organization_id?: string
          output_summary?: Json | null
          package_manager?: string | null
          root_directory?: string
          total_bytes?: number
          updated_at?: string
          venture_assembly_id?: string | null
          venture_assembly_version?: number | null
          vercel_readiness_reasons?: Json
          vercel_readiness_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_artifacts_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_artifacts_build_job_id_fkey"
            columns: ["build_job_id"]
            isOneToOne: false
            referencedRelation: "build_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_artifacts_build_snapshot_id_fkey"
            columns: ["build_snapshot_id"]
            isOneToOne: false
            referencedRelation: "build_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_artifacts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_artifacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_artifacts_venture_assembly_id_fkey"
            columns: ["venture_assembly_id"]
            isOneToOne: false
            referencedRelation: "venture_assemblies"
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
      research_runs: {
        Row: {
          completed_at: string | null
          correlation_id: string | null
          cost_uncertainty: string | null
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          failed_at: string | null
          failure_classification: string | null
          grounding_metadata: Json
          grounding_usage: Json
          id: string
          idempotency_key: string
          input_hash: string
          latency_ms: number | null
          mission_id: string | null
          model: string
          normalized_evidence: Json
          normalized_sources: Json
          organization_id: string
          prompt_version: string
          provider: string
          raw_provider_response: Json
          request_id: string | null
          research_objective: string
          retry_count: number
          schema_version: string
          started_at: string | null
          status: string
          structured_result: Json
          token_usage: Json
          validation_status: string | null
        }
        Insert: {
          completed_at?: string | null
          correlation_id?: string | null
          cost_uncertainty?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          grounding_metadata?: Json
          grounding_usage?: Json
          id?: string
          idempotency_key: string
          input_hash: string
          latency_ms?: number | null
          mission_id?: string | null
          model: string
          normalized_evidence?: Json
          normalized_sources?: Json
          organization_id: string
          prompt_version: string
          provider: string
          raw_provider_response?: Json
          request_id?: string | null
          research_objective: string
          retry_count?: number
          schema_version: string
          started_at?: string | null
          status?: string
          structured_result?: Json
          token_usage?: Json
          validation_status?: string | null
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string | null
          cost_uncertainty?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          grounding_metadata?: Json
          grounding_usage?: Json
          id?: string
          idempotency_key?: string
          input_hash?: string
          latency_ms?: number | null
          mission_id?: string | null
          model?: string
          normalized_evidence?: Json
          normalized_sources?: Json
          organization_id?: string
          prompt_version?: string
          provider?: string
          raw_provider_response?: Json
          request_id?: string | null
          research_objective?: string
          retry_count?: number
          schema_version?: string
          started_at?: string | null
          status?: string
          structured_result?: Json
          token_usage?: Json
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_runs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_allocation_snapshots: {
        Row: {
          allocations: Json
          constraints: Json
          created_at: string
          id: string
          organization_id: string
          summary: Json
          unallocated_candidates: Json
          venture_selection_run_id: string
        }
        Insert: {
          allocations?: Json
          constraints?: Json
          created_at?: string
          id?: string
          organization_id: string
          summary?: Json
          unallocated_candidates?: Json
          venture_selection_run_id: string
        }
        Update: {
          allocations?: Json
          constraints?: Json
          created_at?: string
          id?: string
          organization_id?: string
          summary?: Json
          unallocated_candidates?: Json
          venture_selection_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_allocation_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_allocation_snapshots_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
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
      selection_explanations: {
        Row: {
          candidate_selection_evaluation_id: string
          confidence: number | null
          created_at: string
          expected_economics: Json
          fatal_assumptions: Json
          id: string
          largest_risks: Json
          metadata: Json
          opportunity_candidate_id: string
          organization_id: string
          resource_requirements: Json
          validation_needed: Json
          venture_selection_run_id: string
          why_customers_will_pay: string | null
          why_infinity_can_build_it: string | null
          why_it_ranks_above_alternatives: string | null
          why_now: string | null
          why_this_model: string | null
          why_this_opportunity: string | null
        }
        Insert: {
          candidate_selection_evaluation_id: string
          confidence?: number | null
          created_at?: string
          expected_economics?: Json
          fatal_assumptions?: Json
          id?: string
          largest_risks?: Json
          metadata?: Json
          opportunity_candidate_id: string
          organization_id: string
          resource_requirements?: Json
          validation_needed?: Json
          venture_selection_run_id: string
          why_customers_will_pay?: string | null
          why_infinity_can_build_it?: string | null
          why_it_ranks_above_alternatives?: string | null
          why_now?: string | null
          why_this_model?: string | null
          why_this_opportunity?: string | null
        }
        Update: {
          candidate_selection_evaluation_id?: string
          confidence?: number | null
          created_at?: string
          expected_economics?: Json
          fatal_assumptions?: Json
          id?: string
          largest_risks?: Json
          metadata?: Json
          opportunity_candidate_id?: string
          organization_id?: string
          resource_requirements?: Json
          validation_needed?: Json
          venture_selection_run_id?: string
          why_customers_will_pay?: string | null
          why_infinity_can_build_it?: string | null
          why_it_ranks_above_alternatives?: string | null
          why_now?: string | null
          why_this_model?: string | null
          why_this_opportunity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selection_explanations_candidate_selection_evaluation_id_fkey"
            columns: ["candidate_selection_evaluation_id"]
            isOneToOne: false
            referencedRelation: "candidate_selection_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_explanations_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_explanations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_explanations_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
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
      validation_experiment_priorities: {
        Row: {
          assumption_impact_score: number | null
          candidate_selection_evaluation_id: string
          created_at: string
          description: string | null
          estimated_cost_usd: number | null
          estimated_time_days: number | null
          execution_status: string
          experiment_type: string
          id: string
          information_gain_score: number | null
          metadata: Json
          monetization_experiment_id: string | null
          opportunity_candidate_id: string
          organization_id: string
          priority_rank: number
          priority_score: number | null
          title: string
          uncertainty_score: number | null
          venture_selection_run_id: string
        }
        Insert: {
          assumption_impact_score?: number | null
          candidate_selection_evaluation_id: string
          created_at?: string
          description?: string | null
          estimated_cost_usd?: number | null
          estimated_time_days?: number | null
          execution_status?: string
          experiment_type: string
          id?: string
          information_gain_score?: number | null
          metadata?: Json
          monetization_experiment_id?: string | null
          opportunity_candidate_id: string
          organization_id: string
          priority_rank: number
          priority_score?: number | null
          title: string
          uncertainty_score?: number | null
          venture_selection_run_id: string
        }
        Update: {
          assumption_impact_score?: number | null
          candidate_selection_evaluation_id?: string
          created_at?: string
          description?: string | null
          estimated_cost_usd?: number | null
          estimated_time_days?: number | null
          execution_status?: string
          experiment_type?: string
          id?: string
          information_gain_score?: number | null
          metadata?: Json
          monetization_experiment_id?: string | null
          opportunity_candidate_id?: string
          organization_id?: string
          priority_rank?: number
          priority_score?: number | null
          title?: string
          uncertainty_score?: number | null
          venture_selection_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_experiment_priorit_candidate_selection_evaluati_fkey"
            columns: ["candidate_selection_evaluation_id"]
            isOneToOne: false
            referencedRelation: "candidate_selection_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_experiment_prioritie_monetization_experiment_id_fkey"
            columns: ["monetization_experiment_id"]
            isOneToOne: false
            referencedRelation: "monetization_validation_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_experiment_priorities_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_experiment_priorities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_experiment_priorities_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
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
      venture_assemblies: {
        Row: {
          assembly_version: number
          assembly_worker_result_id: string | null
          blocking_reason: string | null
          brand_package: Json
          build_id: string | null
          build_job_id: string | null
          build_snapshot_id: string | null
          business_model_package: Json
          company_id: string | null
          correlation_id: string | null
          created_at: string
          digital_property_package: Json
          executive_decision_id: string
          id: string
          idempotency_key: string
          identity_package: Json
          immutable_at: string | null
          launch_stage: string | null
          legal_compliance_package: Json
          manifest: Json
          manifest_schema_version: string
          marketing_package: Json
          mission_id: string
          monetization_package: Json
          operations_package: Json
          opportunity_id: string
          organization_id: string
          plan_execution_id: string
          plan_id: string
          plan_version: number
          production_artifact_id: string | null
          qa_worker_result_id: string | null
          readiness_evaluation: Json
          readiness_status: string | null
          status: string
          superseded_by: string | null
          updated_at: string
          venture_blueprint_id: string | null
        }
        Insert: {
          assembly_version?: number
          assembly_worker_result_id?: string | null
          blocking_reason?: string | null
          brand_package?: Json
          build_id?: string | null
          build_job_id?: string | null
          build_snapshot_id?: string | null
          business_model_package?: Json
          company_id?: string | null
          correlation_id?: string | null
          created_at?: string
          digital_property_package?: Json
          executive_decision_id: string
          id?: string
          idempotency_key: string
          identity_package?: Json
          immutable_at?: string | null
          launch_stage?: string | null
          legal_compliance_package?: Json
          manifest?: Json
          manifest_schema_version?: string
          marketing_package?: Json
          mission_id: string
          monetization_package?: Json
          operations_package?: Json
          opportunity_id: string
          organization_id: string
          plan_execution_id: string
          plan_id: string
          plan_version?: number
          production_artifact_id?: string | null
          qa_worker_result_id?: string | null
          readiness_evaluation?: Json
          readiness_status?: string | null
          status?: string
          superseded_by?: string | null
          updated_at?: string
          venture_blueprint_id?: string | null
        }
        Update: {
          assembly_version?: number
          assembly_worker_result_id?: string | null
          blocking_reason?: string | null
          brand_package?: Json
          build_id?: string | null
          build_job_id?: string | null
          build_snapshot_id?: string | null
          business_model_package?: Json
          company_id?: string | null
          correlation_id?: string | null
          created_at?: string
          digital_property_package?: Json
          executive_decision_id?: string
          id?: string
          idempotency_key?: string
          identity_package?: Json
          immutable_at?: string | null
          launch_stage?: string | null
          legal_compliance_package?: Json
          manifest?: Json
          manifest_schema_version?: string
          marketing_package?: Json
          mission_id?: string
          monetization_package?: Json
          operations_package?: Json
          opportunity_id?: string
          organization_id?: string
          plan_execution_id?: string
          plan_id?: string
          plan_version?: number
          production_artifact_id?: string | null
          qa_worker_result_id?: string | null
          readiness_evaluation?: Json
          readiness_status?: string | null
          status?: string
          superseded_by?: string | null
          updated_at?: string
          venture_blueprint_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venture_assemblies_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_build_job_id_fkey"
            columns: ["build_job_id"]
            isOneToOne: false
            referencedRelation: "build_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_build_snapshot_id_fkey"
            columns: ["build_snapshot_id"]
            isOneToOne: false
            referencedRelation: "build_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_plan_execution_id_fkey"
            columns: ["plan_execution_id"]
            isOneToOne: false
            referencedRelation: "plan_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_production_artifact_id_fkey"
            columns: ["production_artifact_id"]
            isOneToOne: false
            referencedRelation: "production_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "venture_assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assemblies_venture_blueprint_id_fkey"
            columns: ["venture_blueprint_id"]
            isOneToOne: false
            referencedRelation: "venture_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_assembly_external_dependencies: {
        Row: {
          approval_requirement: string
          blocking_stage: string
          capability_requirement: string | null
          created_at: string
          dependency_type: string
          estimated_cost: number | null
          id: string
          organization_id: string
          reason: string
          required_for: string
          status: string
          updated_at: string
          venture_assembly_id: string
        }
        Insert: {
          approval_requirement?: string
          blocking_stage?: string
          capability_requirement?: string | null
          created_at?: string
          dependency_type: string
          estimated_cost?: number | null
          id?: string
          organization_id: string
          reason: string
          required_for: string
          status?: string
          updated_at?: string
          venture_assembly_id: string
        }
        Update: {
          approval_requirement?: string
          blocking_stage?: string
          capability_requirement?: string | null
          created_at?: string
          dependency_type?: string
          estimated_cost?: number | null
          id?: string
          organization_id?: string
          reason?: string
          required_for?: string
          status?: string
          updated_at?: string
          venture_assembly_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_assembly_external_dependencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_assembly_external_dependencies_venture_assembly_id_fkey"
            columns: ["venture_assembly_id"]
            isOneToOne: false
            referencedRelation: "venture_assemblies"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_blueprints: {
        Row: {
          blueprint: Json
          created_at: string
          executive_selection_decision_id: string | null
          id: string
          idempotency_key: string
          opportunity_id: string
          organization_id: string
          provenance: string
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
          executive_selection_decision_id?: string | null
          id?: string
          idempotency_key: string
          opportunity_id: string
          organization_id: string
          provenance?: string
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
          executive_selection_decision_id?: string | null
          id?: string
          idempotency_key?: string
          opportunity_id?: string
          organization_id?: string
          provenance?: string
          schema_version?: string
          status?: string
          template_key?: string
          template_version?: string
          updated_at?: string
          venture_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_blueprints_executive_selection_decision_id_fkey"
            columns: ["executive_selection_decision_id"]
            isOneToOne: false
            referencedRelation: "executive_selection_decisions"
            referencedColumns: ["id"]
          },
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
      venture_queue_items: {
        Row: {
          blocking_assumptions: Json
          buildability_score: number | null
          candidate_selection_evaluation_id: string
          confidence: number | null
          created_at: string
          decision: string
          estimated_capital_required: number | null
          estimated_time_to_revenue: number | null
          evaluated_at: string
          expected_12_month_profit: number | null
          expected_12_month_revenue: number | null
          expected_roi: number | null
          id: string
          metadata: Json
          monetization_score: number | null
          opportunity_candidate_id: string
          opportunity_score: number | null
          organization_id: string
          portfolio_adjusted_score: number | null
          primary_monetization_model: string | null
          queue_rank: number
          queue_reason: string | null
          recheck_after: string | null
          recommended_next_action: string | null
          recommended_validation_experiments: Json
          selection_score: number
          stale_after: string | null
          validation_score: number | null
          venture_selection_run_id: string
        }
        Insert: {
          blocking_assumptions?: Json
          buildability_score?: number | null
          candidate_selection_evaluation_id: string
          confidence?: number | null
          created_at?: string
          decision: string
          estimated_capital_required?: number | null
          estimated_time_to_revenue?: number | null
          evaluated_at?: string
          expected_12_month_profit?: number | null
          expected_12_month_revenue?: number | null
          expected_roi?: number | null
          id?: string
          metadata?: Json
          monetization_score?: number | null
          opportunity_candidate_id: string
          opportunity_score?: number | null
          organization_id: string
          portfolio_adjusted_score?: number | null
          primary_monetization_model?: string | null
          queue_rank: number
          queue_reason?: string | null
          recheck_after?: string | null
          recommended_next_action?: string | null
          recommended_validation_experiments?: Json
          selection_score: number
          stale_after?: string | null
          validation_score?: number | null
          venture_selection_run_id: string
        }
        Update: {
          blocking_assumptions?: Json
          buildability_score?: number | null
          candidate_selection_evaluation_id?: string
          confidence?: number | null
          created_at?: string
          decision?: string
          estimated_capital_required?: number | null
          estimated_time_to_revenue?: number | null
          evaluated_at?: string
          expected_12_month_profit?: number | null
          expected_12_month_revenue?: number | null
          expected_roi?: number | null
          id?: string
          metadata?: Json
          monetization_score?: number | null
          opportunity_candidate_id?: string
          opportunity_score?: number | null
          organization_id?: string
          portfolio_adjusted_score?: number | null
          primary_monetization_model?: string | null
          queue_rank?: number
          queue_reason?: string | null
          recheck_after?: string | null
          recommended_next_action?: string | null
          recommended_validation_experiments?: Json
          selection_score?: number
          stale_after?: string | null
          validation_score?: number | null
          venture_selection_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_queue_items_candidate_selection_evaluation_id_fkey"
            columns: ["candidate_selection_evaluation_id"]
            isOneToOne: false
            referencedRelation: "candidate_selection_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_queue_items_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_queue_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_queue_items_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_selection_handovers: {
        Row: {
          budget_envelope: Json
          business_concept: string
          candidate_selection_evaluation_id: string
          created_at: string
          distribution_strategy: string | null
          economic_targets: Json
          future_features: Json
          handoff_status: string
          id: string
          metadata: Json
          mvp_requirements: Json
          opportunity_candidate_id: string
          organization_id: string
          pricing_strategy: string | null
          primary_monetization_model: string | null
          problem: string | null
          recommended_product_type: string | null
          required_capabilities: Json
          risk_constraints: Json
          secondary_revenue_streams: Json
          solution: string | null
          source_evidence_refs: Json
          target_customer: string | null
          validation_state: string
          venture_selection_run_id: string
        }
        Insert: {
          budget_envelope?: Json
          business_concept: string
          candidate_selection_evaluation_id: string
          created_at?: string
          distribution_strategy?: string | null
          economic_targets?: Json
          future_features?: Json
          handoff_status?: string
          id?: string
          metadata?: Json
          mvp_requirements?: Json
          opportunity_candidate_id: string
          organization_id: string
          pricing_strategy?: string | null
          primary_monetization_model?: string | null
          problem?: string | null
          recommended_product_type?: string | null
          required_capabilities?: Json
          risk_constraints?: Json
          secondary_revenue_streams?: Json
          solution?: string | null
          source_evidence_refs?: Json
          target_customer?: string | null
          validation_state?: string
          venture_selection_run_id: string
        }
        Update: {
          budget_envelope?: Json
          business_concept?: string
          candidate_selection_evaluation_id?: string
          created_at?: string
          distribution_strategy?: string | null
          economic_targets?: Json
          future_features?: Json
          handoff_status?: string
          id?: string
          metadata?: Json
          mvp_requirements?: Json
          opportunity_candidate_id?: string
          organization_id?: string
          pricing_strategy?: string | null
          primary_monetization_model?: string | null
          problem?: string | null
          recommended_product_type?: string | null
          required_capabilities?: Json
          risk_constraints?: Json
          secondary_revenue_streams?: Json
          solution?: string | null
          source_evidence_refs?: Json
          target_customer?: string | null
          validation_state?: string
          venture_selection_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_selection_handovers_candidate_selection_evaluation_fkey"
            columns: ["candidate_selection_evaluation_id"]
            isOneToOne: false
            referencedRelation: "candidate_selection_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_selection_handovers_opportunity_candidate_id_fkey"
            columns: ["opportunity_candidate_id"]
            isOneToOne: false
            referencedRelation: "opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_selection_handovers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_selection_handovers_venture_selection_run_id_fkey"
            columns: ["venture_selection_run_id"]
            isOneToOne: false
            referencedRelation: "venture_selection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_selection_runs: {
        Row: {
          build_count: number
          candidates_evaluated: number
          completed_at: string | null
          correlation_id: string
          cost_uncertainty: string | null
          created_at: string
          discovery_run_ids: Json
          engine_version: string
          error_message: string | null
          estimated_cost_usd: number | null
          failed_at: string | null
          failure_classification: string | null
          handoffs_created: number
          hold_count: number
          id: string
          idempotency_key: string
          monetization_run_id: string | null
          monetization_run_ids: Json
          opportunity_candidate_ids: Json
          organization_id: string
          reasoning_run_ids: Json
          reject_count: number
          resource_allocation_snapshot: Json
          scoring_version: string
          selection_report: Json
          started_at: string | null
          status: string
          token_usage: Json
          validate_count: number
        }
        Insert: {
          build_count?: number
          candidates_evaluated?: number
          completed_at?: string | null
          correlation_id: string
          cost_uncertainty?: string | null
          created_at?: string
          discovery_run_ids?: Json
          engine_version?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          handoffs_created?: number
          hold_count?: number
          id?: string
          idempotency_key: string
          monetization_run_id?: string | null
          monetization_run_ids?: Json
          opportunity_candidate_ids?: Json
          organization_id: string
          reasoning_run_ids?: Json
          reject_count?: number
          resource_allocation_snapshot?: Json
          scoring_version?: string
          selection_report?: Json
          started_at?: string | null
          status?: string
          token_usage?: Json
          validate_count?: number
        }
        Update: {
          build_count?: number
          candidates_evaluated?: number
          completed_at?: string | null
          correlation_id?: string
          cost_uncertainty?: string | null
          created_at?: string
          discovery_run_ids?: Json
          engine_version?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          failed_at?: string | null
          failure_classification?: string | null
          handoffs_created?: number
          hold_count?: number
          id?: string
          idempotency_key?: string
          monetization_run_id?: string | null
          monetization_run_ids?: Json
          opportunity_candidate_ids?: Json
          organization_id?: string
          reasoning_run_ids?: Json
          reject_count?: number
          resource_allocation_snapshot?: Json
          scoring_version?: string
          selection_report?: Json
          started_at?: string | null
          status?: string
          token_usage?: Json
          validate_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "venture_selection_runs_monetization_run_id_fkey"
            columns: ["monetization_run_id"]
            isOneToOne: false
            referencedRelation: "monetization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_selection_runs_organization_id_fkey"
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

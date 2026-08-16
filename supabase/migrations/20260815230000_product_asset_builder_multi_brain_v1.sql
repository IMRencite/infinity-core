-- =============================================================================
-- Product Asset Builder + Multi-Brain Orchestration Foundation v1
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_input_cost_per_1k NUMERIC(14, 6),
  estimated_output_cost_per_1k NUMERIC(14, 6),
  context_limit INTEGER,
  latency_tier TEXT,
  availability TEXT NOT NULL DEFAULT 'available',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_model_registry_provider_model_uidx UNIQUE (provider, model_id)
);

CREATE TABLE IF NOT EXISTS public.ai_orchestration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  task_type TEXT NOT NULL,
  execution_strategy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  task_characteristics JSONB NOT NULL DEFAULT '{}'::JSONB,
  synthesis_result JSONB,
  disagreements JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_estimated_cost_usd NUMERIC(14, 6),
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_orchestration_sessions_idempotency_uidx UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.ai_task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  orchestration_session_id UUID REFERENCES public.ai_orchestration_sessions (id) ON DELETE CASCADE,
  product_asset_build_run_id UUID,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  brain_role TEXT NOT NULL,
  task_type TEXT NOT NULL,
  complexity TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(14, 6),
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  validation_result TEXT,
  repair_attempts INTEGER NOT NULL DEFAULT 0,
  reviewer_score NUMERIC(5, 4),
  output JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_task_disagreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  orchestration_session_id UUID NOT NULL REFERENCES public.ai_orchestration_sessions (id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  positions JSONB NOT NULL DEFAULT '[]'::JSONB,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_builder_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  company_builder_package_id UUID REFERENCES public.company_builder_packages (id) ON DELETE SET NULL,
  company_builder_blueprint_id UUID REFERENCES public.company_builder_blueprints (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  engine_version TEXT NOT NULL DEFAULT 'product_asset_builder_v1',
  simulation_only BOOLEAN NOT NULL DEFAULT FALSE,
  workspace_reference TEXT,
  build_graph_hash TEXT,
  cumulative_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  token_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  builder_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  failure_classification TEXT,
  error_message TEXT,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_asset_builder_runs_idempotency_uidx UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.product_asset_build_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  workspace_reference TEXT NOT NULL,
  venture_id TEXT,
  build_package_id UUID,
  state JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_build_task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  dependencies JSONB NOT NULL DEFAULT '[]'::JSONB,
  output_hash TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_asset_build_task_runs_run_task_uidx UNIQUE (product_asset_builder_run_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.product_asset_file_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  content_hash TEXT,
  byte_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  validator_name TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_repair_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  failure_classification TEXT NOT NULL,
  repair_action JSONB NOT NULL DEFAULT '{}'::JSONB,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_production_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  company_builder_package_id UUID,
  workspace_id UUID,
  status TEXT NOT NULL DEFAULT 'building',
  artifact_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  technology_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  database_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  route_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  monetization_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  validation_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  dependency_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  build_hash TEXT NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_asset_production_artifacts_status_valid CHECK (
    status IN ('planned', 'building', 'validating', 'repairing', 'ready', 'failed', 'blocked')
  )
);

CREATE TABLE IF NOT EXISTS public.product_asset_cost_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  provider TEXT,
  model_id TEXT,
  task_type TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_orchestration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_disagreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_builder_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_build_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_build_task_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_file_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_repair_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_production_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_cost_ledger ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ai_model_registry TO service_role;
GRANT ALL ON public.ai_orchestration_sessions TO service_role;
GRANT ALL ON public.ai_task_executions TO service_role;
GRANT ALL ON public.ai_task_disagreements TO service_role;
GRANT ALL ON public.product_asset_builder_runs TO service_role;
GRANT ALL ON public.product_asset_build_workspaces TO service_role;
GRANT ALL ON public.product_asset_build_task_runs TO service_role;
GRANT ALL ON public.product_asset_file_operations TO service_role;
GRANT ALL ON public.product_asset_validation_runs TO service_role;
GRANT ALL ON public.product_asset_repair_attempts TO service_role;
GRANT ALL ON public.product_asset_production_artifacts TO service_role;
GRANT ALL ON public.product_asset_cost_ledger TO service_role;

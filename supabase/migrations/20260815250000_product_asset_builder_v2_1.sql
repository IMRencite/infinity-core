-- Product Asset Builder V2.1 — Autonomous AI Coding Execution

CREATE TABLE IF NOT EXISTS public.product_asset_coding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  venture_id TEXT,
  feature_contract_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  objective TEXT NOT NULL,
  task_type TEXT NOT NULL,
  complexity TEXT NOT NULL DEFAULT 'medium',
  repository_context JSONB NOT NULL DEFAULT '{}'::JSONB,
  relevant_files JSONB NOT NULL DEFAULT '[]'::JSONB,
  allowed_paths JSONB NOT NULL DEFAULT '[]'::JSONB,
  forbidden_paths JSONB NOT NULL DEFAULT '[]'::JSONB,
  requirements JSONB NOT NULL DEFAULT '[]'::JSONB,
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::JSONB,
  dependencies JSONB NOT NULL DEFAULT '[]'::JSONB,
  preferred_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  max_files_changed INTEGER NOT NULL DEFAULT 20,
  max_tokens INTEGER,
  max_cost_usd NUMERIC(14, 6),
  retry_limit INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending',
  parent_task_id UUID REFERENCES public.product_asset_coding_tasks (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT product_asset_coding_tasks_status_valid CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'blocked', 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS public.product_asset_code_change_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  coding_task_id UUID NOT NULL REFERENCES public.product_asset_coding_tasks (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  reasoning_summary TEXT,
  changes JSONB NOT NULL DEFAULT '[]'::JSONB,
  dependency_changes JSONB NOT NULL DEFAULT '[]'::JSONB,
  migration_changes JSONB NOT NULL DEFAULT '[]'::JSONB,
  tests_added JSONB NOT NULL DEFAULT '[]'::JSONB,
  expected_behavior JSONB NOT NULL DEFAULT '[]'::JSONB,
  assumptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  validation_passed BOOLEAN NOT NULL DEFAULT FALSE,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_workspace_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  coding_task_id UUID REFERENCES public.product_asset_coding_tasks (id) ON DELETE SET NULL,
  code_change_set_id UUID REFERENCES public.product_asset_code_change_sets (id) ON DELETE SET NULL,
  feature_contract_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  provider TEXT,
  model_id TEXT,
  relative_path TEXT NOT NULL,
  operation TEXT NOT NULL,
  content_hash_before TEXT,
  content_hash_after TEXT,
  byte_size_before INTEGER,
  byte_size_after INTEGER,
  snapshot_content TEXT,
  rolled_back BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_provider_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  coding_task_id UUID REFERENCES public.product_asset_coding_tasks (id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  role TEXT NOT NULL,
  task_type TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  usage_source TEXT NOT NULL DEFAULT 'provider',
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_asset_provider_calls_usage_source_valid CHECK (
    usage_source IN ('provider', 'estimated')
  )
);

CREATE INDEX IF NOT EXISTS product_asset_coding_tasks_run_idx
  ON public.product_asset_coding_tasks (product_asset_builder_run_id);

CREATE INDEX IF NOT EXISTS product_asset_code_change_sets_task_idx
  ON public.product_asset_code_change_sets (coding_task_id);

CREATE INDEX IF NOT EXISTS product_asset_workspace_mutations_run_idx
  ON public.product_asset_workspace_mutations (product_asset_builder_run_id);

CREATE INDEX IF NOT EXISTS product_asset_provider_calls_run_idx
  ON public.product_asset_provider_calls (product_asset_builder_run_id);

ALTER TABLE public.product_asset_coding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_code_change_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_workspace_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_provider_calls ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.product_asset_coding_tasks TO service_role;
GRANT ALL ON public.product_asset_code_change_sets TO service_role;
GRANT ALL ON public.product_asset_workspace_mutations TO service_role;
GRANT ALL ON public.product_asset_provider_calls TO service_role;

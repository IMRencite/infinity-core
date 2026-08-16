-- Product Asset Builder V2 — Production Build Intelligence

ALTER TABLE public.ai_model_registry
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS context_window INTEGER,
  ADD COLUMN IF NOT EXISTS structured_output BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tool_use BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coding_capability NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS reasoning_capability NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS architecture_capability NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS debugging_capability NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS review_capability NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS research_capability NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS grounded_search_capability NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS multimodal_capability NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS latency_class TEXT,
  ADD COLUMN IF NOT EXISTS historical_task_success NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS historical_validation_success NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS average_repair_rate NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS average_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.product_asset_feature_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  business_purpose TEXT,
  user_roles JSONB NOT NULL DEFAULT '[]'::JSONB,
  functional_requirements JSONB NOT NULL DEFAULT '[]'::JSONB,
  non_functional_requirements JSONB NOT NULL DEFAULT '[]'::JSONB,
  dependencies JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_routes JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_data_entities JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_apis JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_ui_states JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_error_states JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_analytics_events JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_tests JSONB NOT NULL DEFAULT '[]'::JSONB,
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::JSONB,
  revenue_relationship TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_asset_feature_contracts_status_valid CHECK (
    status IN ('PLANNED', 'IMPLEMENTING', 'REVIEWING', 'VALIDATING', 'PASS', 'FAIL', 'BLOCKED')
  ),
  CONSTRAINT product_asset_feature_contracts_run_feature_uidx UNIQUE (product_asset_builder_run_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.product_asset_traceability_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_repository_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  module_kind TEXT,
  exports JSONB NOT NULL DEFAULT '[]'::JSONB,
  routes JSONB NOT NULL DEFAULT '[]'::JSONB,
  entities JSONB NOT NULL DEFAULT '[]'::JSONB,
  feature_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  dependencies JSONB NOT NULL DEFAULT '[]'::JSONB,
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_asset_repository_map_run_path_uidx UNIQUE (product_asset_builder_run_id, relative_path)
);

CREATE TABLE IF NOT EXISTS public.product_asset_review_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  feature_id TEXT,
  defect_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  provider TEXT,
  model_id TEXT,
  resolution TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_asset_build_intelligence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  product_asset_builder_run_id UUID NOT NULL REFERENCES public.product_asset_builder_runs (id) ON DELETE CASCADE,
  report JSONB NOT NULL DEFAULT '{}'::JSONB,
  total_ai_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_task_disagreements
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS synthesizer_provider TEXT,
  ADD COLUMN IF NOT EXISTS synthesizer_model TEXT,
  ADD COLUMN IF NOT EXISTS final_canonical_decision TEXT,
  ADD COLUMN IF NOT EXISTS points_of_agreement JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS points_of_disagreement JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE public.product_asset_production_artifacts
  ADD COLUMN IF NOT EXISTS feature_contract_coverage JSONB,
  ADD COLUMN IF NOT EXISTS test_coverage_summary JSONB,
  ADD COLUMN IF NOT EXISTS security_verification JSONB,
  ADD COLUMN IF NOT EXISTS review_verification JSONB,
  ADD COLUMN IF NOT EXISTS provider_provenance JSONB,
  ADD COLUMN IF NOT EXISTS build_cost_usd NUMERIC(14, 6),
  ADD COLUMN IF NOT EXISTS known_limitations JSONB,
  ADD COLUMN IF NOT EXISTS deployment_prerequisites JSONB;

ALTER TABLE public.product_asset_feature_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_traceability_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_repository_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_review_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_asset_build_intelligence_reports ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.product_asset_feature_contracts TO service_role;
GRANT ALL ON public.product_asset_traceability_links TO service_role;
GRANT ALL ON public.product_asset_repository_map TO service_role;
GRANT ALL ON public.product_asset_review_defects TO service_role;
GRANT ALL ON public.product_asset_build_intelligence_reports TO service_role;

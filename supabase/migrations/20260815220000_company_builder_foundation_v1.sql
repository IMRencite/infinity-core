-- =============================================================================
-- Company Builder v1 — Venture Architecture & Build Planning Foundation
-- Uses company_builder_* tables to avoid collision with venture_factory venture_blueprints
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.company_builder_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  status TEXT NOT NULL DEFAULT 'requested',
  engine_version TEXT NOT NULL DEFAULT 'company_builder_v1',
  blueprint_version TEXT NOT NULL DEFAULT 'venture_blueprint_v1',

  venture_selection_handoff_id UUID REFERENCES public.venture_selection_handovers (id) ON DELETE SET NULL,
  opportunity_candidate_id UUID REFERENCES public.opportunity_candidates (id) ON DELETE SET NULL,
  venture_selection_run_id UUID REFERENCES public.venture_selection_runs (id) ON DELETE SET NULL,
  monetization_run_id UUID REFERENCES public.monetization_runs (id) ON DELETE SET NULL,
  discovery_run_id UUID REFERENCES public.opportunity_discovery_runs (id) ON DELETE SET NULL,

  simulation_only BOOLEAN NOT NULL DEFAULT FALSE,
  input_mode TEXT NOT NULL DEFAULT 'handoff',

  blueprints_created INTEGER NOT NULL DEFAULT 0,
  build_packages_created INTEGER NOT NULL DEFAULT 0,
  ready_packages INTEGER NOT NULL DEFAULT 0,
  blocked_packages INTEGER NOT NULL DEFAULT 0,

  token_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_cost_usd NUMERIC(14, 6),
  builder_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,

  failure_classification TEXT,
  error_message TEXT,

  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT company_builder_runs_idempotency_not_blank
    CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT company_builder_runs_status_valid CHECK (
    status IN (
      'requested',
      'running',
      'architecting',
      'packaging',
      'completed',
      'failed',
      'policy_blocked'
    )
  ),
  CONSTRAINT company_builder_runs_input_mode_valid CHECK (
    input_mode IN ('handoff', 'simulation')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS company_builder_runs_org_idempotency_uidx
  ON public.company_builder_runs (organization_id, idempotency_key);

CREATE INDEX IF NOT EXISTS company_builder_runs_org_status_idx
  ON public.company_builder_runs (organization_id, status, created_at DESC);

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_builder_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  company_builder_run_id UUID NOT NULL REFERENCES public.company_builder_runs (id) ON DELETE CASCADE,
  venture_selection_handoff_id UUID REFERENCES public.venture_selection_handovers (id) ON DELETE SET NULL,
  opportunity_candidate_id UUID REFERENCES public.opportunity_candidates (id) ON DELETE SET NULL,

  simulation_only BOOLEAN NOT NULL DEFAULT FALSE,
  blueprint_version TEXT NOT NULL DEFAULT 'venture_blueprint_v1',

  venture_name_working TEXT NOT NULL,
  venture_type TEXT NOT NULL,
  secondary_venture_types JSONB NOT NULL DEFAULT '[]'::JSONB,
  primary_monetization_model TEXT,

  business_summary TEXT,
  economics_compliance TEXT NOT NULL DEFAULT 'PASS',
  architecture_feedback_action TEXT,

  blueprint_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  business_architecture JSONB NOT NULL DEFAULT '{}'::JSONB,
  revenue_architecture JSONB NOT NULL DEFAULT '{}'::JSONB,
  product_architecture JSONB NOT NULL DEFAULT '{}'::JSONB,
  technical_architecture JSONB NOT NULL DEFAULT '{}'::JSONB,
  data_model JSONB NOT NULL DEFAULT '{}'::JSONB,
  integration_plan JSONB NOT NULL DEFAULT '[]'::JSONB,
  build_vs_buy JSONB NOT NULL DEFAULT '[]'::JSONB,
  automation_architecture JSONB NOT NULL DEFAULT '{}'::JSONB,
  build_graph JSONB NOT NULL DEFAULT '{}'::JSONB,
  build_phases JSONB NOT NULL DEFAULT '[]'::JSONB,
  mvp_definition JSONB NOT NULL DEFAULT '{}'::JSONB,
  economic_guardrails JSONB NOT NULL DEFAULT '{}'::JSONB,
  architecture_feedback JSONB NOT NULL DEFAULT '[]'::JSONB,
  brand_architecture JSONB NOT NULL DEFAULT '{}'::JSONB,
  content_architecture JSONB,
  acquisition_architecture JSONB NOT NULL DEFAULT '{}'::JSONB,
  analytics_architecture JSONB NOT NULL DEFAULT '{}'::JSONB,
  failure_criteria JSONB NOT NULL DEFAULT '[]'::JSONB,

  source_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT company_builder_blueprints_economics_compliance_valid CHECK (
    economics_compliance IN ('PASS', 'WARNING', 'FAIL')
  )
);

CREATE INDEX IF NOT EXISTS company_builder_blueprints_run_idx
  ON public.company_builder_blueprints (company_builder_run_id);

CREATE INDEX IF NOT EXISTS company_builder_blueprints_candidate_idx
  ON public.company_builder_blueprints (opportunity_candidate_id);

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_builder_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  company_builder_run_id UUID NOT NULL REFERENCES public.company_builder_runs (id) ON DELETE CASCADE,
  company_builder_blueprint_id UUID NOT NULL REFERENCES public.company_builder_blueprints (id) ON DELETE CASCADE,

  simulation_only BOOLEAN NOT NULL DEFAULT FALSE,
  package_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT',

  build_graph_reference JSONB NOT NULL DEFAULT '{}'::JSONB,
  mvp_reference JSONB NOT NULL DEFAULT '{}'::JSONB,
  technical_architecture_reference JSONB NOT NULL DEFAULT '{}'::JSONB,
  economic_constraints_reference JSONB NOT NULL DEFAULT '{}'::JSONB,
  verification_requirements JSONB NOT NULL DEFAULT '[]'::JSONB,
  source_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  readiness_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  blocked_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT company_builder_packages_status_valid CHECK (
    status IN ('DRAFT', 'READY', 'BLOCKED', 'SUPERSEDED')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS company_builder_packages_blueprint_version_uidx
  ON public.company_builder_packages (company_builder_blueprint_id, package_version);

CREATE INDEX IF NOT EXISTS company_builder_packages_run_status_idx
  ON public.company_builder_packages (company_builder_run_id, status);

-- -----------------------------------------------------------------------------

ALTER TABLE public.company_builder_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_builder_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_builder_packages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.company_builder_runs TO service_role;
GRANT ALL ON public.company_builder_blueprints TO service_role;
GRANT ALL ON public.company_builder_packages TO service_role;

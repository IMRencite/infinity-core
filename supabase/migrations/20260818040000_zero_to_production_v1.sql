-- =============================================================================
-- Zero-to-Production Venture Builder V1
-- Orchestration records only. Canonical downstream entities remain in their tables.
-- RLS enabled; service_role GRANT; no blanket policies.
-- =============================================================================

CREATE TABLE public.zero_to_production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  origin TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  founder_idea_submission_id UUID,
  opportunity_candidate_id TEXT NOT NULL,
  venture_id TEXT,
  venture_blueprint_id TEXT,
  mission_id TEXT,
  build_package_id TEXT,
  build_graph_id TEXT,
  commercialization_plan_id TEXT,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  business_decision TEXT,
  business_outcome TEXT,
  estimated_cost_usd NUMERIC,
  actual_cost_usd NUMERIC,
  cost_known BOOLEAN NOT NULL DEFAULT FALSE,
  failure_code TEXT,
  failure_reason TEXT,
  idempotency_key TEXT NOT NULL,
  publicly_launched BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE public.zero_to_production_stage_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  ztp_run_id UUID NOT NULL REFERENCES public.zero_to_production_runs (id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  canonical_entity_type TEXT,
  canonical_entity_id TEXT,
  cost_usd NUMERIC,
  cost_known BOOLEAN NOT NULL DEFAULT FALSE,
  failure_code TEXT,
  failure_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.zero_to_production_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  ztp_run_id UUID NOT NULL REFERENCES public.zero_to_production_runs (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ztp_runs_org_created_idx ON public.zero_to_production_runs (organization_id, created_at DESC);
CREATE INDEX ztp_stage_runs_org_run_idx ON public.zero_to_production_stage_runs (organization_id, ztp_run_id);
CREATE INDEX ztp_events_org_run_idx ON public.zero_to_production_events (organization_id, ztp_run_id);

ALTER TABLE public.zero_to_production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zero_to_production_stage_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zero_to_production_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.zero_to_production_runs TO service_role;
GRANT ALL ON public.zero_to_production_stage_runs TO service_role;
GRANT ALL ON public.zero_to_production_events TO service_role;

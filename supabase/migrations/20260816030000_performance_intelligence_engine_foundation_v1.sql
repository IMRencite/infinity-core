-- =============================================================================
-- Performance Intelligence & Learning Engine v1
-- Canonical aggregate: performance_intelligence_build_packages.build_package (JSONB)
-- Normalized tables for events, aggregates, diagnoses, decisions, traceability
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.performance_intelligence_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'requested',
  engine_version TEXT NOT NULL DEFAULT 'performance_intelligence_engine_v1',
  simulation_only BOOLEAN NOT NULL DEFAULT FALSE,
  capability_test BOOLEAN NOT NULL DEFAULT FALSE,
  build_packages_created INTEGER NOT NULL DEFAULT 0,
  engine_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  failure_classification TEXT,
  error_message TEXT,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_intelligence_runs_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT performance_intelligence_runs_status_valid CHECK (
    status IN ('requested', 'running', 'ingesting', 'analyzing', 'completed', 'failed', 'policy_blocked')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_intelligence_runs_org_idempotency_uidx
  ON public.performance_intelligence_runs (organization_id, idempotency_key);

CREATE TABLE IF NOT EXISTS public.performance_intelligence_build_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  performance_intelligence_run_id UUID NOT NULL REFERENCES public.performance_intelligence_runs (id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL,
  package_version TEXT NOT NULL DEFAULT 'performance_intelligence_build_package_v1',
  status TEXT NOT NULL DEFAULT 'READY',
  build_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  observations_ingested INTEGER NOT NULL DEFAULT 0,
  events_normalized INTEGER NOT NULL DEFAULT 0,
  decisions_created INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  performance_intelligence_run_id UUID REFERENCES public.performance_intelligence_runs (id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  venture_id TEXT,
  source_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  ingestion_mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  health TEXT NOT NULL DEFAULT 'healthy',
  source_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  performance_intelligence_run_id UUID NOT NULL REFERENCES public.performance_intelligence_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.performance_intelligence_build_packages (id) ON DELETE CASCADE,
  observation_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  venture_id TEXT,
  source_reference TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  observation_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_observations_idempotency_uidx UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.performance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  performance_intelligence_run_id UUID NOT NULL REFERENCES public.performance_intelligence_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.performance_intelligence_build_packages (id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  venture_id TEXT,
  metric TEXT NOT NULL,
  value NUMERIC(18, 6) NOT NULL,
  unit TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_events_source_ref_uidx UNIQUE (organization_id, source_id, source_reference, metric)
);

CREATE TABLE IF NOT EXISTS public.performance_metric_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  performance_intelligence_run_id UUID NOT NULL REFERENCES public.performance_intelligence_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.performance_intelligence_build_packages (id) ON DELETE CASCADE,
  aggregate_id TEXT NOT NULL,
  venture_id TEXT,
  metric TEXT NOT NULL,
  time_window TEXT NOT NULL,
  value NUMERIC(18, 6) NOT NULL,
  unit TEXT NOT NULL,
  aggregate_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_learning_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  performance_intelligence_run_id UUID NOT NULL REFERENCES public.performance_intelligence_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.performance_intelligence_build_packages (id) ON DELETE CASCADE,
  decision_id TEXT NOT NULL,
  venture_id TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  status TEXT NOT NULL,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,
  decision_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_traceability_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  performance_intelligence_run_id UUID NOT NULL REFERENCES public.performance_intelligence_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.performance_intelligence_build_packages (id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

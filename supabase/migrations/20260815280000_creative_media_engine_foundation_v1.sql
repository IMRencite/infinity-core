-- =============================================================================
-- Creative Media Architecture Engine v1 — provider-neutral media foundation
-- Canonical aggregate: creative_media_build_packages.build_package (JSONB)
-- Normalized tables for jobs, assets, reviews, costs, traceability
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.creative_media_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'requested',
  engine_version TEXT NOT NULL DEFAULT 'creative_media_engine_v1',
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
  CONSTRAINT creative_media_runs_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT creative_media_runs_status_valid CHECK (
    status IN ('requested', 'running', 'generating', 'reviewing', 'completed', 'failed', 'policy_blocked')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS creative_media_runs_org_idempotency_uidx
  ON public.creative_media_runs (organization_id, idempotency_key);

CREATE TABLE IF NOT EXISTS public.creative_media_build_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  creative_media_run_id UUID NOT NULL REFERENCES public.creative_media_runs (id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL,
  package_version TEXT NOT NULL DEFAULT 'creative_media_build_package_v1',
  status TEXT NOT NULL DEFAULT 'READY',
  build_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  blocked_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  assets_generated INTEGER NOT NULL DEFAULT 0,
  production_ready_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creative_media_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  creative_media_run_id UUID NOT NULL REFERENCES public.creative_media_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.creative_media_build_packages (id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  provider_job_id TEXT,
  status TEXT NOT NULL,
  estimated_cost NUMERIC(12, 6),
  actual_cost NUMERIC(12, 6),
  job_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creative_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  creative_media_run_id UUID NOT NULL REFERENCES public.creative_media_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.creative_media_build_packages (id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_sec NUMERIC(10, 3),
  file_size_bytes BIGINT,
  checksum TEXT,
  provider TEXT,
  model TEXT,
  provider_job_id TEXT,
  creative_brief_id TEXT,
  generation_task_id TEXT,
  routing_decision_id TEXT,
  estimated_cost NUMERIC(12, 6),
  actual_cost NUMERIC(12, 6),
  quality_status TEXT NOT NULL DEFAULT 'pending',
  production_status TEXT NOT NULL DEFAULT 'GENERATED',
  usage_rights TEXT NOT NULL DEFAULT 'UNKNOWN',
  asset_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creative_media_quality_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  creative_media_run_id UUID NOT NULL REFERENCES public.creative_media_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.creative_media_build_packages (id) ON DELETE CASCADE,
  review_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]'::JSONB,
  gate_scores JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creative_media_cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  creative_media_run_id UUID NOT NULL REFERENCES public.creative_media_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.creative_media_build_packages (id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  asset_id TEXT,
  task_id TEXT,
  job_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  estimated_cost_usd NUMERIC(12, 6),
  actual_cost_usd NUMERIC(12, 6),
  usage_source TEXT NOT NULL DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creative_media_production_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  creative_media_run_id UUID NOT NULL REFERENCES public.creative_media_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.creative_media_build_packages (id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL,
  venture_id TEXT NOT NULL,
  brief_id TEXT NOT NULL,
  asset_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL,
  media_type TEXT NOT NULL,
  quality_review_id TEXT,
  unresolved_high_count INTEGER NOT NULL DEFAULT 0,
  unresolved_critical_count INTEGER NOT NULL DEFAULT 0,
  artifact_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creative_media_traceability_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  creative_media_run_id UUID NOT NULL REFERENCES public.creative_media_runs (id) ON DELETE CASCADE,
  build_package_id UUID REFERENCES public.creative_media_build_packages (id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creative_media_assets_run_idx
  ON public.creative_media_assets (creative_media_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS creative_media_jobs_run_idx
  ON public.creative_media_generation_jobs (creative_media_run_id, status);

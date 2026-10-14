-- Autonomous portfolio durable execution v1 (Infinity V44)
-- System-scoped runtime tables (no organization FK), service-role only.

CREATE TABLE IF NOT EXISTS public.autonomous_portfolio_cycles (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cron_provenance JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  venture_count INTEGER NOT NULL DEFAULT 0,
  jobs_created INTEGER NOT NULL DEFAULT 0,
  jobs_completed INTEGER NOT NULL DEFAULT 0,
  jobs_failed INTEGER NOT NULL DEFAULT 0,
  assets_published INTEGER NOT NULL DEFAULT 0,
  products_advanced INTEGER NOT NULL DEFAULT 0,
  products_published INTEGER NOT NULL DEFAULT 0,
  research_spend NUMERIC(14, 4) NOT NULL DEFAULT 0,
  creative_spend NUMERIC(14, 4) NOT NULL DEFAULT 0,
  error_summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT autonomous_portfolio_cycles_status_check CHECK (
    status IN ('QUEUED', 'RUNNING', 'PARTIAL', 'COMPLETED', 'FAILED', 'BLOCKED_EXTERNAL_AUTHORITY')
  )
);

CREATE INDEX IF NOT EXISTS autonomous_portfolio_cycles_triggered_at_idx
  ON public.autonomous_portfolio_cycles (triggered_at DESC);

CREATE TABLE IF NOT EXISTS public.autonomous_portfolio_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.autonomous_portfolio_cycles (cycle_id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eligible_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  lease_holder TEXT,
  lease_expires_at TIMESTAMPTZ,
  input_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  output_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  safe_error TEXT,
  external_authority_state TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT autonomous_portfolio_jobs_status_check CHECK (
    status IN ('QUEUED', 'RUNNING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')
  ),
  CONSTRAINT autonomous_portfolio_jobs_priority_range CHECK (priority >= 0 AND priority <= 100),
  CONSTRAINT autonomous_portfolio_jobs_attempt_nonneg CHECK (attempt_count >= 0),
  CONSTRAINT autonomous_portfolio_jobs_max_attempts_positive CHECK (max_attempts >= 1),
  UNIQUE (cycle_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS autonomous_portfolio_jobs_claim_idx
  ON public.autonomous_portfolio_jobs (status, eligible_at, priority DESC)
  WHERE status IN ('QUEUED', 'IN_PROGRESS');

CREATE INDEX IF NOT EXISTS autonomous_portfolio_jobs_cycle_idx
  ON public.autonomous_portfolio_jobs (cycle_id);

CREATE TABLE IF NOT EXISTS public.autonomous_runtime_scheduled_execution_ledger (
  ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  schedule_identity TEXT NOT NULL,
  platform_provenance TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_id UUID REFERENCES public.autonomous_portfolio_cycles (cycle_id) ON DELETE SET NULL,
  accepted_status TEXT,
  completed_status TEXT,
  completion_timestamp TIMESTAMPTZ,
  errors JSONB NOT NULL DEFAULT '[]'::JSONB,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT autonomous_runtime_scheduled_execution_trigger_check CHECK (
    trigger_type IN ('REAL_CRON', 'MANUAL')
  )
);

CREATE INDEX IF NOT EXISTS autonomous_runtime_scheduled_execution_route_ts_idx
  ON public.autonomous_runtime_scheduled_execution_ledger (route, request_timestamp DESC);

CREATE TABLE IF NOT EXISTS public.autonomous_venture_publication_registry (
  venture_id TEXT NOT NULL,
  asset_identity TEXT NOT NULL,
  canonical_path TEXT NOT NULL,
  content_revision TEXT,
  deployment_id TEXT,
  production_url TEXT,
  production_state TEXT NOT NULL DEFAULT 'PUBLISHED',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  PRIMARY KEY (venture_id, asset_identity)
);

CREATE INDEX IF NOT EXISTS autonomous_venture_publication_registry_path_idx
  ON public.autonomous_venture_publication_registry (venture_id, canonical_path);

CREATE TABLE IF NOT EXISTS public.autonomous_venture_deploy_telemetry (
  telemetry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES public.autonomous_portfolio_cycles (cycle_id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.autonomous_portfolio_jobs (job_id) ON DELETE SET NULL,
  venture_id TEXT NOT NULL,
  bundle_started_at TIMESTAMPTZ,
  bundle_completed_at TIMESTAMPTZ,
  bundle_file_count INTEGER,
  bundle_bytes BIGINT,
  deployment_requested_at TIMESTAMPTZ,
  vercel_deployment_id TEXT,
  build_status TEXT,
  alias_promotion_status TEXT,
  production_get_status INTEGER,
  canonical_check TEXT,
  schema_check TEXT,
  sitemap_check TEXT,
  safe_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.autonomous_portfolio_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_portfolio_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_runtime_scheduled_execution_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_venture_publication_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_venture_deploy_telemetry ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.autonomous_portfolio_cycles IS
  'Durable autonomous portfolio operating cycles (V44). Not local .infinity JSON.';
COMMENT ON TABLE public.autonomous_portfolio_jobs IS
  'Durable portfolio job queue with lease-based claiming.';
COMMENT ON TABLE public.autonomous_runtime_scheduled_execution_ledger IS
  'Authoritative scheduled runtime invocation ledger (portfolio + discovery).';

-- =============================================================================
-- Organic Growth Architecture Engine v1 — SEO/GEO Digital Real Estate Foundation
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organic_growth_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  status TEXT NOT NULL DEFAULT 'requested',
  engine_version TEXT NOT NULL DEFAULT 'organic_growth_engine_v1',

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

  CONSTRAINT organic_growth_runs_idempotency_not_blank
    CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT organic_growth_runs_status_valid CHECK (
    status IN (
      'requested',
      'running',
      'analyzing',
      'architecting',
      'packaging',
      'completed',
      'failed',
      'policy_blocked'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS organic_growth_runs_org_idempotency_uidx
  ON public.organic_growth_runs (organization_id, idempotency_key);

CREATE INDEX IF NOT EXISTS organic_growth_runs_org_status_idx
  ON public.organic_growth_runs (organization_id, status, created_at DESC);

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organic_growth_build_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  organic_growth_run_id UUID NOT NULL REFERENCES public.organic_growth_runs (id) ON DELETE CASCADE,

  venture_id TEXT NOT NULL,
  package_version TEXT NOT NULL DEFAULT 'organic_growth_build_package_v1',
  status TEXT NOT NULL DEFAULT 'READY',

  build_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  blocked_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  approved_page_count INTEGER NOT NULL DEFAULT 0,

  company_builder_blueprint_id UUID,
  company_builder_build_package_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT organic_growth_build_packages_status_valid CHECK (
    status IN ('READY', 'BLOCKED', 'PARTIAL')
  )
);

CREATE INDEX IF NOT EXISTS organic_growth_build_packages_run_idx
  ON public.organic_growth_build_packages (organic_growth_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS organic_growth_build_packages_org_venture_idx
  ON public.organic_growth_build_packages (organization_id, venture_id, created_at DESC);

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organic_channel_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  organic_growth_run_id UUID NOT NULL REFERENCES public.organic_growth_runs (id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL,
  organic_viability_score NUMERIC(6, 2) NOT NULL,
  recommendation TEXT NOT NULL,
  assessment JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.page_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  organic_growth_run_id UUID NOT NULL REFERENCES public.organic_growth_runs (id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL,
  page_opportunity_id TEXT NOT NULL,
  page_type TEXT NOT NULL,
  decision TEXT NOT NULL,
  opportunity JSONB NOT NULL DEFAULT '{}'::JSONB,
  score NUMERIC(6, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS page_opportunities_run_venture_idx
  ON public.page_opportunities (organic_growth_run_id, venture_id);

CREATE TABLE IF NOT EXISTS public.organic_content_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  organic_growth_run_id UUID NOT NULL REFERENCES public.organic_growth_runs (id) ON DELETE CASCADE,
  page_opportunity_id TEXT NOT NULL,
  contract JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.canonical_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  organic_growth_run_id UUID NOT NULL REFERENCES public.organic_growth_runs (id) ON DELETE CASCADE,
  page_opportunity_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPROVED',
  registry_entry JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_urls_run_url_uidx
  ON public.canonical_urls (organic_growth_run_id, url);

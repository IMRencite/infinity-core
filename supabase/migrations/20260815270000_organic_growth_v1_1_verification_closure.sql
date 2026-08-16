-- Organic Growth Architecture Engine v1.1 — Verification Closure
-- Persistence model: organic_growth_build_packages.build_package JSONB is the canonical aggregate.
-- Unused normalized page tables from v1 foundation are removed to avoid dual-authority confusion.

DROP TABLE IF EXISTS public.organic_content_contracts;
DROP TABLE IF EXISTS public.canonical_urls;
DROP TABLE IF EXISTS public.page_opportunities;
DROP TABLE IF EXISTS public.organic_channel_assessments;

CREATE TABLE IF NOT EXISTS public.organic_human_contribution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  organic_growth_run_id UUID NOT NULL REFERENCES public.organic_growth_runs (id) ON DELETE CASCADE,
  organic_growth_build_package_id UUID REFERENCES public.organic_growth_build_packages (id) ON DELETE CASCADE,

  request_id TEXT NOT NULL,
  venture_id TEXT NOT NULL,
  page_opportunity_id TEXT NOT NULL,
  contribution_type TEXT NOT NULL,
  purpose TEXT NOT NULL,
  contribution_class TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT_REQUESTED',

  publication_blocking BOOLEAN NOT NULL DEFAULT FALSE,
  contributor_reference TEXT,
  provenance_reference TEXT,
  supported_claims JSONB NOT NULL DEFAULT '[]'::JSONB,
  verification_status TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT organic_human_contribution_requests_status_valid CHECK (
    status IN ('NOT_REQUESTED', 'REQUESTED', 'RECEIVED', 'VERIFIED', 'REJECTED')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS organic_human_contribution_requests_request_uidx
  ON public.organic_human_contribution_requests (organic_growth_run_id, request_id);

CREATE INDEX IF NOT EXISTS organic_human_contribution_requests_run_idx
  ON public.organic_human_contribution_requests (organic_growth_run_id, page_opportunity_id);

COMMENT ON COLUMN public.organic_growth_build_packages.build_package IS
  'Canonical persisted OrganicGrowthBuildPackage aggregate (JSONB). Normalized child tables are not used.';

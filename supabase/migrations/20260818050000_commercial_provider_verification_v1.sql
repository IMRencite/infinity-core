-- =============================================================================
-- Commercial Provider Verification V1 — read-only capability proof records
-- No secrets. RLS enabled. service_role GRANT. No blanket policies.
-- =============================================================================

CREATE TABLE public.commercial_provider_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  provider_category TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  environment TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'READ_ONLY',
  status TEXT NOT NULL,
  capabilities_checked TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  freshness TEXT NOT NULL,
  failure_code TEXT,
  failure_reason TEXT,
  mutation_authority TEXT NOT NULL DEFAULT 'LOCKED',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercial_provider_verifications_category_valid CHECK (
    provider_category IN ('REGISTRAR', 'DNS', 'HOSTING', 'PAYMENTS')
  ),
  CONSTRAINT commercial_provider_verifications_mode_valid CHECK (mode = 'READ_ONLY'),
  CONSTRAINT commercial_provider_verifications_status_valid CHECK (
    status IN (
      'NOT_CONFIGURED',
      'CONFIGURED_UNVERIFIED',
      'READ_ONLY_VERIFIED',
      'DEGRADED',
      'UNAVAILABLE',
      'FAILED',
      'WRITE_CAPABLE_NOT_AUTHORIZED'
    )
  ),
  CONSTRAINT commercial_provider_verifications_freshness_valid CHECK (
    freshness IN ('VERIFIED_FRESH', 'VERIFIED_STALE', 'NOT_VERIFIED')
  ),
  CONSTRAINT commercial_provider_verifications_authority_valid CHECK (mutation_authority = 'LOCKED')
);

CREATE INDEX commercial_provider_verifications_org_category_idx
  ON public.commercial_provider_verifications (organization_id, provider_category, completed_at DESC);

ALTER TABLE public.commercial_provider_verifications ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.commercial_provider_verifications TO service_role;

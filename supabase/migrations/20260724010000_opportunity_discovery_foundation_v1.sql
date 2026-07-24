-- =============================================================================
-- Opportunity Discovery Foundation v1
-- =============================================================================
-- Normalized signals, reviews, decisions, discovery provider registry, and
-- idempotency keys for deterministic autonomous opportunity discovery.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- discovery_provider_registry
-- -----------------------------------------------------------------------------

CREATE TABLE public.discovery_provider_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID REFERENCES public.organizations (id) ON DELETE RESTRICT,

  provider_key TEXT NOT NULL,
  version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  implementation_key TEXT NOT NULL,

  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT discovery_provider_registry_provider_key_not_blank
    CHECK (BTRIM(provider_key) <> ''),
  CONSTRAINT discovery_provider_registry_version_not_blank
    CHECK (BTRIM(version) <> ''),
  CONSTRAINT discovery_provider_registry_display_name_not_blank
    CHECK (BTRIM(display_name) <> ''),
  CONSTRAINT discovery_provider_registry_implementation_key_not_blank
    CHECK (BTRIM(implementation_key) <> ''),
  CONSTRAINT discovery_provider_registry_status_valid CHECK (
    status IN ('draft', 'active', 'deprecated', 'disabled')
  ),
  CONSTRAINT discovery_provider_registry_type_valid CHECK (
    provider_type IN (
      'deterministic_stub',
      'internal_catalog',
      'api_adapter',
      'web_observer',
      'dataset_feed',
      'human_curated',
      'other'
    )
  )
);

COMMENT ON TABLE public.discovery_provider_registry IS
  'Discovery provider catalog for pluggable opportunity discovery sources.';

CREATE UNIQUE INDEX discovery_provider_registry_global_key_version_uidx
  ON public.discovery_provider_registry (provider_key, version)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX discovery_provider_registry_org_key_version_uidx
  ON public.discovery_provider_registry (organization_id, provider_key, version)
  WHERE organization_id IS NOT NULL;

CREATE INDEX discovery_provider_registry_provider_key_idx
  ON public.discovery_provider_registry (provider_key);

CREATE INDEX discovery_provider_registry_organization_id_idx
  ON public.discovery_provider_registry (organization_id);

CREATE TRIGGER discovery_provider_registry_set_updated_at
  BEFORE UPDATE ON public.discovery_provider_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.discovery_provider_registry (
  organization_id,
  provider_key,
  version,
  display_name,
  provider_type,
  status,
  implementation_key,
  config,
  metadata
) VALUES (
  NULL,
  'discovery.deterministic_stub',
  '1.0.0',
  'Deterministic Discovery Stub Provider',
  'deterministic_stub',
  'active',
  'discovery.deterministic_stub.v1',
  '{"mode":"foundation_v1","creates_ventures":false,"labeled_stub":true}'::JSONB,
  '{"purpose":"Opportunity Discovery Foundation v1 validation"}'::JSONB
);

-- -----------------------------------------------------------------------------
-- opportunities — discovery dedup key
-- -----------------------------------------------------------------------------

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS discovery_dedup_key TEXT;

COMMENT ON COLUMN public.opportunities.discovery_dedup_key IS
  'Idempotency key for discovery-created opportunities within an organization.';

CREATE UNIQUE INDEX IF NOT EXISTS opportunities_org_discovery_dedup_key_uidx
  ON public.opportunities (organization_id, discovery_dedup_key)
  WHERE discovery_dedup_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- discovery_signals
-- -----------------------------------------------------------------------------

CREATE TABLE public.discovery_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  scan_id UUID NOT NULL REFERENCES public.opportunity_scans (id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.discovery_provider_registry (id) ON DELETE SET NULL,

  signal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  external_signal_id TEXT,
  signal_hash TEXT NOT NULL,

  source_url TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,

  relevance_score NUMERIC,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT discovery_signals_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT discovery_signals_signal_hash_not_blank CHECK (BTRIM(signal_hash) <> ''),
  CONSTRAINT discovery_signals_type_valid CHECK (
    signal_type IN (
      'market_signal',
      'customer_pain',
      'search_demand',
      'competitor',
      'trend',
      'pricing',
      'regulation',
      'technology',
      'social_discussion',
      'product_demand',
      'funding',
      'operational',
      'other'
    )
  ),
  CONSTRAINT discovery_signals_relevance_score_range CHECK (
    relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 100)
  )
);

COMMENT ON TABLE public.discovery_signals IS
  'Normalized discovery signals captured during an opportunity scan.';

CREATE INDEX discovery_signals_organization_id_idx
  ON public.discovery_signals (organization_id);

CREATE INDEX discovery_signals_scan_id_idx
  ON public.discovery_signals (scan_id);

CREATE INDEX discovery_signals_organization_scan_idx
  ON public.discovery_signals (organization_id, scan_id);

CREATE INDEX discovery_signals_organization_created_at_idx
  ON public.discovery_signals (organization_id, created_at DESC);

CREATE UNIQUE INDEX discovery_signals_org_signal_hash_uidx
  ON public.discovery_signals (organization_id, signal_hash);

CREATE UNIQUE INDEX discovery_signals_scan_external_signal_uidx
  ON public.discovery_signals (scan_id, external_signal_id)
  WHERE external_signal_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- opportunity_reviews
-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,

  review_type TEXT NOT NULL,
  reviewer_type TEXT NOT NULL,
  verdict TEXT NOT NULL,

  notes TEXT,
  confidence_score NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_reviews_type_valid CHECK (
    review_type IN ('automated', 'human', 'policy', 'scoring', 'validation')
  ),
  CONSTRAINT opportunity_reviews_reviewer_type_valid CHECK (
    reviewer_type IN ('system', 'worker', 'human', 'policy_engine')
  ),
  CONSTRAINT opportunity_reviews_verdict_valid CHECK (
    verdict IN ('pass', 'fail', 'needs_review', 'hold', 'approve', 'reject')
  ),
  CONSTRAINT opportunity_reviews_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT opportunity_reviews_unique_identity UNIQUE (
    organization_id,
    opportunity_id,
    review_type,
    reviewer_type
  )
);

COMMENT ON TABLE public.opportunity_reviews IS
  'Structured reviews of discovered opportunities.';

CREATE INDEX opportunity_reviews_organization_id_idx
  ON public.opportunity_reviews (organization_id);

CREATE INDEX opportunity_reviews_opportunity_id_idx
  ON public.opportunity_reviews (opportunity_id);

CREATE INDEX opportunity_reviews_organization_created_at_idx
  ON public.opportunity_reviews (organization_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- opportunity_decisions
-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,

  decision TEXT NOT NULL,
  previous_decision TEXT,
  reasoning TEXT,
  decided_by_type TEXT NOT NULL,
  dedup_key TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_decisions_decision_valid CHECK (
    decision IN ('pending', 'reject', 'hold', 'research_more', 'validate', 'build')
  ),
  CONSTRAINT opportunity_decisions_previous_decision_valid CHECK (
    previous_decision IS NULL
    OR previous_decision IN ('pending', 'reject', 'hold', 'research_more', 'validate', 'build')
  ),
  CONSTRAINT opportunity_decisions_decided_by_type_valid CHECK (
    decided_by_type IN ('system', 'worker', 'human', 'policy_engine')
  )
);

COMMENT ON TABLE public.opportunity_decisions IS
  'Append-only audit trail of opportunity recommendation decisions.';

CREATE INDEX opportunity_decisions_organization_id_idx
  ON public.opportunity_decisions (organization_id);

CREATE INDEX opportunity_decisions_opportunity_id_idx
  ON public.opportunity_decisions (opportunity_id);

CREATE INDEX opportunity_decisions_organization_created_at_idx
  ON public.opportunity_decisions (organization_id, created_at DESC);

CREATE UNIQUE INDEX opportunity_decisions_org_dedup_key_uidx
  ON public.opportunity_decisions (organization_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- opportunity_scores — version idempotency
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS opportunity_scores_opportunity_version_uidx
  ON public.opportunity_scores (opportunity_id, scoring_version);

-- -----------------------------------------------------------------------------
-- Cross-table organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_discovery_signal_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.opportunity_scans AS s
    WHERE s.id = NEW.scan_id
      AND s.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'discovery_signals.scan_id must belong to organization_id';
  END IF;

  IF NEW.provider_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.discovery_provider_registry AS p
      WHERE p.id = NEW.provider_id
        AND (p.organization_id IS NULL OR p.organization_id = NEW.organization_id)
    ) THEN
      RAISE EXCEPTION 'discovery_signals.provider_id must be global or organization-scoped';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER discovery_signals_validate_organization
  BEFORE INSERT OR UPDATE OF scan_id, provider_id, organization_id ON public.discovery_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_discovery_signal_organization();

CREATE OR REPLACE FUNCTION public.validate_opportunity_review_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.opportunities AS o
    WHERE o.id = NEW.opportunity_id
      AND o.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'opportunity_reviews.opportunity_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER opportunity_reviews_validate_organization
  BEFORE INSERT OR UPDATE OF opportunity_id, organization_id ON public.opportunity_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_opportunity_review_organization();

CREATE OR REPLACE FUNCTION public.validate_opportunity_decision_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.opportunities AS o
    WHERE o.id = NEW.opportunity_id
      AND o.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'opportunity_decisions.opportunity_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER opportunity_decisions_validate_organization
  BEFORE INSERT OR UPDATE OF opportunity_id, organization_id ON public.opportunity_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_opportunity_decision_organization();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.discovery_provider_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY discovery_provider_registry_select_member
  ON public.discovery_provider_registry FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR public.is_organization_member(organization_id)
  );

CREATE POLICY discovery_signals_select_member
  ON public.discovery_signals FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunity_reviews_select_member
  ON public.opportunity_reviews FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunity_decisions_select_member
  ON public.opportunity_decisions FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

GRANT SELECT ON public.discovery_provider_registry TO authenticated;
GRANT SELECT ON public.discovery_signals TO authenticated;
GRANT SELECT ON public.opportunity_reviews TO authenticated;
GRANT SELECT ON public.opportunity_decisions TO authenticated;

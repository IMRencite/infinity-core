-- =============================================================================
-- Opportunity Scanner v1 — Discovery Foundation
-- =============================================================================

CREATE TABLE public.opportunity_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  status TEXT NOT NULL DEFAULT 'requested',
  scanner_version TEXT NOT NULL DEFAULT 'opportunity_scanner_v1',
  scoring_version TEXT NOT NULL DEFAULT 'opportunity_scanner_scoring_v1',

  strategies JSONB NOT NULL DEFAULT '[]'::JSONB,
  search_scope JSONB NOT NULL DEFAULT '{}'::JSONB,
  constraints JSONB NOT NULL DEFAULT '{}'::JSONB,

  research_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  research_call_count INTEGER NOT NULL DEFAULT 0,
  candidates_discovered INTEGER NOT NULL DEFAULT 0,
  candidates_merged INTEGER NOT NULL DEFAULT 0,
  candidates_persisted INTEGER NOT NULL DEFAULT 0,

  token_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  grounding_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_cost_usd NUMERIC(14, 6),
  cost_uncertainty TEXT,

  scanner_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  failure_classification TEXT,
  error_message TEXT,

  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_discovery_runs_idempotency_not_blank
    CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT opportunity_discovery_runs_status_valid CHECK (
    status IN (
      'requested',
      'running',
      'researching',
      'extracting',
      'scoring',
      'completed',
      'failed',
      'policy_blocked'
    )
  )
);

CREATE UNIQUE INDEX opportunity_discovery_runs_org_idempotency_uidx
  ON public.opportunity_discovery_runs (organization_id, idempotency_key);

CREATE INDEX opportunity_discovery_runs_organization_id_idx
  ON public.opportunity_discovery_runs (organization_id, created_at DESC);

COMMENT ON TABLE public.opportunity_discovery_runs IS
  'Controlled opportunity scanner discovery cycles with research provenance and cost tracking.';

-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  discovery_run_id UUID NOT NULL REFERENCES public.opportunity_discovery_runs (id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  problem TEXT,
  target_customer TEXT,
  market TEXT,

  business_model_candidates JSONB NOT NULL DEFAULT '[]'::JSONB,
  revenue_mechanism_candidates JSONB NOT NULL DEFAULT '[]'::JSONB,

  demand_evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  market_evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  competition_evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  monetization_evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  distribution_evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  buildability_evidence JSONB NOT NULL DEFAULT '[]'::JSONB,

  risks JSONB NOT NULL DEFAULT '[]'::JSONB,
  unknowns JSONB NOT NULL DEFAULT '[]'::JSONB,

  research_sources JSONB NOT NULL DEFAULT '[]'::JSONB,
  research_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  discovery_strategies JSONB NOT NULL DEFAULT '[]'::JSONB,

  dedup_key TEXT NOT NULL,
  merge_group_key TEXT,

  opportunity_score NUMERIC(5, 2),
  rank_position INTEGER,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_candidates_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT opportunity_candidates_summary_not_blank CHECK (BTRIM(summary) <> ''),
  CONSTRAINT opportunity_candidates_dedup_key_not_blank CHECK (BTRIM(dedup_key) <> ''),
  CONSTRAINT opportunity_candidates_opportunity_score_range CHECK (
    opportunity_score IS NULL OR (opportunity_score >= 0 AND opportunity_score <= 100)
  )
);

CREATE UNIQUE INDEX opportunity_candidates_org_dedup_key_uidx
  ON public.opportunity_candidates (organization_id, dedup_key);

CREATE INDEX opportunity_candidates_discovery_run_id_idx
  ON public.opportunity_candidates (discovery_run_id);

CREATE INDEX opportunity_candidates_organization_score_idx
  ON public.opportunity_candidates (organization_id, opportunity_score DESC NULLS LAST);

CREATE TRIGGER opportunity_candidates_set_updated_at
  BEFORE UPDATE ON public.opportunity_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.opportunity_candidates IS
  'Canonical opportunity candidates discovered by the Opportunity Scanner v1.';

-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_candidate_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,
  discovery_run_id UUID NOT NULL REFERENCES public.opportunity_discovery_runs (id) ON DELETE CASCADE,
  research_run_id UUID REFERENCES public.research_runs (id) ON DELETE SET NULL,

  signal_category TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  claim TEXT,

  source_url TEXT,
  source_title TEXT,
  source_domain TEXT,

  grounded BOOLEAN NOT NULL DEFAULT FALSE,
  provider_confidence NUMERIC(5, 4),

  extracted_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_candidate_evidence_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT opportunity_candidate_evidence_signal_category_valid CHECK (
    signal_category IN (
      'demand',
      'market_change',
      'competition',
      'monetization',
      'buildability',
      'distribution'
    )
  )
);

CREATE INDEX opportunity_candidate_evidence_candidate_id_idx
  ON public.opportunity_candidate_evidence (candidate_id);

CREATE INDEX opportunity_candidate_evidence_discovery_run_id_idx
  ON public.opportunity_candidate_evidence (discovery_run_id);

COMMENT ON TABLE public.opportunity_candidate_evidence IS
  'Structured evidence rows attached to opportunity scanner candidates.';

-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_candidate_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,
  discovery_run_id UUID NOT NULL REFERENCES public.opportunity_discovery_runs (id) ON DELETE CASCADE,

  scoring_version TEXT NOT NULL,

  demand_score NUMERIC(5, 2),
  market_growth_score NUMERIC(5, 2),
  competition_opportunity_score NUMERIC(5, 2),
  monetization_potential_score NUMERIC(5, 2),
  buildability_score NUMERIC(5, 2),
  automation_score NUMERIC(5, 2),
  distribution_score NUMERIC(5, 2),
  capital_efficiency_score NUMERIC(5, 2),
  speed_to_revenue_score NUMERIC(5, 2),
  evidence_confidence_score NUMERIC(5, 2),

  opportunity_score NUMERIC(5, 2) NOT NULL,
  weighted_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
  scoring_inputs JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_candidate_scores_scoring_version_not_blank
    CHECK (BTRIM(scoring_version) <> ''),
  CONSTRAINT opportunity_candidate_scores_opportunity_score_range CHECK (
    opportunity_score >= 0 AND opportunity_score <= 100
  )
);

CREATE UNIQUE INDEX opportunity_candidate_scores_candidate_version_uidx
  ON public.opportunity_candidate_scores (candidate_id, scoring_version);

CREATE INDEX opportunity_candidate_scores_discovery_run_id_idx
  ON public.opportunity_candidate_scores (discovery_run_id);

COMMENT ON TABLE public.opportunity_candidate_scores IS
  'Deterministic preliminary scores for opportunity scanner candidates.';

-- -----------------------------------------------------------------------------

ALTER TABLE public.opportunity_discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_candidate_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_candidate_scores ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.opportunity_discovery_runs TO service_role;
GRANT ALL ON public.opportunity_candidates TO service_role;
GRANT ALL ON public.opportunity_candidate_evidence TO service_role;
GRANT ALL ON public.opportunity_candidate_scores TO service_role;

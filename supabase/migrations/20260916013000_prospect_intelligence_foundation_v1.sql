-- =============================================================================
-- Prospect Intelligence Foundation v1
-- Infinity OS canonical commercial intelligence graph.
-- Canonical people/organizations have no venture_id.
-- Venture relationships live on match / inventory / outreach tables only.
-- Additive and reversible: CREATE IF NOT EXISTS only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.prospect_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  name TEXT NOT NULL,
  jurisdiction TEXT,
  base_url TEXT,
  acquisition_method TEXT NOT NULL,
  usage_policy TEXT NOT NULL DEFAULT 'restricted',
  licensing_notes TEXT NOT NULL DEFAULT '',
  data_categories JSONB NOT NULL DEFAULT '[]'::JSONB,
  refresh_cadence TEXT NOT NULL DEFAULT 'weekly',
  reliability NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_success TIMESTAMPTZ,
  last_failure TIMESTAMPTZ,
  health TEXT NOT NULL DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prospect_sources_health_valid CHECK (health IN ('HEALTHY', 'DEGRADED', 'FAILED', 'UNKNOWN'))
);

CREATE TABLE IF NOT EXISTS public.prospect_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id TEXT NOT NULL UNIQUE,
  source_id TEXT NOT NULL REFERENCES public.prospect_sources (source_id) ON DELETE RESTRICT,
  observed_at TIMESTAMPTZ NOT NULL,
  entity_hint TEXT,
  field TEXT NOT NULL,
  raw_value JSONB NOT NULL,
  normalized_value JSONB,
  usage_restricted BOOLEAN NOT NULL DEFAULT TRUE,
  superseded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prospect_observations_source_idx ON public.prospect_observations (source_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS prospect_observations_entity_hint_idx ON public.prospect_observations (entity_hint);

CREATE TABLE IF NOT EXISTS public.prospect_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  last_verified_at TIMESTAMPTZ,
  refresh_after TIMESTAMPTZ,
  source_id TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  freshness_status TEXT NOT NULL DEFAULT 'CURRENT',
  merge_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prospect_entities_kind_valid CHECK (
    kind IN ('PERSON', 'ORGANIZATION', 'LOCATION', 'CONTACT_POINT', 'ROLE', 'DOMAIN', 'LICENSE', 'PERMIT', 'PROPERTY', 'TECHNOLOGY')
  ),
  CONSTRAINT prospect_entities_no_venture CHECK (true)
);

CREATE INDEX IF NOT EXISTS prospect_entities_kind_idx ON public.prospect_entities (kind);
CREATE INDEX IF NOT EXISTS prospect_entities_refresh_idx ON public.prospect_entities (refresh_after);

CREATE TABLE IF NOT EXISTS public.prospect_entity_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_id TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  scheme TEXT NOT NULL,
  value TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_entity_identifiers_scheme_value_uidx
  ON public.prospect_entity_identifiers (scheme, lower(value));
CREATE INDEX IF NOT EXISTS prospect_entity_identifiers_entity_idx ON public.prospect_entity_identifiers (entity_id);

CREATE TABLE IF NOT EXISTS public.prospect_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prospect_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  industry TEXT,
  employee_range TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prospect_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id TEXT NOT NULL UNIQUE,
  from_entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  to_entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prospect_relationships_from_idx ON public.prospect_relationships (from_entity_id, type);
CREATE INDEX IF NOT EXISTS prospect_relationships_to_idx ON public.prospect_relationships (to_entity_id, type);

CREATE TABLE IF NOT EXISTS public.prospect_derived_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value JSONB NOT NULL,
  inference BOOLEAN NOT NULL DEFAULT TRUE,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prospect_derived_requires_evidence CHECK (jsonb_array_length(evidence_ids) > 0)
);

CREATE TABLE IF NOT EXISTS public.prospect_venture_match_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT NOT NULL UNIQUE,
  venture_id TEXT NOT NULL UNIQUE,
  icp JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prospect_venture_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL UNIQUE,
  prospect_entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL,
  fit_score NUMERIC(6,3) NOT NULL,
  fit_band TEXT NOT NULL,
  fit_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  disqualifiers JSONB NOT NULL DEFAULT '[]'::JSONB,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  confidence NUMERIC(4,3) NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL,
  next_evaluation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prospect_matches_band_valid CHECK (fit_band IN ('HIGH', 'MEDIUM', 'LOW', 'NONE'))
);

CREATE INDEX IF NOT EXISTS prospect_venture_matches_venture_idx ON public.prospect_venture_matches (venture_id, fit_band);
CREATE INDEX IF NOT EXISTS prospect_venture_matches_entity_idx ON public.prospect_venture_matches (prospect_entity_id);

CREATE TABLE IF NOT EXISTS public.prospect_communication_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eligibility_id TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_eligibility_entity_channel_uidx
  ON public.prospect_communication_eligibility (entity_id, channel);

CREATE TABLE IF NOT EXISTS public.prospect_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suppression_id TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  kind TEXT NOT NULL,
  recycle_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prospect_suppressions_entity_idx ON public.prospect_suppressions (entity_id);

CREATE TABLE IF NOT EXISTS public.prospect_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  evidence TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prospect_outcomes_venture_idx ON public.prospect_outcomes (venture_id, at DESC);

CREATE TABLE IF NOT EXISTS public.prospect_outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL REFERENCES public.prospect_entities (entity_id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  scheduled_follow_up_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prospect_outreach_entity_venture_idx ON public.prospect_outreach_history (entity_id, venture_id);

CREATE TABLE IF NOT EXISTS public.prospect_venture_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id TEXT NOT NULL UNIQUE,
  target_ready_inventory INTEGER NOT NULL DEFAULT 50,
  minimum_ready_inventory INTEGER NOT NULL DEFAULT 10,
  current_ready_inventory INTEGER NOT NULL DEFAULT 0,
  average_daily_consumption NUMERIC(10,2) NOT NULL DEFAULT 5,
  coverage_days NUMERIC(10,2) NOT NULL DEFAULT 0,
  enrichment_backlog INTEGER NOT NULL DEFAULT 0,
  refresh_health TEXT NOT NULL DEFAULT 'HEALTHY',
  states JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prospect_intelligence_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'requested',
  engine_version TEXT NOT NULL DEFAULT 'prospect_intelligence_v1',
  engine_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_intelligence_runs_idempotency_uidx
  ON public.prospect_intelligence_runs (idempotency_key);

INSERT INTO public.capability_registry (
  organization_id,
  capability_key,
  version,
  display_name,
  capability_type,
  engine_name,
  status,
  health_status,
  is_default,
  implementation_key,
  input_schema,
  output_schema,
  policy_requirements,
  provider_metadata
)
SELECT
  NULL,
  'prospect.intelligence.shared',
  '1.0.0',
  'Shared Prospect Intelligence',
  'engine',
  'prospect_intelligence',
  'active',
  'unknown',
  TRUE,
  'prospect.intelligence.v1',
  '{"type":"object"}'::JSONB,
  '{"type":"object"}'::JSONB,
  '{"consumers":["authorized_infinity_systems"]}'::JSONB,
  '{}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry WHERE capability_key = 'prospect.intelligence.shared'
);

ALTER TABLE public.prospect_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_entity_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_derived_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_venture_match_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_venture_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_communication_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_outreach_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_venture_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_intelligence_runs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.prospect_sources TO service_role;
GRANT ALL ON public.prospect_observations TO service_role;
GRANT ALL ON public.prospect_entities TO service_role;
GRANT ALL ON public.prospect_entity_identifiers TO service_role;
GRANT ALL ON public.prospect_people TO service_role;
GRANT ALL ON public.prospect_organizations TO service_role;
GRANT ALL ON public.prospect_relationships TO service_role;
GRANT ALL ON public.prospect_derived_attributes TO service_role;
GRANT ALL ON public.prospect_venture_match_rules TO service_role;
GRANT ALL ON public.prospect_venture_matches TO service_role;
GRANT ALL ON public.prospect_communication_eligibility TO service_role;
GRANT ALL ON public.prospect_suppressions TO service_role;
GRANT ALL ON public.prospect_outcomes TO service_role;
GRANT ALL ON public.prospect_outreach_history TO service_role;
GRANT ALL ON public.prospect_venture_inventory TO service_role;
GRANT ALL ON public.prospect_intelligence_runs TO service_role;

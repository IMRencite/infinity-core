-- =============================================================================
-- Monetization Engine v1 — Economic Analysis Foundation
-- =============================================================================

CREATE TABLE public.monetization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  status TEXT NOT NULL DEFAULT 'requested',
  engine_version TEXT NOT NULL DEFAULT 'monetization_engine_v1',
  scoring_version TEXT NOT NULL DEFAULT 'monetization_scoring_v1',

  opportunity_candidate_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  discovery_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  research_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,

  candidates_analyzed INTEGER NOT NULL DEFAULT 0,
  plans_generated INTEGER NOT NULL DEFAULT 0,
  revenue_streams_generated INTEGER NOT NULL DEFAULT 0,

  research_call_count INTEGER NOT NULL DEFAULT 0,
  token_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  grounding_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_cost_usd NUMERIC(14, 6),
  cost_uncertainty TEXT,

  engine_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  failure_classification TEXT,
  error_message TEXT,

  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monetization_runs_idempotency_not_blank
    CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT monetization_runs_status_valid CHECK (
    status IN (
      'requested',
      'running',
      'researching',
      'analyzing',
      'scoring',
      'completed',
      'failed',
      'policy_blocked'
    )
  )
);

CREATE UNIQUE INDEX monetization_runs_org_idempotency_uidx
  ON public.monetization_runs (organization_id, idempotency_key);

CREATE INDEX monetization_runs_organization_id_idx
  ON public.monetization_runs (organization_id, created_at DESC);

COMMENT ON TABLE public.monetization_runs IS
  'Controlled monetization analysis cycles with research provenance and cost tracking.';

-- -----------------------------------------------------------------------------

CREATE TABLE public.monetization_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  monetization_run_id UUID NOT NULL REFERENCES public.monetization_runs (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,
  discovery_run_id UUID REFERENCES public.opportunity_discovery_runs (id) ON DELETE SET NULL,

  plan_role TEXT NOT NULL DEFAULT 'primary',
  model_type TEXT NOT NULL,
  model_name TEXT NOT NULL,

  customer_type TEXT,
  customer_description TEXT,
  payer TEXT,
  beneficiary TEXT,

  value_proposition TEXT,
  purchase_trigger TEXT,
  offer_description TEXT,

  pricing_model TEXT,
  estimated_price_low NUMERIC(14, 2),
  estimated_price_base NUMERIC(14, 2),
  estimated_price_high NUMERIC(14, 2),
  billing_frequency TEXT,

  estimated_customers_year1 NUMERIC(14, 2),
  estimated_revenue_per_customer NUMERIC(14, 2),
  estimated_gross_revenue_year1 NUMERIC(14, 2),
  estimated_gross_margin_percent NUMERIC(5, 2),
  estimated_variable_costs NUMERIC(14, 2),
  estimated_fixed_costs NUMERIC(14, 2),
  estimated_cac NUMERIC(14, 2),
  estimated_ltv NUMERIC(14, 2),
  ltv_cac_ratio NUMERIC(8, 4),
  contribution_margin_per_customer NUMERIC(14, 2),
  break_even_customers NUMERIC(14, 2),

  estimated_months_to_first_revenue NUMERIC(5, 2),
  estimated_months_to_break_even NUMERIC(5, 2),
  estimated_capital_required NUMERIC(14, 2),

  automation_potential NUMERIC(5, 4),
  scalability_score NUMERIC(5, 2),
  margin_score NUMERIC(5, 2),
  speed_to_revenue_score NUMERIC(5, 2),
  customer_acquisition_difficulty NUMERIC(5, 4),
  technical_complexity NUMERIC(5, 4),
  operational_complexity NUMERIC(5, 4),
  regulatory_risk NUMERIC(5, 4),
  platform_dependency_risk NUMERIC(5, 4),

  monetization_confidence NUMERIC(5, 4),
  monetization_score NUMERIC(5, 2),

  key_assumptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  risks JSONB NOT NULL DEFAULT '[]'::JSONB,
  source_urls JSONB NOT NULL DEFAULT '[]'::JSONB,
  research_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,

  economics_inputs JSONB NOT NULL DEFAULT '{}'::JSONB,
  economics_derived JSONB NOT NULL DEFAULT '{}'::JSONB,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monetization_plans_model_name_not_blank CHECK (BTRIM(model_name) <> ''),
  CONSTRAINT monetization_plans_plan_role_valid CHECK (
    plan_role IN ('primary', 'secondary', 'future')
  ),
  CONSTRAINT monetization_plans_monetization_score_range CHECK (
    monetization_score IS NULL OR (monetization_score >= 0 AND monetization_score <= 100)
  )
);

CREATE INDEX monetization_plans_run_id_idx
  ON public.monetization_plans (monetization_run_id);

CREATE INDEX monetization_plans_candidate_id_idx
  ON public.monetization_plans (opportunity_candidate_id);

CREATE TRIGGER monetization_plans_set_updated_at
  BEFORE UPDATE ON public.monetization_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.monetization_plans IS
  'Structured monetization plans for opportunity candidates.';

-- -----------------------------------------------------------------------------

CREATE TABLE public.monetization_revenue_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  monetization_plan_id UUID NOT NULL REFERENCES public.monetization_plans (id) ON DELETE CASCADE,
  monetization_run_id UUID NOT NULL REFERENCES public.monetization_runs (id) ON DELETE CASCADE,

  stream_role TEXT NOT NULL DEFAULT 'primary',
  stream_name TEXT NOT NULL,
  model_type TEXT NOT NULL,

  description TEXT,
  payer TEXT,
  pricing_model TEXT,
  estimated_price_base NUMERIC(14, 2),
  billing_frequency TEXT,
  estimated_share_of_revenue_percent NUMERIC(5, 2),
  estimated_customers_year1 NUMERIC(14, 2),
  estimated_revenue_year1 NUMERIC(14, 2),

  automation_potential NUMERIC(5, 4),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monetization_revenue_streams_name_not_blank CHECK (BTRIM(stream_name) <> ''),
  CONSTRAINT monetization_revenue_streams_role_valid CHECK (
    stream_role IN ('primary', 'secondary', 'future')
  )
);

CREATE INDEX monetization_revenue_streams_plan_id_idx
  ON public.monetization_revenue_streams (monetization_plan_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.monetization_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  monetization_plan_id UUID NOT NULL REFERENCES public.monetization_plans (id) ON DELETE CASCADE,
  monetization_run_id UUID NOT NULL REFERENCES public.monetization_runs (id) ON DELETE CASCADE,

  assumption_key TEXT NOT NULL,
  assumption_value TEXT NOT NULL,
  assumption_category TEXT NOT NULL DEFAULT 'general',
  confidence NUMERIC(5, 4),
  source_type TEXT NOT NULL DEFAULT 'model_inference',

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX monetization_assumptions_plan_id_idx
  ON public.monetization_assumptions (monetization_plan_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.monetization_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  monetization_plan_id UUID REFERENCES public.monetization_plans (id) ON DELETE CASCADE,
  monetization_run_id UUID NOT NULL REFERENCES public.monetization_runs (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID REFERENCES public.opportunity_candidates (id) ON DELETE SET NULL,
  research_run_id UUID REFERENCES public.research_runs (id) ON DELETE SET NULL,

  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  claim TEXT,
  summary TEXT,

  source_url TEXT,
  source_title TEXT,
  source_domain TEXT,
  grounded BOOLEAN NOT NULL DEFAULT FALSE,

  extracted_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monetization_evidence_title_not_blank CHECK (BTRIM(title) <> '')
);

CREATE INDEX monetization_evidence_plan_id_idx
  ON public.monetization_evidence (monetization_plan_id);

CREATE INDEX monetization_evidence_run_id_idx
  ON public.monetization_evidence (monetization_run_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.monetization_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  monetization_plan_id UUID NOT NULL REFERENCES public.monetization_plans (id) ON DELETE CASCADE,
  monetization_run_id UUID NOT NULL REFERENCES public.monetization_runs (id) ON DELETE CASCADE,

  scenario_type TEXT NOT NULL,
  milestone_month INTEGER NOT NULL,

  estimated_customers NUMERIC(14, 2),
  estimated_revenue NUMERIC(14, 2),
  estimated_cost NUMERIC(14, 2),
  estimated_gross_profit NUMERIC(14, 2),

  assumptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monetization_scenarios_type_valid CHECK (
    scenario_type IN ('conservative', 'base', 'aggressive')
  ),
  CONSTRAINT monetization_scenarios_milestone_valid CHECK (
    milestone_month IN (1, 3, 6, 12)
  )
);

CREATE UNIQUE INDEX monetization_scenarios_plan_type_month_uidx
  ON public.monetization_scenarios (monetization_plan_id, scenario_type, milestone_month);

-- -----------------------------------------------------------------------------

CREATE TABLE public.monetization_plan_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  monetization_plan_id UUID NOT NULL REFERENCES public.monetization_plans (id) ON DELETE CASCADE,
  monetization_run_id UUID NOT NULL REFERENCES public.monetization_runs (id) ON DELETE CASCADE,

  scoring_version TEXT NOT NULL,

  revenue_potential_score NUMERIC(5, 2),
  margin_potential_score NUMERIC(5, 2),
  speed_to_revenue_score NUMERIC(5, 2),
  recurring_revenue_potential_score NUMERIC(5, 2),
  automation_potential_score NUMERIC(5, 2),
  scalability_score NUMERIC(5, 2),
  customer_acquisition_feasibility_score NUMERIC(5, 2),
  capital_efficiency_score NUMERIC(5, 2),
  competition_score NUMERIC(5, 2),
  platform_dependency_score NUMERIC(5, 2),
  operational_complexity_score NUMERIC(5, 2),
  technical_complexity_score NUMERIC(5, 2),
  evidence_confidence_score NUMERIC(5, 2),

  monetization_score NUMERIC(5, 2) NOT NULL,
  weighted_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
  scoring_inputs JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monetization_plan_scores_version_not_blank
    CHECK (BTRIM(scoring_version) <> ''),
  CONSTRAINT monetization_plan_scores_score_range CHECK (
    monetization_score >= 0 AND monetization_score <= 100
  )
);

CREATE UNIQUE INDEX monetization_plan_scores_plan_version_uidx
  ON public.monetization_plan_scores (monetization_plan_id, scoring_version);

-- -----------------------------------------------------------------------------

CREATE TABLE public.monetization_candidate_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  monetization_run_id UUID NOT NULL REFERENCES public.monetization_runs (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,
  discovery_run_id UUID REFERENCES public.opportunity_discovery_runs (id) ON DELETE SET NULL,
  primary_plan_id UUID REFERENCES public.monetization_plans (id) ON DELETE SET NULL,

  opportunity_score NUMERIC(5, 2),
  monetization_score NUMERIC(5, 2),
  combined_decision_score NUMERIC(5, 2),
  economic_viability TEXT NOT NULL,

  recommended_primary_model TEXT,
  recommended_secondary_models JSONB NOT NULL DEFAULT '[]'::JSONB,
  recommended_pricing_strategy TEXT,
  recommended_customer TEXT,
  recommended_acquisition_strategy TEXT,
  expected_revenue_mechanism TEXT,
  expected_time_to_revenue TEXT,
  estimated_startup_capital NUMERIC(14, 2),

  key_economic_assumptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  largest_economic_risks JSONB NOT NULL DEFAULT '[]'::JSONB,
  recommendation_confidence NUMERIC(5, 4),

  research_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monetization_candidate_analyses_viability_valid CHECK (
    economic_viability IN ('STRONG', 'PROMISING', 'SPECULATIVE', 'WEAK', 'REJECT')
  )
);

CREATE UNIQUE INDEX monetization_candidate_analyses_run_candidate_uidx
  ON public.monetization_candidate_analyses (monetization_run_id, opportunity_candidate_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.monetization_validation_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  monetization_run_id UUID NOT NULL REFERENCES public.monetization_runs (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,
  monetization_plan_id UUID REFERENCES public.monetization_plans (id) ON DELETE SET NULL,

  experiment_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost_usd NUMERIC(14, 2),
  priority INTEGER NOT NULL DEFAULT 1,
  execution_status TEXT NOT NULL DEFAULT 'recommended',

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monetization_validation_experiments_title_not_blank
    CHECK (BTRIM(title) <> ''),
  CONSTRAINT monetization_validation_experiments_status_valid CHECK (
    execution_status IN ('recommended', 'approved', 'running', 'completed', 'cancelled')
  )
);

CREATE INDEX monetization_validation_experiments_run_id_idx
  ON public.monetization_validation_experiments (monetization_run_id);

-- -----------------------------------------------------------------------------

ALTER TABLE public.monetization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_revenue_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_plan_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_candidate_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_validation_experiments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.monetization_runs TO service_role;
GRANT ALL ON public.monetization_plans TO service_role;
GRANT ALL ON public.monetization_revenue_streams TO service_role;
GRANT ALL ON public.monetization_assumptions TO service_role;
GRANT ALL ON public.monetization_evidence TO service_role;
GRANT ALL ON public.monetization_scenarios TO service_role;
GRANT ALL ON public.monetization_plan_scores TO service_role;
GRANT ALL ON public.monetization_candidate_analyses TO service_role;
GRANT ALL ON public.monetization_validation_experiments TO service_role;

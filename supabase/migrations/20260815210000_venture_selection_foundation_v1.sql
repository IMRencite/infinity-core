-- =============================================================================
-- Venture Selection v1 — Opportunity Validation + Venture Selection Foundation
-- =============================================================================

CREATE TABLE public.venture_selection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  status TEXT NOT NULL DEFAULT 'requested',
  engine_version TEXT NOT NULL DEFAULT 'venture_selection_v1',
  scoring_version TEXT NOT NULL DEFAULT 'venture_selection_scoring_v1',

  monetization_run_id UUID REFERENCES public.monetization_runs (id) ON DELETE SET NULL,
  opportunity_candidate_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  discovery_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  monetization_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  reasoning_run_ids JSONB NOT NULL DEFAULT '[]'::JSONB,

  candidates_evaluated INTEGER NOT NULL DEFAULT 0,
  build_count INTEGER NOT NULL DEFAULT 0,
  validate_count INTEGER NOT NULL DEFAULT 0,
  hold_count INTEGER NOT NULL DEFAULT 0,
  reject_count INTEGER NOT NULL DEFAULT 0,
  handoffs_created INTEGER NOT NULL DEFAULT 0,

  token_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_cost_usd NUMERIC(14, 6),
  cost_uncertainty TEXT,

  resource_allocation_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  selection_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  failure_classification TEXT,
  error_message TEXT,

  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT venture_selection_runs_idempotency_not_blank
    CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT venture_selection_runs_status_valid CHECK (
    status IN (
      'requested',
      'running',
      'validating',
      'ranking',
      'completed',
      'failed',
      'policy_blocked'
    )
  )
);

CREATE UNIQUE INDEX venture_selection_runs_org_idempotency_uidx
  ON public.venture_selection_runs (organization_id, idempotency_key);

CREATE INDEX venture_selection_runs_organization_id_idx
  ON public.venture_selection_runs (organization_id, created_at DESC);

COMMENT ON TABLE public.venture_selection_runs IS
  'Controlled venture selection cycles comparing opportunity candidates for pursuit decisions.';

-- -----------------------------------------------------------------------------

CREATE TABLE public.candidate_selection_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,
  monetization_run_id UUID REFERENCES public.monetization_runs (id) ON DELETE SET NULL,
  monetization_analysis_id UUID REFERENCES public.monetization_candidate_analyses (id) ON DELETE SET NULL,
  primary_plan_id UUID REFERENCES public.monetization_plans (id) ON DELETE SET NULL,
  discovery_run_id UUID REFERENCES public.opportunity_discovery_runs (id) ON DELETE SET NULL,

  opportunity_score NUMERIC(5, 2),
  monetization_score NUMERIC(5, 2),
  validation_score NUMERIC(5, 2),
  buildability_score NUMERIC(5, 2),
  selection_score NUMERIC(5, 2),
  portfolio_adjusted_score NUMERIC(5, 2),

  decision TEXT NOT NULL,
  recommended_next_action TEXT,

  estimated_capital_required NUMERIC(14, 2),
  expected_12_month_revenue NUMERIC(14, 2),
  expected_12_month_profit NUMERIC(14, 2),
  expected_roi NUMERIC(8, 4),
  estimated_time_to_revenue NUMERIC(5, 2),
  primary_monetization_model TEXT,
  confidence NUMERIC(5, 4),
  fatal_assumption_risk_score NUMERIC(5, 2),
  assumption_uncertainty_score NUMERIC(5, 2),

  blocking_assumptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  dependency_tags JSONB NOT NULL DEFAULT '[]'::JSONB,
  correlation_penalties JSONB NOT NULL DEFAULT '[]'::JSONB,
  validation_dimensions JSONB NOT NULL DEFAULT '{}'::JSONB,
  expected_value_inputs JSONB NOT NULL DEFAULT '{}'::JSONB,
  expected_value_derived JSONB NOT NULL DEFAULT '{}'::JSONB,
  speed_to_value JSONB NOT NULL DEFAULT '{}'::JSONB,
  capital_efficiency JSONB NOT NULL DEFAULT '{}'::JSONB,

  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_freshness TIMESTAMPTZ,
  recheck_after TIMESTAMPTZ,
  stale_after TIMESTAMPTZ,

  queue_rank INTEGER,
  queue_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT candidate_selection_evaluations_decision_valid CHECK (
    decision IN ('BUILD', 'VALIDATE', 'HOLD', 'REJECT')
  )
);

CREATE UNIQUE INDEX candidate_selection_evaluations_run_candidate_uidx
  ON public.candidate_selection_evaluations (venture_selection_run_id, opportunity_candidate_id);

CREATE INDEX candidate_selection_evaluations_candidate_id_idx
  ON public.candidate_selection_evaluations (opportunity_candidate_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.candidate_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,
  candidate_selection_evaluation_id UUID NOT NULL REFERENCES public.candidate_selection_evaluations (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,

  assumption TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  assumption_type TEXT NOT NULL DEFAULT 'estimated',
  value TEXT,
  confidence NUMERIC(5, 4),
  evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  source_urls JSONB NOT NULL DEFAULT '[]'::JSONB,
  impact_if_wrong TEXT,
  validation_method TEXT,
  validation_cost_estimate NUMERIC(14, 2),
  validation_time_estimate NUMERIC(5, 2),
  impact_score NUMERIC(5, 4),
  uncertainty_score NUMERIC(5, 4),
  fatal_risk_contribution NUMERIC(5, 4),

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT candidate_assumptions_type_valid CHECK (
    assumption_type IN ('fact', 'derived', 'estimated', 'unknown')
  )
);

CREATE INDEX candidate_assumptions_evaluation_id_idx
  ON public.candidate_assumptions (candidate_selection_evaluation_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.validation_experiment_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,
  candidate_selection_evaluation_id UUID NOT NULL REFERENCES public.candidate_selection_evaluations (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,
  monetization_experiment_id UUID REFERENCES public.monetization_validation_experiments (id) ON DELETE SET NULL,

  experiment_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority_rank INTEGER NOT NULL,
  priority_score NUMERIC(8, 4),
  information_gain_score NUMERIC(5, 4),
  assumption_impact_score NUMERIC(5, 4),
  uncertainty_score NUMERIC(5, 4),
  estimated_cost_usd NUMERIC(14, 2),
  estimated_time_days NUMERIC(5, 2),
  execution_status TEXT NOT NULL DEFAULT 'recommended',

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT validation_experiment_priorities_status_valid CHECK (
    execution_status IN ('recommended', 'approved', 'running', 'completed', 'cancelled')
  )
);

CREATE INDEX validation_experiment_priorities_evaluation_id_idx
  ON public.validation_experiment_priorities (candidate_selection_evaluation_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.buildability_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,
  candidate_selection_evaluation_id UUID NOT NULL REFERENCES public.candidate_selection_evaluations (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,

  buildability_score NUMERIC(5, 2) NOT NULL,
  automation_score NUMERIC(5, 2),
  operational_autonomy_score NUMERIC(5, 2),
  external_dependency_score NUMERIC(5, 2),

  can_build_software BOOLEAN NOT NULL DEFAULT TRUE,
  can_automate_acquisition BOOLEAN NOT NULL DEFAULT FALSE,
  can_automate_fulfillment BOOLEAN NOT NULL DEFAULT FALSE,
  can_automate_support BOOLEAN NOT NULL DEFAULT FALSE,
  requires_physical_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  requires_specialized_employees BOOLEAN NOT NULL DEFAULT FALSE,
  requires_licensing BOOLEAN NOT NULL DEFAULT FALSE,
  requires_large_upfront_capital BOOLEAN NOT NULL DEFAULT FALSE,
  depends_on_manual_sales BOOLEAN NOT NULL DEFAULT FALSE,
  depends_on_inaccessible_systems BOOLEAN NOT NULL DEFAULT FALSE,
  can_deliver_digitally BOOLEAN NOT NULL DEFAULT TRUE,

  assessment_inputs JSONB NOT NULL DEFAULT '{}'::JSONB,
  assessment_notes JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX buildability_assessments_evaluation_uidx
  ON public.buildability_assessments (candidate_selection_evaluation_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.adversarial_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,
  candidate_selection_evaluation_id UUID NOT NULL REFERENCES public.candidate_selection_evaluations (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  model TEXT,
  reasoning_run_id UUID,

  findings JSONB NOT NULL DEFAULT '[]'::JSONB,
  risk_inputs JSONB NOT NULL DEFAULT '{}'::JSONB,
  summary TEXT,
  confidence NUMERIC(5, 4),

  token_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_cost_usd NUMERIC(14, 6),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX adversarial_reviews_evaluation_uidx
  ON public.adversarial_reviews (candidate_selection_evaluation_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.selection_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,
  candidate_selection_evaluation_id UUID NOT NULL REFERENCES public.candidate_selection_evaluations (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,

  why_this_opportunity TEXT,
  why_now TEXT,
  why_infinity_can_build_it TEXT,
  why_customers_will_pay TEXT,
  why_this_model TEXT,
  why_it_ranks_above_alternatives TEXT,
  largest_risks JSONB NOT NULL DEFAULT '[]'::JSONB,
  fatal_assumptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  validation_needed JSONB NOT NULL DEFAULT '[]'::JSONB,
  expected_economics JSONB NOT NULL DEFAULT '{}'::JSONB,
  resource_requirements JSONB NOT NULL DEFAULT '{}'::JSONB,
  confidence NUMERIC(5, 4),

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX selection_explanations_evaluation_uidx
  ON public.selection_explanations (candidate_selection_evaluation_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.venture_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,
  candidate_selection_evaluation_id UUID NOT NULL REFERENCES public.candidate_selection_evaluations (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,

  queue_rank INTEGER NOT NULL,
  decision TEXT NOT NULL,
  recommended_next_action TEXT,
  selection_score NUMERIC(5, 2) NOT NULL,
  portfolio_adjusted_score NUMERIC(5, 2),

  opportunity_score NUMERIC(5, 2),
  monetization_score NUMERIC(5, 2),
  validation_score NUMERIC(5, 2),
  buildability_score NUMERIC(5, 2),

  estimated_capital_required NUMERIC(14, 2),
  expected_12_month_revenue NUMERIC(14, 2),
  expected_12_month_profit NUMERIC(14, 2),
  expected_roi NUMERIC(8, 4),
  estimated_time_to_revenue NUMERIC(5, 2),
  primary_monetization_model TEXT,
  confidence NUMERIC(5, 4),

  blocking_assumptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  recommended_validation_experiments JSONB NOT NULL DEFAULT '[]'::JSONB,
  queue_reason TEXT,

  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recheck_after TIMESTAMPTZ,
  stale_after TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT venture_queue_items_decision_valid CHECK (
    decision IN ('BUILD', 'VALIDATE', 'HOLD', 'REJECT')
  )
);

CREATE UNIQUE INDEX venture_queue_items_run_candidate_uidx
  ON public.venture_queue_items (venture_selection_run_id, opportunity_candidate_id);

CREATE INDEX venture_queue_items_run_rank_idx
  ON public.venture_queue_items (venture_selection_run_id, queue_rank);

-- -----------------------------------------------------------------------------

CREATE TABLE public.venture_selection_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,
  candidate_selection_evaluation_id UUID NOT NULL REFERENCES public.candidate_selection_evaluations (id) ON DELETE CASCADE,
  opportunity_candidate_id UUID NOT NULL REFERENCES public.opportunity_candidates (id) ON DELETE CASCADE,

  business_concept TEXT NOT NULL,
  target_customer TEXT,
  problem TEXT,
  solution TEXT,

  primary_monetization_model TEXT,
  secondary_revenue_streams JSONB NOT NULL DEFAULT '[]'::JSONB,
  pricing_strategy TEXT,
  distribution_strategy TEXT,

  recommended_product_type TEXT,
  required_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  mvp_requirements JSONB NOT NULL DEFAULT '[]'::JSONB,
  future_features JSONB NOT NULL DEFAULT '[]'::JSONB,

  economic_targets JSONB NOT NULL DEFAULT '{}'::JSONB,
  budget_envelope JSONB NOT NULL DEFAULT '{}'::JSONB,
  risk_constraints JSONB NOT NULL DEFAULT '{}'::JSONB,
  validation_state TEXT NOT NULL DEFAULT 'ready_for_build',
  source_evidence_refs JSONB NOT NULL DEFAULT '[]'::JSONB,

  handoff_status TEXT NOT NULL DEFAULT 'prepared',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT venture_selection_handovers_status_valid CHECK (
    handoff_status IN ('prepared', 'consumed', 'cancelled')
  )
);

CREATE UNIQUE INDEX venture_selection_handovers_evaluation_uidx
  ON public.venture_selection_handovers (candidate_selection_evaluation_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.resource_allocation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_selection_run_id UUID NOT NULL REFERENCES public.venture_selection_runs (id) ON DELETE CASCADE,

  constraints JSONB NOT NULL DEFAULT '{}'::JSONB,
  allocations JSONB NOT NULL DEFAULT '[]'::JSONB,
  unallocated_candidates JSONB NOT NULL DEFAULT '[]'::JSONB,
  summary JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX resource_allocation_snapshots_run_uidx
  ON public.resource_allocation_snapshots (venture_selection_run_id);

-- -----------------------------------------------------------------------------

ALTER TABLE public.venture_selection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_selection_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_experiment_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildability_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adversarial_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_selection_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_allocation_snapshots ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.venture_selection_runs TO service_role;
GRANT ALL ON public.candidate_selection_evaluations TO service_role;
GRANT ALL ON public.candidate_assumptions TO service_role;
GRANT ALL ON public.validation_experiment_priorities TO service_role;
GRANT ALL ON public.buildability_assessments TO service_role;
GRANT ALL ON public.adversarial_reviews TO service_role;
GRANT ALL ON public.selection_explanations TO service_role;
GRANT ALL ON public.venture_queue_items TO service_role;
GRANT ALL ON public.venture_selection_handovers TO service_role;
GRANT ALL ON public.resource_allocation_snapshots TO service_role;

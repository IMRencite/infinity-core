-- Executive Context and Autonomous Selection Foundation v1

CREATE TABLE public.executive_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  runtime_instance_id UUID NOT NULL,
  context_version INTEGER NOT NULL DEFAULT 1,
  objective TEXT,
  portfolio_strategy TEXT,
  opportunity_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  context_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  context_hash TEXT NOT NULL,
  scoring_model_key TEXT NOT NULL DEFAULT 'executive_selection_v1',
  scoring_model_version TEXT NOT NULL DEFAULT '1.0.0',
  policy_version TEXT NOT NULL DEFAULT '1.0.0',
  resource_constraints JSONB NOT NULL DEFAULT '{}'::JSONB,
  risk_constraints JSONB NOT NULL DEFAULT '{}'::JSONB,
  decision_thresholds JSONB NOT NULL DEFAULT '{}'::JSONB,
  escalation_thresholds JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  error JSONB NOT NULL DEFAULT '{}'::JSONB,
  correlation_id UUID,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT executive_contexts_status_valid CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'superseded')
  ),
  CONSTRAINT executive_contexts_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT executive_contexts_hash_not_blank CHECK (BTRIM(context_hash) <> '')
);

CREATE UNIQUE INDEX executive_contexts_org_idempotency_uidx
  ON public.executive_contexts (organization_id, idempotency_key);

CREATE INDEX executive_contexts_org_mission_created_idx
  ON public.executive_contexts (organization_id, mission_id, created_at DESC);

CREATE INDEX executive_contexts_org_runtime_status_idx
  ON public.executive_contexts (organization_id, runtime_instance_id, status);

COMMENT ON TABLE public.executive_contexts IS
  'Versioned Executive selection context assembled from eligible opportunities (org-scoped summaries only).';

CREATE TABLE public.executive_selection_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  runtime_instance_id UUID NOT NULL,
  executive_context_id UUID NOT NULL REFERENCES public.executive_contexts (id) ON DELETE RESTRICT,
  opportunity_id UUID REFERENCES public.opportunities (id) ON DELETE SET NULL,
  decision TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  rank INTEGER NOT NULL DEFAULT 0,
  deterministic_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  adjusted_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  confidence NUMERIC(8, 4) NOT NULL DEFAULT 0,
  rationale_summary TEXT NOT NULL DEFAULT '',
  supporting_evidence_reference_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  validation_run_id UUID REFERENCES public.validation_runs (id) ON DELETE SET NULL,
  reasoning_session_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  decision_model_key TEXT NOT NULL DEFAULT 'executive_selection_v1',
  decision_model_version TEXT NOT NULL DEFAULT '1.0.0',
  policy_version TEXT NOT NULL DEFAULT '1.0.0',
  context_hash TEXT NOT NULL,
  threshold_results JSONB NOT NULL DEFAULT '{}'::JSONB,
  policy_results JSONB NOT NULL DEFAULT '{}'::JSONB,
  constraint_results JSONB NOT NULL DEFAULT '{}'::JSONB,
  ai_advisory_reference_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  missing_information JSONB NOT NULL DEFAULT '[]'::JSONB,
  risks JSONB NOT NULL DEFAULT '[]'::JSONB,
  blockers JSONB NOT NULL DEFAULT '[]'::JSONB,
  escalation_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  planning_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reversible BOOLEAN NOT NULL DEFAULT TRUE,
  supersedes_decision_id UUID REFERENCES public.executive_selection_decisions (id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT executive_selection_decisions_decision_valid CHECK (
    decision IN (
      'select_for_planning',
      'reject',
      'monitor',
      'request_more_validation',
      'defer_due_to_constraints',
      'escalate_for_human_review'
    )
  ),
  CONSTRAINT executive_selection_decisions_status_valid CHECK (
    status IN ('draft', 'finalized', 'superseded')
  ),
  CONSTRAINT executive_selection_decisions_review_valid CHECK (
    review_status IN ('pending', 'passed', 'failed', 'needs_human_review')
  ),
  CONSTRAINT executive_selection_decisions_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX executive_selection_decisions_org_idempotency_uidx
  ON public.executive_selection_decisions (organization_id, idempotency_key);

CREATE INDEX executive_selection_decisions_org_mission_created_idx
  ON public.executive_selection_decisions (organization_id, mission_id, created_at DESC);

CREATE INDEX executive_selection_decisions_org_opportunity_idx
  ON public.executive_selection_decisions (organization_id, opportunity_id);

CREATE INDEX executive_selection_decisions_planning_eligible_idx
  ON public.executive_selection_decisions (organization_id, mission_id, planning_eligible)
  WHERE planning_eligible = TRUE AND status = 'finalized';

COMMENT ON TABLE public.executive_selection_decisions IS
  'Immutable finalized Executive selection decisions; draft rows finalized by worker only.';

CREATE OR REPLACE FUNCTION public.executive_selection_decisions_immutable_finalized()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.finalized_at IS NOT NULL THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.decision IS DISTINCT FROM OLD.decision
      OR NEW.planning_eligible IS DISTINCT FROM OLD.planning_eligible
      OR NEW.deterministic_score IS DISTINCT FROM OLD.deterministic_score
      OR NEW.adjusted_score IS DISTINCT FROM OLD.adjusted_score
      OR NEW.confidence IS DISTINCT FROM OLD.confidence
      OR NEW.context_hash IS DISTINCT FROM OLD.context_hash
      OR NEW.finalized_at IS DISTINCT FROM OLD.finalized_at
    THEN
      RAISE EXCEPTION 'Finalized executive selection decisions are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER executive_selection_decisions_immutable_finalized_trg
  BEFORE UPDATE ON public.executive_selection_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.executive_selection_decisions_immutable_finalized();

ALTER TABLE public.executive_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_selection_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY executive_contexts_select_member
  ON public.executive_contexts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members AS m
      WHERE m.organization_id = executive_contexts.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

CREATE POLICY executive_selection_decisions_select_member
  ON public.executive_selection_decisions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members AS m
      WHERE m.organization_id = executive_selection_decisions.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

GRANT SELECT ON public.executive_contexts TO authenticated;
GRANT SELECT ON public.executive_selection_decisions TO authenticated;

-- Venture blueprint provenance (do not treat dev/E2E blueprints as production candidates)
ALTER TABLE public.venture_blueprints
  ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'development_validation';

ALTER TABLE public.venture_blueprints
  ADD COLUMN IF NOT EXISTS executive_selection_decision_id UUID
  REFERENCES public.executive_selection_decisions (id) ON DELETE SET NULL;

ALTER TABLE public.venture_blueprints
  DROP CONSTRAINT IF EXISTS venture_blueprints_provenance_valid;

ALTER TABLE public.venture_blueprints
  ADD CONSTRAINT venture_blueprints_provenance_valid CHECK (
    provenance IN (
      'development_validation',
      'test',
      'production_candidate',
      'superseded',
      'rejected'
    )
  );

COMMENT ON COLUMN public.venture_blueprints.provenance IS
  'Blueprint origin; only production_candidate with valid Executive selection may plan/build.';

-- Capability seeds (worker_capability_engine)
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
  v.capability_key,
  '1.0.0',
  v.display_name,
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","mission_id","runtime_instance_id"]}'::JSONB,
  '{"type":"object"}'::JSONB,
  '["organization_consistency"]'::JSONB,
  '{}'::JSONB
FROM (
  VALUES
    ('executive.build_selection_context', 'Executive Build Selection Context'),
    ('executive.score_opportunity_set', 'Executive Score Opportunity Set'),
    ('executive.request_ai_advisory', 'Executive Request AI Advisory'),
    ('executive.evaluate_constraints', 'Executive Evaluate Constraints'),
    ('executive.select_opportunity', 'Executive Select Opportunity'),
    ('executive.persist_selection_decisions', 'Executive Persist Selection Decisions'),
    ('qa.verify_executive_selection', 'QA Verify Executive Selection')
) AS v (capability_key, display_name)
ON CONFLICT DO NOTHING;

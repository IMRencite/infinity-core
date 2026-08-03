-- =============================================================================
-- Validation Engine Foundation v1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- validation_models
-- -----------------------------------------------------------------------------

CREATE TABLE public.validation_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',

  categories JSONB NOT NULL DEFAULT '[]'::JSONB,
  thresholds JSONB NOT NULL DEFAULT '{}'::JSONB,
  requirements JSONB NOT NULL DEFAULT '{}'::JSONB,

  description TEXT,
  activated_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT validation_models_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT validation_models_version_not_blank CHECK (BTRIM(version) <> ''),
  CONSTRAINT validation_models_status_valid CHECK (
    status IN ('draft', 'active', 'experimental', 'deprecated', 'archived')
  ),
  CONSTRAINT validation_models_org_name_version_unique UNIQUE (organization_id, name, version)
);

CREATE INDEX validation_models_organization_id_idx
  ON public.validation_models (organization_id);
CREATE INDEX validation_models_status_idx
  ON public.validation_models (organization_id, status);

CREATE UNIQUE INDEX validation_models_org_active_name_uidx
  ON public.validation_models (organization_id, name)
  WHERE status = 'active';

CREATE TRIGGER validation_models_set_updated_at
  BEFORE UPDATE ON public.validation_models
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- validation_runs
-- -----------------------------------------------------------------------------

CREATE TABLE public.validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,
  validation_model_id UUID NOT NULL REFERENCES public.validation_models (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,
  evaluation_id UUID REFERENCES public.opportunity_evaluations (id) ON DELETE SET NULL,
  allocation_proposal_id UUID REFERENCES public.allocation_proposals (id) ON DELETE SET NULL,

  run_status TEXT NOT NULL DEFAULT 'pending',
  recommendation TEXT NOT NULL,
  run_key TEXT NOT NULL,

  overall_score NUMERIC,
  overall_confidence NUMERIC,
  is_sparse_system_validation BOOLEAN NOT NULL DEFAULT FALSE,

  summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT validation_runs_run_key_not_blank CHECK (BTRIM(run_key) <> ''),
  CONSTRAINT validation_runs_status_valid CHECK (
    run_status IN ('pending', 'running', 'completed', 'failed', 'blocked', 'superseded')
  ),
  CONSTRAINT validation_runs_recommendation_valid CHECK (
    recommendation IN (
      'reject', 'hold', 'research_more', 'validate_again', 'approved_for_planning'
    )
  ),
  CONSTRAINT validation_runs_overall_score_range CHECK (
    overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)
  ),
  CONSTRAINT validation_runs_overall_confidence_range CHECK (
    overall_confidence IS NULL OR (overall_confidence >= 0 AND overall_confidence <= 100)
  )
);

CREATE INDEX validation_runs_organization_id_idx
  ON public.validation_runs (organization_id);
CREATE INDEX validation_runs_opportunity_id_idx
  ON public.validation_runs (opportunity_id);
CREATE INDEX validation_runs_recommendation_idx
  ON public.validation_runs (organization_id, recommendation);
CREATE INDEX validation_runs_completed_at_idx
  ON public.validation_runs (organization_id, completed_at DESC NULLS LAST);

CREATE UNIQUE INDEX validation_runs_org_run_key_uidx
  ON public.validation_runs (organization_id, run_key);

-- -----------------------------------------------------------------------------
-- validation_dimension_results
-- -----------------------------------------------------------------------------

CREATE TABLE public.validation_dimension_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  validation_run_id UUID NOT NULL REFERENCES public.validation_runs (id) ON DELETE CASCADE,

  category TEXT NOT NULL,
  score NUMERIC,
  confidence NUMERIC,
  data_status TEXT NOT NULL DEFAULT 'unknown',

  findings JSONB NOT NULL DEFAULT '[]'::JSONB,
  missing_information JSONB NOT NULL DEFAULT '[]'::JSONB,
  blocking_issues JSONB NOT NULL DEFAULT '[]'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT validation_dimension_results_category_not_blank
    CHECK (BTRIM(category) <> ''),
  CONSTRAINT validation_dimension_results_data_status_valid CHECK (
    data_status IN ('known', 'unknown', 'insufficient')
  ),
  CONSTRAINT validation_dimension_results_score_range CHECK (
    score IS NULL OR (score >= 0 AND score <= 100)
  ),
  CONSTRAINT validation_dimension_results_confidence_range CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 100)
  ),
  CONSTRAINT validation_dimension_results_run_category_unique
    UNIQUE (validation_run_id, category)
);

CREATE INDEX validation_dimension_results_organization_id_idx
  ON public.validation_dimension_results (organization_id);
CREATE INDEX validation_dimension_results_run_id_idx
  ON public.validation_dimension_results (validation_run_id);

-- -----------------------------------------------------------------------------
-- validation_findings
-- -----------------------------------------------------------------------------

CREATE TABLE public.validation_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  validation_run_id UUID NOT NULL REFERENCES public.validation_runs (id) ON DELETE CASCADE,

  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  finding_type TEXT NOT NULL DEFAULT 'observation',
  title TEXT NOT NULL,
  description TEXT,

  is_blocking BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT validation_findings_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT validation_findings_severity_valid CHECK (
    severity IN ('info', 'warning', 'critical')
  )
);

CREATE INDEX validation_findings_organization_id_idx
  ON public.validation_findings (organization_id);
CREATE INDEX validation_findings_run_id_idx
  ON public.validation_findings (validation_run_id);
CREATE INDEX validation_findings_blocking_idx
  ON public.validation_findings (validation_run_id, is_blocking)
  WHERE is_blocking = TRUE;

-- -----------------------------------------------------------------------------
-- validation_requirements
-- -----------------------------------------------------------------------------

CREATE TABLE public.validation_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  validation_run_id UUID NOT NULL REFERENCES public.validation_runs (id) ON DELETE CASCADE,

  requirement_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT NOT NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT validation_requirements_key_not_blank CHECK (BTRIM(requirement_key) <> ''),
  CONSTRAINT validation_requirements_description_not_blank CHECK (BTRIM(description) <> ''),
  CONSTRAINT validation_requirements_status_valid CHECK (
    status IN ('open', 'satisfied', 'waived', 'blocked')
  ),
  CONSTRAINT validation_requirements_run_key_unique
    UNIQUE (validation_run_id, requirement_key)
);

CREATE INDEX validation_requirements_organization_id_idx
  ON public.validation_requirements (organization_id);
CREATE INDEX validation_requirements_run_id_idx
  ON public.validation_requirements (validation_run_id);

-- -----------------------------------------------------------------------------
-- Organization consistency triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_validation_run_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.opportunities AS o
    WHERE o.id = NEW.opportunity_id AND o.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'validation_runs.opportunity_id must belong to organization_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.validation_models AS m
    WHERE m.id = NEW.validation_model_id AND m.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'validation_runs.validation_model_id must belong to organization_id';
  END IF;

  IF NEW.evaluation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.opportunity_evaluations AS e
    WHERE e.id = NEW.evaluation_id AND e.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'validation_runs.evaluation_id must belong to organization_id';
  END IF;

  IF NEW.allocation_proposal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.allocation_proposals AS p
    WHERE p.id = NEW.allocation_proposal_id AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'validation_runs.allocation_proposal_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validation_runs_validate_organization
  BEFORE INSERT OR UPDATE OF opportunity_id, validation_model_id, evaluation_id,
    allocation_proposal_id, organization_id
  ON public.validation_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_validation_run_organization();

CREATE OR REPLACE FUNCTION public.validate_validation_child_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.validation_runs AS r
    WHERE r.id = NEW.validation_run_id AND r.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'validation child record must belong to validation_run organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validation_dimension_results_validate_organization
  BEFORE INSERT OR UPDATE OF validation_run_id, organization_id
  ON public.validation_dimension_results
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_validation_child_organization();

CREATE TRIGGER validation_findings_validate_organization
  BEFORE INSERT OR UPDATE OF validation_run_id, organization_id
  ON public.validation_findings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_validation_child_organization();

CREATE TRIGGER validation_requirements_validate_organization
  BEFORE INSERT OR UPDATE OF validation_run_id, organization_id
  ON public.validation_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_validation_child_organization();

-- -----------------------------------------------------------------------------
-- capability_registry seed
-- -----------------------------------------------------------------------------

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
  'validation.run',
  '1.0.0',
  'Run Opportunity Validation',
  'worker',
  'validation_engine',
  'active',
  'healthy',
  TRUE,
  'validation.run.v1',
  '{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","properties":{"validation_run_id":{"type":"string"},"recommendation":{"type":"string"}}}'::JSONB,
  '{"requires_mission":true,"requires_evaluation":true}'::JSONB,
  '{"implementation_key":"validation.run.v1"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1
  FROM public.capability_registry
  WHERE organization_id IS NULL
    AND capability_key = 'validation.run'
    AND version = '1.0.0'
);

CREATE INDEX IF NOT EXISTS engine_jobs_pending_validation_idx
  ON public.engine_jobs (organization_id, status, available_at)
  WHERE capability_key LIKE 'validation.%'
    AND status IN ('queued', 'waiting', 'running');

-- -----------------------------------------------------------------------------
-- Row Level Security (read-only for authenticated members)
-- -----------------------------------------------------------------------------

ALTER TABLE public.validation_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_dimension_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY validation_models_select_member
  ON public.validation_models FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY validation_runs_select_member
  ON public.validation_runs FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY validation_dimension_results_select_member
  ON public.validation_dimension_results FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY validation_findings_select_member
  ON public.validation_findings FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY validation_requirements_select_member
  ON public.validation_requirements FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

GRANT SELECT ON public.validation_models TO authenticated;
GRANT SELECT ON public.validation_runs TO authenticated;
GRANT SELECT ON public.validation_dimension_results TO authenticated;
GRANT SELECT ON public.validation_findings TO authenticated;
GRANT SELECT ON public.validation_requirements TO authenticated;

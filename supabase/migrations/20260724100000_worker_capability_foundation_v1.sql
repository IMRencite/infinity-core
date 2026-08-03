-- =============================================================================
-- Worker Capability Foundation v1
-- Durable worker_results and worker_artifacts; safe internal capability seeds
-- =============================================================================

CREATE TABLE public.worker_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,
  runtime_instance_id UUID REFERENCES public.mission_runtime_instances (id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans (id) ON DELETE SET NULL,
  plan_step_id UUID REFERENCES public.plan_steps (id) ON DELETE SET NULL,
  engine_job_id UUID NOT NULL REFERENCES public.engine_jobs (id) ON DELETE RESTRICT,
  worker_run_id UUID NOT NULL REFERENCES public.worker_runs (id) ON DELETE RESTRICT,
  capability_key TEXT NOT NULL,
  capability_version TEXT NOT NULL,
  execution_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  input_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  input_hash TEXT NOT NULL,
  structured_output JSONB NOT NULL DEFAULT '{}'::JSONB,
  output_schema_version TEXT NOT NULL DEFAULT '1.0.0',
  policy_results JSONB NOT NULL DEFAULT '{}'::JSONB,
  validation_results JSONB NOT NULL DEFAULT '{}'::JSONB,
  artifact_references JSONB NOT NULL DEFAULT '[]'::JSONB,
  review_status TEXT NOT NULL DEFAULT 'not_required',
  error JSONB NOT NULL DEFAULT '{}'::JSONB,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT worker_results_status_valid CHECK (
    status IN (
      'queued',
      'running',
      'completed',
      'failed',
      'cancelled',
      'blocked',
      'needs_review'
    )
  ),
  CONSTRAINT worker_results_review_status_valid CHECK (
    review_status IN (
      'not_required',
      'pending',
      'passed',
      'failed',
      'needs_human_review'
    )
  ),
  CONSTRAINT worker_results_attempt_positive CHECK (attempt_number >= 1)
);

COMMENT ON TABLE public.worker_results IS
  'Governed worker capability outputs. Completed rows are immutable; retries use new attempts.';

CREATE UNIQUE INDEX worker_results_org_execution_key_completed_uidx
  ON public.worker_results (organization_id, execution_key)
  WHERE status = 'completed';

CREATE INDEX worker_results_org_mission_idx
  ON public.worker_results (organization_id, mission_id, created_at DESC);

CREATE INDEX worker_results_org_plan_step_idx
  ON public.worker_results (organization_id, plan_step_id, status);

CREATE INDEX worker_results_org_capability_idx
  ON public.worker_results (organization_id, capability_key, status, created_at DESC);

CREATE TRIGGER worker_results_set_updated_at
  BEFORE UPDATE ON public.worker_results
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_worker_result_completed_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status = 'completed' THEN
    IF NEW.structured_output IS DISTINCT FROM OLD.structured_output
      OR NEW.review_status IS DISTINCT FROM OLD.review_status
      OR NEW.artifact_references IS DISTINCT FROM OLD.artifact_references THEN
      RAISE EXCEPTION 'Completed worker_results are immutable except review_status transitions';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER worker_results_immutable_completed
  BEFORE UPDATE ON public.worker_results
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_worker_result_completed_mutation();

CREATE TABLE public.worker_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,
  worker_result_id UUID NOT NULL REFERENCES public.worker_results (id) ON DELETE RESTRICT,
  artifact_type TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  capability_key TEXT NOT NULL,
  capability_version TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  provenance JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT worker_artifacts_type_not_blank CHECK (BTRIM(artifact_type) <> '')
);

COMMENT ON TABLE public.worker_artifacts IS
  'Internal structured worker outputs only — not deployed assets, websites, or ventures.';

CREATE INDEX worker_artifacts_org_result_idx
  ON public.worker_artifacts (organization_id, worker_result_id);

CREATE INDEX worker_artifacts_org_type_idx
  ON public.worker_artifacts (organization_id, artifact_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_worker_artifact_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  result_org UUID;
BEGIN
  SELECT organization_id INTO result_org
  FROM public.worker_results
  WHERE id = NEW.worker_result_id;

  IF result_org IS NULL OR result_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'worker_artifacts must match worker_results organization';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER worker_artifacts_validate_organization
  BEFORE INSERT OR UPDATE OF worker_result_id, organization_id
  ON public.worker_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_worker_artifact_organization();

-- -----------------------------------------------------------------------------
-- capability_registry seeds (safe v1 internal workers)
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
  v.capability_key,
  v.version,
  v.display_name,
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  v.input_schema::JSONB,
  v.output_schema::JSONB,
  v.policy_requirements::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'side_effect_class', v.side_effect)
FROM (
  VALUES
    (
      'research.summarize_internal_evidence',
      '1.0.0',
      'Summarize Internal Evidence',
      '{"type":"object","required":["organization_id","evidence_record_ids"],"properties":{"organization_id":{"type":"string"},"mission_id":{"type":"string"},"opportunity_id":{"type":"string"},"evidence_record_ids":{"type":"array","items":{"type":"string"}}}}',
      '{"type":"object","required":["summary","missing_evidence","provenance"],"properties":{"summary":{"type":"string"},"missing_evidence":{"type":"array"},"provenance":{"type":"array"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_read"}',
      'internal_read'
    ),
    (
      'analysis.compare_opportunities',
      '1.0.0',
      'Compare Opportunities (Deterministic)',
      '{"type":"object","required":["organization_id","opportunity_ids"],"properties":{"organization_id":{"type":"string"},"opportunity_ids":{"type":"array","items":{"type":"string"}},"scoring_config":{"type":"object"}}}',
      '{"type":"object","required":["ranked"],"properties":{"ranked":{"type":"array"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_read"}',
      'internal_read'
    ),
    (
      'blueprint.validate',
      '1.0.0',
      'Validate Venture Blueprint',
      '{"type":"object","required":["organization_id","venture_blueprint_id"],"properties":{"organization_id":{"type":"string"},"venture_blueprint_id":{"type":"string"}}}',
      '{"type":"object","required":["valid","blockers"],"properties":{"valid":{"type":"boolean"},"blockers":{"type":"array"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_read"}',
      'internal_read'
    ),
    (
      'qa.verify_plan_step_output',
      '1.0.0',
      'QA Verify Plan Step Output',
      '{"type":"object","required":["organization_id","plan_step_id","worker_result_id"],"properties":{"organization_id":{"type":"string"},"plan_step_id":{"type":"string"},"worker_result_id":{"type":"string"}}}',
      '{"type":"object","required":["verdict"],"properties":{"verdict":{"type":"string"},"issues":{"type":"array"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_read","independent_review":true}',
      'internal_read'
    )
) AS v(
  capability_key,
  version,
  display_name,
  input_schema,
  output_schema,
  policy_requirements,
  side_effect
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.capability_registry cr
  WHERE cr.organization_id IS NULL
    AND cr.capability_key = v.capability_key
    AND cr.version = v.version
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.worker_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY worker_results_select_member
  ON public.worker_results FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY worker_artifacts_select_member
  ON public.worker_artifacts FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

-- No INSERT/UPDATE/DELETE for authenticated — Worker Runtime uses service role

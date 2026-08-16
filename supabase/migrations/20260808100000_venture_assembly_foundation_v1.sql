-- Venture Assembly Foundation v1 — internal launch-ready packages (not deployed)

CREATE TABLE public.venture_assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE RESTRICT,
  executive_decision_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.plans (id) ON DELETE RESTRICT,
  plan_version INTEGER NOT NULL DEFAULT 1,
  plan_execution_id UUID NOT NULL REFERENCES public.plan_executions (id) ON DELETE RESTRICT,
  venture_blueprint_id UUID REFERENCES public.venture_blueprints (id) ON DELETE SET NULL,
  build_id UUID REFERENCES public.builds (id) ON DELETE SET NULL,
  build_job_id UUID REFERENCES public.build_jobs (id) ON DELETE SET NULL,
  build_snapshot_id UUID REFERENCES public.build_snapshots (id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies (id) ON DELETE SET NULL,
  assembly_version INTEGER NOT NULL DEFAULT 1,
  manifest_schema_version TEXT NOT NULL DEFAULT 'venture_assembly_manifest_v1',
  status TEXT NOT NULL DEFAULT 'assembly_requested',
  readiness_status TEXT,
  manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  identity_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  business_model_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  brand_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  digital_property_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  monetization_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  marketing_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  operations_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  legal_compliance_package JSONB NOT NULL DEFAULT '{}'::JSONB,
  readiness_evaluation JSONB NOT NULL DEFAULT '{}'::JSONB,
  assembly_worker_result_id UUID,
  qa_worker_result_id UUID,
  idempotency_key TEXT NOT NULL,
  correlation_id UUID,
  blocking_reason TEXT,
  superseded_by UUID REFERENCES public.venture_assemblies (id) ON DELETE SET NULL,
  immutable_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venture_assemblies_status_valid CHECK (
    status IN (
      'assembly_requested',
      'assembling',
      'needs_review',
      'blocked',
      'internally_ready',
      'superseded',
      'failed'
    )
  ),
  CONSTRAINT venture_assemblies_readiness_valid CHECK (
    readiness_status IS NULL
    OR readiness_status IN ('internally_ready', 'needs_review', 'blocked')
  ),
  CONSTRAINT venture_assemblies_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX venture_assemblies_org_idempotency_uidx
  ON public.venture_assemblies (organization_id, idempotency_key);

CREATE INDEX venture_assemblies_org_mission_idx
  ON public.venture_assemblies (organization_id, mission_id, created_at DESC);

CREATE INDEX venture_assemblies_org_plan_execution_idx
  ON public.venture_assemblies (organization_id, plan_execution_id);

COMMENT ON TABLE public.venture_assemblies IS
  'Canonical internal venture package after internally_complete plan execution — not live in market.';

CREATE TABLE public.venture_assembly_external_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_assembly_id UUID NOT NULL REFERENCES public.venture_assemblies (id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  required_for TEXT NOT NULL,
  blocking_stage TEXT NOT NULL DEFAULT 'launch',
  estimated_cost NUMERIC,
  approval_requirement TEXT NOT NULL DEFAULT 'requires_approval',
  capability_requirement TEXT,
  status TEXT NOT NULL DEFAULT 'unresolved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venture_assembly_external_dependencies_status_valid CHECK (
    status IN (
      'not_required',
      'unresolved',
      'requires_approval',
      'requires_external_capability',
      'ready',
      'satisfied'
    )
  )
);

CREATE INDEX venture_assembly_external_dependencies_assembly_idx
  ON public.venture_assembly_external_dependencies (venture_assembly_id);

ALTER TABLE public.venture_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_assembly_external_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY venture_assemblies_select_member
  ON public.venture_assemblies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = venture_assemblies.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

CREATE POLICY venture_assembly_external_dependencies_select_member
  ON public.venture_assembly_external_dependencies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = venture_assembly_external_dependencies.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

GRANT SELECT ON public.venture_assemblies TO authenticated;
GRANT SELECT ON public.venture_assembly_external_dependencies TO authenticated;

CREATE TRIGGER venture_assemblies_set_updated_at
  BEFORE UPDATE ON public.venture_assemblies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER venture_assembly_external_dependencies_set_updated_at
  BEFORE UPDATE ON public.venture_assembly_external_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

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
  'venture.assemble_internal_package',
  '1.0.0',
  'Assemble Internal Venture Package',
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","mission_id","plan_execution_id","venture_assembly_id"],"properties":{"organization_id":{"type":"string"},"mission_id":{"type":"string"},"plan_execution_id":{"type":"string"},"venture_assembly_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","required":["venture_assembly_id","assembly_version","readiness_status"],"properties":{"venture_assembly_id":{"type":"string"},"assembly_version":{"type":"integer"},"readiness_status":{"type":"string"}}}'::JSONB,
  '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}'::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'side_effect_class', 'internal_write')
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry cr
  WHERE cr.capability_key = 'venture.assemble_internal_package' AND cr.version = '1.0.0'
);

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
  'qa.verify_venture_assembly',
  '1.0.0',
  'QA Verify Venture Assembly',
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","mission_id","venture_assembly_id"],"properties":{"organization_id":{"type":"string"},"mission_id":{"type":"string"},"venture_assembly_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","required":["verdict"],"properties":{"verdict":{"type":"string"}}}'::JSONB,
  '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}'::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'side_effect_class', 'internal_read')
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry cr
  WHERE cr.capability_key = 'qa.verify_venture_assembly' AND cr.version = '1.0.0'
);

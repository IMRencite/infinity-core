-- Build Factory Runtime v2 — generic BuildJob + builder registry (internal only)

CREATE TABLE public.build_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  runtime_instance_id UUID REFERENCES public.mission_runtime_instances (id) ON DELETE SET NULL,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE RESTRICT,
  venture_blueprint_id UUID NOT NULL REFERENCES public.venture_blueprints (id) ON DELETE RESTRICT,
  executive_decision_id UUID,
  plan_id UUID REFERENCES public.plans (id) ON DELETE SET NULL,
  plan_step_id UUID REFERENCES public.plan_steps (id) ON DELETE SET NULL,
  allocation_proposal_id UUID REFERENCES public.allocation_proposals (id) ON DELETE SET NULL,
  build_id UUID REFERENCES public.builds (id) ON DELETE SET NULL,
  build_version TEXT NOT NULL DEFAULT '1',
  builder_key TEXT NOT NULL,
  builder_version TEXT NOT NULL,
  project_type TEXT NOT NULL,
  build_specification_id TEXT NOT NULL DEFAULT '',
  build_manifest_id TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL DEFAULT '',
  input_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  policy_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  approved_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  prohibited_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  resource_budget JSONB NOT NULL DEFAULT '{}'::JSONB,
  runtime_budget JSONB NOT NULL DEFAULT '{}'::JSONB,
  output_contracts JSONB NOT NULL DEFAULT '{}'::JSONB,
  required_reviews JSONB NOT NULL DEFAULT '[]'::JSONB,
  idempotency_key TEXT NOT NULL,
  correlation_id UUID,
  status TEXT NOT NULL DEFAULT 'requested',
  blocking_reason TEXT,
  lifecycle_stage TEXT,
  generic_qa_status TEXT NOT NULL DEFAULT 'pending',
  product_qa_status TEXT NOT NULL DEFAULT 'pending',
  reproducibility_status TEXT,
  rollback_mode TEXT,
  repair_attempt_count INT NOT NULL DEFAULT 0,
  max_repair_attempts INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT build_jobs_status_valid CHECK (
    status IN (
      'requested',
      'gated',
      'builder_resolved',
      'workspace_ready',
      'initialized',
      'validating',
      'generating',
      'repairing',
      'testing',
      'review_pending',
      'internally_complete',
      'blocked',
      'failed',
      'cancelled',
      'rolled_back'
    )
  ),
  CONSTRAINT build_jobs_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX build_jobs_org_idempotency_uidx
  ON public.build_jobs (organization_id, idempotency_key);

CREATE INDEX build_jobs_org_mission_status_idx
  ON public.build_jobs (organization_id, mission_id, status, created_at DESC);

CREATE INDEX build_jobs_org_build_idx
  ON public.build_jobs (organization_id, build_id);

COMMENT ON TABLE public.build_jobs IS
  'Generic Build Factory Runtime v2 job — product-neutral; internal only.';

CREATE TABLE public.builder_registry_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_key TEXT NOT NULL,
  builder_version TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  supported_project_types JSONB NOT NULL DEFAULT '[]'::JSONB,
  supported_specification_versions JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  side_effect_class TEXT NOT NULL DEFAULT 'internal_write',
  status TEXT NOT NULL DEFAULT 'active',
  deprecated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT builder_registry_key_version_uidx UNIQUE (builder_key, builder_version),
  CONSTRAINT builder_registry_status_valid CHECK (status IN ('active', 'inactive', 'deprecated'))
);

COMMENT ON TABLE public.builder_registry_entries IS
  'Server-seeded builder plugins; browser clients cannot register builders.';

CREATE TABLE public.build_repair_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  build_job_id UUID NOT NULL REFERENCES public.build_jobs (id) ON DELETE RESTRICT,
  build_id UUID REFERENCES public.builds (id) ON DELETE SET NULL,
  attempt_number INT NOT NULL,
  failing_lifecycle_stage TEXT NOT NULL,
  failure_classification TEXT NOT NULL,
  permitted_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  snapshot_reference TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  result JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT build_repair_attempts_job_attempt_uidx UNIQUE (build_job_id, attempt_number)
);

CREATE TABLE public.build_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  build_job_id UUID NOT NULL REFERENCES public.build_jobs (id) ON DELETE RESTRICT,
  build_id UUID NOT NULL REFERENCES public.builds (id) ON DELETE RESTRICT,
  snapshot_id UUID REFERENCES public.build_snapshots (id) ON DELETE SET NULL,
  rollback_mode TEXT NOT NULL DEFAULT 'metadata_only',
  status TEXT NOT NULL DEFAULT 'completed',
  audit JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT build_rollbacks_mode_valid CHECK (rollback_mode IN ('metadata_only', 'byte_perfect'))
);

ALTER TABLE public.build_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_registry_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_repair_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_rollbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY build_jobs_select_member
  ON public.build_jobs FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY builder_registry_select_authenticated
  ON public.builder_registry_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY build_repair_attempts_select_member
  ON public.build_repair_attempts FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY build_rollbacks_select_member
  ON public.build_rollbacks FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

GRANT SELECT ON public.build_jobs TO authenticated;
GRANT SELECT ON public.builder_registry_entries TO authenticated;
GRANT SELECT ON public.build_repair_attempts TO authenticated;
GRANT SELECT ON public.build_rollbacks TO authenticated;

INSERT INTO public.builder_registry_entries (
  builder_key,
  builder_version,
  name,
  description,
  supported_project_types,
  supported_specification_versions,
  required_capabilities,
  side_effect_class,
  status,
  metadata
)
VALUES
  (
    'website.internal_static',
    '1.0.0',
    'Internal static website builder',
    'Adapter over Website Build Worker Foundation v1',
    '["static_website","lead_generation_site","affiliate_site"]'::JSONB,
    '["build_specification_v1"]'::JSONB,
    '["build.workspace_initialize","website.generate_pages","qa.verify_internal_website"]'::JSONB,
    'internal_write',
    'active',
    '{"adapter":"website_v1"}'::JSONB
  ),
  (
    'website.internal_nextjs',
    '1.0.0',
    'Internal Next.js website builder',
    'Adapter over Website Build Worker Foundation v1',
    '["nextjs_website"]'::JSONB,
    '["build_specification_v1"]'::JSONB,
    '["build.workspace_initialize","website.generate_structure","qa.verify_internal_website"]'::JSONB,
    'internal_write',
    'active',
    '{"adapter":"website_v1"}'::JSONB
  ),
  (
    'website.internal_content',
    '1.0.0',
    'Internal content site builder',
    'Adapter over Website Build Worker Foundation v1',
    '["content_site"]'::JSONB,
    '["build_specification_v1"]'::JSONB,
    '["build.workspace_initialize","website.generate_pages","qa.verify_internal_website"]'::JSONB,
    'internal_write',
    'active',
    '{"adapter":"website_v1"}'::JSONB
  )
ON CONFLICT (builder_key, builder_version) DO NOTHING;

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
  'qa.verify_generic_internal_build',
  '1.0.0',
  'QA Verify Generic Internal Build',
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","build_id","build_job_id"],"properties":{"organization_id":{"type":"string"},"build_id":{"type":"string"},"build_job_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","required":["verdict"],"properties":{"verdict":{"type":"string"}}}'::JSONB,
  '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}'::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'side_effect_class', 'internal_read')
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry cr
  WHERE cr.capability_key = 'qa.verify_generic_internal_build' AND cr.version = '1.0.0'
);

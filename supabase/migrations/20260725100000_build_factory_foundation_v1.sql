-- =============================================================================
-- Build Factory Foundation v1 — internal builds only (not deployed/published)
-- =============================================================================

CREATE TABLE public.builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  runtime_instance_id UUID REFERENCES public.mission_runtime_instances (id) ON DELETE SET NULL,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE RESTRICT,
  venture_blueprint_id UUID NOT NULL REFERENCES public.venture_blueprints (id) ON DELETE RESTRICT,
  plan_id UUID REFERENCES public.plans (id) ON DELETE SET NULL,
  allocation_proposal_id UUID REFERENCES public.allocation_proposals (id) ON DELETE SET NULL,
  project_type TEXT NOT NULL,
  template_key TEXT NOT NULL,
  template_version TEXT NOT NULL,
  build_version TEXT NOT NULL DEFAULT '1',
  specification_version TEXT NOT NULL DEFAULT '1',
  status TEXT NOT NULL DEFAULT 'requested',
  specification JSONB NOT NULL DEFAULT '{}'::JSONB,
  specification_hash TEXT NOT NULL,
  manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  manifest_hash TEXT NOT NULL DEFAULT '',
  workspace_reference TEXT NOT NULL DEFAULT '',
  current_snapshot_id UUID,
  review_status TEXT NOT NULL DEFAULT 'not_required',
  idempotency_key TEXT NOT NULL,
  error JSONB NOT NULL DEFAULT '{}'::JSONB,
  correlation_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT builds_status_valid CHECK (
    status IN (
      'requested',
      'specified',
      'manifest_ready',
      'workspace_ready',
      'scaffolding',
      'validating',
      'review_pending',
      'internally_complete',
      'blocked',
      'failed',
      'cancelled'
    )
  ),
  CONSTRAINT builds_review_status_valid CHECK (
    review_status IN (
      'not_required',
      'pending',
      'passed',
      'failed',
      'needs_human_review'
    )
  ),
  CONSTRAINT builds_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT builds_spec_hash_not_blank CHECK (BTRIM(specification_hash) <> '')
);

CREATE UNIQUE INDEX builds_org_idempotency_uidx
  ON public.builds (organization_id, idempotency_key);

CREATE INDEX builds_org_mission_idx
  ON public.builds (organization_id, mission_id, created_at DESC);

CREATE INDEX builds_org_blueprint_idx
  ON public.builds (organization_id, venture_blueprint_id);

CREATE TRIGGER builds_set_updated_at
  BEFORE UPDATE ON public.builds
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.builds IS
  'Internal build factory records. Not deployed, published, or live.';

CREATE TABLE public.build_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  build_id UUID NOT NULL REFERENCES public.builds (id) ON DELETE RESTRICT,
  snapshot_version INTEGER NOT NULL,
  file_manifest JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_files INTEGER NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  root_hash TEXT NOT NULL,
  previous_snapshot_id UUID REFERENCES public.build_snapshots (id) ON DELETE SET NULL,
  created_by_worker_result_id UUID REFERENCES public.worker_results (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT build_snapshots_version_positive CHECK (snapshot_version >= 1)
);

CREATE UNIQUE INDEX build_snapshots_build_version_uidx
  ON public.build_snapshots (build_id, snapshot_version);

CREATE INDEX build_snapshots_org_build_idx
  ON public.build_snapshots (organization_id, build_id, created_at DESC);

COMMENT ON TABLE public.build_snapshots IS
  'Immutable workspace snapshots for internal build rollback metadata.';

ALTER TABLE public.builds
  ADD CONSTRAINT builds_current_snapshot_fkey
  FOREIGN KEY (current_snapshot_id) REFERENCES public.build_snapshots (id) ON DELETE SET NULL;

ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY builds_select_member
  ON public.builds FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY build_snapshots_select_member
  ON public.build_snapshots FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

GRANT SELECT ON public.builds TO authenticated;
GRANT SELECT ON public.build_snapshots TO authenticated;

-- Build + QA capabilities (governed worker runtime)
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
      'build.workspace_initialize',
      '1.0.0',
      'Initialize Build Workspace',
      '{"type":"object","required":["organization_id","build_id"],"properties":{"organization_id":{"type":"string"},"build_id":{"type":"string"},"mission_id":{"type":"string"}}}',
      '{"type":"object","required":["workspace_reference","initialized"],"properties":{"workspace_reference":{"type":"string"},"initialized":{"type":"boolean"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}',
      'internal_write'
    ),
    (
      'build.persist_specification',
      '1.0.0',
      'Persist Build Specification',
      '{"type":"object","required":["organization_id","build_id"],"properties":{"organization_id":{"type":"string"},"build_id":{"type":"string"}}}',
      '{"type":"object","required":["specification_path","specification_hash"],"properties":{"specification_path":{"type":"string"},"specification_hash":{"type":"string"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}',
      'internal_write'
    ),
    (
      'build.persist_manifest',
      '1.0.0',
      'Persist Build Manifest',
      '{"type":"object","required":["organization_id","build_id"],"properties":{"organization_id":{"type":"string"},"build_id":{"type":"string"}}}',
      '{"type":"object","required":["manifest_path","manifest_hash"],"properties":{"manifest_path":{"type":"string"},"manifest_hash":{"type":"string"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}',
      'internal_write'
    ),
    (
      'build.generate_template_scaffold',
      '1.0.0',
      'Generate Template Scaffold',
      '{"type":"object","required":["organization_id","build_id"],"properties":{"organization_id":{"type":"string"},"build_id":{"type":"string"}}}',
      '{"type":"object","required":["files_written","template_key"],"properties":{"files_written":{"type":"array"},"template_key":{"type":"string"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}',
      'internal_write'
    ),
    (
      'build.validate_manifest',
      '1.0.0',
      'Validate Build Manifest',
      '{"type":"object","required":["organization_id","build_id"],"properties":{"organization_id":{"type":"string"},"build_id":{"type":"string"}}}',
      '{"type":"object","required":["valid","issues"],"properties":{"valid":{"type":"boolean"},"issues":{"type":"array"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}',
      'internal_read'
    ),
    (
      'build.snapshot_workspace',
      '1.0.0',
      'Snapshot Build Workspace',
      '{"type":"object","required":["organization_id","build_id"],"properties":{"organization_id":{"type":"string"},"build_id":{"type":"string"}}}',
      '{"type":"object","required":["snapshot_id","root_hash"],"properties":{"snapshot_id":{"type":"string"},"root_hash":{"type":"string"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}',
      'internal_write'
    ),
    (
      'qa.verify_internal_build',
      '1.0.0',
      'QA Verify Internal Build',
      '{"type":"object","required":["organization_id","build_id","plan_step_id","worker_result_id"],"properties":{"organization_id":{"type":"string"},"build_id":{"type":"string"},"plan_step_id":{"type":"string"},"worker_result_id":{"type":"string"}}}',
      '{"type":"object","required":["verdict"],"properties":{"verdict":{"type":"string"},"issues":{"type":"array"}}}',
      '{"requires_active_mission":true,"side_effect_class":"internal_read","independent_review":true,"zero_cost":true}',
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

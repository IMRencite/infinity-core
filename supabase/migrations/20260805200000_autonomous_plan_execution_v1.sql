-- Autonomous Plan Execution Integration v1 — coordination record (internal only)

CREATE TABLE public.plan_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  runtime_instance_id UUID REFERENCES public.mission_runtime_instances (id) ON DELETE SET NULL,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE RESTRICT,
  executive_decision_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.plans (id) ON DELETE RESTRICT,
  plan_version INTEGER NOT NULL DEFAULT 1,
  allocation_proposal_id UUID REFERENCES public.allocation_proposals (id) ON DELETE SET NULL,
  execution_version INTEGER NOT NULL DEFAULT 1,
  venture_blueprint_id UUID REFERENCES public.venture_blueprints (id) ON DELETE SET NULL,
  build_id UUID REFERENCES public.builds (id) ON DELETE SET NULL,
  build_job_id UUID REFERENCES public.build_jobs (id) ON DELETE SET NULL,
  current_phase TEXT NOT NULL DEFAULT 'requested',
  executable_step_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  completed_step_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  blocked_step_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  failed_step_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  active_step_id UUID,
  execution_policy_version TEXT NOT NULL DEFAULT 'plan_execution_v1',
  scheduler_policy_version TEXT NOT NULL DEFAULT 'scheduler_v1',
  approved_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  prohibited_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  approved_cost NUMERIC NOT NULL DEFAULT 0,
  maximum_runtime_ms INTEGER NOT NULL DEFAULT 900000,
  maximum_concurrency INTEGER NOT NULL DEFAULT 2,
  idempotency_key TEXT NOT NULL,
  correlation_id UUID,
  status TEXT NOT NULL DEFAULT 'requested',
  blocking_reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plan_executions_status_valid CHECK (
    status IN (
      'requested',
      'awaiting_allocation',
      'allocation_approved',
      'scheduling',
      'running',
      'awaiting_review',
      'internally_complete',
      'blocked',
      'failed',
      'cancelled'
    )
  ),
  CONSTRAINT plan_executions_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX plan_executions_org_idempotency_uidx
  ON public.plan_executions (organization_id, idempotency_key);

CREATE INDEX plan_executions_org_mission_status_idx
  ON public.plan_executions (organization_id, mission_id, status, created_at DESC);

CREATE INDEX plan_executions_org_plan_idx
  ON public.plan_executions (organization_id, plan_id, execution_version DESC);

COMMENT ON TABLE public.plan_executions IS
  'Coordinates autonomous internal plan execution — not deployed or published.';

ALTER TABLE public.plan_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_executions_select_member
  ON public.plan_executions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = plan_executions.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

GRANT SELECT ON public.plan_executions TO authenticated;

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
  'qa.verify_autonomous_plan_execution',
  '1.0.0',
  'QA Verify Autonomous Plan Execution',
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","mission_id","plan_execution_id"],"properties":{"organization_id":{"type":"string"},"mission_id":{"type":"string"},"plan_execution_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","required":["verdict"],"properties":{"verdict":{"type":"string"}}}'::JSONB,
  '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}'::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'side_effect_class', 'internal_read')
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry cr
  WHERE cr.capability_key = 'qa.verify_autonomous_plan_execution' AND cr.version = '1.0.0'
);

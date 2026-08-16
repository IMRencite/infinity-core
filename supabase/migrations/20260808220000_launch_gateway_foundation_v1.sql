-- Launch & Deployment Gateway Foundation v1 — simulation only (no live external execution)

CREATE TABLE public.launch_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  venture_assembly_id UUID NOT NULL REFERENCES public.venture_assemblies (id) ON DELETE RESTRICT,
  company_id UUID REFERENCES public.companies (id) ON DELETE SET NULL,
  plan_version INTEGER NOT NULL DEFAULT 1,
  assembly_version INTEGER NOT NULL DEFAULT 1,
  schema_version TEXT NOT NULL DEFAULT 'launch_plan_v1',
  status TEXT NOT NULL DEFAULT 'draft',
  launch_readiness TEXT,
  estimated_total_cost NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  dependency_graph JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  correlation_id UUID,
  simulation_completed_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES public.launch_plans (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT launch_plans_status_valid CHECK (
    status IN (
      'draft',
      'ready',
      'simulation_in_progress',
      'simulation_complete',
      'blocked',
      'awaiting_approval',
      'superseded',
      'cancelled'
    )
  ),
  CONSTRAINT launch_plans_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX launch_plans_org_idempotency_uidx
  ON public.launch_plans (organization_id, idempotency_key);

CREATE INDEX launch_plans_org_assembly_idx
  ON public.launch_plans (organization_id, venture_assembly_id, plan_version DESC);

CREATE TABLE public.external_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  opportunity_id UUID REFERENCES public.opportunities (id) ON DELETE SET NULL,
  venture_id UUID REFERENCES public.companies (id) ON DELETE SET NULL,
  venture_assembly_id UUID REFERENCES public.venture_assemblies (id) ON DELETE SET NULL,
  launch_plan_id UUID REFERENCES public.launch_plans (id) ON DELETE SET NULL,
  plan_execution_id UUID REFERENCES public.plan_executions (id) ON DELETE SET NULL,
  requested_by_worker_result_id UUID,
  action_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mock.infinity_v1',
  adapter_key TEXT NOT NULL DEFAULT 'mock.infinity_v1',
  target TEXT NOT NULL,
  payload_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  side_effect_class TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  cost_confidence TEXT NOT NULL DEFAULT 'estimated',
  approval_policy TEXT NOT NULL DEFAULT 'simulation_auto',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  credential_requirement JSONB NOT NULL DEFAULT '{}'::JSONB,
  credential_status TEXT NOT NULL DEFAULT 'not_required',
  execution_status TEXT NOT NULL DEFAULT 'requested',
  policy_version TEXT NOT NULL DEFAULT 'launch_gateway_policy_v1',
  idempotency_key TEXT NOT NULL,
  correlation_id UUID,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  depends_on_action_id UUID REFERENCES public.external_actions (id) ON DELETE SET NULL,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  error TEXT,
  result_manifest JSONB,
  verification_status TEXT,
  rollback_supported BOOLEAN NOT NULL DEFAULT FALSE,
  audit_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT external_actions_execution_status_valid CHECK (
    execution_status IN (
      'requested',
      'policy_review',
      'blocked',
      'awaiting_approval',
      'approved',
      'simulation_ready',
      'simulating',
      'simulated',
      'execution_ready',
      'executing',
      'succeeded',
      'failed',
      'rollback_requested',
      'rolled_back',
      'cancelled',
      'superseded'
    )
  ),
  CONSTRAINT external_actions_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX external_actions_org_idempotency_uidx
  ON public.external_actions (organization_id, idempotency_key);

CREATE INDEX external_actions_org_launch_plan_idx
  ON public.external_actions (organization_id, launch_plan_id, sequence_order);

CREATE TABLE public.external_action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  external_action_id UUID NOT NULL REFERENCES public.external_actions (id) ON DELETE CASCADE,
  approval_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approver_reference TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  CONSTRAINT external_action_approvals_kind_valid CHECK (
    approval_kind IN ('simulate', 'execute_external')
  ),
  CONSTRAINT external_action_approvals_status_valid CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired')
  )
);

ALTER TABLE public.launch_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_action_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY launch_plans_select_member
  ON public.launch_plans FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = launch_plans.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

CREATE POLICY external_actions_select_member
  ON public.external_actions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = external_actions.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

CREATE POLICY external_action_approvals_select_member
  ON public.external_action_approvals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = external_action_approvals.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

GRANT SELECT ON public.launch_plans TO authenticated;
GRANT SELECT ON public.external_actions TO authenticated;
GRANT SELECT ON public.external_action_approvals TO authenticated;

CREATE TRIGGER launch_plans_set_updated_at
  BEFORE UPDATE ON public.launch_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER external_actions_set_updated_at
  BEFORE UPDATE ON public.external_actions
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
  'launch.generate_plan',
  '1.0.0',
  'Generate Launch Plan',
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","mission_id","venture_assembly_id"],"properties":{"organization_id":{"type":"string"},"mission_id":{"type":"string"},"venture_assembly_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","required":["launch_plan_id"],"properties":{"launch_plan_id":{"type":"string"}}}'::JSONB,
  '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}'::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1')
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry cr
  WHERE cr.capability_key = 'launch.generate_plan' AND cr.version = '1.0.0'
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
  'launch.simulate_external_action',
  '1.0.0',
  'Simulate External Action via Gateway',
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","mission_id","external_action_id"],"properties":{"organization_id":{"type":"string"},"mission_id":{"type":"string"},"external_action_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","required":["execution_status","simulation"],"properties":{"execution_status":{"type":"string"},"simulation":{"type":"boolean"}}}'::JSONB,
  '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}'::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'gateway_only', true)
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry cr
  WHERE cr.capability_key = 'launch.simulate_external_action' AND cr.version = '1.0.0'
);

COMMENT ON TABLE public.external_actions IS
  'Canonical external action requests — v1 simulation only; live execution disabled by policy.';

COMMENT ON TABLE public.launch_plans IS
  'Ordered launch simulation plan derived from internally_ready venture assembly.';

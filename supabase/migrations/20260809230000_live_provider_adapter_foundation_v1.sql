-- Live Provider Adapter Foundation v1 — external resource registry + live execution fields

ALTER TABLE public.external_actions
  ADD COLUMN IF NOT EXISTS execution_mode TEXT NOT NULL DEFAULT 'simulation',
  ADD COLUMN IF NOT EXISTS build_id UUID REFERENCES public.builds (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS build_snapshot_id UUID REFERENCES public.build_snapshots (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS provider_execution_mode TEXT;

ALTER TABLE public.external_actions
  DROP CONSTRAINT IF EXISTS external_actions_execution_mode_valid;

ALTER TABLE public.external_actions
  ADD CONSTRAINT external_actions_execution_mode_valid CHECK (
    execution_mode IN ('mock', 'simulation', 'live')
  );

ALTER TABLE public.external_action_approvals
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS max_authorized_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS venture_id UUID REFERENCES public.companies (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS launch_plan_id UUID REFERENCES public.launch_plans (id) ON DELETE SET NULL;

CREATE TABLE public.external_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID REFERENCES public.companies (id) ON DELETE SET NULL,
  launch_plan_id UUID REFERENCES public.launch_plans (id) ON DELETE SET NULL,
  external_action_id UUID NOT NULL REFERENCES public.external_actions (id) ON DELETE RESTRICT,
  resource_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_resource_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  external_url TEXT,
  environment TEXT NOT NULL DEFAULT 'test',
  status TEXT NOT NULL DEFAULT 'pending',
  execution_mode TEXT NOT NULL DEFAULT 'simulation',
  created_by_action_id UUID NOT NULL REFERENCES public.external_actions (id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  last_reconciled_at TIMESTAMPTZ,
  reconciliation_state TEXT NOT NULL DEFAULT 'unknown',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT external_resources_type_valid CHECK (
    resource_type IN ('repository', 'hosting_project', 'deployment')
  ),
  CONSTRAINT external_resources_execution_mode_valid CHECK (
    execution_mode IN ('mock', 'simulation', 'live')
  ),
  CONSTRAINT external_resources_reconciliation_valid CHECK (
    reconciliation_state IN (
      'in_sync',
      'missing_external',
      'missing_internal',
      'drifted',
      'verification_failed',
      'unknown'
    )
  ),
  CONSTRAINT external_resources_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX external_resources_org_idempotency_uidx
  ON public.external_resources (organization_id, idempotency_key);

CREATE INDEX external_resources_org_venture_idx
  ON public.external_resources (organization_id, venture_id, resource_type);

ALTER TABLE public.external_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_resources_select_member
  ON public.external_resources FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = external_resources.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

GRANT SELECT ON public.external_resources TO authenticated;

CREATE TRIGGER external_resources_set_updated_at
  BEFORE UPDATE ON public.external_resources
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
  'launch.execute_external_action',
  '1.0.0',
  'Execute External Action (Live — Gated)',
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","mission_id","external_action_id","live_approval_id"],"properties":{"organization_id":{"type":"string"},"mission_id":{"type":"string"},"external_action_id":{"type":"string"},"live_approval_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","required":["execution_status","execution_mode"],"properties":{"execution_status":{"type":"string"},"execution_mode":{"type":"string"}}}'::JSONB,
  '{"requires_active_mission":true,"side_effect_class":"external_write","live_gated":true}'::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'gateway_only', true)
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry cr
  WHERE cr.capability_key = 'launch.execute_external_action' AND cr.version = '1.0.0'
);

COMMENT ON TABLE public.external_resources IS
  'Durable external infrastructure references — no secrets stored.';

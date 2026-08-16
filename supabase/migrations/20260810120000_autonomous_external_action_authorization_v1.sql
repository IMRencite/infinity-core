-- Autonomous External Action Authorization v1

CREATE TABLE public.organization_external_autonomy_policies (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
  external_autonomy_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  max_auto_risk TEXT NOT NULL DEFAULT 'moderate',
  max_action_cost_usd NUMERIC NOT NULL DEFAULT 0,
  max_daily_cost_usd NUMERIC NOT NULL DEFAULT 0,
  max_venture_cost_usd NUMERIC NOT NULL DEFAULT 0,
  allowed_action_types JSONB NOT NULL DEFAULT '[]'::JSONB,
  allowed_providers JSONB NOT NULL DEFAULT '[]'::JSONB,
  prohibited_action_types JSONB NOT NULL DEFAULT '[]'::JSONB,
  human_approval_action_types JSONB NOT NULL DEFAULT '[]'::JSONB,
  policy_version TEXT NOT NULL DEFAULT 'organization_external_autonomy_v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_ext_autonomy_max_risk_valid CHECK (
    max_auto_risk IN ('low', 'moderate', 'high', 'critical')
  )
);

ALTER TABLE public.external_action_approvals
  ADD COLUMN IF NOT EXISTS authorization_source TEXT,
  ADD COLUMN IF NOT EXISTS policy_key TEXT,
  ADD COLUMN IF NOT EXISTS policy_version TEXT,
  ADD COLUMN IF NOT EXISTS policy_decision TEXT,
  ADD COLUMN IF NOT EXISTS risk_class TEXT,
  ADD COLUMN IF NOT EXISTS side_effect_class TEXT,
  ADD COLUMN IF NOT EXISTS cost_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS capability_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS credential_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS artifact_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS decision_reason JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correlation_id UUID,
  ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS external_action_approvals_autonomous_idempotency_uidx
  ON public.external_action_approvals (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND authorization_source = 'autonomous_policy';

ALTER TABLE public.external_actions
  ADD COLUMN IF NOT EXISTS authorization_source TEXT,
  ADD COLUMN IF NOT EXISTS active_authorization_id UUID REFERENCES public.external_action_approvals (id) ON DELETE SET NULL;

ALTER TABLE public.external_action_approvals
  DROP CONSTRAINT IF EXISTS external_action_approvals_source_valid;

ALTER TABLE public.external_action_approvals
  ADD CONSTRAINT external_action_approvals_source_valid CHECK (
    authorization_source IS NULL
    OR authorization_source IN ('autonomous_policy', 'human', 'system_test', 'denied')
  );

ALTER TABLE public.external_action_approvals
  DROP CONSTRAINT IF EXISTS external_action_approvals_decision_valid;

ALTER TABLE public.external_action_approvals
  ADD CONSTRAINT external_action_approvals_decision_valid CHECK (
    policy_decision IS NULL
    OR policy_decision IN ('AUTO_AUTHORIZE', 'REQUIRE_HUMAN_APPROVAL', 'BLOCK')
  );

ALTER TABLE public.organization_external_autonomy_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_external_autonomy_select_member
  ON public.organization_external_autonomy_policies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_external_autonomy_policies.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

GRANT SELECT ON public.organization_external_autonomy_policies TO authenticated;

CREATE TRIGGER organization_external_autonomy_policies_set_updated_at
  BEFORE UPDATE ON public.organization_external_autonomy_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.organization_external_autonomy_policies IS
  'Per-organization external autonomy — defaults fail closed (autonomy disabled).';

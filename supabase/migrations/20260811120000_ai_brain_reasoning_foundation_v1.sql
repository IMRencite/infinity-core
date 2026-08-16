-- =============================================================================
-- AI Brain Reasoning Foundation v1
-- =============================================================================

CREATE TABLE public.ai_brain_reasoning_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,

  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,

  objective TEXT NOT NULL,
  objective_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,

  structured_output JSONB NOT NULL DEFAULT '{}'::JSONB,
  validation_status TEXT,
  failure_classification TEXT,
  token_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_cost NUMERIC(14, 6),
  latency_ms INTEGER,
  request_id TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'requested',
  canonical_mission_draft JSONB,
  error_message TEXT,

  correlation_id TEXT,
  idempotency_key TEXT NOT NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ai_brain_reasoning_runs_objective_not_blank CHECK (BTRIM(objective) <> ''),
  CONSTRAINT ai_brain_reasoning_runs_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT ai_brain_reasoning_runs_status_valid CHECK (
    status IN (
      'requested',
      'provider_called',
      'validated',
      'completed',
      'failed',
      'policy_blocked',
      'validation_failed'
    )
  )
);

CREATE UNIQUE INDEX ai_brain_reasoning_runs_org_idempotency_uidx
  ON public.ai_brain_reasoning_runs (organization_id, idempotency_key);

CREATE INDEX ai_brain_reasoning_runs_organization_id_idx
  ON public.ai_brain_reasoning_runs (organization_id, created_at DESC);

CREATE INDEX ai_brain_reasoning_runs_mission_id_idx
  ON public.ai_brain_reasoning_runs (mission_id, created_at DESC)
  WHERE mission_id IS NOT NULL;

CREATE INDEX ai_brain_reasoning_runs_status_idx
  ON public.ai_brain_reasoning_runs (organization_id, status);

COMMENT ON TABLE public.ai_brain_reasoning_runs IS
  'Immutable audit trail for AI Brain structured reasoning runs (advisory only).';

CREATE OR REPLACE FUNCTION public.prevent_ai_brain_reasoning_runs_terminal_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IN ('completed', 'failed', 'policy_blocked', 'validation_failed') THEN
    RAISE EXCEPTION 'ai_brain_reasoning_runs are immutable once terminal';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ai_brain_reasoning_runs cannot be deleted';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_brain_reasoning_runs_prevent_terminal_mutation
  BEFORE UPDATE OR DELETE ON public.ai_brain_reasoning_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ai_brain_reasoning_runs_terminal_mutation();

ALTER TABLE public.ai_brain_reasoning_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_brain_reasoning_runs_service_role_all
  ON public.ai_brain_reasoning_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

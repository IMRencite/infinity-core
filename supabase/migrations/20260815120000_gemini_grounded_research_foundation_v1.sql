-- =============================================================================
-- Gemini Grounded Research Foundation v1
-- =============================================================================

CREATE TABLE public.research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,

  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,

  research_objective TEXT NOT NULL,
  input_hash TEXT NOT NULL,

  structured_result JSONB NOT NULL DEFAULT '{}'::JSONB,
  raw_provider_response JSONB NOT NULL DEFAULT '{}'::JSONB,
  grounding_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  normalized_evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  normalized_sources JSONB NOT NULL DEFAULT '[]'::JSONB,

  token_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  grounding_usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_cost NUMERIC(14, 6),
  cost_uncertainty TEXT,
  latency_ms INTEGER,
  request_id TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'requested',
  validation_status TEXT,
  failure_classification TEXT,
  error_message TEXT,

  correlation_id TEXT,
  idempotency_key TEXT NOT NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT research_runs_objective_not_blank CHECK (BTRIM(research_objective) <> ''),
  CONSTRAINT research_runs_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT research_runs_status_valid CHECK (
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

CREATE UNIQUE INDEX research_runs_org_idempotency_uidx
  ON public.research_runs (organization_id, idempotency_key);

CREATE INDEX research_runs_organization_id_idx
  ON public.research_runs (organization_id, created_at DESC);

CREATE INDEX research_runs_mission_id_idx
  ON public.research_runs (mission_id, created_at DESC)
  WHERE mission_id IS NOT NULL;

CREATE INDEX research_runs_status_idx
  ON public.research_runs (organization_id, status);

COMMENT ON TABLE public.research_runs IS
  'Immutable audit trail for grounded research runs (Gemini + future providers).';

CREATE OR REPLACE FUNCTION public.prevent_research_runs_terminal_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IN ('completed', 'failed', 'policy_blocked', 'validation_failed') THEN
    RAISE EXCEPTION 'research_runs are immutable once terminal';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'research_runs cannot be deleted';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER research_runs_prevent_terminal_mutation
  BEFORE UPDATE OR DELETE ON public.research_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_research_runs_terminal_mutation();

ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY research_runs_service_role_all
  ON public.research_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

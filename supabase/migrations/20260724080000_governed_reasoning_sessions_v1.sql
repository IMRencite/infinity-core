-- =============================================================================
-- Governed Reasoning Sessions v1 (OpenAI advisory cycle persistence)
-- =============================================================================

CREATE TABLE public.reasoning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities (id) ON DELETE SET NULL,
  validation_run_id UUID REFERENCES public.validation_runs (id) ON DELETE SET NULL,
  executive_decision_id UUID REFERENCES public.executive_decisions (id) ON DELETE SET NULL,
  runtime_instance_id UUID REFERENCES public.mission_runtime_instances (id) ON DELETE SET NULL,

  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  mode TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',

  context_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  context_hash TEXT NOT NULL,
  structured_output JSONB NOT NULL DEFAULT '{}'::JSONB,
  recommendation TEXT,
  confidence NUMERIC(5, 2),
  usage JSONB NOT NULL DEFAULT '{}'::JSONB,
  estimated_cost NUMERIC(14, 6),
  latency_ms INTEGER,
  error JSONB NOT NULL DEFAULT '{}'::JSONB,
  correlation_id TEXT,
  idempotency_key TEXT NOT NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reasoning_sessions_mode_valid CHECK (
    mode IN ('mock', 'shadow', 'advisory', 'disabled')
  ),
  CONSTRAINT reasoning_sessions_status_valid CHECK (
    status IN (
      'requested',
      'started',
      'context_built',
      'provider_called',
      'validated',
      'completed',
      'failed',
      'policy_blocked',
      'rejected'
    )
  ),
  CONSTRAINT reasoning_sessions_confidence_range CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 100)
  ),
  CONSTRAINT reasoning_sessions_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX reasoning_sessions_org_idempotency_uidx
  ON public.reasoning_sessions (organization_id, idempotency_key);

CREATE INDEX reasoning_sessions_organization_id_idx
  ON public.reasoning_sessions (organization_id, created_at DESC);

CREATE INDEX reasoning_sessions_mission_id_idx
  ON public.reasoning_sessions (mission_id, created_at DESC)
  WHERE mission_id IS NOT NULL;

CREATE INDEX reasoning_sessions_opportunity_id_idx
  ON public.reasoning_sessions (opportunity_id, created_at DESC)
  WHERE opportunity_id IS NOT NULL;

CREATE INDEX reasoning_sessions_status_idx
  ON public.reasoning_sessions (organization_id, status);

CREATE INDEX reasoning_sessions_provider_idx
  ON public.reasoning_sessions (organization_id, provider, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_reasoning_sessions_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IN ('completed', 'failed', 'policy_blocked', 'rejected') THEN
    RAISE EXCEPTION 'reasoning_sessions are immutable once terminal';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'reasoning_sessions cannot be deleted';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reasoning_sessions_prevent_terminal_mutation
  BEFORE UPDATE OR DELETE ON public.reasoning_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_reasoning_sessions_mutation();

CREATE OR REPLACE FUNCTION public.validate_reasoning_session_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.mission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.missions m
    WHERE m.id = NEW.mission_id AND m.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'reasoning_sessions.mission_id must match organization';
  END IF;

  IF NEW.opportunity_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = NEW.opportunity_id AND o.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'reasoning_sessions.opportunity_id must match organization';
  END IF;

  IF NEW.runtime_instance_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.mission_runtime_instances r
    WHERE r.id = NEW.runtime_instance_id AND r.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'reasoning_sessions.runtime_instance_id must match organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reasoning_sessions_validate_organization
  BEFORE INSERT OR UPDATE OF organization_id, mission_id, opportunity_id, runtime_instance_id
  ON public.reasoning_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reasoning_session_organization();

ALTER TABLE public.reasoning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reasoning_sessions_select_member
  ON public.reasoning_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

INSERT INTO public.capability_registry (
  organization_id,
  capability_key,
  capability_type,
  display_name,
  description,
  version,
  status,
  health_status,
  engine_name,
  is_default,
  implementation_key,
  input_schema,
  output_schema,
  policy_requirements,
  cost_metadata,
  provider_metadata
)
SELECT
  NULL,
  'reasoning.execute_advisory',
  'engine',
  'Governed Advisory Reasoning',
  'Bounded OpenAI/mock advisory reasoning with structured output (v1).',
  '1.0.0',
  'active',
  'healthy',
  'reasoning_engine',
  TRUE,
  'reasoning.execute_advisory.v1',
  '{"required":["organization_id","mission_id","opportunity_id","runtime_instance_id","mode"]}'::JSONB,
  '{"properties":{"reasoning_session_id":{"type":"string"}}}'::JSONB,
  '{"autonomy_level":"advisory_only","tools":false}'::JSONB,
  '{"unit":"per_session","estimated_usd":null}'::JSONB,
  '{"implementation_key":"reasoning.execute_advisory.v1"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1
  FROM public.capability_registry
  WHERE organization_id IS NULL
    AND capability_key = 'reasoning.execute_advisory'
    AND version = '1.0.0'
);

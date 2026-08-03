-- =============================================================================
-- Mission Runtime Foundation v1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mission_runtime_instances
-- -----------------------------------------------------------------------------

CREATE TABLE public.mission_runtime_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,

  runtime_version TEXT NOT NULL DEFAULT 'mission_runtime_v1',
  status TEXT NOT NULL DEFAULT 'ready',
  current_stage TEXT NOT NULL DEFAULT 'command',
  previous_stage TEXT,

  state_version INTEGER NOT NULL DEFAULT 1,

  started_at TIMESTAMPTZ,
  last_advanced_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  wake_at TIMESTAMPTZ,

  correlation_id TEXT,

  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,

  last_error JSONB NOT NULL DEFAULT '{}'::JSONB,
  context JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT mission_runtime_instances_status_valid CHECK (
    status IN (
      'draft',
      'ready',
      'running',
      'waiting',
      'blocked',
      'paused',
      'completed',
      'failed',
      'cancelled',
      'archived'
    )
  ),
  CONSTRAINT mission_runtime_instances_stage_valid CHECK (
    current_stage IN (
      'command',
      'discovery',
      'evaluation',
      'allocation',
      'validation',
      'reasoning',
      'executive',
      'planning',
      'scheduling',
      'execution',
      'review',
      'completed'
    )
  ),
  CONSTRAINT mission_runtime_instances_state_version_positive CHECK (state_version >= 1)
);

COMMENT ON TABLE public.mission_runtime_instances IS
  'Durable mission lifecycle runtime. One active instance per mission (running/waiting/ready).';

CREATE UNIQUE INDEX mission_runtime_instances_one_active_per_mission_uidx
  ON public.mission_runtime_instances (mission_id)
  WHERE status IN ('ready', 'running', 'waiting', 'blocked', 'paused');

CREATE INDEX mission_runtime_instances_organization_id_idx
  ON public.mission_runtime_instances (organization_id);

CREATE INDEX mission_runtime_instances_mission_id_idx
  ON public.mission_runtime_instances (mission_id);

CREATE INDEX mission_runtime_instances_status_idx
  ON public.mission_runtime_instances (organization_id, status);

CREATE INDEX mission_runtime_instances_stage_idx
  ON public.mission_runtime_instances (organization_id, current_stage);

CREATE INDEX mission_runtime_instances_wake_at_idx
  ON public.mission_runtime_instances (organization_id, wake_at)
  WHERE wake_at IS NOT NULL;

CREATE TRIGGER mission_runtime_instances_set_updated_at
  BEFORE UPDATE ON public.mission_runtime_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- mission_runtime_transitions (append-only)
-- -----------------------------------------------------------------------------

CREATE TABLE public.mission_runtime_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  runtime_instance_id UUID NOT NULL REFERENCES public.mission_runtime_instances (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,

  from_stage TEXT,
  to_stage TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,

  transition_reason TEXT NOT NULL,
  transition_key TEXT NOT NULL,

  correlation_id TEXT,
  command_decision_id UUID REFERENCES public.command_decisions (id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans (id) ON DELETE SET NULL,
  engine_job_id UUID REFERENCES public.engine_jobs (id) ON DELETE SET NULL,
  worker_run_id UUID REFERENCES public.worker_runs (id) ON DELETE SET NULL,

  context_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT mission_runtime_transitions_transition_key_not_blank CHECK (
    BTRIM(transition_key) <> ''
  )
);

CREATE UNIQUE INDEX mission_runtime_transitions_idempotency_uidx
  ON public.mission_runtime_transitions (runtime_instance_id, transition_key);

CREATE INDEX mission_runtime_transitions_runtime_idx
  ON public.mission_runtime_transitions (runtime_instance_id, occurred_at DESC);

CREATE INDEX mission_runtime_transitions_mission_idx
  ON public.mission_runtime_transitions (mission_id, occurred_at DESC);

CREATE INDEX mission_runtime_transitions_stage_idx
  ON public.mission_runtime_transitions (to_stage, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_mission_runtime_transitions_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'mission_runtime_transitions are append-only';
END;
$$;

CREATE TRIGGER mission_runtime_transitions_prevent_update
  BEFORE UPDATE ON public.mission_runtime_transitions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_mission_runtime_transitions_mutation();

CREATE TRIGGER mission_runtime_transitions_prevent_delete
  BEFORE DELETE ON public.mission_runtime_transitions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_mission_runtime_transitions_mutation();

-- -----------------------------------------------------------------------------
-- mission_runtime_checkpoints (immutable)
-- -----------------------------------------------------------------------------

CREATE TABLE public.mission_runtime_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  runtime_instance_id UUID NOT NULL REFERENCES public.mission_runtime_instances (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,

  checkpoint_key TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  state_version INTEGER NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT mission_runtime_checkpoints_key_not_blank CHECK (BTRIM(checkpoint_key) <> '')
);

CREATE UNIQUE INDEX mission_runtime_checkpoints_idempotency_uidx
  ON public.mission_runtime_checkpoints (runtime_instance_id, checkpoint_key);

CREATE INDEX mission_runtime_checkpoints_runtime_idx
  ON public.mission_runtime_checkpoints (runtime_instance_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_mission_runtime_checkpoints_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'mission_runtime_checkpoints are immutable';
END;
$$;

CREATE TRIGGER mission_runtime_checkpoints_prevent_update
  BEFORE UPDATE ON public.mission_runtime_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_mission_runtime_checkpoints_mutation();

CREATE TRIGGER mission_runtime_checkpoints_prevent_delete
  BEFORE DELETE ON public.mission_runtime_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_mission_runtime_checkpoints_mutation();

-- -----------------------------------------------------------------------------
-- Organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_mission_runtime_instance_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.missions AS m
    WHERE m.id = NEW.mission_id
      AND m.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'mission_runtime_instances.mission_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mission_runtime_instances_validate_organization
  BEFORE INSERT OR UPDATE OF mission_id, organization_id ON public.mission_runtime_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_mission_runtime_instance_organization();

CREATE OR REPLACE FUNCTION public.validate_mission_runtime_transition_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.mission_runtime_instances AS r
    WHERE r.id = NEW.runtime_instance_id
      AND r.organization_id = NEW.organization_id
      AND r.mission_id = NEW.mission_id
  ) THEN
    RAISE EXCEPTION 'mission_runtime_transitions must match runtime instance organization/mission';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mission_runtime_transitions_validate_organization
  BEFORE INSERT ON public.mission_runtime_transitions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_mission_runtime_transition_organization();

CREATE OR REPLACE FUNCTION public.validate_mission_runtime_checkpoint_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.mission_runtime_instances AS r
    WHERE r.id = NEW.runtime_instance_id
      AND r.organization_id = NEW.organization_id
      AND r.mission_id = NEW.mission_id
  ) THEN
    RAISE EXCEPTION 'mission_runtime_checkpoints must match runtime instance organization/mission';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mission_runtime_checkpoints_validate_organization
  BEFORE INSERT ON public.mission_runtime_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_mission_runtime_checkpoint_organization();

-- -----------------------------------------------------------------------------
-- Atomic runtime claim (lease)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_mission_runtime_instance(
  p_runtime_instance_id UUID,
  p_organization_id UUID,
  p_locked_by TEXT,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.mission_runtime_instances%ROWTYPE;
BEGIN
  IF BTRIM(COALESCE(p_locked_by, '')) = '' THEN
    RAISE EXCEPTION 'locked_by is required';
  END IF;

  SELECT *
  INTO v_row
  FROM public.mission_runtime_instances
  WHERE id = p_runtime_instance_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mission runtime instance not found';
  END IF;

  IF v_row.status = 'paused' OR v_row.status = 'cancelled' OR v_row.status = 'completed'
     OR v_row.status = 'failed' OR v_row.status = 'archived' THEN
    RAISE EXCEPTION 'runtime instance is not claimable (status=%)', v_row.status;
  END IF;

  IF v_row.locked_by IS NOT NULL
     AND v_row.lease_expires_at IS NOT NULL
     AND v_row.lease_expires_at > NOW()
     AND v_row.locked_by <> p_locked_by THEN
    RAISE EXCEPTION 'runtime instance is locked by another worker';
  END IF;

  UPDATE public.mission_runtime_instances
  SET
    locked_by = p_locked_by,
    locked_at = NOW(),
    lease_expires_at = NOW() + MAKE_INTERVAL(secs => GREATEST(p_lease_seconds, 30)),
    heartbeat_at = NOW(),
    updated_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_mission_runtime_instance(
  p_runtime_instance_id UUID,
  p_organization_id UUID,
  p_locked_by TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mission_runtime_instances
  SET
    locked_by = NULL,
    locked_at = NULL,
    lease_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_runtime_instance_id
    AND organization_id = p_organization_id
    AND (locked_by IS NULL OR locked_by = p_locked_by);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_mission_runtime_instance(UUID, UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_mission_runtime_instance(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_mission_runtime_instance(UUID, UUID, TEXT, INTEGER) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_mission_runtime_instance(UUID, UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mission_runtime_instance(UUID, UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_mission_runtime_instance(UUID, UUID, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.mission_runtime_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_runtime_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_runtime_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY mission_runtime_instances_select_member
  ON public.mission_runtime_instances
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY mission_runtime_transitions_select_member
  ON public.mission_runtime_transitions
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY mission_runtime_checkpoints_select_member
  ON public.mission_runtime_checkpoints
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

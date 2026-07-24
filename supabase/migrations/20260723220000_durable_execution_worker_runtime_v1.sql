-- =============================================================================
-- Infinity Durable Execution and Worker Runtime v1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extend capability_registry with implementation_key
-- -----------------------------------------------------------------------------

ALTER TABLE public.capability_registry
  ADD COLUMN IF NOT EXISTS implementation_key TEXT;

COMMENT ON COLUMN public.capability_registry.implementation_key IS
  'Local worker runtime implementation identifier resolved at execution time.';

UPDATE public.capability_registry
SET
  implementation_key = 'discovery.scan.v1',
  provider_metadata = COALESCE(provider_metadata, '{}'::JSONB) || '{"implementation_key":"discovery.scan.v1"}'::JSONB
WHERE capability_key = 'discovery.scan'
  AND organization_id IS NULL;

-- -----------------------------------------------------------------------------
-- Extend engine_jobs for durable execution
-- -----------------------------------------------------------------------------

ALTER TABLE public.engine_jobs
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;

ALTER TABLE public.engine_jobs
  DROP CONSTRAINT IF EXISTS engine_jobs_priority_non_negative;

ALTER TABLE public.engine_jobs
  ADD CONSTRAINT engine_jobs_priority_range CHECK (priority >= 0 AND priority <= 100),
  ADD CONSTRAINT engine_jobs_attempt_count_non_negative CHECK (attempt_count >= 0),
  ADD CONSTRAINT engine_jobs_max_attempts_positive CHECK (max_attempts >= 1),
  ADD CONSTRAINT engine_jobs_timeout_seconds_positive CHECK (
    timeout_seconds IS NULL OR timeout_seconds > 0
  );

CREATE INDEX IF NOT EXISTS engine_jobs_next_attempt_at_idx
  ON public.engine_jobs (organization_id, next_attempt_at)
  WHERE status IN ('queued', 'waiting');

CREATE INDEX IF NOT EXISTS engine_jobs_available_at_idx
  ON public.engine_jobs (organization_id, available_at)
  WHERE status IN ('queued', 'waiting');

CREATE INDEX IF NOT EXISTS engine_jobs_mission_id_idx
  ON public.engine_jobs (mission_id)
  WHERE mission_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- worker_runs
-- -----------------------------------------------------------------------------

CREATE TABLE public.worker_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,
  engine_job_id UUID NOT NULL REFERENCES public.engine_jobs (id) ON DELETE RESTRICT,
  capability_id UUID REFERENCES public.capability_registry (id) ON DELETE SET NULL,

  engine_name TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  worker_version TEXT,
  provider TEXT,
  model TEXT,

  status TEXT NOT NULL DEFAULT 'queued',

  attempt_number INTEGER NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::JSONB,
  output JSONB NOT NULL DEFAULT '{}'::JSONB,
  error JSONB NOT NULL DEFAULT '{}'::JSONB,
  metrics JSONB NOT NULL DEFAULT '{}'::JSONB,

  cost_amount NUMERIC(14, 4),
  cost_currency TEXT,
  confidence_score NUMERIC(5, 2),
  quality_score NUMERIC(5, 2),

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms BIGINT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT worker_runs_engine_name_not_blank CHECK (BTRIM(engine_name) <> ''),
  CONSTRAINT worker_runs_worker_name_not_blank CHECK (BTRIM(worker_name) <> ''),
  CONSTRAINT worker_runs_status_valid CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'timed_out')
  ),
  CONSTRAINT worker_runs_attempt_number_positive CHECK (attempt_number >= 1),
  CONSTRAINT worker_runs_confidence_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT worker_runs_quality_range CHECK (
    quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)
  ),
  CONSTRAINT worker_runs_cost_amount_non_negative CHECK (
    cost_amount IS NULL OR cost_amount >= 0
  ),
  CONSTRAINT worker_runs_duration_non_negative CHECK (
    duration_ms IS NULL OR duration_ms >= 0
  )
);

COMMENT ON TABLE public.worker_runs IS
  'One execution attempt for an engine job by the Worker Runtime.';

CREATE INDEX worker_runs_organization_id_idx
  ON public.worker_runs (organization_id);

CREATE INDEX worker_runs_engine_job_id_idx
  ON public.worker_runs (engine_job_id);

CREATE INDEX worker_runs_capability_id_idx
  ON public.worker_runs (capability_id);

CREATE INDEX worker_runs_status_idx
  ON public.worker_runs (organization_id, status);

CREATE INDEX worker_runs_engine_name_idx
  ON public.worker_runs (organization_id, engine_name);

CREATE INDEX worker_runs_worker_name_idx
  ON public.worker_runs (organization_id, worker_name);

CREATE INDEX worker_runs_created_at_idx
  ON public.worker_runs (organization_id, created_at DESC);

CREATE TRIGGER worker_runs_set_updated_at
  BEFORE UPDATE ON public.worker_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- job_attempt_events
-- -----------------------------------------------------------------------------

CREATE TABLE public.job_attempt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  engine_job_id UUID NOT NULL REFERENCES public.engine_jobs (id) ON DELETE RESTRICT,
  worker_run_id UUID REFERENCES public.worker_runs (id) ON DELETE SET NULL,

  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT job_attempt_events_type_not_blank CHECK (BTRIM(event_type) <> '')
);

COMMENT ON TABLE public.job_attempt_events IS
  'Append-only execution history for engine job attempts.';

CREATE INDEX job_attempt_events_organization_id_idx
  ON public.job_attempt_events (organization_id);

CREATE INDEX job_attempt_events_engine_job_id_idx
  ON public.job_attempt_events (engine_job_id, created_at DESC);

CREATE INDEX job_attempt_events_worker_run_id_idx
  ON public.job_attempt_events (worker_run_id)
  WHERE worker_run_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_job_attempt_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'job_attempt_events are append-only and cannot be modified or deleted';
END;
$$;

CREATE TRIGGER job_attempt_events_prevent_update
  BEFORE UPDATE ON public.job_attempt_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_job_attempt_events_mutation();

CREATE TRIGGER job_attempt_events_prevent_delete
  BEFORE DELETE ON public.job_attempt_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_job_attempt_events_mutation();

-- -----------------------------------------------------------------------------
-- Cross-table organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_worker_run_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.engine_jobs AS j
    WHERE j.id = NEW.engine_job_id
      AND j.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'worker_runs.engine_job_id must reference a job in the same organization';
  END IF;

  IF NEW.mission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.missions AS m
    WHERE m.id = NEW.mission_id
      AND m.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'worker_runs.mission_id must reference a mission in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER worker_runs_validate_organization
  BEFORE INSERT OR UPDATE OF engine_job_id, mission_id, organization_id ON public.worker_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_worker_run_organization();

CREATE OR REPLACE FUNCTION public.validate_job_attempt_event_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.engine_jobs AS j
    WHERE j.id = NEW.engine_job_id
      AND j.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'job_attempt_events.engine_job_id must reference a job in the same organization';
  END IF;

  IF NEW.worker_run_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.worker_runs AS wr
    WHERE wr.id = NEW.worker_run_id
      AND wr.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'job_attempt_events.worker_run_id must reference a worker run in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER job_attempt_events_validate_organization
  BEFORE INSERT OR UPDATE OF engine_job_id, worker_run_id, organization_id
    ON public.job_attempt_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_job_attempt_event_organization();

CREATE OR REPLACE FUNCTION public.validate_engine_job_mission_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.mission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.missions AS m
    WHERE m.id = NEW.mission_id
      AND m.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'engine_jobs.mission_id must reference a mission in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER engine_jobs_validate_mission_organization
  BEFORE INSERT OR UPDATE OF mission_id, organization_id ON public.engine_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_engine_job_mission_organization();

-- -----------------------------------------------------------------------------
-- Atomic job claim
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_engine_job(
  p_job_id UUID,
  p_organization_id UUID,
  p_executor_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.engine_jobs%ROWTYPE;
  v_worker_run public.worker_runs%ROWTYPE;
  v_attempt_number INTEGER;
  v_engine_name TEXT;
  v_worker_name TEXT;
  v_worker_version TEXT;
  v_capability_id UUID;
BEGIN
  IF BTRIM(COALESCE(p_executor_id, '')) = '' THEN
    RAISE EXCEPTION 'executor_id is required';
  END IF;

  SELECT *
  INTO v_job
  FROM public.engine_jobs
  WHERE id = p_job_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'engine job not found for organization';
  END IF;

  IF v_job.cancellation_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'job cancellation requested';
  END IF;

  IF v_job.status NOT IN ('queued', 'waiting') THEN
    RAISE EXCEPTION 'job is not claimable (status=%)', v_job.status;
  END IF;

  IF v_job.available_at IS NOT NULL AND v_job.available_at > NOW() THEN
    RAISE EXCEPTION 'job is not yet available';
  END IF;

  IF v_job.next_attempt_at IS NOT NULL AND v_job.next_attempt_at > NOW() THEN
    RAISE EXCEPTION 'job retry is not yet due';
  END IF;

  IF v_job.attempt_count >= v_job.max_attempts THEN
    RAISE EXCEPTION 'job has exhausted max attempts';
  END IF;

  v_attempt_number := v_job.attempt_count + 1;
  v_engine_name := COALESCE(v_job.resolved_engine_name, 'unknown_engine');
  v_worker_name := v_job.capability_key;
  v_worker_version := v_job.resolved_version;
  v_capability_id := v_job.resolved_capability_id;

  UPDATE public.engine_jobs
  SET
    status = 'running',
    attempt_count = v_attempt_number,
    locked_at = NOW(),
    locked_by = p_executor_id,
    started_at = COALESCE(started_at, NOW()),
    updated_at = NOW()
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  INSERT INTO public.worker_runs (
    organization_id,
    mission_id,
    engine_job_id,
    capability_id,
    engine_name,
    worker_name,
    worker_version,
    status,
    attempt_number,
    input,
    started_at
  ) VALUES (
    v_job.organization_id,
    v_job.mission_id,
    v_job.id,
    v_capability_id,
    v_engine_name,
    v_worker_name,
    v_worker_version,
    'running',
    v_attempt_number,
    v_job.payload,
    NOW()
  )
  RETURNING * INTO v_worker_run;

  INSERT INTO public.job_attempt_events (
    organization_id,
    engine_job_id,
    worker_run_id,
    event_type,
    payload
  ) VALUES
  (
    v_job.organization_id,
    v_job.id,
    v_worker_run.id,
    'job.claimed',
    jsonb_build_object(
      'executor_id', p_executor_id,
      'attempt_number', v_attempt_number
    )
  ),
  (
    v_job.organization_id,
    v_job.id,
    v_worker_run.id,
    'worker.started',
    jsonb_build_object(
      'worker_name', v_worker_name,
      'worker_version', v_worker_version
    )
  );

  RETURN jsonb_build_object(
    'job', to_jsonb(v_job),
    'worker_run', to_jsonb(v_worker_run)
  );
END;
$$;

COMMENT ON FUNCTION public.claim_engine_job(UUID, UUID, TEXT) IS
  'Atomically claims a queued/waiting engine job and creates a worker run.';

REVOKE ALL ON FUNCTION public.claim_engine_job(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_engine_job(UUID, UUID, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.worker_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_attempt_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS engine_jobs_update_member ON public.engine_jobs;

CREATE POLICY worker_runs_select_member
  ON public.worker_runs FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY job_attempt_events_select_member
  ON public.job_attempt_events FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.worker_runs TO authenticated;
GRANT SELECT ON public.job_attempt_events TO authenticated;

-- =============================================================================
-- Infinity OS Foundation v1
-- =============================================================================
-- Core operating primitives: missions, policies, command cycles/decisions,
-- plans, plan steps, engine jobs, capability registry.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- missions
-- -----------------------------------------------------------------------------

CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  title TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'draft',
  objectives JSONB NOT NULL DEFAULT '[]'::JSONB,
  constraints JSONB NOT NULL DEFAULT '{}'::JSONB,

  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT missions_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT missions_status_valid CHECK (
    status IN ('draft', 'active', 'paused', 'completed', 'archived')
  )
);

COMMENT ON TABLE public.missions IS
  'Organization strategic objective driving autonomous Command cycles.';

CREATE UNIQUE INDEX missions_one_active_per_org_uidx
  ON public.missions (organization_id)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX missions_organization_id_idx
  ON public.missions (organization_id);

CREATE INDEX missions_organization_status_idx
  ON public.missions (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER missions_set_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- mission_policies
-- -----------------------------------------------------------------------------

CREATE TABLE public.mission_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,

  policy_category TEXT NOT NULL,
  policy_key TEXT NOT NULL,
  autonomy_level TEXT NOT NULL DEFAULT 'approval_required',

  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT mission_policies_category_not_blank CHECK (BTRIM(policy_category) <> ''),
  CONSTRAINT mission_policies_key_not_blank CHECK (BTRIM(policy_key) <> ''),
  CONSTRAINT mission_policies_autonomy_level_valid CHECK (
    autonomy_level IN (
      'observe_only',
      'approval_required',
      'bounded_autonomy',
      'full_autonomy'
    )
  ),
  CONSTRAINT mission_policies_unique_key UNIQUE (mission_id, policy_category, policy_key)
);

COMMENT ON TABLE public.mission_policies IS
  'Mission-scoped autonomy and governance policies.';

CREATE INDEX mission_policies_organization_id_idx
  ON public.mission_policies (organization_id);

CREATE INDEX mission_policies_mission_id_idx
  ON public.mission_policies (mission_id);

CREATE TRIGGER mission_policies_set_updated_at
  BEFORE UPDATE ON public.mission_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- command_cycles
-- -----------------------------------------------------------------------------

CREATE TABLE public.command_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,

  status TEXT NOT NULL DEFAULT 'running',
  trigger_source TEXT NOT NULL DEFAULT 'manual',

  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  summary JSONB NOT NULL DEFAULT '{}'::JSONB,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT command_cycles_status_valid CHECK (
    status IN ('running', 'completed', 'failed', 'skipped', 'cancelled')
  ),
  CONSTRAINT command_cycles_trigger_valid CHECK (
    trigger_source IN ('manual', 'scheduled', 'event', 'system')
  )
);

COMMENT ON TABLE public.command_cycles IS
  'Bounded Command evaluation pass for a mission.';

CREATE INDEX command_cycles_organization_id_idx
  ON public.command_cycles (organization_id);

CREATE INDEX command_cycles_mission_id_idx
  ON public.command_cycles (mission_id);

CREATE INDEX command_cycles_correlation_id_idx
  ON public.command_cycles (correlation_id);

CREATE TRIGGER command_cycles_set_updated_at
  BEFORE UPDATE ON public.command_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- command_decisions
-- -----------------------------------------------------------------------------

CREATE TABLE public.command_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  command_cycle_id UUID NOT NULL REFERENCES public.command_cycles (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,

  decision_type TEXT NOT NULL,
  outcome TEXT NOT NULL,

  reasoning TEXT NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL DEFAULT 0,

  evidence_refs JSONB NOT NULL DEFAULT '[]'::JSONB,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,

  supersedes_id UUID REFERENCES public.command_decisions (id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT command_decisions_type_not_blank CHECK (BTRIM(decision_type) <> ''),
  CONSTRAINT command_decisions_outcome_not_blank CHECK (BTRIM(outcome) <> ''),
  CONSTRAINT command_decisions_reasoning_not_blank CHECK (BTRIM(reasoning) <> ''),
  CONSTRAINT command_decisions_confidence_range CHECK (
    confidence >= 0 AND confidence <= 100
  )
);

COMMENT ON TABLE public.command_decisions IS
  'Append-only Command decision records with reasoning and confidence.';

CREATE INDEX command_decisions_organization_id_idx
  ON public.command_decisions (organization_id);

CREATE INDEX command_decisions_cycle_id_idx
  ON public.command_decisions (command_cycle_id);

CREATE INDEX command_decisions_mission_id_idx
  ON public.command_decisions (mission_id);

-- -----------------------------------------------------------------------------
-- plans
-- -----------------------------------------------------------------------------

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  command_decision_id UUID NOT NULL REFERENCES public.command_decisions (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  command_cycle_id UUID NOT NULL REFERENCES public.command_cycles (id) ON DELETE RESTRICT,

  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',

  title TEXT NOT NULL,
  objectives JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT plans_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT plans_version_positive CHECK (version > 0),
  CONSTRAINT plans_status_valid CHECK (
    status IN ('draft', 'active', 'superseded', 'cancelled', 'completed')
  )
);

COMMENT ON TABLE public.plans IS
  'Versioned execution structure produced by Planner from Command decisions.';

CREATE INDEX plans_organization_id_idx
  ON public.plans (organization_id);

CREATE INDEX plans_decision_id_idx
  ON public.plans (command_decision_id);

CREATE INDEX plans_cycle_id_idx
  ON public.plans (command_cycle_id);

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- plan_steps
-- -----------------------------------------------------------------------------

CREATE TABLE public.plan_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans (id) ON DELETE RESTRICT,

  step_order INTEGER NOT NULL,
  capability_key TEXT NOT NULL,

  title TEXT NOT NULL,
  description TEXT,

  constraints JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT plan_steps_order_positive CHECK (step_order > 0),
  CONSTRAINT plan_steps_capability_key_not_blank CHECK (BTRIM(capability_key) <> ''),
  CONSTRAINT plan_steps_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT plan_steps_status_valid CHECK (
    status IN ('pending', 'scheduled', 'running', 'completed', 'failed', 'skipped')
  ),
  CONSTRAINT plan_steps_unique_order UNIQUE (plan_id, step_order)
);

COMMENT ON TABLE public.plan_steps IS
  'Ordered capability requirements within a plan.';

CREATE INDEX plan_steps_organization_id_idx
  ON public.plan_steps (organization_id);

CREATE INDEX plan_steps_plan_id_idx
  ON public.plan_steps (plan_id);

CREATE TRIGGER plan_steps_set_updated_at
  BEFORE UPDATE ON public.plan_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- capability_registry
-- -----------------------------------------------------------------------------

CREATE TABLE public.capability_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE,

  capability_key TEXT NOT NULL,
  capability_type TEXT NOT NULL,

  display_name TEXT NOT NULL,
  description TEXT,

  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'active',
  health_status TEXT NOT NULL DEFAULT 'unknown',

  engine_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  input_schema JSONB NOT NULL DEFAULT '{}'::JSONB,
  output_schema JSONB NOT NULL DEFAULT '{}'::JSONB,
  policy_requirements JSONB NOT NULL DEFAULT '{}'::JSONB,
  cost_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  quality_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT capability_registry_key_not_blank CHECK (BTRIM(capability_key) <> ''),
  CONSTRAINT capability_registry_type_not_blank CHECK (BTRIM(capability_type) <> ''),
  CONSTRAINT capability_registry_display_name_not_blank CHECK (BTRIM(display_name) <> ''),
  CONSTRAINT capability_registry_status_valid CHECK (
    status IN ('active', 'deprecated', 'disabled')
  ),
  CONSTRAINT capability_registry_health_valid CHECK (
    health_status IN ('healthy', 'degraded', 'unhealthy', 'disabled', 'unknown')
  ),
  CONSTRAINT capability_registry_type_valid CHECK (
    capability_type IN (
      'engine',
      'worker',
      'builder',
      'module',
      'provider',
      'adapter',
      'deployment_target',
      'tool',
      'human_review',
      'workflow'
    )
  )
);

COMMENT ON TABLE public.capability_registry IS
  'Authoritative catalog of execution capabilities for Planner and Scheduler resolution.';

CREATE UNIQUE INDEX capability_registry_global_key_version_uidx
  ON public.capability_registry (capability_key, version)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX capability_registry_org_key_version_uidx
  ON public.capability_registry (organization_id, capability_key, version)
  WHERE organization_id IS NOT NULL;

CREATE INDEX capability_registry_capability_key_idx
  ON public.capability_registry (capability_key);

CREATE INDEX capability_registry_organization_id_idx
  ON public.capability_registry (organization_id);

CREATE TRIGGER capability_registry_set_updated_at
  BEFORE UPDATE ON public.capability_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Seed platform Discovery capability (deterministic v1, no external integrations).
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
  input_schema,
  output_schema,
  policy_requirements,
  cost_metadata
) VALUES (
  NULL,
  'discovery.scan',
  'engine',
  'Discovery Scan',
  'Deterministic Discovery Engine scan (Foundation v1 stub; no external sources).',
  '1.0.0',
  'active',
  'healthy',
  'discovery_engine',
  TRUE,
  '{"required": ["scan_type"], "properties": {"scan_type": {"type": "string"}}}'::JSONB,
  '{"properties": {"opportunity_scan_id": {"type": "string"}}}'::JSONB,
  '{"autonomy_level": "bounded_autonomy"}'::JSONB,
  '{"unit": "per_run", "estimated_usd": 0}'::JSONB
);

-- -----------------------------------------------------------------------------
-- engine_jobs
-- -----------------------------------------------------------------------------

CREATE TABLE public.engine_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  command_cycle_id UUID REFERENCES public.command_cycles (id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans (id) ON DELETE SET NULL,
  plan_step_id UUID REFERENCES public.plan_steps (id) ON DELETE SET NULL,

  capability_key TEXT NOT NULL,
  resolved_capability_id UUID REFERENCES public.capability_registry (id) ON DELETE SET NULL,
  resolved_engine_name TEXT,
  resolved_version TEXT,

  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 100,

  idempotency_key TEXT NOT NULL,
  correlation_id UUID NOT NULL,

  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  result JSONB NOT NULL DEFAULT '{}'::JSONB,
  error_message TEXT,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT engine_jobs_capability_key_not_blank CHECK (BTRIM(capability_key) <> ''),
  CONSTRAINT engine_jobs_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT engine_jobs_status_valid CHECK (
    status IN (
      'queued',
      'running',
      'waiting',
      'completed',
      'failed',
      'cancelled',
      'dead_letter'
    )
  ),
  CONSTRAINT engine_jobs_priority_non_negative CHECK (priority >= 0),
  CONSTRAINT engine_jobs_unique_idempotency UNIQUE (organization_id, idempotency_key)
);

COMMENT ON TABLE public.engine_jobs IS
  'Durable Scheduler work units with Registry-resolved capability bindings.';

CREATE INDEX engine_jobs_organization_id_idx
  ON public.engine_jobs (organization_id);

CREATE INDEX engine_jobs_status_idx
  ON public.engine_jobs (organization_id, status);

CREATE INDEX engine_jobs_capability_key_idx
  ON public.engine_jobs (organization_id, capability_key);

CREATE INDEX engine_jobs_correlation_id_idx
  ON public.engine_jobs (correlation_id);

CREATE INDEX engine_jobs_pending_discovery_idx
  ON public.engine_jobs (organization_id, status)
  WHERE capability_key LIKE 'discovery.%'
    AND status IN ('queued', 'running', 'waiting');

CREATE TRIGGER engine_jobs_set_updated_at
  BEFORE UPDATE ON public.engine_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cross-table organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_mission_policy_organization()
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
    RAISE EXCEPTION
      'mission_policies.mission_id must reference a mission in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mission_policies_validate_organization
  BEFORE INSERT OR UPDATE OF mission_id, organization_id ON public.mission_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_mission_policy_organization();

CREATE OR REPLACE FUNCTION public.validate_command_cycle_organization()
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
    RAISE EXCEPTION
      'command_cycles.mission_id must reference a mission in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER command_cycles_validate_organization
  BEFORE INSERT OR UPDATE OF mission_id, organization_id ON public.command_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_command_cycle_organization();

CREATE OR REPLACE FUNCTION public.validate_command_decision_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.command_cycles AS c
    WHERE c.id = NEW.command_cycle_id
      AND c.organization_id = NEW.organization_id
      AND c.mission_id = NEW.mission_id
  ) THEN
    RAISE EXCEPTION
      'command_decisions must align with command_cycles organization and mission';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER command_decisions_validate_organization
  BEFORE INSERT OR UPDATE OF command_cycle_id, mission_id, organization_id
    ON public.command_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_command_decision_organization();

CREATE OR REPLACE FUNCTION public.validate_plan_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.command_decisions AS d
    WHERE d.id = NEW.command_decision_id
      AND d.organization_id = NEW.organization_id
      AND d.mission_id = NEW.mission_id
      AND d.command_cycle_id = NEW.command_cycle_id
  ) THEN
    RAISE EXCEPTION
      'plans must align with command decision organization, mission, and cycle';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER plans_validate_organization
  BEFORE INSERT OR UPDATE OF command_decision_id, mission_id, command_cycle_id, organization_id
    ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_plan_organization();

CREATE OR REPLACE FUNCTION public.validate_plan_step_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.plans AS p
    WHERE p.id = NEW.plan_id
      AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'plan_steps.plan_id must reference a plan in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER plan_steps_validate_organization
  BEFORE INSERT OR UPDATE OF plan_id, organization_id ON public.plan_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_plan_step_organization();

CREATE OR REPLACE FUNCTION public.validate_engine_job_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.plans AS p
    WHERE p.id = NEW.plan_id
      AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'engine_jobs.plan_id must reference a plan in the same organization';
  END IF;

  IF NEW.plan_step_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.plan_steps AS s
    WHERE s.id = NEW.plan_step_id
      AND s.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'engine_jobs.plan_step_id must reference a plan step in the same organization';
  END IF;

  IF NEW.command_cycle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.command_cycles AS c
    WHERE c.id = NEW.command_cycle_id
      AND c.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'engine_jobs.command_cycle_id must reference a cycle in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER engine_jobs_validate_organization
  BEFORE INSERT OR UPDATE OF plan_id, plan_step_id, command_cycle_id, organization_id
    ON public.engine_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_engine_job_organization();

-- -----------------------------------------------------------------------------
-- Immutable engine_events
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_engine_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'engine_events are append-only and cannot be modified or deleted';
END;
$$;

CREATE TRIGGER engine_events_prevent_update
  BEFORE UPDATE ON public.engine_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_engine_events_mutation();

CREATE TRIGGER engine_events_prevent_delete
  BEFORE DELETE ON public.engine_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_engine_events_mutation();

DROP POLICY IF EXISTS engine_events_update_member ON public.engine_events;
DROP POLICY IF EXISTS engine_events_delete_member ON public.engine_events;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capability_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY missions_select_member
  ON public.missions FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY missions_insert_member
  ON public.missions FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY missions_update_member
  ON public.missions FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY missions_delete_member
  ON public.missions FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY mission_policies_select_member
  ON public.mission_policies FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY mission_policies_insert_member
  ON public.mission_policies FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY mission_policies_update_member
  ON public.mission_policies FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY mission_policies_delete_member
  ON public.mission_policies FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY command_cycles_select_member
  ON public.command_cycles FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY command_cycles_insert_member
  ON public.command_cycles FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY command_cycles_update_member
  ON public.command_cycles FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY command_decisions_select_member
  ON public.command_decisions FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY command_decisions_insert_member
  ON public.command_decisions FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY plans_select_member
  ON public.plans FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY plans_insert_member
  ON public.plans FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY plans_update_member
  ON public.plans FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY plan_steps_select_member
  ON public.plan_steps FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY plan_steps_insert_member
  ON public.plan_steps FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY plan_steps_update_member
  ON public.plan_steps FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY capability_registry_select_authenticated
  ON public.capability_registry FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR public.is_organization_member(organization_id)
  );

CREATE POLICY engine_jobs_select_member
  ON public.engine_jobs FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY engine_jobs_insert_member
  ON public.engine_jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY engine_jobs_update_member
  ON public.engine_jobs FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.command_cycles TO authenticated;
GRANT SELECT, INSERT ON public.command_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.plan_steps TO authenticated;
GRANT SELECT ON public.capability_registry TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.engine_jobs TO authenticated;

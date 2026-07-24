-- =============================================================================
-- Decision Engine and Capital Allocation Foundation v1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- decision_models
-- -----------------------------------------------------------------------------

CREATE TABLE public.decision_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  opportunity_type TEXT,

  scoring_dimensions JSONB NOT NULL DEFAULT '[]'::JSONB,
  weights JSONB NOT NULL DEFAULT '{}'::JSONB,
  decision_thresholds JSONB NOT NULL DEFAULT '{}'::JSONB,
  policy_requirements JSONB NOT NULL DEFAULT '{}'::JSONB,

  description TEXT,
  activated_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT decision_models_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT decision_models_version_not_blank CHECK (BTRIM(version) <> ''),
  CONSTRAINT decision_models_status_valid CHECK (
    status IN ('draft', 'active', 'experimental', 'deprecated', 'archived')
  ),
  CONSTRAINT decision_models_org_name_version_unique UNIQUE (organization_id, name, version)
);

COMMENT ON TABLE public.decision_models IS
  'Versioned deterministic evaluation models for opportunity decisions.';

CREATE INDEX decision_models_organization_id_idx
  ON public.decision_models (organization_id);
CREATE INDEX decision_models_status_idx
  ON public.decision_models (organization_id, status);
CREATE INDEX decision_models_name_idx
  ON public.decision_models (organization_id, name);

CREATE UNIQUE INDEX decision_models_org_active_name_uidx
  ON public.decision_models (organization_id, name)
  WHERE status = 'active';

CREATE TRIGGER decision_models_set_updated_at
  BEFORE UPDATE ON public.decision_models
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- opportunity_evaluations
-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,
  decision_model_id UUID NOT NULL REFERENCES public.decision_models (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,

  evaluation_status TEXT NOT NULL DEFAULT 'pending',
  recommendation TEXT NOT NULL,
  evaluation_key TEXT NOT NULL,

  overall_score NUMERIC,
  confidence_score NUMERIC,
  expected_value_score NUMERIC,
  strategic_fit_score NUMERIC,
  capital_efficiency_score NUMERIC,
  compounding_score NUMERIC,
  risk_adjusted_score NUMERIC,

  dimension_scores JSONB NOT NULL DEFAULT '{}'::JSONB,
  policy_results JSONB NOT NULL DEFAULT '{}'::JSONB,
  assumptions JSONB NOT NULL DEFAULT '{}'::JSONB,
  uncertainty JSONB NOT NULL DEFAULT '{}'::JSONB,

  reasoning TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_evaluations_status_valid CHECK (
    evaluation_status IN ('pending', 'completed', 'blocked', 'invalidated', 'superseded')
  ),
  CONSTRAINT opportunity_evaluations_recommendation_valid CHECK (
    recommendation IN (
      'reject', 'monitor', 'hold', 'research_more', 'validate',
      'approve_initiative', 'approve_build', 'acquire', 'partner', 'scale'
    )
  ),
  CONSTRAINT opportunity_evaluations_evaluation_key_not_blank
    CHECK (BTRIM(evaluation_key) <> ''),
  CONSTRAINT opportunity_evaluations_overall_score_range CHECK (
    overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)
  ),
  CONSTRAINT opportunity_evaluations_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT opportunity_evaluations_expected_value_score_range CHECK (
    expected_value_score IS NULL OR (expected_value_score >= 0 AND expected_value_score <= 100)
  ),
  CONSTRAINT opportunity_evaluations_strategic_fit_score_range CHECK (
    strategic_fit_score IS NULL OR (strategic_fit_score >= 0 AND strategic_fit_score <= 100)
  ),
  CONSTRAINT opportunity_evaluations_capital_efficiency_score_range CHECK (
    capital_efficiency_score IS NULL OR (capital_efficiency_score >= 0 AND capital_efficiency_score <= 100)
  ),
  CONSTRAINT opportunity_evaluations_compounding_score_range CHECK (
    compounding_score IS NULL OR (compounding_score >= 0 AND compounding_score <= 100)
  ),
  CONSTRAINT opportunity_evaluations_risk_adjusted_score_range CHECK (
    risk_adjusted_score IS NULL OR (risk_adjusted_score >= 0 AND risk_adjusted_score <= 100)
  )
);

COMMENT ON TABLE public.opportunity_evaluations IS
  'Versioned, append-only opportunity evaluations produced by the Decision Engine.';

CREATE INDEX opportunity_evaluations_organization_id_idx
  ON public.opportunity_evaluations (organization_id);
CREATE INDEX opportunity_evaluations_opportunity_id_idx
  ON public.opportunity_evaluations (opportunity_id);
CREATE INDEX opportunity_evaluations_recommendation_idx
  ON public.opportunity_evaluations (organization_id, recommendation);
CREATE INDEX opportunity_evaluations_overall_score_idx
  ON public.opportunity_evaluations (organization_id, overall_score DESC NULLS LAST);
CREATE INDEX opportunity_evaluations_evaluated_at_idx
  ON public.opportunity_evaluations (organization_id, evaluated_at DESC);

CREATE UNIQUE INDEX opportunity_evaluations_org_evaluation_key_uidx
  ON public.opportunity_evaluations (organization_id, evaluation_key);

-- -----------------------------------------------------------------------------
-- resource_pools
-- -----------------------------------------------------------------------------

CREATE TABLE public.resource_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  resource_type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  currency TEXT,

  total_capacity NUMERIC NOT NULL,
  reserved_capacity NUMERIC NOT NULL DEFAULT 0,
  consumed_capacity NUMERIC NOT NULL DEFAULT 0,

  reset_period TEXT,
  reset_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT resource_pools_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT resource_pools_status_valid CHECK (
    status IN ('active', 'paused', 'deprecated', 'archived')
  ),
  CONSTRAINT resource_pools_type_valid CHECK (
    resource_type IN (
      'capital', 'compute_budget', 'api_budget', 'worker_hours', 'build_slots',
      'validation_slots', 'research_slots', 'deployment_slots', 'other'
    )
  ),
  CONSTRAINT resource_pools_total_capacity_non_negative CHECK (total_capacity >= 0),
  CONSTRAINT resource_pools_reserved_capacity_non_negative CHECK (reserved_capacity >= 0),
  CONSTRAINT resource_pools_consumed_capacity_non_negative CHECK (consumed_capacity >= 0),
  CONSTRAINT resource_pools_capacity_not_exceeded CHECK (
    reserved_capacity + consumed_capacity <= total_capacity
  ),
  CONSTRAINT resource_pools_org_type_name_unique UNIQUE (organization_id, resource_type, name)
);

COMMENT ON TABLE public.resource_pools IS
  'Organization resource capacity pools for capital allocation proposals and reservations.';

CREATE INDEX resource_pools_organization_id_idx
  ON public.resource_pools (organization_id);
CREATE INDEX resource_pools_resource_type_idx
  ON public.resource_pools (organization_id, resource_type);
CREATE INDEX resource_pools_status_idx
  ON public.resource_pools (organization_id, status);

CREATE TRIGGER resource_pools_set_updated_at
  BEFORE UPDATE ON public.resource_pools
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- allocation_proposals
-- -----------------------------------------------------------------------------

CREATE TABLE public.allocation_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID REFERENCES public.opportunities (id) ON DELETE SET NULL,
  evaluation_id UUID REFERENCES public.opportunity_evaluations (id) ON DELETE SET NULL,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,

  allocation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  expected_outcome TEXT NOT NULL,
  proposal_key TEXT NOT NULL,

  expected_value NUMERIC,
  expected_value_currency TEXT,
  expected_time_to_value_days INTEGER,
  risk_score NUMERIC,
  confidence_score NUMERIC,

  rationale TEXT,
  policy_results JSONB NOT NULL DEFAULT '{}'::JSONB,
  requested_resources JSONB NOT NULL DEFAULT '[]'::JSONB,
  approved_resources JSONB NOT NULL DEFAULT '[]'::JSONB,

  expires_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT allocation_proposals_expected_outcome_not_blank
    CHECK (BTRIM(expected_outcome) <> ''),
  CONSTRAINT allocation_proposals_proposal_key_not_blank
    CHECK (BTRIM(proposal_key) <> ''),
  CONSTRAINT allocation_proposals_type_valid CHECK (
    allocation_type IN (
      'research', 'validation', 'initiative', 'build', 'acquisition',
      'growth', 'optimization', 'recovery', 'other'
    )
  ),
  CONSTRAINT allocation_proposals_status_valid CHECK (
    status IN (
      'proposed', 'policy_blocked', 'awaiting_approval', 'approved',
      'partially_approved', 'rejected', 'reserved', 'consumed', 'released',
      'expired', 'cancelled'
    )
  ),
  CONSTRAINT allocation_proposals_expected_value_non_negative CHECK (
    expected_value IS NULL OR expected_value >= 0
  ),
  CONSTRAINT allocation_proposals_expected_time_non_negative CHECK (
    expected_time_to_value_days IS NULL OR expected_time_to_value_days >= 0
  ),
  CONSTRAINT allocation_proposals_risk_score_range CHECK (
    risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)
  ),
  CONSTRAINT allocation_proposals_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  )
);

COMMENT ON TABLE public.allocation_proposals IS
  'Proposed resource allocations linked to opportunity evaluations.';

CREATE INDEX allocation_proposals_organization_id_idx
  ON public.allocation_proposals (organization_id);
CREATE INDEX allocation_proposals_opportunity_id_idx
  ON public.allocation_proposals (opportunity_id);
CREATE INDEX allocation_proposals_evaluation_id_idx
  ON public.allocation_proposals (evaluation_id);
CREATE INDEX allocation_proposals_status_idx
  ON public.allocation_proposals (organization_id, status);
CREATE INDEX allocation_proposals_created_at_idx
  ON public.allocation_proposals (organization_id, created_at DESC);

CREATE UNIQUE INDEX allocation_proposals_org_proposal_key_uidx
  ON public.allocation_proposals (organization_id, proposal_key);

-- -----------------------------------------------------------------------------
-- resource_reservations
-- -----------------------------------------------------------------------------

CREATE TABLE public.resource_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  allocation_proposal_id UUID NOT NULL REFERENCES public.allocation_proposals (id) ON DELETE CASCADE,
  resource_pool_id UUID NOT NULL REFERENCES public.resource_pools (id) ON DELETE RESTRICT,

  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  reservation_key TEXT NOT NULL,

  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT resource_reservations_amount_positive CHECK (amount > 0),
  CONSTRAINT resource_reservations_status_valid CHECK (
    status IN ('reserved', 'consumed', 'released', 'expired', 'cancelled')
  ),
  CONSTRAINT resource_reservations_reservation_key_not_blank
    CHECK (BTRIM(reservation_key) <> '')
);

COMMENT ON TABLE public.resource_reservations IS
  'Reserved capacity against resource pools for approved allocation proposals.';

CREATE INDEX resource_reservations_organization_id_idx
  ON public.resource_reservations (organization_id);
CREATE INDEX resource_reservations_proposal_id_idx
  ON public.resource_reservations (allocation_proposal_id);
CREATE INDEX resource_reservations_pool_id_idx
  ON public.resource_reservations (resource_pool_id);
CREATE INDEX resource_reservations_status_idx
  ON public.resource_reservations (organization_id, status);
CREATE INDEX resource_reservations_created_at_idx
  ON public.resource_reservations (organization_id, created_at DESC);

CREATE UNIQUE INDEX resource_reservations_org_reservation_key_uidx
  ON public.resource_reservations (organization_id, reservation_key);

-- -----------------------------------------------------------------------------
-- Cross-table organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_opportunity_evaluation_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.opportunities AS o
    WHERE o.id = NEW.opportunity_id
      AND o.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'opportunity_evaluations.opportunity_id must belong to organization_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.decision_models AS m
    WHERE m.id = NEW.decision_model_id
      AND m.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'opportunity_evaluations.decision_model_id must belong to organization_id';
  END IF;

  IF NEW.mission_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.missions AS ms
      WHERE ms.id = NEW.mission_id
        AND ms.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'opportunity_evaluations.mission_id must belong to organization_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER opportunity_evaluations_validate_organization
  BEFORE INSERT OR UPDATE OF opportunity_id, decision_model_id, mission_id, organization_id
  ON public.opportunity_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_opportunity_evaluation_organization();

CREATE OR REPLACE FUNCTION public.validate_allocation_proposal_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.opportunity_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.opportunities AS o
      WHERE o.id = NEW.opportunity_id
        AND o.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'allocation_proposals.opportunity_id must belong to organization_id';
    END IF;
  END IF;

  IF NEW.evaluation_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.opportunity_evaluations AS e
      WHERE e.id = NEW.evaluation_id
        AND e.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'allocation_proposals.evaluation_id must belong to organization_id';
    END IF;
  END IF;

  IF NEW.mission_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.missions AS m
      WHERE m.id = NEW.mission_id
        AND m.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'allocation_proposals.mission_id must belong to organization_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER allocation_proposals_validate_organization
  BEFORE INSERT OR UPDATE OF opportunity_id, evaluation_id, mission_id, organization_id
  ON public.allocation_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_allocation_proposal_organization();

CREATE OR REPLACE FUNCTION public.validate_resource_reservation_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.allocation_proposals AS p
    WHERE p.id = NEW.allocation_proposal_id
      AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'resource_reservations.allocation_proposal_id must belong to organization_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.resource_pools AS pool
    WHERE pool.id = NEW.resource_pool_id
      AND pool.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'resource_reservations.resource_pool_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER resource_reservations_validate_organization
  BEFORE INSERT OR UPDATE OF allocation_proposal_id, resource_pool_id, organization_id
  ON public.resource_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_resource_reservation_organization();

-- -----------------------------------------------------------------------------
-- Atomic reservation helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reserve_allocation_resources(
  p_organization_id UUID,
  p_proposal_id UUID,
  p_reservation_key TEXT
)
RETURNS SETOF public.resource_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.allocation_proposals%ROWTYPE;
  v_request JSONB;
  v_item JSONB;
  v_pool_id UUID;
  v_amount NUMERIC;
  v_pool public.resource_pools%ROWTYPE;
  v_available NUMERIC;
  v_reservation_id UUID;
BEGIN
  SELECT *
  INTO v_proposal
  FROM public.allocation_proposals
  WHERE id = p_proposal_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allocation proposal not found for organization';
  END IF;

  IF v_proposal.status NOT IN ('approved', 'partially_approved', 'proposed', 'awaiting_approval') THEN
    RAISE EXCEPTION 'Allocation proposal status % cannot be reserved', v_proposal.status;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.resource_reservations AS r
    WHERE r.organization_id = p_organization_id
      AND r.reservation_key = p_reservation_key
  ) THEN
    RETURN QUERY
    SELECT *
    FROM public.resource_reservations
    WHERE organization_id = p_organization_id
      AND reservation_key = p_reservation_key;
    RETURN;
  END IF;

  v_request := COALESCE(v_proposal.requested_resources, '[]'::JSONB);

  IF jsonb_typeof(v_request) <> 'array' OR jsonb_array_length(v_request) = 0 THEN
    RAISE EXCEPTION 'Allocation proposal has no requested resources';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_request)
  LOOP
    v_pool_id := NULLIF(v_item->>'resource_pool_id', '')::UUID;
    v_amount := NULLIF(v_item->>'amount', '')::NUMERIC;

    IF v_pool_id IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Invalid requested resource entry in allocation proposal';
    END IF;

    SELECT *
    INTO v_pool
    FROM public.resource_pools
    WHERE id = v_pool_id
      AND organization_id = p_organization_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Resource pool % not found for organization', v_pool_id;
    END IF;

    v_available := v_pool.total_capacity - v_pool.reserved_capacity - v_pool.consumed_capacity;

    IF v_available < v_amount THEN
      RAISE EXCEPTION 'Insufficient capacity in pool % (available %, requested %)',
        v_pool_id, v_available, v_amount;
    END IF;

    UPDATE public.resource_pools
    SET reserved_capacity = reserved_capacity + v_amount
    WHERE id = v_pool_id;

    INSERT INTO public.resource_reservations (
      organization_id,
      allocation_proposal_id,
      resource_pool_id,
      amount,
      status,
      reservation_key,
      metadata
    ) VALUES (
      p_organization_id,
      p_proposal_id,
      v_pool_id,
      v_amount,
      'reserved',
      p_reservation_key || ':' || v_pool_id::TEXT,
      jsonb_build_object('proposal_key', v_proposal.proposal_key)
    )
    RETURNING id INTO v_reservation_id;

    RETURN QUERY
    SELECT *
    FROM public.resource_reservations
    WHERE id = v_reservation_id;
  END LOOP;

  UPDATE public.allocation_proposals
  SET status = 'reserved', updated_at = NOW()
  WHERE id = p_proposal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_allocation_resources(
  p_organization_id UUID,
  p_proposal_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.resource_reservations%ROWTYPE;
BEGIN
  FOR v_reservation IN
    SELECT *
    FROM public.resource_reservations
    WHERE organization_id = p_organization_id
      AND allocation_proposal_id = p_proposal_id
      AND status = 'reserved'
    FOR UPDATE
  LOOP
    UPDATE public.resource_pools
    SET reserved_capacity = GREATEST(0, reserved_capacity - v_reservation.amount)
    WHERE id = v_reservation.resource_pool_id
      AND organization_id = p_organization_id;

    UPDATE public.resource_reservations
    SET status = 'released', released_at = NOW()
    WHERE id = v_reservation.id;
  END LOOP;

  UPDATE public.allocation_proposals
  SET status = 'released', updated_at = NOW()
  WHERE id = p_proposal_id
    AND organization_id = p_organization_id;
END;
$$;

COMMENT ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) IS
  'Atomically reserves capacity for an allocation proposal. Server-side only.';

COMMENT ON FUNCTION public.release_allocation_resources(UUID, UUID) IS
  'Releases reserved capacity for an allocation proposal. Server-side only.';

REVOKE ALL ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.release_allocation_resources(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_allocation_resources(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.release_allocation_resources(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_allocation_resources(UUID, UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- capability_registry seed
-- -----------------------------------------------------------------------------

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
  'decision.evaluate_opportunity',
  '1.0.0',
  'Evaluate Opportunity',
  'worker',
  'decision_engine',
  'active',
  'healthy',
  TRUE,
  'decision.evaluate_opportunity.v1',
  '{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","properties":{"evaluation_id":{"type":"string"},"recommendation":{"type":"string"}}}'::JSONB,
  '{"requires_mission":true,"requires_decision_model":true}'::JSONB,
  '{"implementation_key":"decision.evaluate_opportunity.v1"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1
  FROM public.capability_registry
  WHERE organization_id IS NULL
    AND capability_key = 'decision.evaluate_opportunity'
    AND version = '1.0.0'
);

CREATE INDEX IF NOT EXISTS engine_jobs_pending_decision_idx
  ON public.engine_jobs (organization_id, status, available_at)
  WHERE capability_key LIKE 'decision.%'
    AND status IN ('queued', 'waiting', 'running');

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.decision_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY decision_models_select_member
  ON public.decision_models FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunity_evaluations_select_member
  ON public.opportunity_evaluations FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY resource_pools_select_member
  ON public.resource_pools FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY allocation_proposals_select_member
  ON public.allocation_proposals FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY resource_reservations_select_member
  ON public.resource_reservations FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

GRANT SELECT ON public.decision_models TO authenticated;
GRANT SELECT ON public.opportunity_evaluations TO authenticated;
GRANT SELECT ON public.resource_pools TO authenticated;
GRANT SELECT ON public.allocation_proposals TO authenticated;
GRANT SELECT ON public.resource_reservations TO authenticated;

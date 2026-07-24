-- =============================================================================
-- Secure decision/allocation privileged RPCs (service_role only)
-- =============================================================================

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

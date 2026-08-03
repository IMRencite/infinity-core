-- Reassert EXECUTE grants on privileged RPCs (service_role only).
-- Idempotent: safe if foundation / corrective migrations already applied.

REVOKE ALL ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_allocation_resources(UUID, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.release_allocation_resources(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_allocation_resources(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.release_allocation_resources(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_allocation_resources(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.claim_engine_job(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_engine_job(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_engine_job(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_engine_job(UUID, UUID, TEXT) TO service_role;

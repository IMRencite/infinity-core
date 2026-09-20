-- Rolled-back behavioral proof. Must not persist recovered=FALSE.
BEGIN;
DO $$
DECLARE
  raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    UPDATE public.communication_incidents
    SET recovered = FALSE
    WHERE incident_id = 'inc:1a0af74557b0eb36:1a0be7a9feee5375';
  EXCEPTION
    WHEN OTHERS THEN
      raised := TRUE;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'MONOTONIC_PROOF_FAILED_RECOVERED_REVERTED';
  END IF;
END;
$$;
ROLLBACK;

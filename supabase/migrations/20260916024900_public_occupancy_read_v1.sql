-- Public occupancy is sanitized enums only. Allow anon/authenticated SELECT
-- for that scope so imros.io can read canonical operating state without
-- inventing IDLE from missing local disk.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cloud_runtime_state'
      AND policyname = 'cloud_runtime_state_public_occupancy_read'
  ) THEN
    CREATE POLICY cloud_runtime_state_public_occupancy_read
    ON public.cloud_runtime_state
    FOR SELECT
    TO anon, authenticated
    USING (scope = 'public-operations-occupancy');
  END IF;
END
$$;

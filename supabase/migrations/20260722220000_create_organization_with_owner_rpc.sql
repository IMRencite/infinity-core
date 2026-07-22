-- =============================================================================
-- Atomic organization bootstrap RPC
-- =============================================================================
-- Provides a single transactional entry point for founding users to create
-- their first organization and owner membership without orphan records.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  organization_name text,
  organization_slug text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_organization_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF organization_name IS NULL OR BTRIM(organization_name) = '' THEN
    RAISE EXCEPTION 'Organization name is required'
      USING ERRCODE = '22023';
  END IF;

  IF organization_slug IS NULL OR BTRIM(organization_slug) = '' THEN
    RAISE EXCEPTION 'Organization slug is required'
      USING ERRCODE = '22023';
  END IF;

  IF organization_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid organization slug format'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.user_id = v_user_id
      AND om.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User already belongs to an organization'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (BTRIM(organization_name), organization_slug)
  RETURNING id INTO v_organization_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_organization_id, v_user_id, 'owner');

  UPDATE public.organizations
  SET owner_user_id = v_user_id
  WHERE id = v_organization_id;

  RETURN v_organization_id;
END;
$$;

COMMENT ON FUNCTION public.create_organization_with_owner(text, text) IS
  'Atomically creates an organization, owner membership for auth.uid(), and sets owner_user_id. SECURITY DEFINER with empty search_path; never accepts a client-supplied user id.';

REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text) TO authenticated;

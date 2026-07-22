-- =============================================================================
-- Infinity Phase 1: Foundational Data Model
-- =============================================================================
-- Tables: organizations, profiles, organization_members, projects, companies
--
-- Organization isolation: tenant-scoped rows carry organization_id.
-- Identity: Supabase Auth owns auth.users; public.profiles extends auth users.
-- Membership: public.organization_members links auth.users to organizations.
-- Soft deletes: deleted_at is set instead of hard DELETE for recoverability.
-- RLS: enabled on every public table with membership-based policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Trigger function that sets updated_at to the current timestamp on row update.';

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable tenant name shown across Infinity HQ and admin surfaces.
  name TEXT NOT NULL,

  -- URL-safe unique identifier for the organization (subdomain, routing, APIs).
  slug TEXT NOT NULL,

  -- Primary owner reference to Supabase Auth. Nullable until membership is provisioned.
  owner_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT organizations_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT organizations_slug_not_blank CHECK (BTRIM(slug) <> ''),
  CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON TABLE public.organizations IS
  'Top-level tenant boundary. Every Infinity record is scoped to exactly one organization.';

COMMENT ON COLUMN public.organizations.id IS
  'Primary key for the organization (tenant).';

COMMENT ON COLUMN public.organizations.name IS
  'Display name of the organization or venture studio.';

COMMENT ON COLUMN public.organizations.slug IS
  'Globally unique, lowercase slug used for stable references and future routing.';

COMMENT ON COLUMN public.organizations.owner_user_id IS
  'Primary owner auth user. Must hold an active owner membership in organization_members.';

COMMENT ON COLUMN public.organizations.deleted_at IS
  'Soft-delete timestamp. NULL means the organization is active.';

CREATE UNIQUE INDEX organizations_slug_active_uidx
  ON public.organizations (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX organizations_deleted_at_idx
  ON public.organizations (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX organizations_owner_user_id_idx
  ON public.organizations (owner_user_id)
  WHERE owner_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,

  full_name TEXT,
  avatar_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.profiles IS
  'Application profile for each Supabase Auth user. One row per auth.users record.';

COMMENT ON COLUMN public.profiles.id IS
  'Primary key and foreign key to auth.users.id.';

COMMENT ON COLUMN public.profiles.full_name IS
  'Display name shown in conversations, approvals, and activity history.';

COMMENT ON COLUMN public.profiles.avatar_url IS
  'Optional avatar image URL for the user profile.';

COMMENT ON COLUMN public.profiles.deleted_at IS
  'Soft-delete timestamp. NULL means the profile is active.';

CREATE INDEX profiles_deleted_at_idx
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

  role TEXT NOT NULL DEFAULT 'member',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT organization_members_role_valid CHECK (
    role IN ('owner', 'admin', 'member', 'viewer')
  )
);

COMMENT ON TABLE public.organization_members IS
  'Links authenticated users to organizations with role-based access control.';

COMMENT ON COLUMN public.organization_members.organization_id IS
  'Organization the user belongs to.';

COMMENT ON COLUMN public.organization_members.user_id IS
  'Supabase Auth user id for the member.';

COMMENT ON COLUMN public.organization_members.role IS
  'Organization role: owner, admin, member, or viewer.';

COMMENT ON COLUMN public.organization_members.deleted_at IS
  'Soft-delete timestamp. NULL means the membership is active.';

CREATE UNIQUE INDEX organization_members_org_user_active_uidx
  ON public.organization_members (organization_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX organization_members_organization_id_idx
  ON public.organization_members (organization_id);

CREATE INDEX organization_members_user_id_idx
  ON public.organization_members (user_id);

CREATE INDEX organization_members_org_role_idx
  ON public.organization_members (organization_id, role)
  WHERE deleted_at IS NULL;

CREATE TRIGGER organization_members_set_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  name TEXT NOT NULL,
  description TEXT,

  -- Operational status of the project record itself.
  status TEXT NOT NULL DEFAULT 'active',

  -- Position in the Infinity venture lifecycle (see Architecture Bible §5).
  lifecycle_stage TEXT NOT NULL DEFAULT 'idea',

  -- Structured objectives and budget metadata for planning engines.
  objectives JSONB NOT NULL DEFAULT '[]'::JSONB,
  budget JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Auth user who created the project record.
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT projects_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT projects_status_valid CHECK (
    status IN ('active', 'paused', 'closed', 'archived')
  ),
  CONSTRAINT projects_lifecycle_stage_valid CHECK (
    lifecycle_stage IN (
      'idea',
      'research',
      'validation',
      'opportunity',
      'architecture',
      'design',
      'build',
      'qa',
      'launch',
      'growth',
      'operating_business',
      'portfolio_asset',
      'paused',
      'closed',
      'sold'
    )
  )
);

COMMENT ON TABLE public.projects IS
  'Central lifecycle object for ventures, research initiatives, and experiments.';

COMMENT ON COLUMN public.projects.organization_id IS
  'Owning organization. Required on every query for tenant isolation.';

COMMENT ON COLUMN public.projects.status IS
  'Record status: active, paused, closed, or archived.';

COMMENT ON COLUMN public.projects.lifecycle_stage IS
  'Current stage in the Infinity venture lifecycle pipeline.';

COMMENT ON COLUMN public.projects.objectives IS
  'JSON array of structured objectives for missions and planning engines.';

COMMENT ON COLUMN public.projects.budget IS
  'JSON document describing budget caps, currency, and allocation metadata.';

COMMENT ON COLUMN public.projects.created_by IS
  'Auth user who created the project. Must be an active member of organization_id.';

COMMENT ON COLUMN public.projects.deleted_at IS
  'Soft-delete timestamp. NULL means the project is active.';

CREATE INDEX projects_organization_id_idx
  ON public.projects (organization_id);

CREATE INDEX projects_organization_status_idx
  ON public.projects (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX projects_organization_lifecycle_stage_idx
  ON public.projects (organization_id, lifecycle_stage)
  WHERE deleted_at IS NULL;

CREATE INDEX projects_created_by_idx
  ON public.projects (created_by)
  WHERE created_by IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX projects_created_at_idx
  ON public.projects (organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- companies
-- -----------------------------------------------------------------------------

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  -- Optional originating project when a venture graduates to an operating company.
  project_id UUID REFERENCES public.projects (id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  legal_status TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  launched_at TIMESTAMPTZ,

  -- Auth user who created the company record.
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT companies_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT companies_status_valid CHECK (
    status IN ('draft', 'pre_launch', 'operating', 'paused', 'closed', 'sold')
  )
);

COMMENT ON TABLE public.companies IS
  'Operating business entities launched from projects or tracked as portfolio companies.';

COMMENT ON COLUMN public.companies.organization_id IS
  'Owning organization. Required on every query for tenant isolation.';

COMMENT ON COLUMN public.companies.project_id IS
  'Optional link to the originating project. Must belong to the same organization.';

COMMENT ON COLUMN public.companies.legal_status IS
  'Legal formation status (e.g. sole proprietorship, LLC, corporation).';

COMMENT ON COLUMN public.companies.status IS
  'Operating status: draft, pre_launch, operating, paused, closed, or sold.';

COMMENT ON COLUMN public.companies.launched_at IS
  'Timestamp when the company went live in market. NULL until launch.';

COMMENT ON COLUMN public.companies.created_by IS
  'Auth user who created the company. Must be an active member of organization_id.';

COMMENT ON COLUMN public.companies.deleted_at IS
  'Soft-delete timestamp. NULL means the company is active.';

CREATE INDEX companies_organization_id_idx
  ON public.companies (organization_id);

CREATE INDEX companies_organization_status_idx
  ON public.companies (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX companies_project_id_idx
  ON public.companies (project_id)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX companies_created_by_idx
  ON public.companies (created_by)
  WHERE created_by IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX companies_launched_at_idx
  ON public.companies (organization_id, launched_at DESC)
  WHERE deleted_at IS NULL AND launched_at IS NOT NULL;

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cross-table integrity triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_organization_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = NEW.id
        AND om.user_id = NEW.owner_user_id
        AND om.role = 'owner'
        AND om.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'owner_user_id must reference an active owner membership in this organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_organization_owner_membership() IS
  'Ensures organizations.owner_user_id holds an active owner role in organization_members.';

CREATE TRIGGER organizations_validate_owner_membership
  BEFORE INSERT OR UPDATE OF owner_user_id, id ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_organization_owner_membership();

CREATE OR REPLACE FUNCTION public.validate_created_by_organization_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = NEW.organization_id
        AND om.user_id = NEW.created_by
        AND om.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'created_by must reference an active member of the same organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_created_by_organization_member() IS
  'Ensures created_by belongs to an active organization_members row for organization_id.';

CREATE TRIGGER projects_validate_created_by
  BEFORE INSERT OR UPDATE OF created_by, organization_id ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_created_by_organization_member();

CREATE OR REPLACE FUNCTION public.validate_company_project_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.projects AS p
      WHERE p.id = NEW.project_id
        AND p.organization_id = NEW.organization_id
        AND p.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'companies.project_id must reference an active project in the same organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_company_project_organization() IS
  'Ensures companies.project_id belongs to the same organization as the company.';

CREATE TRIGGER companies_validate_project_organization
  BEFORE INSERT OR UPDATE OF project_id, organization_id ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_company_project_organization();

CREATE TRIGGER companies_validate_created_by
  BEFORE INSERT OR UPDATE OF created_by, organization_id ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_created_by_organization_member();

-- -----------------------------------------------------------------------------
-- Auth trigger: auto-create profile for new auth.users rows
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Creates a matching public.profiles row when Supabase Auth inserts auth.users. Does not create organizations.';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER avoids policy recursion)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_organization_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.is_organization_member(UUID) IS
  'Returns true when auth.uid() has an active membership in the given organization.';

CREATE OR REPLACE FUNCTION public.has_organization_role(
  p_organization_id UUID,
  p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.role = ANY (p_roles)
      AND om.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.has_organization_role(UUID, TEXT[]) IS
  'Returns true when auth.uid() holds one of the given roles in the organization.';

CREATE OR REPLACE FUNCTION public.shares_organization_with(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS mine
    INNER JOIN public.organization_members AS theirs
      ON mine.organization_id = theirs.organization_id
    WHERE mine.user_id = auth.uid()
      AND theirs.user_id = p_user_id
      AND mine.deleted_at IS NULL
      AND theirs.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.shares_organization_with(UUID) IS
  'Returns true when auth.uid() shares at least one active organization with the given user.';

CREATE OR REPLACE FUNCTION public.organization_has_no_active_members(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = p_organization_id
      AND om.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.organization_has_no_active_members(UUID) IS
  'Returns true when an organization has no active memberships. Used for bootstrap owner insertion.';

-- -----------------------------------------------------------------------------
-- Row-Level Security policies
-- -----------------------------------------------------------------------------

CREATE POLICY organizations_select_member
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_organization_member(id)
  );

COMMENT ON POLICY organizations_select_member ON public.organizations IS
  'Authenticated members may view active organizations they belong to.';

CREATE POLICY organizations_insert_authenticated
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY organizations_insert_authenticated ON public.organizations IS
  'Authenticated users may create a new organization record.';

CREATE POLICY organizations_update_admin
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.has_organization_role(id, ARRAY['owner', 'admin'])
  )
  WITH CHECK (
    deleted_at IS NULL
    AND public.has_organization_role(id, ARRAY['owner', 'admin'])
  );

COMMENT ON POLICY organizations_update_admin ON public.organizations IS
  'Organization owners and admins may update their organization.';

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND id = auth.uid()
  );

COMMENT ON POLICY profiles_select_own ON public.profiles IS
  'Authenticated users may read their own active profile.';

CREATE POLICY profiles_select_shared_organization
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.shares_organization_with(id)
  );

COMMENT ON POLICY profiles_select_shared_organization ON public.profiles IS
  'Organization members may read basic profiles of other active members in shared organizations.';

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

COMMENT ON POLICY profiles_update_own ON public.profiles IS
  'Authenticated users may update their own profile.';

CREATE POLICY organization_members_select_member
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_organization_member(organization_id)
  );

COMMENT ON POLICY organization_members_select_member ON public.organization_members IS
  'Members may read active memberships in their organizations.';

CREATE POLICY organization_members_insert_admin
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['owner', 'admin'])
    AND (
      user_id <> auth.uid()
      OR role IN ('member', 'viewer')
    )
  );

COMMENT ON POLICY organization_members_insert_admin ON public.organization_members IS
  'Owners and admins may add memberships but cannot assign themselves elevated roles.';

CREATE POLICY organization_members_insert_bootstrap_owner
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND public.organization_has_no_active_members(organization_id)
  );

COMMENT ON POLICY organization_members_insert_bootstrap_owner ON public.organization_members IS
  'Founding user may insert their own owner membership when the organization has no active members.';

CREATE POLICY organization_members_update_admin
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.has_organization_role(organization_id, ARRAY['owner', 'admin'])
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['owner', 'admin'])
    AND (
      user_id <> auth.uid()
      OR role IN ('member', 'viewer')
    )
  );

COMMENT ON POLICY organization_members_update_admin ON public.organization_members IS
  'Owners and admins may update memberships but cannot elevate their own role.';

CREATE POLICY projects_select_member
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_organization_member(organization_id)
  );

COMMENT ON POLICY projects_select_member ON public.projects IS
  'Active organization members may read projects in their organization.';

CREATE POLICY projects_insert_editor
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'member']
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

COMMENT ON POLICY projects_insert_editor ON public.projects IS
  'Owners, admins, and members may create projects. Viewers are read-only.';

CREATE POLICY projects_update_editor
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'member']
    )
  )
  WITH CHECK (
    public.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'member']
    )
  );

COMMENT ON POLICY projects_update_editor ON public.projects IS
  'Owners, admins, and members may update projects. Viewers are read-only.';

CREATE POLICY companies_select_member
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_organization_member(organization_id)
  );

COMMENT ON POLICY companies_select_member ON public.companies IS
  'Active organization members may read companies in their organization.';

CREATE POLICY companies_insert_editor
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'member']
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

COMMENT ON POLICY companies_insert_editor ON public.companies IS
  'Owners, admins, and members may create companies. Viewers are read-only.';

CREATE POLICY companies_update_editor
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'member']
    )
  )
  WITH CHECK (
    public.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'member']
    )
  );

COMMENT ON POLICY companies_update_editor ON public.companies IS
  'Owners, admins, and members may update companies. Viewers are read-only.';

-- -----------------------------------------------------------------------------
-- Enable Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_organization_with(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.organization_has_no_active_members(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;

-- =============================================================================
-- Infinity Phase 1: Foundational Data Model
-- =============================================================================
-- Tables: organizations, users, projects, companies
--
-- Organization isolation: every tenant-scoped row carries organization_id.
-- Soft deletes: deleted_at is set instead of hard DELETE for recoverability.
-- RLS: policies are defined below but row level security is NOT enabled yet.
--       Enable RLS in a follow-up migration once Supabase Auth is wired up.
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
-- Shared trigger: enforce cross-table organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_user_belongs_to_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.users AS u
      WHERE u.id = NEW.owner_user_id
        AND u.organization_id = NEW.id
        AND u.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'owner_user_id must reference an active user in the same organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_user_belongs_to_organization() IS
  'Ensures organizations.owner_user_id references a user within that organization.';

CREATE OR REPLACE FUNCTION public.validate_project_owner_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.users AS u
      WHERE u.id = NEW.owner_user_id
        AND u.organization_id = NEW.organization_id
        AND u.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'projects.owner_user_id must reference an active user in the same organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_project_owner_organization() IS
  'Ensures projects.owner_user_id belongs to the same organization as the project.';

CREATE OR REPLACE FUNCTION public.validate_company_project_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable tenant name shown across Infinity HQ and admin surfaces.
  name TEXT NOT NULL,

  -- URL-safe unique identifier for the organization (subdomain, routing, APIs).
  slug TEXT NOT NULL,

  -- Primary owner; nullable until the first user is provisioned.
  owner_user_id UUID,

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
  'Primary owner user. Set after the founding user row exists in public.users.';

COMMENT ON COLUMN public.organizations.deleted_at IS
  'Soft-delete timestamp. NULL means the organization is active.';

CREATE UNIQUE INDEX organizations_slug_active_uidx
  ON public.organizations (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX organizations_deleted_at_idx
  ON public.organizations (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation: every user belongs to exactly one organization in Phase 1.
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  -- Application identity fields (auth integration added in a later phase).
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',

  -- Future link to Supabase Auth. NULL until authentication is implemented.
  auth_user_id UUID UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL,

  preferences JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT users_email_not_blank CHECK (BTRIM(email) <> ''),
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT users_role_valid CHECK (role IN ('owner', 'admin', 'member'))
);

COMMENT ON TABLE public.users IS
  'Application users scoped to an organization. Maps to the Identity domain; links to auth.users when authentication is enabled.';

COMMENT ON COLUMN public.users.organization_id IS
  'Organization this user belongs to. Enforces tenant isolation at the row level.';

COMMENT ON COLUMN public.users.email IS
  'Primary email address for the user within the organization.';

COMMENT ON COLUMN public.users.display_name IS
  'Optional display name shown in conversations, approvals, and activity history.';

COMMENT ON COLUMN public.users.role IS
  'Organization role: owner, admin, or member. Drives future authorization rules.';

COMMENT ON COLUMN public.users.auth_user_id IS
  'Optional foreign key to auth.users. Populated when Supabase Authentication is connected.';

COMMENT ON COLUMN public.users.preferences IS
  'JSON document for user-level settings and UI preferences.';

COMMENT ON COLUMN public.users.deleted_at IS
  'Soft-delete timestamp. NULL means the user is active.';

CREATE UNIQUE INDEX users_organization_email_active_uidx
  ON public.users (organization_id, lower(email))
  WHERE deleted_at IS NULL;

CREATE INDEX users_organization_id_idx
  ON public.users (organization_id);

CREATE INDEX users_auth_user_id_idx
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX users_role_idx
  ON public.users (organization_id, role)
  WHERE deleted_at IS NULL;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Deferred FK: organizations.owner_user_id -> users.id
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.users (id) ON DELETE SET NULL;

CREATE TRIGGER organizations_validate_owner_user
  BEFORE INSERT OR UPDATE OF owner_user_id, id ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_belongs_to_organization();

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

  owner_user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,

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

COMMENT ON COLUMN public.projects.owner_user_id IS
  'Primary accountable user for this project within the organization.';

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

CREATE INDEX projects_owner_user_id_idx
  ON public.projects (owner_user_id)
  WHERE owner_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX projects_created_at_idx
  ON public.projects (organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER projects_validate_owner_user
  BEFORE INSERT OR UPDATE OF owner_user_id, organization_id ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_project_owner_organization();

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

CREATE INDEX companies_launched_at_idx
  ON public.companies (organization_id, launched_at DESC)
  WHERE deleted_at IS NULL AND launched_at IS NOT NULL;

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER companies_validate_project_organization
  BEFORE INSERT OR UPDATE OF project_id, organization_id ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_company_project_organization();

-- -----------------------------------------------------------------------------
-- Row-Level Security (prepared, NOT enabled)
-- -----------------------------------------------------------------------------
-- Policies reference auth.uid() via public.users.auth_user_id for future use.
-- RLS remains disabled until the authentication migration explicitly enables it.

CREATE POLICY organizations_select_member
  ON public.organizations
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON POLICY organizations_select_member ON public.organizations IS
  'Allow authenticated users to read their own active organization. RLS not enabled yet.';

CREATE POLICY organizations_update_owner
  ON public.organizations
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND owner_user_id IN (
      SELECT u.id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'owner'
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND owner_user_id IN (
      SELECT u.id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'owner'
    )
  );

COMMENT ON POLICY organizations_update_owner ON public.organizations IS
  'Allow organization owners to update their organization. RLS not enabled yet.';

CREATE POLICY users_select_same_organization
  ON public.users
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON POLICY users_select_same_organization ON public.users IS
  'Allow users to read other users within their organization. RLS not enabled yet.';

CREATE POLICY users_update_self
  ON public.users
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND auth_user_id = auth.uid()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
  );

COMMENT ON POLICY users_update_self ON public.users IS
  'Allow users to update their own profile. RLS not enabled yet.';

CREATE POLICY projects_select_organization
  ON public.projects
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON POLICY projects_select_organization ON public.projects IS
  'Allow organization members to read active projects. RLS not enabled yet.';

CREATE POLICY projects_insert_organization
  ON public.projects
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON POLICY projects_insert_organization ON public.projects IS
  'Allow organization members to create projects in their organization. RLS not enabled yet.';

CREATE POLICY projects_update_organization
  ON public.projects
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON POLICY projects_update_organization ON public.projects IS
  'Allow organization members to update projects in their organization. RLS not enabled yet.';

CREATE POLICY companies_select_organization
  ON public.companies
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON POLICY companies_select_organization ON public.companies IS
  'Allow organization members to read active companies. RLS not enabled yet.';

CREATE POLICY companies_insert_organization
  ON public.companies
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON POLICY companies_insert_organization ON public.companies IS
  'Allow organization members to create companies in their organization. RLS not enabled yet.';

CREATE POLICY companies_update_organization
  ON public.companies
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON POLICY companies_update_organization ON public.companies IS
  'Allow organization members to update companies in their organization. RLS not enabled yet.';

-- RLS intentionally NOT enabled in Phase 1:
-- ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

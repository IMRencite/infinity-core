-- Production Artifact Handoff + Deployment Readiness v1

CREATE TABLE public.production_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  venture_assembly_id UUID REFERENCES public.venture_assemblies (id) ON DELETE SET NULL,
  venture_assembly_version INTEGER,
  build_job_id UUID REFERENCES public.build_jobs (id) ON DELETE SET NULL,
  build_snapshot_id UUID NOT NULL REFERENCES public.build_snapshots (id) ON DELETE RESTRICT,
  build_id UUID NOT NULL REFERENCES public.builds (id) ON DELETE RESTRICT,
  artifact_version INTEGER NOT NULL DEFAULT 1,
  artifact_type TEXT NOT NULL DEFAULT 'website_application',
  framework TEXT NOT NULL,
  root_directory TEXT NOT NULL DEFAULT '.',
  file_manifest JSONB NOT NULL DEFAULT '[]'::JSONB,
  file_count INTEGER NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  content_hash TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT production_artifacts_content_hash_not_blank CHECK (BTRIM(content_hash) <> ''),
  CONSTRAINT production_artifacts_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX production_artifacts_org_idempotency_uidx
  ON public.production_artifacts (organization_id, idempotency_key);

CREATE INDEX production_artifacts_snapshot_idx
  ON public.production_artifacts (organization_id, build_snapshot_id);

CREATE TABLE public.production_artifact_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  production_artifact_id UUID NOT NULL REFERENCES public.production_artifacts (id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  byte_size BIGINT NOT NULL DEFAULT 0,
  file_mode TEXT NOT NULL DEFAULT '100644',
  content_text TEXT,
  CONSTRAINT production_artifact_files_path_not_blank CHECK (BTRIM(relative_path) <> '')
);

CREATE UNIQUE INDEX production_artifact_files_artifact_path_uidx
  ON public.production_artifact_files (production_artifact_id, relative_path);

ALTER TABLE public.venture_assemblies
  ADD COLUMN IF NOT EXISTS production_artifact_id UUID REFERENCES public.production_artifacts (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS launch_stage TEXT;

ALTER TABLE public.external_actions
  ADD COLUMN IF NOT EXISTS production_artifact_id UUID REFERENCES public.production_artifacts (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS launch_stage TEXT,
  ADD COLUMN IF NOT EXISTS provider_lifecycle_state TEXT,
  ADD COLUMN IF NOT EXISTS http_verification_status TEXT,
  ADD COLUMN IF NOT EXISTS verified_url TEXT;

CREATE TABLE public.launch_handoff_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_assembly_id UUID NOT NULL REFERENCES public.venture_assemblies (id) ON DELETE RESTRICT,
  production_artifact_id UUID REFERENCES public.production_artifacts (id) ON DELETE SET NULL,
  external_action_id UUID REFERENCES public.external_actions (id) ON DELETE SET NULL,
  link_type TEXT NOT NULL,
  provider TEXT,
  provider_resource_id TEXT,
  repository_full_name TEXT,
  commit_sha TEXT,
  branch_name TEXT,
  vercel_project_id TEXT,
  deployment_id TEXT,
  deployment_url TEXT,
  artifact_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX launch_handoff_links_assembly_idx
  ON public.launch_handoff_links (organization_id, venture_assembly_id, link_type);

ALTER TABLE public.production_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_artifact_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_handoff_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY production_artifacts_select_member
  ON public.production_artifacts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = production_artifacts.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

CREATE POLICY production_artifact_files_select_member
  ON public.production_artifact_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = production_artifact_files.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

CREATE POLICY launch_handoff_links_select_member
  ON public.launch_handoff_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = launch_handoff_links.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

GRANT SELECT ON public.production_artifacts TO authenticated;
GRANT SELECT ON public.production_artifact_files TO authenticated;
GRANT SELECT ON public.launch_handoff_links TO authenticated;

COMMENT ON TABLE public.production_artifacts IS
  'Canonical deployable Build Factory output — deterministic content hash, no secrets.';

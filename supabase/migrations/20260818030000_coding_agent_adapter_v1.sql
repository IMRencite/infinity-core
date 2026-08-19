-- =============================================================================
-- Coding Agent Adapter V1
-- Provider-neutral coding-agent runs. Service_role writes; RLS enabled; no blanket policies.
-- =============================================================================

CREATE TABLE public.coding_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID,
  mission_id TEXT,
  task_id TEXT NOT NULL,
  build_run_id TEXT,
  founder_idea_submission_id UUID,
  provider TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  cost_usd NUMERIC,
  cost_known BOOLEAN NOT NULL DEFAULT FALSE,
  files_read TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  files_created TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  files_modified TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  files_deleted TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  commands_run JSONB NOT NULL DEFAULT '[]'::JSONB,
  tests_run JSONB NOT NULL DEFAULT '[]'::JSONB,
  branch TEXT,
  commit_sha TEXT,
  failure_code TEXT,
  failure_reason TEXT,
  repair_attempts INTEGER NOT NULL DEFAULT 0,
  infinity_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX coding_agent_runs_org_created_idx
  ON public.coding_agent_runs (organization_id, created_at DESC);

CREATE INDEX coding_agent_runs_org_task_idx
  ON public.coding_agent_runs (organization_id, task_id);

ALTER TABLE public.coding_agent_runs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.coding_agent_runs TO service_role;

-- EXPAND only. No DROP / TRUNCATE / DELETE.

CREATE TABLE IF NOT EXISTS public.communication_release_attempts (
  deployment_id TEXT PRIMARY KEY,
  git_commit_sha TEXT NOT NULL,
  git_tree_sha TEXT,
  release_content_hash TEXT NOT NULL,
  build_graph_hash TEXT NOT NULL,
  dirty BOOLEAN NOT NULL DEFAULT FALSE,
  build_timestamp TIMESTAMPTZ,
  promotion_timestamp TIMESTAMPTZ,
  required_routes JSONB NOT NULL DEFAULT '[]'::jsonb,
  build_result TEXT,
  smoke_result TEXT,
  promotion_result TEXT,
  heartbeat_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.communication_serving_evidence (
  evidence_id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  release_content_hash TEXT NOT NULL,
  git_commit_sha TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  evidence_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.communication_bad_promotion_incidents (
  incident_id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  missing_route TEXT NOT NULL,
  promotion_started_at TIMESTAMPTZ,
  last_healthy_heartbeat_at TIMESTAMPTZ,
  first_missed_heartbeat_at TIMESTAMPTZ,
  alias_restored_at TIMESTAMPTZ,
  first_healthy_after_restore_at TIMESTAMPTZ,
  runtime_gap_ms BIGINT,
  provider_messages_during_gap INTEGER,
  eligible_prospect_messages INTEGER,
  uncovered INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.communication_admission_watermarks
  ADD COLUMN IF NOT EXISTS cutover_internal_date_ms BIGINT;

CREATE OR REPLACE VIEW public.communication_heartbeat_observer_v AS
SELECT scope, payload, updated_at
FROM public.cloud_runtime_state
WHERE scope = 'communication-runtime-heartbeats-v1';

CREATE OR REPLACE VIEW public.communication_release_intent_observer_v AS
SELECT scope, payload, updated_at
FROM public.cloud_runtime_state
WHERE scope IN ('communication-intended-release-v1', 'communication-release-attempts-v8');

CREATE OR REPLACE VIEW public.communication_provider_coverage_observer_v AS
SELECT scope, payload, updated_at
FROM public.cloud_runtime_state
WHERE scope IN ('communication-provider-probe-v4', 'communication-gap-coverage-v8');

CREATE OR REPLACE VIEW public.communication_open_obligation_observer_v AS
SELECT id, state, provider_message_id, created_at
FROM public.communication_obligations
WHERE state IS NOT NULL;

CREATE OR REPLACE VIEW public.communication_legacy_sink_observer_v AS
SELECT scope, payload, updated_at
FROM public.cloud_runtime_state
WHERE scope = 'communication-runtime-scheduler-v1';

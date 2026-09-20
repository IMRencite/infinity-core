-- EXPAND only. Do not drop live uniqueness or existing ownership PK.
-- Compatible with currently serving runtime until V7 is proven.

CREATE TABLE IF NOT EXISTS public.communication_human_attestation_requests (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('AWAITING_HUMAN', 'ATTESTED', 'REJECTED', 'EXPIRED')),
  requested_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  renotify_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  question TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_action TEXT NOT NULL,
  escalation_count INTEGER NOT NULL DEFAULT 0,
  attestation_version TEXT NOT NULL,
  attested_by TEXT,
  attested_at TIMESTAMPTZ,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.communication_shadow_attempts (
  shadow_id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  release_sha TEXT,
  planner_version TEXT,
  offer_truth_version TEXT,
  draft_hash TEXT,
  authorship TEXT NOT NULL,
  intent TEXT,
  first_touch BOOLEAN NOT NULL DEFAULT FALSE,
  hard_gates TEXT NOT NULL,
  soft_gates TEXT NOT NULL,
  fallback TEXT NOT NULL,
  threading TEXT NOT NULL,
  send_authority BOOLEAN NOT NULL DEFAULT FALSE CHECK (send_authority = FALSE),
  terminal TEXT NOT NULL CHECK (terminal IN ('SHADOW_PASS', 'SHADOW_FAIL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.communication_recovery_admissions (
  mailbox_id TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  admission_reason TEXT NOT NULL CHECK (admission_reason = 'EXPLICIT_RECOVERY'),
  incident_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  approved_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (mailbox_id, provider_message_id)
);

CREATE TABLE IF NOT EXISTS public.communication_snapshot_deny_list (
  provider_message_id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification = 'PRE_CUTOVER_SNAPSHOT'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.communication_admission_watermarks (
  mailbox_id TEXT PRIMARY KEY,
  live_admission_internal_date_watermark_ms BIGINT NOT NULL,
  gmail_sync_history_cursor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.communication_recovery_watch_ticks (
  tick INTEGER PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  deployment TEXT,
  epoch TEXT NOT NULL,
  obligation_state TEXT,
  owner TEXT,
  due_at TIMESTAMPTZ,
  next_action TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  retry_budget INTEGER NOT NULL DEFAULT 0,
  provider_call_state TEXT,
  ownership_state TEXT,
  last_error TEXT,
  outcome TEXT NOT NULL
);

ALTER TABLE public.communication_outbound_ownership
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS attempt_id TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.communication_outbound_ownership
  ALTER COLUMN owner_path DROP NOT NULL,
  ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.communication_obligations
  ADD COLUMN IF NOT EXISTS admission_basis TEXT,
  ADD COLUMN IF NOT EXISTS provider_internal_date_ms BIGINT;

CREATE INDEX IF NOT EXISTS communication_shadow_attempts_deployment_idx
  ON public.communication_shadow_attempts (deployment_id, provider_message_id);

ALTER TABLE public.communication_human_attestation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_shadow_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_recovery_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_snapshot_deny_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_admission_watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_recovery_watch_ticks ENABLE ROW LEVEL SECURITY;

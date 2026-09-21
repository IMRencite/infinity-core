-- CommunicationObligation production authority v2
-- Relational lifecycle storage. Not cloud_runtime_state JSON.

CREATE TABLE IF NOT EXISTS public.communication_obligations (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  role TEXT NOT NULL,
  role_evidence TEXT NOT NULL,
  authorship_resolution TEXT NOT NULL DEFAULT 'UNRESOLVED',
  received_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL,
  planner_intent TEXT,
  planner_version TEXT,
  conversation_stage TEXT,
  next_action TEXT,
  owner TEXT,
  due_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  covered_by_outbound_id TEXT,
  terminal_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mailbox_id, provider_message_id),
  CONSTRAINT communication_obligations_version_positive CHECK (version >= 1),
  CONSTRAINT communication_obligations_no_blocked CHECK (state <> 'BLOCKED')
);

CREATE TABLE IF NOT EXISTS public.communication_attempts (
  id TEXT PRIMARY KEY,
  obligation_id TEXT NOT NULL REFERENCES public.communication_obligations(id),
  attempt_no INTEGER NOT NULL,
  strategy TEXT,
  stage TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  failure_class TEXT,
  failure_reason TEXT,
  provider_status TEXT,
  provider_message_id TEXT,
  rfc_message_id TEXT,
  recovered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (obligation_id, attempt_no),
  CONSTRAINT communication_attempts_attempt_no_positive CHECK (attempt_no >= 1)
);

CREATE TABLE IF NOT EXISTS public.communication_outbound_ledger (
  obligation_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  attempt_no INTEGER NOT NULL,
  rfc_message_id TEXT NOT NULL,
  custom_header TEXT,
  thread_id TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_message_id TEXT,
  accepted_at TIMESTAMPTZ,
  PRIMARY KEY (obligation_id, attempt_no)
);

CREATE TABLE IF NOT EXISTS public.communication_transition_log (
  id BIGSERIAL PRIMARY KEY,
  obligation_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  expected_version INTEGER NOT NULL,
  new_version INTEGER NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_ref TEXT,
  timestamp TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.communication_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_outbound_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_transition_log ENABLE ROW LEVEL SECURITY;

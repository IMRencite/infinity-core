-- Append-only founder decisions. Shared by Organic QC hold and Communication attestations.
-- No business runtime coupling.

CREATE TABLE IF NOT EXISTS public.founder_decisions (
  id TEXT PRIMARY KEY,
  decision_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  statement_hash TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  requested_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ NOT NULL,
  actor_identity TEXT NOT NULL,
  authentication_method TEXT NOT NULL,
  previous_decision_id TEXT,
  CONSTRAINT founder_decisions_method CHECK (
    authentication_method IN ('WEBAUTHN_PASSKEY', 'FOUNDER_GPG')
  )
);

CREATE TABLE IF NOT EXISTS public.founder_passkeys (
  credential_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL,
  user_label TEXT NOT NULL
);

ALTER TABLE public.founder_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_passkeys ENABLE ROW LEVEL SECURITY;

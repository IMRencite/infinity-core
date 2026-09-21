-- Cloud Runtime Productionization v1
-- Durable autonomous runtime state. No organization FK: system-scoped Infinity runtime.

CREATE TABLE IF NOT EXISTS public.cloud_runtime_state (
  scope TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  instance_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cloud_runtime_state_version_positive CHECK (version >= 1)
);

CREATE TABLE IF NOT EXISTS public.cloud_runtime_leases (
  scope TEXT PRIMARY KEY,
  holder TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cloud_runtime_idempotency (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  kind TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, key)
);

CREATE TABLE IF NOT EXISTS public.cloud_runtime_events (
  scope TEXT NOT NULL,
  event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, event_id)
);

CREATE TABLE IF NOT EXISTS public.cloud_runtime_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  action_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  provider TEXT,
  safe_error TEXT NOT NULL,
  recovery_state TEXT NOT NULL,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cloud_runtime_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  wake_source TEXT NOT NULL,
  decision TEXT,
  action_result TEXT,
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cloud_runtime_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_runtime_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_runtime_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_runtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_runtime_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_runtime_audit ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.cloud_runtime_state IS
  'Canonical durable Cloud Runtime Productionization state. Not local .infinity JSON.';

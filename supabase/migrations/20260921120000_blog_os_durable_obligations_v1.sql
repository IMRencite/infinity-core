-- Blog-OS durable daily obligations. Isolated from communication_* tables.

CREATE TABLE IF NOT EXISTS public.blog_publishing_holds (
  hold_id TEXT PRIMARY KEY,
  venture_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  owner TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  next_review_at TIMESTAMPTZ NOT NULL,
  escalation_count INTEGER NOT NULL DEFAULT 0,
  exit_condition_version TEXT NOT NULL,
  exit_condition_frozen_at TIMESTAMPTZ NOT NULL,
  evidence_required TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  evidence_pack_url TEXT,
  founder_review_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  resolved_at TIMESTAMPTZ,
  CONSTRAINT blog_publishing_holds_escalation_nonneg CHECK (escalation_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.blog_daily_obligations (
  id TEXT PRIMARY KEY,
  venture_id TEXT NOT NULL,
  operating_date DATE NOT NULL,
  operating_timezone TEXT NOT NULL,
  required_count INTEGER NOT NULL DEFAULT 1,
  candidate_id TEXT,
  expected_url TEXT,
  pipeline_state TEXT NOT NULL,
  hold_id TEXT REFERENCES public.blog_publishing_holds(hold_id),
  qc_version TEXT,
  owner TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  failure_reason TEXT,
  published_at TIMESTAMPTZ,
  live_verified_at TIMESTAMPTZ,
  live_url TEXT,
  recovered BOOLEAN NOT NULL DEFAULT FALSE,
  clean BOOLEAN NOT NULL DEFAULT FALSE,
  missed_reason TEXT,
  decision_owner TEXT,
  decided_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (venture_id, operating_date),
  CONSTRAINT blog_daily_obligations_required_positive CHECK (required_count >= 1),
  CONSTRAINT blog_daily_obligations_pipeline CHECK (
    pipeline_state IN ('PLANNED', 'DRAFTED', 'QC_PASSED', 'PUBLISHED', 'LIVE_VERIFIED', 'MISSED_RECORDED')
  )
);

CREATE TABLE IF NOT EXISTS public.blog_obligation_events (
  id TEXT PRIMARY KEY,
  obligation_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  actor TEXT NOT NULL,
  invoked_by TEXT NOT NULL,
  event_type TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  deployment_id TEXT,
  evidence_ref TEXT
);

CREATE TABLE IF NOT EXISTS public.blog_scheduler_events (
  id TEXT PRIMARY KEY,
  deployment_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  venture_id TEXT NOT NULL,
  operating_date DATE NOT NULL,
  insert_attempted BOOLEAN NOT NULL DEFAULT TRUE,
  insert_result TEXT NOT NULL,
  error TEXT
);

ALTER TABLE public.blog_publishing_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_daily_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_obligation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_scheduler_events ENABLE ROW LEVEL SECURITY;

-- Durable cross-invocation candidate failure / quarantine state for portfolio operating cycles.

CREATE TABLE IF NOT EXISTS public.autonomous_portfolio_candidate_state (
  venture_id TEXT NOT NULL,
  lane TEXT NOT NULL,
  candidate_key TEXT NOT NULL,
  revision_identity TEXT,
  terminal_state TEXT NOT NULL,
  failure_class TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  failure_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  quarantine_reason TEXT,
  quarantined_at TIMESTAMPTZ,
  last_cycle_id UUID,
  last_release_sha TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT autonomous_portfolio_candidate_state_pk PRIMARY KEY (venture_id, lane, candidate_key),
  CONSTRAINT autonomous_portfolio_candidate_state_terminal_check CHECK (
    terminal_state IN (
      'ACTIVE',
      'REPAIRABLE',
      'QUARANTINED_QC_EXHAUSTED',
      'SUPERSEDED',
      'PUBLISHED'
    )
  )
);

CREATE INDEX IF NOT EXISTS autonomous_portfolio_candidate_state_venture_terminal_idx
  ON public.autonomous_portfolio_candidate_state (venture_id, terminal_state);

ALTER TABLE public.autonomous_portfolio_candidate_state ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.autonomous_portfolio_candidate_state IS
  'Cross-serverless candidate quarantine and cumulative QC failure state for portfolio content/shirt lanes.';

-- Founder Daily Operations Reports — durable production persistence.
-- Service-role only. No public policies. Not local .infinity JSON.

CREATE TABLE IF NOT EXISTS public.founder_daily_reports (
  report_date DATE PRIMARY KEY,
  report_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('LIVE', 'FINAL', 'AMENDED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  generated_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  finalized_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS founder_daily_reports_report_id_idx
  ON public.founder_daily_reports (report_id);

ALTER TABLE public.founder_daily_reports ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.founder_daily_reports IS
  'Canonical durable FounderDailyOperationsReport. Production HQ must not use ephemeral filesystem.';

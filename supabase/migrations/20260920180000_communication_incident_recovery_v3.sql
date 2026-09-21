-- Durable CommunicationIncident + recovered monotonicity + outbound ownership.

CREATE TABLE IF NOT EXISTS public.communication_incidents (
  incident_id TEXT PRIMARY KEY,
  provider_message_id TEXT NOT NULL,
  mailbox_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  recovered BOOLEAN NOT NULL DEFAULT TRUE,
  clean_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  recovery_reason_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  first_detected_at TIMESTAMPTZ NOT NULL,
  slo_breached_at TIMESTAMPTZ NOT NULL,
  release_parity_failed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mailbox_id, provider_message_id),
  CONSTRAINT communication_incidents_recovered_true CHECK (recovered = TRUE),
  CONSTRAINT communication_incidents_clean_false CHECK (clean_eligible = FALSE)
);

CREATE OR REPLACE FUNCTION public.communication_incident_recovered_monotonic()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.recovered = TRUE AND NEW.recovered = FALSE THEN
    RAISE EXCEPTION 'RECOVERED_IS_MONOTONIC';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.clean_eligible = FALSE AND NEW.clean_eligible = TRUE THEN
    RAISE EXCEPTION 'CLEAN_ELIGIBLE_IS_MONOTONIC_FALSE';
  END IF;
  NEW.recovered := TRUE;
  NEW.clean_eligible := FALSE;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS communication_incident_recovered_monotonic ON public.communication_incidents;
CREATE TRIGGER communication_incident_recovered_monotonic
BEFORE UPDATE ON public.communication_incidents
FOR EACH ROW
EXECUTE FUNCTION public.communication_incident_recovered_monotonic();

CREATE TABLE IF NOT EXISTS public.communication_outbound_ownership (
  mailbox_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  answered_inbound_provider_message_id TEXT NOT NULL,
  owner_path TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (mailbox_id, thread_id, answered_inbound_provider_message_id)
);

CREATE TABLE IF NOT EXISTS public.communication_legacy_jobs (
  job_id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  inbound_message_id TEXT NOT NULL,
  state TEXT NOT NULL,
  failure_reason TEXT,
  superseded_by_obligation_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.communication_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_outbound_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_legacy_jobs ENABLE ROW LEVEL SECURITY;

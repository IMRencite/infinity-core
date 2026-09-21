-- Dual hold owners, founder clock, exit hash, scheduler invoked_by.

ALTER TABLE public.blog_publishing_holds
  ADD COLUMN IF NOT EXISTS engineering_owner TEXT,
  ADD COLUMN IF NOT EXISTS founder_decision_owner TEXT,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renotify_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_condition_hash TEXT;

ALTER TABLE public.blog_scheduler_events
  ADD COLUMN IF NOT EXISTS invoked_by TEXT;

UPDATE public.blog_publishing_holds
SET
  engineering_owner = COALESCE(engineering_owner, owner),
  founder_decision_owner = COALESCE(founder_decision_owner, 'FOUNDER'),
  renotify_at = COALESCE(renotify_at, next_review_at)
WHERE hold_id = 'hold:occupancynpv:second-qc-escape-v1';

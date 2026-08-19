-- =============================================================================
-- Founder Idea Lab V1
-- Intake + grading persistence. Canonical candidate conversion stays in-engine.
-- Posture: service_role writes; RLS enabled; no authenticated mutation policies.
-- =============================================================================

CREATE TABLE public.founder_idea_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  submitted_by_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_customer TEXT,
  problem TEXT,
  proposed_solution TEXT,
  business_model_hypothesis TEXT,
  pricing_hypothesis TEXT,
  competitors TEXT,
  notes TEXT,
  desired_mode TEXT NOT NULL DEFAULT 'GRADE_ONLY',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  opportunity_candidate_id UUID,
  infinity_decision TEXT,
  founder_decision TEXT,
  origin TEXT NOT NULL DEFAULT 'FOUNDER_SUBMITTED',
  failure_code TEXT,
  analyzed_by_user_id UUID,
  approved_by_user_id UUID,
  idempotency_key TEXT NOT NULL,
  opportunity_quality NUMERIC,
  selection_score NUMERIC,
  validation_score NUMERIC,
  monetization_score NUMERIC,
  fatal_assumption_risk NUMERIC,
  expected_roi NUMERIC,
  estimated_capital_required NUMERIC,
  scores_json JSONB,
  blocking_assumptions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT founder_idea_submissions_mode_valid CHECK (
    desired_mode IN ('GRADE_ONLY', 'GRADE_AND_VALIDATE', 'GRADE_AND_BUILD_IF_READY')
  ),
  CONSTRAINT founder_idea_submissions_status_valid CHECK (
    status IN (
      'DRAFT',
      'SUBMITTED',
      'RESEARCHING',
      'GRADED',
      'VALIDATING',
      'READY_FOR_DECISION',
      'BUILD_APPROVED',
      'BUILDING',
      'COMPLETED',
      'HELD',
      'REJECTED',
      'FAILED'
    )
  ),
  CONSTRAINT founder_idea_submissions_origin_valid CHECK (
    origin IN ('AUTONOMOUS_DISCOVERY', 'FOUNDER_SUBMITTED', 'FOUNDER_OVERRIDE')
  )
);

CREATE UNIQUE INDEX founder_idea_submissions_org_idempotency_uidx
  ON public.founder_idea_submissions (organization_id, idempotency_key);

CREATE INDEX founder_idea_submissions_org_created_idx
  ON public.founder_idea_submissions (organization_id, created_at DESC);

CREATE TABLE public.founder_decision_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  founder_idea_submission_id UUID NOT NULL REFERENCES public.founder_idea_submissions (id) ON DELETE RESTRICT,
  candidate_id TEXT NOT NULL DEFAULT '',
  infinity_decision TEXT NOT NULL,
  founder_decision TEXT NOT NULL,
  founder_action TEXT NOT NULL,
  reason TEXT,
  risk_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX founder_decision_overrides_org_submission_idx
  ON public.founder_decision_overrides (organization_id, founder_idea_submission_id, created_at DESC);

ALTER TABLE public.founder_idea_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_decision_overrides ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.founder_idea_submissions TO service_role;
GRANT ALL ON public.founder_decision_overrides TO service_role;

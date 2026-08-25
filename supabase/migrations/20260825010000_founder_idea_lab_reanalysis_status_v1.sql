-- Founder Idea Lab reanalysis statuses.
-- Constraint-only. Does not mutate founder rows, scores, or candidates.
-- Extends founder_idea_submissions_status_valid to match TypeScript FounderIdeaStatus.

ALTER TABLE public.founder_idea_submissions
  DROP CONSTRAINT IF EXISTS founder_idea_submissions_status_valid;

ALTER TABLE public.founder_idea_submissions
  ADD CONSTRAINT founder_idea_submissions_status_valid CHECK (
    status IN (
      'DRAFT',
      'SUBMITTED',
      'RESEARCHING',
      'GRADED',
      'VALIDATING',
      'READY_FOR_DECISION',
      'INSUFFICIENT_EVIDENCE',
      'RESEARCH_INCOMPLETE',
      'NEEDS_REANALYSIS',
      'BUILD_APPROVED',
      'BUILDING',
      'COMPLETED',
      'HELD',
      'REJECTED',
      'FAILED'
    )
  );

COMMENT ON CONSTRAINT founder_idea_submissions_status_valid ON public.founder_idea_submissions IS
  'Includes reanalysis incomplete states. Historical grades live in scores_json.evaluationHistory.';

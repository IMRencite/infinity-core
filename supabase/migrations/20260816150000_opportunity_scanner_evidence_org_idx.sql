-- Opportunity scanner persistence: org-scoped evidence lookups and FK checks.

CREATE INDEX IF NOT EXISTS opportunity_candidate_evidence_organization_id_idx
  ON public.opportunity_candidate_evidence (organization_id);

COMMENT ON INDEX public.opportunity_candidate_evidence_organization_id_idx IS
  'Supports org-scoped scanner persistence and diagnostics without full-table scans.';

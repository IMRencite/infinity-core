-- Canonical autonomous lineage: opportunity_candidates.id is distinct from
-- venture_assemblies.opportunity_id (legacy opportunities FK). Do not merge meanings.

ALTER TABLE public.venture_assemblies
  ADD COLUMN IF NOT EXISTS opportunity_candidate_id UUID
    REFERENCES public.opportunity_candidates (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS venture_assemblies_org_opportunity_candidate_idx
  ON public.venture_assemblies (organization_id, opportunity_candidate_id)
  WHERE opportunity_candidate_id IS NOT NULL;

COMMENT ON COLUMN public.venture_assemblies.opportunity_candidate_id IS
  'Canonical opportunity_candidates.id for autonomous lineage. Distinct from opportunity_id, which remains the legacy opportunities FK.';

-- Deterministic backfill only: explicit persisted candidate UUID that already exists.
-- Ambiguous historical e2e shells without a matching candidate id are left unchanged.
UPDATE public.venture_assemblies va
SET opportunity_candidate_id = oc.id
FROM public.opportunity_candidates oc
WHERE va.opportunity_candidate_id IS NULL
  AND oc.organization_id = va.organization_id
  AND oc.id::text = COALESCE(
    NULLIF(BTRIM(va.identity_package->>'opportunityCandidateId'), ''),
    NULLIF(BTRIM(va.manifest->>'opportunityCandidateId'), '')
  )
  AND COALESCE(
    NULLIF(BTRIM(va.identity_package->>'opportunityCandidateId'), ''),
    NULLIF(BTRIM(va.manifest->>'opportunityCandidateId'), '')
  ) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

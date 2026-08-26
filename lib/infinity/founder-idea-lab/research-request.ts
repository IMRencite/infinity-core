import type { RunGroundedResearchInput } from "@/lib/infinity/research/types";
import { founderResearchAttemptKey } from "./idempotency";
import type { FounderResearchSeed } from "./research-seed";

export function founderResearchIdempotencyKey(seed: FounderResearchSeed): string {
  if (!seed.candidateId) {
    throw new Error("FOUNDER_RESEARCH_REQUIRES_CANDIDATE_ID");
  }
  return founderResearchAttemptKey({
    submissionId: seed.submissionId,
    candidateId: seed.candidateId,
    attempt: seed.analysisAttempt,
  });
}

/**
 * Deterministic mapping from a Founder research seed into the canonical
 * grounded-research engine. Founder claims remain hypotheses in the objective.
 */
export function buildCanonicalResearchRequest(seed: FounderResearchSeed): RunGroundedResearchInput {
  if (!seed.candidateId) {
    throw new Error("FOUNDER_RESEARCH_REQUIRES_CANDIDATE_ID");
  }
  return {
    organizationId: seed.organizationId,
    candidateId: seed.candidateId,
    researchObjective: seed.researchObjective,
    idempotencyKey: founderResearchIdempotencyKey(seed),
    runPurpose: "FOUNDER_IDEA_REANALYSIS",
    requireSourceBackedFindings: true,
    coverageSeed: {
      ideaTitle: seed.ideaTitle,
      ideaDescription: seed.ideaDescription,
      targetCustomer: seed.targetCustomer,
      problem: seed.problem,
      businessModelHypothesis: seed.businessModelHypothesis,
      pricingHypothesis: seed.pricingHypothesis,
      competitorLeads: seed.knownCompetitors,
    },
  };
}

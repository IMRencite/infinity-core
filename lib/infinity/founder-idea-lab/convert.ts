import { calculateDeterministicScores } from "@/lib/infinity/opportunity-scanner/scoring/calculate";
import type {
  EvidenceBundle,
  OpportunityCandidate,
  OpportunityCandidateDraft,
  ScoringAssessmentInput,
} from "@/lib/infinity/opportunity-scanner/types";
import { canonicalGroundedEvidence } from "./fixtures";
import { normalizeFounderIdea } from "./normalize";
import { newId, nowIso, type FounderIdeaStore } from "./store";
import type { FounderIdeaSubmission } from "./types";

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function founderDedupKey(organizationId: string, title: string, description: string): string {
  return `founder:${organizationId}:${slug(title)}:${slug(description).slice(0, 48)}`;
}

export function toCandidateDraft(
  submission: FounderIdeaSubmission,
  research?: { grounded: boolean; sources: Array<{ url: string; title: string | null; domain: string | null }> },
): OpportunityCandidateDraft {
  const thesis = normalizeFounderIdea(submission);
  const grounded = research?.grounded === true;
  const researchEvidence: Partial<Record<keyof Pick<
    OpportunityCandidateDraft,
    "demandEvidence" | "marketEvidence" | "competitionEvidence" | "monetizationEvidence" | "distributionEvidence" | "buildabilityEvidence"
  >, EvidenceBundle[]>> = grounded ? canonicalGroundedEvidence(research?.sources[0]?.url) : {};
  const founderCompetition: EvidenceBundle[] = submission.competitors
    ? [{
        signalType: "competition",
        claim: submission.competitors,
        observedSignal: "Founder-provided competitor list",
        relevance: "unknown",
        sourceUrls: [],
        grounded: false,
        limitations: ["FOUNDER_PROVIDED — not independently verified"],
      }]
    : [];
  return {
    title: submission.title,
    summary: thesis.businessThesis.value ?? submission.description,
    problem: thesis.problem.value ?? submission.description,
    targetCustomer: thesis.targetCustomer.value ?? "UNSPECIFIED",
    market: thesis.market.value ?? "UNSPECIFIED",
    businessModelCandidates: thesis.businessModelCandidates.values as OpportunityCandidateDraft["businessModelCandidates"],
    revenueMechanismCandidates: submission.pricingHypothesis ? [submission.pricingHypothesis] : ["subscription"],
    demandEvidence: researchEvidence.demandEvidence ?? [],
    marketEvidence: researchEvidence.marketEvidence ?? [],
    competitionEvidence: [...(researchEvidence.competitionEvidence ?? []), ...founderCompetition],
    monetizationEvidence: researchEvidence.monetizationEvidence ?? [],
    distributionEvidence: researchEvidence.distributionEvidence ?? [],
    buildabilityEvidence: researchEvidence.buildabilityEvidence ?? [],
    risks: thesis.risks.values,
    unknowns: thesis.unknowns.values,
    researchSources: research?.sources ?? [],
    researchRunIds: [],
    discoveryStrategies: [],
    dedupKey: founderDedupKey(submission.organizationId, submission.title, submission.description),
    mergeGroupKey: `founder-idea:${submission.id}`,
  };
}

export function conservativeScoringInputs(hasResearch: boolean): ScoringAssessmentInput {
  return {
    demandStrength: hasResearch ? 0.78 : 0.42,
    marketGrowth: hasResearch ? 0.7 : 0.4,
    competitionWeakness: hasResearch ? 0.62 : 0.45,
    monetizationPotential: hasResearch ? 0.8 : 0.48,
    buildability: hasResearch ? 0.82 : 0.55,
    automationPotential: hasResearch ? 0.8 : 0.5,
    distributionStrength: hasResearch ? 0.68 : 0.4,
    capitalEfficiency: hasResearch ? 0.75 : 0.45,
    speedToRevenue: hasResearch ? 0.78 : 0.42,
    evidenceConfidence: hasResearch ? 0.72 : 0.28,
  };
}

export function convertFounderIdeaToCandidate(
  store: FounderIdeaStore,
  submission: FounderIdeaSubmission,
  input?: { scores?: ScoringAssessmentInput; researchGrounded?: boolean },
): OpportunityCandidate {
  const existing = [...store.candidates.values()].find(
    (candidate) =>
      candidate.organizationId === submission.organizationId &&
      candidate.dedupKey === founderDedupKey(submission.organizationId, submission.title, submission.description),
  );
  if (existing) {
    submission.opportunityCandidateId = existing.id;
    store.submissions.set(submission.id, submission);
    return existing;
  }

  const draft = toCandidateDraft(submission, input?.researchGrounded ? { grounded: true, sources: [{ url: "https://example.com/research", title: "Research fixture", domain: "example.com" }] } : undefined);
  const scores = calculateDeterministicScores(input?.scores ?? conservativeScoringInputs(Boolean(input?.researchGrounded)));
  const now = nowIso();
  const candidate: OpportunityCandidate = {
    ...draft,
    id: newId(),
    organizationId: submission.organizationId,
    discoveryRunId: `founder-discovery:${submission.id}`,
    opportunityScore: scores.opportunityScore,
    rankPosition: 1,
    scores,
    createdAt: now,
    updatedAt: now,
  };
  store.candidates.set(candidate.id, candidate);
  submission.opportunityCandidateId = candidate.id;
  submission.updatedAt = now;
  store.submissions.set(submission.id, submission);
  return candidate;
}

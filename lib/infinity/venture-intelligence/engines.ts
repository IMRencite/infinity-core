import { buildResearchCoveragePlan } from "@/lib/infinity/research/coverage/plan";
import { loadResearchCoveragePolicy } from "@/lib/infinity/research/coverage/policy";
import {
  QUALITY_REPLACEMENT_PRIORITY,
  assessQualityReplacementNeeds,
  evaluateQualityReplacementEligibility,
} from "@/lib/infinity/research/coverage/quality-replacement";
import { researchBenchmarkEconomics } from "@/lib/infinity/founder-idea-lab/benchmark-economics";
import { buildFounderVentureBuildPlan } from "@/lib/infinity/founder-idea-lab/build-plan";
import type { VentureContext } from "@/lib/infinity/founder-idea-lab/comparable-economics/qualify";
import { activateEducatedEstimates, buildEducatedEconomicsModel, emptyEducatedEconomicsModel } from "@/lib/infinity/founder-idea-lab/educated-estimates";
import { emptyMonetizationLayers } from "@/lib/infinity/founder-idea-lab/monetization-levels";
import { buildProductAdvantage } from "@/lib/infinity/founder-idea-lab/product-advantage";
import type { FounderProductAdvantageView } from "@/lib/infinity/founder-idea-lab/product-advantage/types";
import type { FounderResearchFinding, FounderResearchPacket } from "@/lib/infinity/founder-idea-lab/research-packet";
import { researchRevenueModel } from "@/lib/infinity/founder-idea-lab/revenue-model-research";
import { presentVentureBrief } from "@/lib/infinity/founder-idea-lab/venture-brief";
import type { CanonicalCandidateInput } from "./types";

export {
  buildResearchCoveragePlan,
  loadResearchCoveragePolicy,
  assessQualityReplacementNeeds,
  evaluateQualityReplacementEligibility,
  QUALITY_REPLACEMENT_PRIORITY,
  researchRevenueModel,
  researchBenchmarkEconomics,
  activateEducatedEstimates,
  buildEducatedEconomicsModel,
  emptyEducatedEconomicsModel,
  buildProductAdvantage,
  presentVentureBrief,
  buildFounderVentureBuildPlan,
};

export const QUALITY_REPLACEMENT_POLICY = {
  maxPhases: 1,
  maxQueries: 5,
  hardCap: 8,
} as const;

type EvidenceDimension =
  | "demand"
  | "market"
  | "competition"
  | "monetization"
  | "pricing"
  | "distribution"
  | "buildability";

function findingsFromClaims(dimension: EvidenceDimension, claims: string[]): FounderResearchFinding[] {
  return claims.filter(Boolean).map((claim, index) => ({
    findingId: `${dimension}-${index}`,
    dimension,
    claim,
    polarity: "unknown" as const,
    grounded: true,
    confidence: null,
    sourceUrls: [],
    limitations: [],
  }));
}

export function ventureContextFromCandidate(candidate: CanonicalCandidateInput): VentureContext {
  return {
    title: candidate.title,
    description: candidate.summary || candidate.title,
    targetCustomer: candidate.targetCustomer || null,
    problem: candidate.problem || null,
    proposedSolution: candidate.summary || null,
    businessModelHypothesis: candidate.businessModelCandidates[0] ?? null,
    pricingHypothesis: candidate.monetizationEvidence[0] ?? null,
  };
}

export function researchPacketFromCandidateEvidence(candidate: CanonicalCandidateInput): FounderResearchPacket {
  const findings = [
    ...findingsFromClaims("demand", candidate.demandEvidence),
    ...findingsFromClaims("market", candidate.marketEvidence),
    ...findingsFromClaims("competition", candidate.competitionEvidence),
    ...findingsFromClaims("monetization", candidate.monetizationEvidence),
    ...findingsFromClaims("pricing", candidate.monetizationEvidence),
    ...findingsFromClaims("distribution", candidate.distributionEvidence),
    ...findingsFromClaims("buildability", candidate.buildabilityEvidence),
  ];
  return {
    researchRunId: candidate.researchRunIds[0] ?? `candidate:${candidate.id}`,
    candidateId: candidate.id,
    submissionId: candidate.id,
    grounded: findings.length > 0,
    failed: false,
    failureCode: null,
    summary: candidate.summary,
    findings,
    sources: candidate.researchSources.map((url) => ({ url, title: null, domain: null })),
    competitorLeads: [],
    verifiedCompetitors: [],
    monetizationLayers: emptyMonetizationLayers(),
    requiresMoreResearch: findings.length === 0,
  };
}

export function planAutonomousResearchCoverage(candidate: CanonicalCandidateInput) {
  return buildResearchCoveragePlan({
    seed: {
      ideaTitle: candidate.title,
      ideaDescription: candidate.summary,
      targetCustomer: candidate.targetCustomer,
      problem: candidate.problem,
      businessModelHypothesis: candidate.businessModelCandidates[0],
    },
    objective: candidate.summary || candidate.title,
    policy: loadResearchCoveragePolicy({
      RESEARCH_QUALITY_REPLACEMENT_MAX_QUERIES: String(QUALITY_REPLACEMENT_POLICY.maxQueries),
    }),
  });
}

export function researchAutonomousRevenueModel(candidate: CanonicalCandidateInput) {
  return researchRevenueModel({
    packet: researchPacketFromCandidateEvidence(candidate),
    context: ventureContextFromCandidate(candidate),
  });
}

export function researchAutonomousBenchmarkEconomics(candidate: CanonicalCandidateInput) {
  return researchBenchmarkEconomics({
    packet: researchPacketFromCandidateEvidence(candidate),
    context: ventureContextFromCandidate(candidate),
    revenueModel: researchAutonomousRevenueModel(candidate),
  });
}

export function activateAutonomousEducatedEstimates(candidate: CanonicalCandidateInput) {
  return activateEducatedEstimates({
    revenueModel: researchAutonomousRevenueModel(candidate),
    benchmarkEconomics: researchAutonomousBenchmarkEconomics(candidate),
  });
}

export function hasProductAdvantageEvidence(candidate: CanonicalCandidateInput | null): boolean {
  if (!candidate) return false;
  const pain = Boolean(candidate.problem || candidate.demandEvidence.length);
  const competition = Boolean(candidate.competitionEvidence.length);
  return pain && competition;
}

export function buildAutonomousProductAdvantage(candidate: CanonicalCandidateInput): {
  insufficient: boolean;
  view: FounderProductAdvantageView | null;
} {
  if (!hasProductAdvantageEvidence(candidate)) {
    return { insufficient: true, view: null };
  }
  return {
    insufficient: false,
    view: buildProductAdvantage({
      packet: researchPacketFromCandidateEvidence(candidate),
      context: {
        proposedSolution: candidate.summary || null,
        pricingHypothesis: candidate.monetizationEvidence[0] ?? null,
        businessModelHypothesis: candidate.businessModelCandidates[0] ?? null,
        targetCustomer: candidate.targetCustomer || null,
      },
    }),
  };
}

export function presentAutonomousVentureBrief(candidate: CanonicalCandidateInput) {
  const advantage = buildAutonomousProductAdvantage(candidate);
  return presentVentureBrief({
    educated: activateAutonomousEducatedEstimates(candidate),
    advantage: advantage.view,
    attractiveness: "Worth validating from persisted autonomous evidence.",
    biggestRisk: candidate.risks[0] ?? "Unit economics are still modeled, not observed.",
  });
}

export function buildAutonomousVentureBuildPlan(input: {
  candidate: CanonicalCandidateInput | null;
  recommendedModel: string | null;
  buildReady?: boolean;
}) {
  const advantage = input.candidate ? buildAutonomousProductAdvantage(input.candidate) : { insufficient: true, view: null };
  const educated = input.candidate ? activateAutonomousEducatedEstimates(input.candidate) : emptyEducatedEconomicsModel();
  return buildFounderVentureBuildPlan({
    advantage: advantage.view,
    educated,
    buildReady: input.buildReady === true,
    recommendedModel: input.recommendedModel,
  });
}

export function assessAutonomousQualityReplacement(candidate: CanonicalCandidateInput) {
  return assessQualityReplacementNeeds({
    evidence: [
      ...candidate.demandEvidence,
      ...candidate.marketEvidence,
      ...candidate.competitionEvidence,
      ...candidate.monetizationEvidence,
    ].map((claim) => ({ claim, grounded: true })),
    sources: candidate.researchSources.map((url) => ({ url, title: null, domain: null, publisher: null })),
    seed: {
      ideaTitle: candidate.title,
      targetCustomer: candidate.targetCustomer,
      problem: candidate.problem,
    },
  });
}

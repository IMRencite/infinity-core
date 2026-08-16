import type { DiscoveryStrategyId } from "../constants";
import type { ProviderExtractionCandidate, ProviderExtractionOutput } from "../types";
import type { ResearchResult } from "@/lib/infinity/research/types";
import {
  buildCandidateDedupKey,
  buildMergeGroupKey,
} from "../dedupe/dedupe";
import type { OpportunityCandidateDraft } from "../types";

function mapResearchSources(research: ResearchResult) {
  return research.sources.map((source) => ({
    url: source.url,
    title: source.title,
    domain: source.domain,
  }));
}

function findingToEvidence(finding: ResearchResult["evidence"][number]) {
  return {
    signalType: finding.signalType,
    claim: finding.claim,
    observedSignal: finding.observedSignal,
    relevance: finding.relevance ?? "",
    sourceUrls: finding.sourceUrls,
    grounded: finding.grounded,
    limitations: finding.limitations,
  };
}

function inferScoringFromResearch(research: ResearchResult, candidate: ProviderExtractionCandidate) {
  const groundedCount = research.evidence.filter((item) => item.grounded).length;
  const evidenceConfidence = Math.min(1, groundedCount / Math.max(research.evidence.length, 1));
  return {
    demandStrength: candidate.scoringAssessment.demandStrength || evidenceConfidence * 0.7,
    marketGrowth: candidate.scoringAssessment.marketGrowth,
    competitionWeakness: candidate.scoringAssessment.competitionWeakness,
    monetizationPotential: candidate.scoringAssessment.monetizationPotential,
    buildability: candidate.scoringAssessment.buildability,
    automationPotential: candidate.scoringAssessment.automationPotential,
    distributionStrength: candidate.scoringAssessment.distributionStrength,
    capitalEfficiency: candidate.scoringAssessment.capitalEfficiency,
    speedToRevenue: candidate.scoringAssessment.speedToRevenue,
    evidenceConfidence: Math.max(candidate.scoringAssessment.evidenceConfidence, evidenceConfidence),
  };
}

export function mapExtractionToCandidateDrafts(
  extraction: ProviderExtractionOutput,
  research: ResearchResult,
): Array<OpportunityCandidateDraft & { scoringAssessment: ProviderExtractionCandidate["scoringAssessment"] }> {
  if (extraction.candidates.length > 0) {
    return extraction.candidates.map((candidate) => {
      const draft: OpportunityCandidateDraft & {
        scoringAssessment: ProviderExtractionCandidate["scoringAssessment"];
      } = {
        title: candidate.title,
        summary: candidate.summary,
        problem: candidate.problem,
        targetCustomer: candidate.targetCustomer,
        market: candidate.market,
        businessModelCandidates: candidate.businessModelCandidates.filter(Boolean) as never,
        revenueMechanismCandidates: candidate.revenueMechanismCandidates,
        demandEvidence: candidate.demandEvidence,
        marketEvidence: candidate.marketEvidence,
        competitionEvidence: candidate.competitionEvidence,
        monetizationEvidence: candidate.monetizationEvidence,
        distributionEvidence: candidate.distributionEvidence,
        buildabilityEvidence: candidate.buildabilityEvidence,
        risks: candidate.risks,
        unknowns: candidate.unknowns,
        researchSources: mapResearchSources(research),
        researchRunIds: [research.researchRunId],
        discoveryStrategies: [extraction.strategyId],
        dedupKey: buildCandidateDedupKey({
          title: candidate.title,
          problem: candidate.problem,
          market: candidate.market,
          businessModelCandidates: candidate.businessModelCandidates,
        }),
        mergeGroupKey: buildMergeGroupKey({
          problem: candidate.problem,
          market: candidate.market,
          businessModelCandidates: candidate.businessModelCandidates,
        }),
        scoringAssessment: inferScoringFromResearch(research, candidate),
      };
      return draft;
    });
  }

  return research.evidence.slice(0, 3).map((item) => ({
    title: item.claim.slice(0, 200),
    summary: research.summary,
    problem: item.claim,
    targetCustomer: "Small software-driven businesses and their customers",
    market: "United States online economy",
    businessModelCandidates: ["other"] as never,
    revenueMechanismCandidates: [],
    demandEvidence: [findingToEvidence(item)],
    marketEvidence: [],
    competitionEvidence: [],
    monetizationEvidence: [],
    distributionEvidence: [],
    buildabilityEvidence: [],
    risks: item.limitations,
    unknowns: research.limitations,
    researchSources: mapResearchSources(research),
    researchRunIds: [research.researchRunId],
    discoveryStrategies: [extraction.strategyId as DiscoveryStrategyId],
    dedupKey: buildCandidateDedupKey({
      title: item.claim,
      problem: item.claim,
      market: "United States online economy",
      businessModelCandidates: ["other"],
    }),
    mergeGroupKey: buildMergeGroupKey({
      problem: item.claim,
      market: "United States online economy",
      businessModelCandidates: ["other"],
    }),
    scoringAssessment: {
      demandStrength: item.grounded ? 0.7 : 0.4,
      marketGrowth: 0.5,
      competitionWeakness: 0.5,
      monetizationPotential: 0.5,
      buildability: 0.6,
      automationPotential: 0.6,
      distributionStrength: 0.5,
      capitalEfficiency: 0.6,
      speedToRevenue: 0.5,
      evidenceConfidence: item.grounded ? 0.75 : 0.35,
    },
  }));
}

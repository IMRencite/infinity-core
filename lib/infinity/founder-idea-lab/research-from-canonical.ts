import {
  isResearchProviderTransportFailure,
  type EvidenceSignalType,
} from "@/lib/infinity/research/constants";
import type { FailedResearchResult, NormalizedEvidenceItem, ResearchResult } from "@/lib/infinity/research/types";
import type { EvidenceDimension, EvidencePolarity } from "./evidence-coverage";
import type { MonetizationEvidenceLayers } from "./monetization-levels";
import { emptyMonetizationLayers } from "./monetization-levels";
import type { FounderResearchFinding, FounderResearchPacket } from "./research-packet";
import { parseKnownCompetitors } from "./research-seed";
import type { FounderIdeaSubmission } from "./types";

const SIGNAL_TO_DIMENSION: Partial<Record<EvidenceSignalType, EvidenceDimension>> = {
  search_demand: "demand",
  customer_complaints: "demand",
  purchase_intent: "demand",
  recurring_problem: "demand",
  pricing_pain: "pricing",
  growing_market: "market",
  underserved_niche: "market",
  regulatory_change: "market",
  technological_shift: "market",
  competitor_weakness: "competition",
  competitor_presence: "competition",
  distribution_opportunity: "distribution",
  workflow_inefficiency: "buildability",
  monetization_precedent: "monetization",
  capital_requirement: "capital_efficiency",
  time_to_revenue: "speed_to_revenue",
};

function polarityFromEvidence(item: NormalizedEvidenceItem): EvidencePolarity {
  const relevance = item.relevance.toLowerCase();
  if (relevance === "positive" || relevance === "negative" || relevance === "mixed" || relevance === "unknown") {
    return relevance;
  }
  return "unknown";
}

function dimensionFromEvidence(item: NormalizedEvidenceItem): EvidenceDimension | null {
  return SIGNAL_TO_DIMENSION[item.signalType] ?? null;
}

function inferMonetizationLayers(findings: FounderResearchFinding[]): MonetizationEvidenceLayers {
  const layers = emptyMonetizationLayers();
  const monetization = findings.filter((item) => item.dimension === "monetization" || item.dimension === "pricing");
  const groundedCategory = monetization.some((item) => item.grounded && item.polarity !== "unknown");
  const negative = monetization.some((item) => item.polarity === "negative" && item.grounded);
  const unitText = findings.some((item) => /cac|ltv|gross margin|unit economic/i.test(item.claim));
  const ideaWin = findings.some((item) => /this exact|this specific idea|this concept (has|won)/i.test(item.claim) && item.grounded);
  layers.category = negative ? "UNSUPPORTED" : groundedCategory ? "SUPPORTED" : "UNKNOWN";
  layers.ideaSpecific = ideaWin ? "SUPPORTED" : "UNKNOWN";
  layers.unitEconomics = unitText ? (negative ? "UNSUPPORTED" : "UNKNOWN") : "UNKNOWN";
  return layers;
}

export function founderResearchPacketFromResult(input: {
  result: ResearchResult;
  submission: FounderIdeaSubmission;
}): FounderResearchPacket {
  const findings: FounderResearchFinding[] = [];
  for (const item of input.result.evidence) {
    const dimension = dimensionFromEvidence(item);
    if (!dimension) continue;
    findings.push({
      findingId: item.findingId,
      evidenceId: item.evidenceId,
      dimension,
      claim: item.claim,
      polarity: polarityFromEvidence(item),
      grounded: item.grounded,
      confidence: item.confidence,
      sourceUrls: item.sourceUrls,
      limitations: item.limitations,
      verifiesFounderCompetitor: null,
    });
  }

  const leads = parseKnownCompetitors(input.submission.competitors);
  const verified = findings
    .filter((item) => item.dimension === "competition" && item.grounded)
    .flatMap((item) => leads.filter((name) => item.claim.toLowerCase().includes(name.toLowerCase())));

  return {
    researchRunId: input.result.researchRunId,
    candidateId: input.result.candidateId ?? input.submission.opportunityCandidateId ?? "",
    submissionId: input.submission.id,
    grounded: input.result.groundedStatus,
    failed: false,
    failureCode: null,
    summary: input.result.summary,
    findings,
    sources: input.result.sources.map((source) => ({
      url: source.url,
      title: source.title,
      domain: source.domain,
    })),
    competitorLeads: leads,
    verifiedCompetitors: [...new Set(verified)],
    monetizationLayers: inferMonetizationLayers(findings),
    requiresMoreResearch: input.result.requiresMoreResearch,
  };
}

export function founderResearchPacketFromFailure(input: {
  failure: FailedResearchResult;
  submission: FounderIdeaSubmission;
}): FounderResearchPacket {
  return {
    researchRunId: input.failure.researchRunId,
    candidateId: input.failure.candidateId ?? input.submission.opportunityCandidateId ?? "",
    submissionId: input.submission.id,
    grounded: false,
    failed: true,
    failureCode: isResearchProviderTransportFailure(input.failure.failureClassification)
      ? "PROVIDER_FAILED"
      : "RESEARCH_FAILED",
    summary: input.failure.message,
    findings: [],
    sources: [],
    competitorLeads: parseKnownCompetitors(input.submission.competitors),
    verifiedCompetitors: [],
    monetizationLayers: emptyMonetizationLayers(),
    requiresMoreResearch: true,
  };
}

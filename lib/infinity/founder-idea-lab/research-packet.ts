import type { EvidenceBundle } from "@/lib/infinity/opportunity-scanner/types";
import type { EvidenceCoverage, EvidenceDimension, EvidencePolarity } from "./evidence-coverage";
import {
  emptyDimension,
  emptyEvidenceCoverage,
  polarityFromSignals,
  summarizeCoverage,
} from "./evidence-coverage";
import type { MonetizationEvidenceLayers } from "./monetization-levels";
import { emptyMonetizationLayers } from "./monetization-levels";

export type FounderResearchFinding = {
  findingId: string;
  evidenceId?: string;
  dimension: EvidenceDimension;
  claim: string;
  polarity: EvidencePolarity;
  grounded: boolean;
  confidence: number | null;
  sourceUrls: string[];
  limitations: string[];
  verifiesFounderCompetitor?: string | null;
};

export type FounderResearchPacket = {
  researchRunId: string;
  candidateId: string;
  submissionId: string;
  grounded: boolean;
  failed: boolean;
  failureCode: "RESEARCH_FAILED" | "PROVIDER_FAILED" | null;
  summary: string;
  findings: FounderResearchFinding[];
  sources: Array<{ url: string; title: string | null; domain: string | null }>;
  competitorLeads: string[];
  verifiedCompetitors: string[];
  monetizationLayers: MonetizationEvidenceLayers;
  requiresMoreResearch: boolean;
};

export function coverageFromPacket(packet: FounderResearchPacket | null): EvidenceCoverage {
  if (!packet || packet.failed) return emptyEvidenceCoverage({ researched: false });
  const dimensions = Object.fromEntries(
    (["demand", "market", "competition", "monetization", "pricing", "distribution", "buildability", "capital_efficiency", "speed_to_revenue"] as EvidenceDimension[]).map(
      (dimension) => [dimension, emptyDimension(dimension)],
    ),
  ) as EvidenceCoverage["dimensions"];

  for (const finding of packet.findings) {
    const current = dimensions[finding.dimension];
    const refs = [...current.evidenceRefs, finding.findingId];
    const positive = finding.polarity === "positive" ? 1 : 0;
    const negative = finding.polarity === "negative" ? 1 : 0;
    const mixed = finding.polarity === "mixed" ? 1 : 0;
    const priorPositive = current.polarity === "positive" ? 1 : 0;
    const priorNegative = current.polarity === "negative" ? 1 : 0;
    const priorMixed = current.polarity === "mixed" ? 1 : 0;
    const polarity = polarityFromSignals({
      positive: positive + priorPositive,
      negative: negative + priorNegative,
      mixed: mixed + priorMixed,
    });
    const confidences = [current.confidence, finding.confidence].filter((item): item is number => item != null);
    dimensions[finding.dimension] = {
      dimension: finding.dimension,
      polarity,
      coverage: finding.grounded || current.coverage === "adequate" ? "adequate" : "partial",
      confidence: confidences.length ? confidences.reduce((sum, item) => sum + item, 0) / confidences.length : finding.confidence,
      evidenceRefs: refs,
      founderHypothesisOnly: false,
    };
  }

  return summarizeCoverage(dimensions, true);
}

export function evidenceBundlesFromPacket(packet: FounderResearchPacket): Partial<
  Record<
    "demandEvidence" | "marketEvidence" | "competitionEvidence" | "monetizationEvidence" | "distributionEvidence" | "buildabilityEvidence",
    EvidenceBundle[]
  >
> {
  const buckets: Record<string, EvidenceBundle[]> = {
    demandEvidence: [],
    marketEvidence: [],
    competitionEvidence: [],
    monetizationEvidence: [],
    distributionEvidence: [],
    buildabilityEvidence: [],
  };
  const map: Record<string, string> = {
    demand: "demandEvidence",
    market: "marketEvidence",
    competition: "competitionEvidence",
    monetization: "monetizationEvidence",
    pricing: "monetizationEvidence",
    distribution: "distributionEvidence",
    buildability: "buildabilityEvidence",
    capital_efficiency: "buildabilityEvidence",
    speed_to_revenue: "distributionEvidence",
  };
  for (const finding of packet.findings) {
    const key = map[finding.dimension];
    if (!key) continue;
    buckets[key].push({
      signalType: finding.dimension,
      claim: finding.claim,
      observedSignal: finding.grounded ? "grounded_research" : "ungrounded_finding",
      relevance: finding.polarity,
      sourceUrls: finding.sourceUrls,
      grounded: finding.grounded,
      limitations: finding.limitations,
    });
  }
  return buckets;
}

export function layersFromPacket(packet: FounderResearchPacket | null): MonetizationEvidenceLayers {
  return packet && !packet.failed ? packet.monetizationLayers : emptyMonetizationLayers();
}

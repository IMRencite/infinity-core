import type { FounderIdeaGrade, FounderIdeaSubmission } from "./types";
import type { FounderResearchPacket } from "./research-packet";
import type { ScoreProvenanceRow } from "./score-from-evidence";
import { infinityCmsLiveV5ReplayPacket } from "./integrity-fixtures";
import { newId } from "./store";
import type { FounderResearchFinding } from "./research-packet";

/**
 * READ-ONLY snapshot of Infinity CMS live decision-gate verification (ResearchRun 7f1fdbb3).
 * Do not treat these numbers as a live write. Used only to explain the verified HOLD.
 */
export const CMS_LIVE_V6_SNAPSHOT = {
  opportunityQuality: 65.46,
  selectionScore: 52.49,
  portfolioAdjustedScore: 52.49,
  validationScore: 59.85,
  monetizationScore: 54,
  decision: "HOLD" as const,
  status: "HELD" as const,
  readyForDecision: true,
  buildReady: false,
  validateThreshold: 58,
  rejectThreshold: 45,
};

function finding(
  dimension: FounderResearchFinding["dimension"],
  polarity: FounderResearchFinding["polarity"],
  claim: string,
  extra?: Partial<FounderResearchFinding>,
): FounderResearchFinding {
  return {
    findingId: extra?.findingId ?? newId(),
    dimension,
    claim,
    polarity,
    grounded: extra?.grounded ?? true,
    confidence: extra?.confidence ?? 0.7,
    sourceUrls: extra?.sourceUrls ?? ["https://example.com/comparable-pricing"],
    limitations: extra?.limitations ?? [],
    verifiesFounderCompetitor: extra?.verifiesFounderCompetitor ?? null,
  };
}

/** Mock grounded comparable evidence. Names are fixture data, not production constants. */
export function cmsComparableEconomicsPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = infinityCmsLiveV5ReplayPacket(submissionId, candidateId);
  return {
    ...base,
    competitorLeads: ["Northstar Sites", "LocalLaunch Web", "Hyperscale Cloud IaaS"],
    verifiedCompetitors: ["Northstar Sites"],
    findings: [
      ...base.findings,
      finding(
        "pricing",
        "positive",
        "Northstar Sites public packages list $149–$399 per month for SMB website platforms.",
        { verifiesFounderCompetitor: "Northstar Sites", sourceUrls: ["https://example.com/northstar-pricing"] },
      ),
      finding(
        "pricing",
        "positive",
        "LocalLaunch Web charges a $499–$1500 setup fee plus monthly retainers.",
        { verifiesFounderCompetitor: "LocalLaunch Web", sourceUrls: ["https://example.com/locallaunch-pricing"] },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "Comparable paid-search CAC for local website packages is reported at $700–$1800.",
        { sourceUrls: ["https://example.com/smb-cac-benchmark"] },
      ),
      finding(
        "monetization",
        "positive",
        "Category vendors report roughly 55%–70% gross margin on hosted website packages.",
        { sourceUrls: ["https://example.com/website-margins"] },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "SMB website-package monthly churn is described around 3%–6%.",
        { sourceUrls: ["https://example.com/website-churn"] },
      ),
      finding(
        "competition",
        "negative",
        "Hyperscale Cloud IaaS is an unrelated global cloud giant and is not an SMB CMS economic comparable.",
        { verifiesFounderCompetitor: "Hyperscale Cloud IaaS", sourceUrls: ["https://example.com/cloud-giant"] },
      ),
    ],
  };
}

const LIVE_PROVENANCE: ScoreProvenanceRow[] = [
  { dimension: "distributionStrength", rawInput: null, normalizedInput: null, weight: 0.09, weightedContribution: null, evidenceRefs: [], confidence: null, evidenceState: "unknown" },
  { dimension: "capitalEfficiency", rawInput: null, normalizedInput: null, weight: 0.07, weightedContribution: null, evidenceRefs: [], confidence: null, evidenceState: "unknown" },
  { dimension: "speedToRevenue", rawInput: null, normalizedInput: null, weight: 0.07, weightedContribution: null, evidenceRefs: [], confidence: null, evidenceState: "unknown" },
  { dimension: "evidenceConfidence", rawInput: null, normalizedInput: null, weight: 0.1, weightedContribution: null, evidenceRefs: [], confidence: null, evidenceState: "unknown" },
  { dimension: "demandStrength", rawInput: 0.74, normalizedInput: 74, weight: 0.20895522388059704, weightedContribution: 15.46, evidenceRefs: ["finding_1", "finding_3"], confidence: null, evidenceState: "positive" },
  { dimension: "marketGrowth", rawInput: 0.74, normalizedInput: 74, weight: 0.13432835820895522, weightedContribution: 9.94, evidenceRefs: ["finding_2", "finding_4"], confidence: null, evidenceState: "positive" },
  { dimension: "competitionWeakness", rawInput: 0.48, normalizedInput: 48, weight: 0.16417910447761194, weightedContribution: 7.88, evidenceRefs: ["finding_5", "finding_6", "finding_9"], confidence: null, evidenceState: "mixed" },
  { dimension: "monetizationPotential", rawInput: 0.52, normalizedInput: 52, weight: 0.19402985074626866, weightedContribution: 10.09, evidenceRefs: ["finding_7"], confidence: null, evidenceState: "mixed" },
  { dimension: "buildability", rawInput: 0.74, normalizedInput: 74, weight: 0.13432835820895522, weightedContribution: 9.94, evidenceRefs: ["finding_10"], confidence: null, evidenceState: "positive" },
  { dimension: "automationPotential", rawInput: 0.74, normalizedInput: 74, weight: 0.16417910447761194, weightedContribution: 12.15, evidenceRefs: ["finding_10"], confidence: null, evidenceState: "positive" },
];

export function cmsLiveV6ExplainabilityGrade(submission: FounderIdeaSubmission, packet: FounderResearchPacket): FounderIdeaGrade {
  return {
    opportunityScores: null,
    selectionScore: CMS_LIVE_V6_SNAPSHOT.selectionScore,
    validationScore: CMS_LIVE_V6_SNAPSHOT.validationScore,
    monetizationScore: CMS_LIVE_V6_SNAPSHOT.monetizationScore,
    fatalAssumptionRisk: 0.4,
    expectedRoi: null,
    estimatedCapitalRequired: null,
    buildReadiness: "HOLD",
    opportunityQuality: CMS_LIVE_V6_SNAPSHOT.opportunityQuality,
    evaluation: {
      decision: "HOLD",
      recommendedNextAction: "Monitor and rescan when evidence freshness expires.",
      queueReason: "Unit economics unknown; LTV/CAC is not zero.",
      selectionScore: CMS_LIVE_V6_SNAPSHOT.selectionScore,
      portfolioAdjustedScore: CMS_LIVE_V6_SNAPSHOT.portfolioAdjustedScore,
      validationScore: CMS_LIVE_V6_SNAPSHOT.validationScore,
      selectionScoreInputs: {},
      blockingAssumptions: ["Demand conversion and willingness to pay remain unproven."],
    } as FounderIdeaGrade["evaluation"],
    scoreIntegrity: "EVIDENCE_GROUNDED",
    readyForDecision: true,
    buildReady: false,
    researchRunId: packet.researchRunId,
    monetizationRunId: null,
    provenance: LIVE_PROVENANCE,
    coverage: {
      researched: true,
      unknownCount: 3,
      groundedCount: 6,
      materialCoverageSufficient: true,
      dimensions: {
        demand: { dimension: "demand", polarity: "positive", coverage: "adequate", confidence: null, evidenceRefs: ["finding_1"], founderHypothesisOnly: false },
        market: { dimension: "market", polarity: "positive", coverage: "adequate", confidence: null, evidenceRefs: ["finding_2"], founderHypothesisOnly: false },
        competition: { dimension: "competition", polarity: "mixed", coverage: "adequate", confidence: null, evidenceRefs: ["finding_5"], founderHypothesisOnly: false },
        pricing: { dimension: "pricing", polarity: "positive", coverage: "adequate", confidence: null, evidenceRefs: [], founderHypothesisOnly: false },
        monetization: { dimension: "monetization", polarity: "positive", coverage: "adequate", confidence: null, evidenceRefs: ["finding_7"], founderHypothesisOnly: false },
        distribution: { dimension: "distribution", polarity: "unknown", coverage: "none", confidence: null, evidenceRefs: [], founderHypothesisOnly: false },
        buildability: { dimension: "buildability", polarity: "positive", coverage: "partial", confidence: null, evidenceRefs: ["finding_10"], founderHypothesisOnly: false },
        capital_efficiency: { dimension: "capital_efficiency", polarity: "unknown", coverage: "none", confidence: null, evidenceRefs: [], founderHypothesisOnly: false },
        speed_to_revenue: { dimension: "speed_to_revenue", polarity: "unknown", coverage: "none", confidence: null, evidenceRefs: [], founderHypothesisOnly: false },
      },
    },
    monetizationLayers: { category: "SUPPORTED", ideaSpecific: "UNKNOWN", unitEconomics: "UNKNOWN" },
  };
}

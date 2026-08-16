import type {
  BusinessModelCandidateType,
  DiscoveryRunStatus,
  DiscoveryStrategyId,
} from "./constants";

export type EvidenceBundle = {
  signalType: string;
  claim: string;
  observedSignal: string;
  relevance: string;
  sourceUrls: string[];
  grounded: boolean;
  limitations: string[];
};

export type OpportunityCandidateDraft = {
  title: string;
  summary: string;
  problem: string;
  targetCustomer: string;
  market: string;
  businessModelCandidates: BusinessModelCandidateType[];
  revenueMechanismCandidates: string[];
  demandEvidence: EvidenceBundle[];
  marketEvidence: EvidenceBundle[];
  competitionEvidence: EvidenceBundle[];
  monetizationEvidence: EvidenceBundle[];
  distributionEvidence: EvidenceBundle[];
  buildabilityEvidence: EvidenceBundle[];
  risks: string[];
  unknowns: string[];
  researchSources: Array<{
    url: string;
    title: string | null;
    domain: string | null;
  }>;
  researchRunIds: string[];
  discoveryStrategies: DiscoveryStrategyId[];
  dedupKey: string;
  mergeGroupKey: string | null;
};

export type ScoringAssessmentInput = {
  demandStrength: number;
  marketGrowth: number;
  competitionWeakness: number;
  monetizationPotential: number;
  buildability: number;
  automationPotential: number;
  distributionStrength: number;
  capitalEfficiency: number;
  speedToRevenue: number;
  evidenceConfidence: number;
};

export type NormalizedCandidateScores = {
  scoringVersion: string;
  demandScore: number;
  marketGrowthScore: number;
  competitionOpportunityScore: number;
  monetizationPotentialScore: number;
  buildabilityScore: number;
  automationScore: number;
  distributionScore: number;
  capitalEfficiencyScore: number;
  speedToRevenueScore: number;
  evidenceConfidenceScore: number;
  opportunityScore: number;
  weightedBreakdown: Record<string, number>;
  scoringInputs: ScoringAssessmentInput;
};

export type OpportunityCandidate = OpportunityCandidateDraft & {
  id: string;
  organizationId: string;
  discoveryRunId: string;
  opportunityScore: number | null;
  rankPosition: number | null;
  scores: NormalizedCandidateScores | null;
  createdAt: string;
  updatedAt: string;
};

export type RunOpportunityScannerInput = {
  organizationId: string;
  idempotencyKey: string;
  strategies?: DiscoveryStrategyId[];
  searchScope?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  maxResearchCalls?: number;
  runPurpose?: string;
};

export type ScannerResearchTask = {
  strategyId: DiscoveryStrategyId;
  researchObjective: string;
  idempotencyKey: string;
};

export type ScannerCostSummary = {
  researchCallCount: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  groundingUsage: {
    searchQueryCount: number;
    groundingChunkCount: number;
  };
  estimatedCostUsd: number | null;
  costUncertainty: string | null;
};

export type ScannerReport = {
  scannerVersion: string;
  scoringVersion: string;
  strategiesExecuted: DiscoveryStrategyId[];
  researchRunIds: string[];
  candidatesDiscovered: number;
  candidatesMerged: number;
  candidatesPersisted: number;
  topCandidates: Array<{
    id: string;
    title: string;
    opportunityScore: number;
    rankPosition: number;
  }>;
  costSummary: ScannerCostSummary;
  completedAt: string;
};

export type RunOpportunityScannerOutput =
  | { ok: true; discoveryRunId: string; report: ScannerReport; candidates: OpportunityCandidate[] }
  | {
      ok: false;
      discoveryRunId: string;
      status: DiscoveryRunStatus;
      failureClassification: string;
      message: string;
    };

export type ProviderExtractionCandidate = {
  candidateId: string;
  title: string;
  summary: string;
  problem: string;
  targetCustomer: string;
  market: string;
  businessModelCandidates: string[];
  revenueMechanismCandidates: string[];
  demandEvidence: EvidenceBundle[];
  marketEvidence: EvidenceBundle[];
  competitionEvidence: EvidenceBundle[];
  monetizationEvidence: EvidenceBundle[];
  distributionEvidence: EvidenceBundle[];
  buildabilityEvidence: EvidenceBundle[];
  risks: string[];
  unknowns: string[];
  scoringAssessment: ScoringAssessmentInput;
};

export type ProviderExtractionOutput = {
  schemaVersion: string;
  strategyId: DiscoveryStrategyId;
  candidates: ProviderExtractionCandidate[];
  limitations: string[];
};

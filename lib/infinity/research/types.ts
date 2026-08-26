import type {
  EvidenceSignalType,
  EvidenceType,
  ResearchFailureClassification,
  ResearchProviderId,
  ResearchRunStatus,
} from "./constants";

export type ResearchTokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type GroundingUsage = {
  webSearchQueries: string[];
  searchQueryCount: number;
  groundingChunkCount: number;
  groundingSupportCount: number;
  /** When true, Google Search grounding metadata was present on the response. */
  groundingInvoked: boolean;
  /** Billing uncertainty for search grounding when provider does not expose exact cost. */
  searchCostKnown: boolean;
};

export type NormalizedSource = {
  sourceId: string;
  url: string;
  canonicalUrl: string;
  title: string | null;
  domain: string | null;
  retrievedAt: string;
  providerChunkIndex: number | null;
};

export type NormalizedEvidenceItem = {
  evidenceId: string;
  findingId: string;
  claim: string;
  observedSignal: string;
  signalType: EvidenceSignalType;
  evidenceType: EvidenceType;
  grounded: boolean;
  sourceIds: string[];
  sourceUrls: string[];
  relevance: string;
  confidence: number | null;
  sourceDate: string | null;
  limitations: string[];
  providerConfidence: number | null;
};

export type ResearchFinding = {
  findingId: string;
  summary: string;
  signalType: EvidenceSignalType;
  evidenceIds: string[];
};

export type ProviderResearchStructuredOutput = {
  schemaVersion: "grounded_research_v1";
  summary: string;
  findings: Array<{
    findingId: string;
    claim: string;
    signalType: EvidenceSignalType;
    observedSignal: string;
    relevance: string;
    confidence: number | null;
    grounded: boolean;
    inference: boolean;
    sourceUrls: string[];
    limitations: string[];
  }>;
  limitations: string[];
  requiresMoreResearch: boolean;
};

export type ResearchResult = {
  researchRunId: string;
  organizationId: string;
  candidateId?: string | null;
  missionId: string | null;
  providerId: ResearchProviderId;
  modelId: string;
  researchObjective: string;
  inputHash: string;
  generatedAt: string;
  summary: string;
  findings: ResearchFinding[];
  evidence: NormalizedEvidenceItem[];
  sources: NormalizedSource[];
  limitations: string[];
  requiresMoreResearch: boolean;
  groundedStatus: boolean;
  validationStatus: "validated";
  tokenUsage: ResearchTokenUsage;
  groundingUsage: GroundingUsage;
  estimatedCostUsd: number | null;
  costUncertainty: string | null;
  latencyMs: number;
  requestId: string | null;
  retryMetadata: {
    attemptCount: number;
    maxAttempts: number;
    retried: boolean;
  };
  status: "completed";
  provenance: {
    schemaVersion: string;
    promptVersion: string;
    rawProviderResponseStored: boolean;
    normalizationApplied: true;
    purpose?: string;
  };
  coverage?: {
    coveredDimensions: string[];
    partialDimensions: string[];
    unknownDimensions: string[];
    researchableGaps: string[];
    directEvidenceCount: number;
    derivedEvidenceCount: number;
    sourceCount: number;
    materialCoverageSufficient: boolean;
  };
  callTelemetry?: {
    initialResearchCallCount: number;
    transportRetryCount: number;
    gapFillCallCount: number;
    totalProviderCalls: number;
  };
  stopReason?: string;
  issuedQueries?: string[];
  completedAt: string;
};

export type FailedResearchResult = {
  researchRunId: string;
  organizationId: string;
  candidateId?: string | null;
  researchObjective: string;
  providerId: ResearchProviderId | null;
  modelId: string | null;
  inputHash: string;
  status: ResearchRunStatus;
  failureClassification: ResearchFailureClassification;
  message: string;
  tokenUsage: ResearchTokenUsage | null;
  estimatedCostUsd: number | null;
  latencyMs: number | null;
  requestId: string | null;
  failedAt: string;
};

export type RunGroundedResearchInput = {
  organizationId: string;
  /** Canonical OpportunityCandidate.id when this run is candidate-scoped. Optional for independent research. */
  candidateId?: string | null;
  missionId?: string | null;
  researchObjective: string;
  idempotencyKey: string;
  providerId?: ResearchProviderId;
  modelId?: string;
  runPurpose?: string;
  requireSourceBackedFindings?: boolean;
  coverageSeed?: {
    ideaTitle?: string | null;
    ideaDescription?: string | null;
    targetCustomer?: string | null;
    problem?: string | null;
    businessModelHypothesis?: string | null;
    pricingHypothesis?: string | null;
    competitorLeads?: string[];
  };
};

export type RunGroundedResearchOutput =
  | { ok: true; result: ResearchResult }
  | { ok: false; failure: FailedResearchResult };

export type ResearchProviderCallResult = {
  providerId: ResearchProviderId;
  modelId: string;
  requestId: string | null;
  rawText: string;
  rawProviderResponse: Record<string, unknown>;
  groundingMetadata: Record<string, unknown> | null;
  tokenUsage: ResearchTokenUsage;
  groundingUsage: GroundingUsage;
  estimatedCostUsd: number | null;
  costUncertainty: string | null;
  latencyMs: number;
  retryMetadata: {
    attemptCount: number;
    maxAttempts: number;
    retried: boolean;
  };
};

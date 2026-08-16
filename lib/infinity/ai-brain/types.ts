import type {
  AiBrainActionType,
  AiBrainFailureClassification,
  AiBrainMissionPriority,
  AiBrainMissionType,
  AiBrainObjectiveType,
  AiBrainProviderId,
  AiBrainRiskLevel,
  AiBrainRunStatus,
} from "./constants";

export type AiBrainCandidateAction = {
  actionId: string;
  actionType: AiBrainActionType;
  description: string;
  reason: string;
  expectedValue: string;
  estimatedCost: number;
  riskLevel: AiBrainRiskLevel;
  confidence: number;
  dependencies: string[];
  requiredCapabilities: string[];
};

export type AiBrainMissionProposal = {
  missionType: AiBrainMissionType;
  missionTitle: string;
  missionObjective: string;
  priority: AiBrainMissionPriority;
  successCriteria: string[];
  constraints: string[];
  proposedSteps: string[];
};

export type AiBrainStructuredOutput = {
  schemaVersion: "ai_brain_reasoning_v1";
  objective: string;
  objectiveType: AiBrainObjectiveType;
  summary: string;
  observations: string[];
  assumptions: string[];
  unknowns: string[];
  candidateActions: AiBrainCandidateAction[];
  recommendedAction: string;
  alternativeActions: string[];
  shouldAct: boolean;
  requiresMoreInformation: boolean;
  missionProposal: AiBrainMissionProposal;
};

export type AiBrainTokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AiBrainRetryMetadata = {
  attemptCount: number;
  maxAttempts: number;
  retried: boolean;
};

export type AiBrainProviderCallResult = {
  providerId: AiBrainProviderId;
  modelId: string;
  requestId: string | null;
  rawText: string;
  tokenUsage: AiBrainTokenUsage;
  estimatedCostUsd: number;
  latencyMs: number;
  retryMetadata: AiBrainRetryMetadata;
};

export type CanonicalMissionDraft = {
  title: string;
  description: string;
  objectives: Array<{ key: string; description: string }>;
  constraints: Record<string, unknown>;
  status: "draft";
  activate: false;
  provenance: {
    reasoningRunId: string;
    missionType: AiBrainMissionType;
    missionProposalSource: "ai_brain_v1";
    autoExecute: false;
  };
};

export type ReasoningResult = {
  reasoningRunId: string;
  organizationId: string;
  missionId: string | null;
  objective: string;
  objectiveType: AiBrainObjectiveType;
  providerId: AiBrainProviderId;
  modelId: string;
  inputHash: string;
  structuredOutput: AiBrainStructuredOutput;
  validationStatus: "validated";
  tokenUsage: AiBrainTokenUsage;
  estimatedCostUsd: number;
  latencyMs: number;
  requestId: string | null;
  retryMetadata: AiBrainRetryMetadata;
  status: "completed";
  canonicalMissionDraft: CanonicalMissionDraft;
  completedAt: string;
};

export type FailedReasoningResult = {
  reasoningRunId: string;
  organizationId: string;
  objective: string;
  providerId: AiBrainProviderId | null;
  modelId: string | null;
  inputHash: string;
  status: AiBrainRunStatus;
  failureClassification: AiBrainFailureClassification;
  message: string;
  tokenUsage: AiBrainTokenUsage | null;
  estimatedCostUsd: number | null;
  latencyMs: number | null;
  requestId: string | null;
  retryMetadata: AiBrainRetryMetadata | null;
  failedAt: string;
};

export type RunAiBrainReasoningInput = {
  organizationId: string;
  missionId?: string | null;
  objective: string;
  objectiveType?: AiBrainObjectiveType;
  idempotencyKey: string;
  providerId?: AiBrainProviderId;
  modelId?: string;
};

export type RunAiBrainReasoningOutput =
  | { ok: true; result: ReasoningResult }
  | { ok: false; failure: FailedReasoningResult };

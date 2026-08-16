import type { BrainRole, ExecutionStrategy, ModelCapability, TaskComplexityLevel } from "./constants";

export type ModelCapabilityProfile = {
  reasoning: number;
  coding: number;
  architecture: number;
  researchGrounding: number;
  longContext: number;
  creativeGeneration: number;
  structuredOutput: number;
  reviewCriticism: number;
  debugging: number;
};

export type RegisteredModel = {
  provider: string;
  modelId: string;
  displayName: string;
  capabilities: ModelCapabilityProfile;
  estimatedInputCostPer1k: number;
  estimatedOutputCostPer1k: number;
  contextLimit: number;
  latencyTier: "fast" | "standard" | "slow";
  availability: "available" | "unavailable" | "degraded";
  historicalSuccessRate?: number;
};

export type TaskCharacteristics = {
  taskType: string;
  complexity: TaskComplexityLevel;
  uncertainty: number;
  economicImportance: number;
  implementationRisk: number;
  reversibility: number;
  researchRequired: boolean;
  codingRequired: boolean;
  architectureRequired: boolean;
  expectedTokenCost: number;
  expectedExternalCost: number;
};

export type RoutingDecision = {
  strategy: ExecutionStrategy;
  roles: BrainRole[];
  primaryModel: RegisteredModel;
  specialistModels: RegisteredModel[];
  criticModel: RegisteredModel | null;
  reviewerModel: RegisteredModel | null;
  synthesizerModel: RegisteredModel | null;
  rationale: string[];
  estimatedCostUsd: number;
};

export type BrainExecutionInput = {
  taskType: string;
  prompt: string;
  context?: Record<string, unknown>;
  requiredCapabilities?: ModelCapability[];
  constraints?: string[];
};

export type BrainExecutionOutput = {
  provider: string;
  modelId: string;
  role: BrainRole;
  content: string;
  structured?: Record<string, unknown>;
  confidence: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  success: boolean;
  error?: string;
};

export type BrainProvider = {
  provider: string;
  isConfigured: () => boolean;
  execute: (input: {
    modelId: string;
    role: BrainRole;
    taskType: string;
    prompt: string;
    context?: Record<string, unknown>;
  }) => Promise<BrainExecutionOutput>;
};

export type SynthesisInput = {
  taskType: string;
  primary: BrainExecutionOutput;
  specialists: BrainExecutionOutput[];
  critics: BrainExecutionOutput[];
  reviewers: BrainExecutionOutput[];
  constraints: string[];
  taskCharacteristics: TaskCharacteristics;
};

export type SynthesisResult = {
  recommendation: string;
  structured: Record<string, unknown>;
  confidence: number;
  disagreements: Array<{
    topic: string;
    positions: Array<{ provider: string; modelId: string; role: BrainRole; position: string; confidence: number }>;
    resolution: string;
  }>;
  provenance: Array<{ provider: string; modelId: string; role: BrainRole; weight: number }>;
  estimatedTotalCostUsd: number;
};

export type OrchestrationSessionResult = {
  sessionId: string;
  strategy: ExecutionStrategy;
  taskCharacteristics: TaskCharacteristics;
  executions: BrainExecutionOutput[];
  synthesis: SynthesisResult | null;
  disagreements: SynthesisResult["disagreements"];
  totalCostUsd: number;
  status: "completed" | "failed" | "cost_blocked";
};

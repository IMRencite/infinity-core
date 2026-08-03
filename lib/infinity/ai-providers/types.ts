import type { AiProviderId } from "./constants";
import type { StructuredAdvisoryPayload } from "./structured-output";

export type ProviderHealthStatus = {
  ok: boolean;
  providerId: AiProviderId;
  message: string;
  configured: boolean;
  executable: boolean;
};

export type TokenEstimate = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type CostEstimate = {
  currency: string;
  inputCost: number | null;
  outputCost: number | null;
  totalCost: number | null;
};

export type ProviderExecuteRequest = {
  correlationId: string;
  modelId: string;
  prompt: string;
  systemPrompt?: string;
  timeoutMs?: number;
  requireJson: true;
};

export type ProviderExecuteResult = {
  providerId: AiProviderId;
  modelId: string;
  rawText: string;
  structured: StructuredAdvisoryPayload;
  latencyMs: number;
  tokenEstimate: TokenEstimate;
  costEstimate: CostEstimate;
  retries: number;
};

export type AiProviderAdapter = {
  readonly id: AiProviderId;
  readonly name: string;
  readonly version: string;

  initialize(): Promise<{ ok: boolean; message: string }>;
  health(): Promise<ProviderHealthStatus>;
  listModels(): Promise<Array<{ id: string; displayName: string }>>;
  estimateTokens(input: { prompt: string; systemPrompt?: string }): TokenEstimate;
  estimateCost(input: { modelId: string; tokenEstimate: TokenEstimate }): CostEstimate;
  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResult>;
  supportsTools(): boolean;
  supportsVision(): boolean;
  supportsJSON(): boolean;
  supportsReasoning(): boolean;
  shutdown(): Promise<void>;
};

export type ProviderExecutionTelemetry = {
  id: string;
  correlationId: string;
  providerId: AiProviderId;
  modelId: string;
  latencyMs: number;
  tokenEstimate: TokenEstimate;
  costEstimate: CostEstimate;
  retries: number;
  errorCode: string | null;
  errorMessage: string | null;
  occurredAt: string;
};

export type ExecutiveReviewEnvelope = {
  structured: StructuredAdvisoryPayload;
  executiveAuthoritative: true;
  accepted: false;
  reviewRequired: true;
  message: string;
};

import type { AiBrainProviderId } from "./constants";
import type { AiBrainProviderCallResult } from "./types";

export type StructuredReasoningProviderRequest = {
  correlationId: string;
  systemInstructions: string;
  userInput: string;
  modelId: string;
  schemaName: string;
  responseSchema: Record<string, unknown>;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
};

export type StructuredReasoningProvider = {
  readonly providerId: AiBrainProviderId;
  readonly isSimulation: boolean;
  executeStructuredReasoning(
    request: StructuredReasoningProviderRequest,
  ): Promise<AiBrainProviderCallResult>;
};

export type ProviderRegistry = {
  resolve(providerId: AiBrainProviderId): StructuredReasoningProvider;
};

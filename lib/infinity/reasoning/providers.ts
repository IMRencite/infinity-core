import { KNOWN_PROVIDER_IDS } from "./constants";
import type { ReasoningModelMetadata } from "./types";

export type ReasoningProviderId = (typeof KNOWN_PROVIDER_IDS)[number];

export type ProviderCostMetrics = {
  currency: string;
  inputCostPer1kTokens: number | null;
  outputCostPer1kTokens: number | null;
  notes?: string;
};

export type ReasoningProviderCapabilities = {
  contextWindowTokens: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsJsonMode: boolean;
  supportsFunctionCalling: boolean;
  supportsStreaming: boolean;
  supportsReasoningMode: boolean;
};

/** Future provider adapter contract — no implementations in Foundation v1. */
export type ReasoningProvider = {
  readonly id: ReasoningProviderId;
  readonly name: string;
  readonly version: string;
  readonly capabilities: ReasoningProviderCapabilities;
  readonly costMetrics: ProviderCostMetrics;
  /** Returns metadata only; must not perform network I/O in Foundation v1. */
  listModels(): ReasoningModelMetadata[];
};

export type ReasoningProviderRegistration = {
  provider: ReasoningProvider;
  registeredAt: string;
};

export function describeProviderCapabilities(
  capabilities: ReasoningProviderCapabilities,
): string[] {
  const flags: string[] = [];
  if (capabilities.supportsTools) flags.push("tools");
  if (capabilities.supportsImages) flags.push("images");
  if (capabilities.supportsJsonMode) flags.push("json_mode");
  if (capabilities.supportsFunctionCalling) flags.push("function_calling");
  if (capabilities.supportsStreaming) flags.push("streaming");
  if (capabilities.supportsReasoningMode) flags.push("reasoning_mode");
  return flags;
}

import type { ResearchConfig } from "./config";
import { ResearchError } from "./failures";

export type ResearchCostPolicy = {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  maxRetries: number;
  maxSearchQueries: number;
  timeoutMs: number;
};

export function loadResearchCostPolicy(config: ResearchConfig): ResearchCostPolicy {
  return {
    maxInputTokens: config.maxInputTokens,
    maxOutputTokens: config.maxOutputTokens,
    maxEstimatedCostUsd: config.maxEstimatedCostUsd,
    maxRetries: config.maxRetries,
    maxSearchQueries: config.maxSearchQueries,
    timeoutMs: config.timeoutMs,
  };
}

export function estimateInputTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function evaluatePreCallResearchPolicy(input: {
  policy: ResearchCostPolicy;
  estimatedInputTokens: number;
  configuredOutputTokens: number;
  providerEnabled: boolean;
  modelAllowed: boolean;
  estimatedCostUsd: number | null;
}): { allowed: boolean; reason: string | null } {
  if (!input.providerEnabled) {
    return { allowed: false, reason: "Research provider is disabled." };
  }
  if (!input.modelAllowed) {
    return { allowed: false, reason: "Configured research model is not allowed." };
  }
  if (input.estimatedInputTokens > input.policy.maxInputTokens) {
    return { allowed: false, reason: "Estimated input tokens exceed research policy limit." };
  }
  if (input.configuredOutputTokens > input.policy.maxOutputTokens) {
    return { allowed: false, reason: "Configured output tokens exceed research policy limit." };
  }
  if (
    input.estimatedCostUsd !== null &&
    input.estimatedCostUsd > input.policy.maxEstimatedCostUsd
  ) {
    return { allowed: false, reason: "Estimated request cost exceeds research policy limit." };
  }
  return { allowed: true, reason: null };
}

export function assertPreCallResearchPolicy(
  input: Parameters<typeof evaluatePreCallResearchPolicy>[0],
): void {
  const decision = evaluatePreCallResearchPolicy(input);
  if (!decision.allowed) {
    throw new ResearchError(decision.reason ?? "Budget rejection.", "budget_exceeded");
  }
}

export function isResearchModelAllowed(modelId: string): boolean {
  return Boolean(modelId && modelId.trim().length > 0 && modelId.length <= 128);
}

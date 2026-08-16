import type { AiBrainConfig } from "./config";
import { AiBrainError } from "./failures";

export type AiBrainCostPolicy = {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  maxRetries: number;
};

export function loadAiBrainCostPolicy(config: AiBrainConfig): AiBrainCostPolicy {
  return {
    maxInputTokens: config.maxInputTokens,
    maxOutputTokens: config.maxOutputTokens,
    maxEstimatedCostUsd: config.maxEstimatedCostUsd,
    maxRetries: config.maxRetries,
  };
}

export function estimateInputTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 2;
  const outputCost = (outputTokens / 1_000_000) * 8;
  return inputCost + outputCost;
}

export function evaluatePreCallCostPolicy(input: {
  policy: AiBrainCostPolicy;
  estimatedInputTokens: number;
  configuredOutputTokens: number;
  providerEnabled: boolean;
  modelAllowed: boolean;
}): { allowed: boolean; reason: string | null } {
  if (!input.providerEnabled) {
    return { allowed: false, reason: "AI Brain provider is disabled." };
  }

  if (!input.modelAllowed) {
    return { allowed: false, reason: "Configured model is not allowed." };
  }

  if (input.estimatedInputTokens > input.policy.maxInputTokens) {
    return { allowed: false, reason: "Estimated input tokens exceed policy limit." };
  }

  if (input.configuredOutputTokens > input.policy.maxOutputTokens) {
    return { allowed: false, reason: "Configured output tokens exceed policy limit." };
  }

  const estimatedCost = estimateCostUsd(
    input.estimatedInputTokens,
    input.configuredOutputTokens,
  );

  if (estimatedCost > input.policy.maxEstimatedCostUsd) {
    return { allowed: false, reason: "Estimated request cost exceeds policy limit." };
  }

  return { allowed: true, reason: null };
}

export function assertPreCallCostPolicy(
  input: Parameters<typeof evaluatePreCallCostPolicy>[0],
): void {
  const decision = evaluatePreCallCostPolicy(input);
  if (!decision.allowed) {
    throw new AiBrainError(decision.reason ?? "Budget rejection.", "budget_rejection");
  }
}

export function isModelAllowed(modelId: string): boolean {
  return Boolean(modelId && modelId.trim().length > 0 && modelId.length <= 128);
}

import type { GovernedReasoningMode } from "./constants";

export type ReasoningCostPolicy = {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  maxRetries: number;
  maxSessionsPerRuntimeStage: number;
};

export function loadReasoningCostPolicy(env: NodeJS.ProcessEnv = process.env): ReasoningCostPolicy {
  return {
    maxInputTokens: Number(env.AI_REASONING_MAX_INPUT_TOKENS ?? 16_000),
    maxOutputTokens: Number(env.AI_REASONING_MAX_OUTPUT_TOKENS ?? env.OPENAI_MAX_OUTPUT_TOKENS ?? 4_096),
    maxEstimatedCostUsd: Number(env.AI_REASONING_MAX_ESTIMATED_COST_USD ?? 1),
    maxRetries: Number(env.OPENAI_MAX_RETRIES ?? 2),
    maxSessionsPerRuntimeStage: Number(env.AI_REASONING_MAX_SESSIONS_PER_STAGE ?? 1),
  };
}

export function estimateRequestTokens(inputText: string): number {
  return Math.max(1, Math.ceil(inputText.length / 4));
}

export function estimateRequestCostUsd(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 2;
  const outputCost = (outputTokens / 1_000_000) * 8;
  return inputCost + outputCost;
}

export function evaluateCostPolicy(input: {
  policy: ReasoningCostPolicy;
  estimatedInputTokens: number;
  configuredOutputTokens: number;
  mode: GovernedReasoningMode;
}): { allowed: boolean; reason: string | null } {
  if (input.mode === "disabled") {
    return { allowed: false, reason: "Reasoning mode is disabled." };
  }

  if (input.estimatedInputTokens > input.policy.maxInputTokens) {
    return { allowed: false, reason: "Estimated input tokens exceed policy limit." };
  }

  if (input.configuredOutputTokens > input.policy.maxOutputTokens) {
    return { allowed: false, reason: "Configured output tokens exceed policy limit." };
  }

  const estimatedCost = estimateRequestCostUsd(
    input.estimatedInputTokens,
    input.configuredOutputTokens,
  );

  if (estimatedCost > input.policy.maxEstimatedCostUsd) {
    return { allowed: false, reason: "Estimated request cost exceeds policy limit." };
  }

  return { allowed: true, reason: null };
}

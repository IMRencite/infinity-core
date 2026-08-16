import type { MonetizationEngineConfig } from "./config";
import type { MonetizationCostSummary } from "./types";

export function assertMonetizationResearchBudget(input: {
  config: MonetizationEngineConfig;
  plannedResearchCalls: number;
  accumulatedEstimatedCostUsd: number;
}): void {
  if (input.plannedResearchCalls > input.config.maxResearchCallsPerRun) {
    throw new Error(
      `Monetization research call limit exceeded (${input.plannedResearchCalls}/${input.config.maxResearchCallsPerRun}).`,
    );
  }

  if (
    input.accumulatedEstimatedCostUsd > input.config.maxEstimatedCostUsd &&
    input.accumulatedEstimatedCostUsd > 0
  ) {
    throw new Error(
      `Monetization estimated cost limit exceeded (${input.accumulatedEstimatedCostUsd}/${input.config.maxEstimatedCostUsd}).`,
    );
  }
}

export function mergeCostSummaries(
  current: MonetizationCostSummary,
  next: {
    tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
    groundingUsage: { searchQueryCount: number; groundingChunkCount: number };
    estimatedCostUsd: number | null;
    costUncertainty: string | null;
  },
): MonetizationCostSummary {
  return {
    researchCallCount: current.researchCallCount + 1,
    tokenUsage: {
      inputTokens: current.tokenUsage.inputTokens + next.tokenUsage.inputTokens,
      outputTokens: current.tokenUsage.outputTokens + next.tokenUsage.outputTokens,
      totalTokens: current.tokenUsage.totalTokens + next.tokenUsage.totalTokens,
    },
    groundingUsage: {
      searchQueryCount:
        current.groundingUsage.searchQueryCount + next.groundingUsage.searchQueryCount,
      groundingChunkCount:
        current.groundingUsage.groundingChunkCount + next.groundingUsage.groundingChunkCount,
    },
    estimatedCostUsd:
      current.estimatedCostUsd === null && next.estimatedCostUsd === null
        ? null
        : (current.estimatedCostUsd ?? 0) + (next.estimatedCostUsd ?? 0),
    costUncertainty: next.costUncertainty ?? current.costUncertainty,
  };
}

export function emptyCostSummary(): MonetizationCostSummary {
  return {
    researchCallCount: 0,
    tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    groundingUsage: { searchQueryCount: 0, groundingChunkCount: 0 },
    estimatedCostUsd: null,
    costUncertainty: null,
  };
}

import type { OpportunityScannerConfig } from "./config";
import type { ScannerCostSummary } from "./types";

export function assertScannerResearchBudget(input: {
  config: OpportunityScannerConfig;
  plannedResearchCalls: number;
  accumulatedEstimatedCostUsd: number;
}): void {
  if (input.plannedResearchCalls > input.config.maxResearchCallsPerRun) {
    throw new Error(
      `Scanner research call limit exceeded (${input.plannedResearchCalls}/${input.config.maxResearchCallsPerRun}).`,
    );
  }

  if (
    input.accumulatedEstimatedCostUsd > input.config.maxEstimatedCostUsd &&
    input.accumulatedEstimatedCostUsd > 0
  ) {
    throw new Error(
      `Scanner estimated cost limit exceeded (${input.accumulatedEstimatedCostUsd}/${input.config.maxEstimatedCostUsd}).`,
    );
  }
}

export function mergeCostSummaryBlocks(
  current: ScannerCostSummary,
  delta: ScannerCostSummary,
): ScannerCostSummary {
  return {
    researchCallCount: current.researchCallCount + delta.researchCallCount,
    tokenUsage: {
      inputTokens: current.tokenUsage.inputTokens + delta.tokenUsage.inputTokens,
      outputTokens: current.tokenUsage.outputTokens + delta.tokenUsage.outputTokens,
      totalTokens: current.tokenUsage.totalTokens + delta.tokenUsage.totalTokens,
    },
    groundingUsage: {
      searchQueryCount:
        current.groundingUsage.searchQueryCount + delta.groundingUsage.searchQueryCount,
      groundingChunkCount:
        current.groundingUsage.groundingChunkCount + delta.groundingUsage.groundingChunkCount,
    },
    estimatedCostUsd:
      current.estimatedCostUsd === null && delta.estimatedCostUsd === null
        ? null
        : (current.estimatedCostUsd ?? 0) + (delta.estimatedCostUsd ?? 0),
    costUncertainty: delta.costUncertainty ?? current.costUncertainty,
  };
}

export function mergeCostSummaries(
  current: ScannerCostSummary,
  next: {
    tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
    groundingUsage: { searchQueryCount: number; groundingChunkCount: number };
    estimatedCostUsd: number | null;
    costUncertainty: string | null;
  },
): ScannerCostSummary {
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

export function emptyCostSummary(): ScannerCostSummary {
  return {
    researchCallCount: 0,
    tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    groundingUsage: { searchQueryCount: 0, groundingChunkCount: 0 },
    estimatedCostUsd: null,
    costUncertainty: null,
  };
}

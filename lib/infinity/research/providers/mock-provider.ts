import { estimateResearchCostUsd } from "../cost-pricing";
import { buildMockGroundingMetadata, buildMockProviderResearchOutput } from "../mock-output";
import { buildGroundingUsageFromMetadata } from "../normalization/evidence";
import type { GroundedResearchProvider, GroundedResearchProviderRequest } from "../provider-contract";
import { estimateInputTokens } from "../cost-governance";
import type { ResearchProviderCallResult } from "../types";

export function createMockGroundedResearchProvider(): GroundedResearchProvider {
  return {
    providerId: "mock",
    isSimulation: true,

    async executeGroundedResearch(
      request: GroundedResearchProviderRequest,
    ): Promise<ResearchProviderCallResult> {
      const started = Date.now();
      const structured = buildMockProviderResearchOutput({
        researchObjective: request.researchObjective,
      });
      const rawText = JSON.stringify(structured);
      const groundingMetadata = buildMockGroundingMetadata();
      const groundingUsage = buildGroundingUsageFromMetadata(groundingMetadata);
      const inputTokens = estimateInputTokens(
        `${request.systemInstructions}\n${request.researchObjective}`,
      );
      const outputTokens = estimateInputTokens(rawText);
      const tokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      };
      const { estimatedCostUsd, costUncertainty } = estimateResearchCostUsd({
        modelId: request.modelId,
        inputTokens,
        outputTokens,
        searchQueryCount: groundingUsage.searchQueryCount,
      });

      return {
        providerId: "mock",
        modelId: request.modelId,
        requestId: `mock_${request.correlationId}`,
        rawText,
        rawProviderResponse: {
          mock: true,
          groundingMetadata,
        },
        groundingMetadata,
        tokenUsage,
        groundingUsage,
        estimatedCostUsd,
        costUncertainty,
        latencyMs: Date.now() - started,
        retryMetadata: {
          attemptCount: 1,
          maxAttempts: request.maxRetries + 1,
          retried: false,
        },
      };
    },
  };
}

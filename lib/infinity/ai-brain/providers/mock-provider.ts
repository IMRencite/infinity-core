import { buildMockAiBrainStructuredOutput } from "../mock-output";
import { estimateCostUsd, estimateInputTokens } from "../cost-governance";
import type { StructuredReasoningProvider, StructuredReasoningProviderRequest } from "../provider-contract";
import type { AiBrainProviderCallResult } from "../types";

export function createMockStructuredReasoningProvider(): StructuredReasoningProvider {
  return {
    providerId: "mock",
    isSimulation: true,

    async executeStructuredReasoning(
      request: StructuredReasoningProviderRequest,
    ): Promise<AiBrainProviderCallResult> {
      const started = Date.now();
      const structured = buildMockAiBrainStructuredOutput({
        objective: request.userInput,
      });
      const rawText = JSON.stringify(structured);
      const inputTokens = estimateInputTokens(`${request.systemInstructions}\n${request.userInput}`);
      const outputTokens = estimateInputTokens(rawText);
      const tokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      };

      return {
        providerId: "mock",
        modelId: request.modelId,
        requestId: `mock_${request.correlationId}`,
        rawText,
        tokenUsage,
        estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
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

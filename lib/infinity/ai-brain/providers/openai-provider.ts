import { createInternalOpenAiClient, readOutputText, readUsage } from "@/lib/infinity/ai-providers/openai/client";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";
import { classifyOpenAiError } from "@/lib/infinity/ai-providers/openai/errors";
import { AI_BRAIN_SCHEMA_VERSION } from "../constants";
import { estimateCostUsd } from "../cost-governance";
import type { StructuredReasoningProvider, StructuredReasoningProviderRequest } from "../provider-contract";
import type { AiBrainProviderCallResult } from "../types";

export function createOpenAiStructuredReasoningProvider(): StructuredReasoningProvider {
  return {
    providerId: "openai",
    isSimulation: false,

    async executeStructuredReasoning(
      request: StructuredReasoningProviderRequest,
    ): Promise<AiBrainProviderCallResult> {
      const config = loadOpenAiReasoningConfig();
      if (!config.apiKey) {
        throw classifyOpenAiError(new Error("OPENAI_API_KEY is not configured."));
      }

      const started = Date.now();
      const client = createInternalOpenAiClient({
        ...config,
        maxOutputTokens: request.maxOutputTokens,
        timeoutMs: request.timeoutMs,
      });

      let lastError: unknown;
      let attemptCount = 0;

      for (let attempt = 0; attempt <= request.maxRetries; attempt += 1) {
        attemptCount = attempt + 1;
        try {
          const response = await client.responses.create({
            model: request.modelId,
            input: [
              { role: "system", content: request.systemInstructions },
              { role: "user", content: request.userInput },
            ],
            max_output_tokens: request.maxOutputTokens,
            reasoning: { effort: config.reasoningEffort },
            text: {
              format: {
                type: "json_schema",
                name: request.schemaName,
                schema: request.responseSchema,
                strict: true,
              },
            },
          });

          const rawText = readOutputText(response);
          if (!rawText) {
            throw new Error("OpenAI returned empty structured output.");
          }

          if (!rawText.includes(AI_BRAIN_SCHEMA_VERSION)) {
            throw new Error("OpenAI structured output missing schemaVersion.");
          }

          const usage = readUsage(response);
          const tokenUsage = {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.inputTokens + usage.outputTokens,
          };

          return {
            providerId: "openai",
            modelId: request.modelId,
            requestId: response.id ?? null,
            rawText,
            tokenUsage,
            estimatedCostUsd: estimateCostUsd(tokenUsage.inputTokens, tokenUsage.outputTokens),
            latencyMs: Date.now() - started,
            retryMetadata: {
              attemptCount,
              maxAttempts: request.maxRetries + 1,
              retried: attempt > 0,
            },
          };
        } catch (error) {
          lastError = error;
          const classified = classifyOpenAiError(error);
          if (!classified.retryable || attempt >= request.maxRetries) {
            throw classified;
          }
        }
      }

      throw classifyOpenAiError(lastError);
    },
  };
}

import type { AiProviderAdapter } from "../types";
import { listRegisteredAiModels } from "../model-registry";
import { loadOpenAiReasoningConfig, assertOpenAiConfigured, validateConfiguredModel } from "./config";
import { checkOpenAiHealth } from "./execute-governed";
import { OpenAiProviderError } from "./errors";

export function createOpenAiProviderAdapter(env: NodeJS.ProcessEnv = process.env): AiProviderAdapter {
  const config = loadOpenAiReasoningConfig(env);
  const allowLiveExecution = env.AI_PROVIDER_ALLOW_LIVE_EXECUTION === "true";

  return {
    id: "openai",
    name: "OpenAI",
    version: "1.0.0",

    async initialize() {
      validateConfiguredModel(config.model);
      return checkOpenAiHealth(config);
    },

    async health() {
      const health = await checkOpenAiHealth(config);
      return {
        ok: health.ok,
        providerId: "openai",
        message: health.message,
        configured: Boolean(config.apiKey),
        executable: Boolean(config.apiKey) && allowLiveExecution,
      };
    },

    async listModels() {
      return listRegisteredAiModels({ providerId: "openai" }).map((model) => ({
        id: model.id,
        displayName: model.displayName,
      }));
    },

    estimateTokens({ prompt, systemPrompt }) {
      const text = `${systemPrompt ?? ""}\n${prompt}`;
      const inputTokens = Math.ceil(text.length / 4);
      const outputTokens = Math.min(config.maxOutputTokens, 1024);
      return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
    },

    estimateCost({ tokenEstimate }) {
      const inputCost = (tokenEstimate.inputTokens / 1_000_000) * 2;
      const outputCost = (tokenEstimate.outputTokens / 1_000_000) * 8;
      return {
        currency: "USD",
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
      };
    },

    async execute() {
      try {
        assertOpenAiConfigured(config);
      } catch (error) {
        throw new OpenAiProviderError(
          error instanceof Error ? error.message : "OpenAI not configured.",
          "not_configured",
        );
      }

      if (!allowLiveExecution) {
        throw new OpenAiProviderError(
          "OpenAI live execution disabled. Set AI_PROVIDER_ALLOW_LIVE_EXECUTION=true.",
          "provider_disabled",
        );
      }

      throw new OpenAiProviderError(
        "Use executeOpenAiGovernedReasoning for governed reasoning cycles.",
        "network_forbidden",
      );
    },

    supportsTools: () => false,
    supportsVision: () => false,
    supportsJSON: () => true,
    supportsReasoning: () => true,

    async shutdown() {},
  };
}

export * from "./config";
export * from "./execute-governed";
export * from "./errors";

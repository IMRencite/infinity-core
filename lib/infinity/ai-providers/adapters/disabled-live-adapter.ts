import type { AiProviderEnvConfig } from "../config";
import { isProviderConfigured, mayExecuteProvider } from "../config";
import { AiProviderError } from "../errors";
import type { AiProviderId } from "../constants";
import type { AiProviderAdapter, ProviderExecuteRequest, ProviderExecuteResult } from "../types";
import { listRegisteredAiModels } from "../model-registry";

export function createDisabledLiveAdapter(input: {
  id: Exclude<AiProviderId, "mock">;
  name: string;
  config: AiProviderEnvConfig;
  supports: {
    tools: boolean;
    vision: boolean;
    json: boolean;
    reasoning: boolean;
  };
}): AiProviderAdapter {
  const configured = isProviderConfigured(input.id, input.config);
  const executable = mayExecuteProvider(input.id, input.config);

  return {
    id: input.id,
    name: input.name,
    version: "1.0.0",

    async initialize() {
      return {
        ok: configured,
        message: configured
          ? `${input.name} configured but live execution disabled by default.`
          : `${input.name} not configured.`,
      };
    },

    async health() {
      return {
        ok: configured,
        providerId: input.id,
        message: executable
          ? `${input.name} configured for live execution.`
          : configured
            ? `${input.name} configured; live execution disabled.`
            : `${input.name} not configured.`,
        configured,
        executable,
      };
    },

    async listModels() {
      return listRegisteredAiModels({ providerId: input.id }).map((model) => ({
        id: model.id,
        displayName: model.displayName,
      }));
    },

    estimateTokens({ prompt, systemPrompt }) {
      const text = `${systemPrompt ?? ""}\n${prompt}`;
      const tokens = Math.ceil(text.length / 4);
      return { inputTokens: tokens, outputTokens: 512, totalTokens: tokens + 512 };
    },

    estimateCost({ modelId, tokenEstimate }) {
      const model = listRegisteredAiModels({ providerId: input.id }).find((m) => m.id === modelId);
      const inputCost =
        model?.inputCostPer1kTokens != null
          ? (tokenEstimate.inputTokens / 1000) * model.inputCostPer1kTokens
          : null;
      const outputCost =
        model?.outputCostPer1kTokens != null
          ? (tokenEstimate.outputTokens / 1000) * model.outputCostPer1kTokens
          : null;

      return {
        currency: "USD",
        inputCost,
        outputCost,
        totalCost:
          inputCost !== null && outputCost !== null ? inputCost + outputCost : null,
      };
    },

    async execute(_request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
      void _request;
      if (!configured) {
        throw new AiProviderError(`${input.name} is not configured.`, "not_configured", {
          providerId: input.id,
        });
      }

      if (!executable) {
        throw new AiProviderError(
          `${input.name} live execution is disabled. Set AI_PROVIDER_ALLOW_LIVE_EXECUTION=true to enable.`,
          "provider_disabled",
          { providerId: input.id },
        );
      }

      throw new AiProviderError(
        "Live provider HTTP execution is not implemented in Provider Integration Foundation v1.",
        "network_forbidden",
        { providerId: input.id },
      );
    },

    supportsTools: () => input.supports.tools,
    supportsVision: () => input.supports.vision,
    supportsJSON: () => input.supports.json,
    supportsReasoning: () => input.supports.reasoning,

    async shutdown() {},
  };
}

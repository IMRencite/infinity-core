import { listRegisteredAiModels } from "./model-registry";
import type { ReasoningProvider } from "@/lib/infinity/reasoning/providers";
import { mockProviderAdapter } from "./adapters/mock-adapter";

/** Maps mock provider into reasoning registry using `local` provider id. */
export function createReasoningProviderBridge(): ReasoningProvider {
  return {
    id: "local",
    name: "Mock Provider (local bridge)",
    version: mockProviderAdapter.version,
    capabilities: {
      contextWindowTokens: 128_000,
      maxOutputTokens: 8_192,
      supportsTools: mockProviderAdapter.supportsTools(),
      supportsImages: mockProviderAdapter.supportsVision(),
      supportsJsonMode: mockProviderAdapter.supportsJSON(),
      supportsFunctionCalling: mockProviderAdapter.supportsTools(),
      supportsStreaming: false,
      supportsReasoningMode: mockProviderAdapter.supportsReasoning(),
    },
    costMetrics: {
      currency: "USD",
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
    },
    listModels() {
      return listRegisteredAiModels({ providerId: "mock" }).map((model) => ({
        providerId: "local",
        modelId: model.id,
        displayName: model.displayName,
        version: model.version,
        contextWindowTokens: model.contextWindowTokens,
        maxOutputTokens: model.maxOutputTokens,
      }));
    },
  };
}

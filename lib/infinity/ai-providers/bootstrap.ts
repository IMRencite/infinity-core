import { mockProviderAdapter } from "./adapters/mock-adapter";
import { createReasoningProviderBridge } from "./reasoning-bridge";
import {
  registerReasoningProvider,
  clearReasoningProviderRegistry,
} from "@/lib/infinity/reasoning/registry";
import { registerAiProvider, clearAiProviderRegistry } from "./registry";
import { clearAiModelRegistry, seedExampleModelCatalog } from "./model-registry";
import { loadAiProviderEnvConfig } from "./config";
import {
  createAnthropicAdapter,
  createGeminiAdapter,
  createOllamaAdapter,
  createOpenAiAdapter,
  createOpenRouterAdapter,
} from "./adapters/vendor-adapters";

export function bootstrapAiProviders(options?: {
  env?: NodeJS.ProcessEnv;
  registerReasoning?: boolean;
}): void {
  clearAiProviderRegistry();
  clearAiModelRegistry();
  seedExampleModelCatalog();

  const config = loadAiProviderEnvConfig(options?.env);

  registerAiProvider(mockProviderAdapter);
  registerAiProvider(createOpenAiAdapter(config));
  registerAiProvider(createAnthropicAdapter(config));
  registerAiProvider(createGeminiAdapter(config));
  registerAiProvider(createOpenRouterAdapter(config));
  registerAiProvider(createOllamaAdapter(config));

  if (options?.registerReasoning !== false) {
    clearReasoningProviderRegistry();
    registerReasoningProvider(createReasoningProviderBridge());
  }
}

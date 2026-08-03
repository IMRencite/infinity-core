import { bootstrapAiProviders } from "./bootstrap";
import { createReasoningProviderBridge } from "./reasoning-bridge";
import { registerReasoningProvider, clearReasoningProviderRegistry } from "@/lib/infinity/reasoning/registry";

export function bootstrapAiProvidersWithReasoning(options?: {
  env?: NodeJS.ProcessEnv;
}): void {
  bootstrapAiProviders({ env: options?.env, registerReasoning: false });
  clearReasoningProviderRegistry();
  registerReasoningProvider(createReasoningProviderBridge());
}

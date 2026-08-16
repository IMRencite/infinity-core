import type { AiBrainProviderId } from "../constants";
import type { ProviderRegistry, StructuredReasoningProvider } from "../provider-contract";
import { createMockStructuredReasoningProvider } from "./mock-provider";
import { createOpenAiStructuredReasoningProvider } from "./openai-provider";

export function createAiBrainProviderRegistry(): ProviderRegistry {
  const providers = new Map<AiBrainProviderId, StructuredReasoningProvider>([
    ["mock", createMockStructuredReasoningProvider()],
    ["openai", createOpenAiStructuredReasoningProvider()],
  ]);

  return {
    resolve(providerId: AiBrainProviderId): StructuredReasoningProvider {
      const provider = providers.get(providerId);
      if (!provider) {
        throw new Error(`AI Brain provider not registered: ${providerId}`);
      }
      return provider;
    },
  };
}

export function getStructuredReasoningProvider(
  providerId: AiBrainProviderId,
): StructuredReasoningProvider {
  return createAiBrainProviderRegistry().resolve(providerId);
}

import type { ReasoningProvider, ReasoningProviderRegistration } from "./providers";
import type { ProviderSelectionPolicy } from "./types";

const registry = new Map<string, ReasoningProviderRegistration>();

export function registerReasoningProvider(provider: ReasoningProvider): void {
  registry.set(provider.id, {
    provider,
    registeredAt: new Date().toISOString(),
  });
}

export function unregisterReasoningProvider(providerId: string): void {
  registry.delete(providerId);
}

export function getReasoningProvider(providerId: string): ReasoningProvider | null {
  return registry.get(providerId)?.provider ?? null;
}

export function listReasoningProviders(): ReasoningProviderRegistration[] {
  return [...registry.values()].sort((a, b) => a.provider.id.localeCompare(b.provider.id));
}

export function clearReasoningProviderRegistry(): void {
  registry.clear();
}

function providerMeetsRequirements(
  provider: ReasoningProvider,
  require?: ProviderSelectionPolicy["requireCapabilities"],
): boolean {
  if (!require) return true;

  const caps = provider.capabilities;
  return (
    (require.contextWindowTokens === undefined ||
      caps.contextWindowTokens >= require.contextWindowTokens) &&
    (require.maxOutputTokens === undefined ||
      caps.maxOutputTokens >= require.maxOutputTokens) &&
    (require.supportsTools === undefined || caps.supportsTools === require.supportsTools) &&
    (require.supportsImages === undefined ||
      caps.supportsImages === require.supportsImages) &&
    (require.supportsJsonMode === undefined ||
      caps.supportsJsonMode === require.supportsJsonMode) &&
    (require.supportsFunctionCalling === undefined ||
      caps.supportsFunctionCalling === require.supportsFunctionCalling) &&
    (require.supportsStreaming === undefined ||
      caps.supportsStreaming === require.supportsStreaming) &&
    (require.supportsReasoningMode === undefined ||
      caps.supportsReasoningMode === require.supportsReasoningMode)
  );
}

/** Deterministic provider selection — no network calls. */
export function selectReasoningProvider(
  policy: ProviderSelectionPolicy = {
    preferredProviderId: null,
    fallbackProviderIds: [],
  },
): ReasoningProvider | null {
  const candidates: string[] = [];

  if (policy.preferredProviderId) {
    candidates.push(policy.preferredProviderId);
  }

  candidates.push(...policy.fallbackProviderIds);

  for (const providerId of candidates) {
    const provider = getReasoningProvider(providerId);
    if (provider && providerMeetsRequirements(provider, policy.requireCapabilities)) {
      return provider;
    }
  }

  const all = listReasoningProviders();
  for (const registration of all) {
    if (providerMeetsRequirements(registration.provider, policy.requireCapabilities)) {
      return registration.provider;
    }
  }

  return null;
}

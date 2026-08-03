import type { AiProviderAdapter } from "./types";
import type { AiProviderId } from "./constants";

const registry = new Map<AiProviderId, AiProviderAdapter>();

export function registerAiProvider(adapter: AiProviderAdapter): void {
  registry.set(adapter.id, adapter);
}

export function unregisterAiProvider(providerId: AiProviderId): void {
  registry.delete(providerId);
}

export function getAiProvider(providerId: AiProviderId): AiProviderAdapter | null {
  return registry.get(providerId) ?? null;
}

export function listAiProviders(): AiProviderAdapter[] {
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function clearAiProviderRegistry(): void {
  registry.clear();
}

export function selectAiProvider(input: {
  preferredProviderId?: AiProviderId | null;
  fallbackProviderIds?: AiProviderId[];
}): AiProviderAdapter | null {
  const candidates: AiProviderId[] = [];

  if (input.preferredProviderId) candidates.push(input.preferredProviderId);
  candidates.push(...(input.fallbackProviderIds ?? []));
  candidates.push("mock");

  for (const id of candidates) {
    const provider = getAiProvider(id);
    if (provider) return provider;
  }

  return null;
}

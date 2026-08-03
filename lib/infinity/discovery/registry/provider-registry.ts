import type { DiscoverySourceProvider } from "../types/provider";

const providers = new Map<string, DiscoverySourceProvider>();

export function registerDiscoverySourceProvider(provider: DiscoverySourceProvider): void {
  if (providers.has(provider.id)) {
    throw new Error(`Discovery source provider already registered: ${provider.id}`);
  }
  providers.set(provider.id, provider);
}

export function getDiscoverySourceProvider(id: string): DiscoverySourceProvider | undefined {
  return providers.get(id);
}

export function listDiscoverySourceProviders(): DiscoverySourceProvider[] {
  return [...providers.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function clearDiscoverySourceProviders(): void {
  providers.clear();
}

export function requireDiscoverySourceProvider(id: string): DiscoverySourceProvider {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Discovery source provider not registered: ${id}`);
  }
  return provider;
}

import { redditDiscoveryProvider } from "./reddit";
import { hackerNewsDiscoveryProvider } from "./hackernews";
import { productHuntDiscoveryProvider } from "./product-hunt";
import { githubTrendingDiscoveryProvider } from "./github-trending";
import { googleTrendsDiscoveryProvider } from "./google-trends";
import { rssDiscoveryProvider } from "./rss";
import { manualDiscoveryProvider } from "./manual";
import {
  clearDiscoverySourceProviders,
  listDiscoverySourceProviders,
  registerDiscoverySourceProvider,
} from "../registry/provider-registry";

const DEFAULT_PROVIDERS = [
  redditDiscoveryProvider,
  hackerNewsDiscoveryProvider,
  productHuntDiscoveryProvider,
  githubTrendingDiscoveryProvider,
  googleTrendsDiscoveryProvider,
  rssDiscoveryProvider,
  manualDiscoveryProvider,
];

let bootstrapped = false;

export function bootstrapDiscoverySourceProviders(options?: { force?: boolean }): void {
  if (bootstrapped && !options?.force) {
    return;
  }

  clearDiscoverySourceProviders();
  for (const provider of DEFAULT_PROVIDERS) {
    registerDiscoverySourceProvider(provider);
  }
  bootstrapped = true;
}

export function resetDiscoverySourceProvidersForTests(): void {
  bootstrapped = false;
  clearDiscoverySourceProviders();
}

export {
  redditDiscoveryProvider,
  hackerNewsDiscoveryProvider,
  productHuntDiscoveryProvider,
  githubTrendingDiscoveryProvider,
  googleTrendsDiscoveryProvider,
  rssDiscoveryProvider,
  manualDiscoveryProvider,
};

export function allDefaultProviderIds(): string[] {
  bootstrapDiscoverySourceProviders();
  return listDiscoverySourceProviders().map((p) => p.id);
}

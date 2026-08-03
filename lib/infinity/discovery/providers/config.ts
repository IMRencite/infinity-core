export const DISCOVERY_ENGINE_VERSION = "discovery_engine_v1";

export const DISCOVERY_SOURCE_PROVIDER_IDS = [
  "reddit",
  "hackernews",
  "product_hunt",
  "github_trending",
  "google_trends",
  "rss",
  "manual",
] as const;

export type DiscoverySourceProviderId = (typeof DISCOVERY_SOURCE_PROVIDER_IDS)[number];

export function isLiveDiscoveryFetchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DISCOVERY_ALLOW_LIVE_FETCH === "true";
}

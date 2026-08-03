import type { DiscoveryFetchContext, DiscoveryRawItem, DiscoverySourceProvider } from "../types/provider";
import { isLiveDiscoveryFetchEnabled } from "./config";

export const googleTrendsDiscoveryProvider: DiscoverySourceProvider = {
  id: "google_trends",
  name: "Google Trends",
  sourceKey: "discovery.google_trends",
  version: "1.0.0",
  async fetch(context: DiscoveryFetchContext): Promise<DiscoveryRawItem[]> {
    if (!isLiveDiscoveryFetchEnabled()) {
      return [];
    }

    const topics =
      (context.config?.topics as string[] | undefined) ??
      (process.env.DISCOVERY_GOOGLE_TRENDS_TOPICS?.split(",").map((t) => t.trim()) ??
        []);

    if (topics.length === 0) {
      return [];
    }

    const limit = Math.min(context.limit ?? topics.length, 10);
    return topics.slice(0, limit).map((topic, index) => ({
      externalId: `gt-${topic.toLowerCase().replace(/\s+/g, "-")}`,
      title: `Rising interest: ${topic}`,
      description: `Google Trends configured topic "${topic}" for demand monitoring.`,
      url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(topic)}`,
      category: "search_demand",
      market: "general",
      keywords: ["google_trends", topic],
      payload: { provider: "google_trends", topic, rank: index + 1 },
    }));
  },
};

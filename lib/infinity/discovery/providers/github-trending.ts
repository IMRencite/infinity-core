import type { DiscoveryFetchContext, DiscoveryRawItem, DiscoverySourceProvider } from "../types/provider";
import { isLiveDiscoveryFetchEnabled } from "./config";

export const githubTrendingDiscoveryProvider: DiscoverySourceProvider = {
  id: "github_trending",
  name: "GitHub Trending",
  sourceKey: "discovery.github_trending",
  version: "1.0.0",
  async fetch(context: DiscoveryFetchContext): Promise<DiscoveryRawItem[]> {
    if (!isLiveDiscoveryFetchEnabled()) {
      return [];
    }

    const language = String(context.config?.language ?? "typescript");
    const limit = Math.min(context.limit ?? 10, 15);
    const response = await fetch(
      `https://api.github.com/search/repositories?q=language:${encodeURIComponent(language)}+stars:>100&sort=stars&order=desc&per_page=${limit}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "InfinityDiscoveryEngine/1.0",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!response.ok) return [];

    const json = (await response.json()) as {
      items?: Array<Record<string, unknown>>;
    };

    return (json.items ?? []).map((repo) => ({
      externalId: String(repo.id ?? repo.full_name),
      title: String(repo.full_name ?? repo.name ?? "repository"),
      description: String(repo.description ?? repo.full_name ?? ""),
      url: String(repo.html_url ?? "https://github.com"),
      category: "technology",
      market: "developer_tools",
      keywords: ["github", "open_source", language],
      payload: {
        provider: "github_trending",
        stars: repo.stargazers_count,
        language: repo.language,
      },
    }));
  },
};

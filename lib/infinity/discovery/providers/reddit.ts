import type { DiscoveryFetchContext, DiscoveryRawItem, DiscoverySourceProvider } from "../types/provider";
import { isLiveDiscoveryFetchEnabled } from "./config";

const DEFAULT_SUBREDDITS = ["Entrepreneur", "SaaS", "startups"];

function parseRedditListing(json: unknown): DiscoveryRawItem[] {
  if (typeof json !== "object" || json === null) return [];
  const data = (json as { data?: { children?: unknown[] } }).data;
  const children = data?.children;
  if (!Array.isArray(children)) return [];

  const items: DiscoveryRawItem[] = [];
  for (const child of children) {
    if (typeof child !== "object" || child === null) continue;
    const post = (child as { data?: Record<string, unknown> }).data;
    if (!post) continue;
    const title = String(post.title ?? "").trim();
    if (!title) continue;
    const id = String(post.id ?? title);
    const url = String(post.url ?? post.permalink ?? "");
    items.push({
      externalId: id,
      title,
      description: String(post.selftext ?? post.title ?? "").slice(0, 2_000),
      url: url.startsWith("http") ? url : `https://www.reddit.com${url}`,
      category: "social_discussion",
      market: "b2c",
      keywords: ["reddit", String(post.subreddit ?? "unknown")],
      publishedAt: post.created_utc
        ? new Date(Number(post.created_utc) * 1_000).toISOString()
        : undefined,
      payload: { provider: "reddit", subreddit: post.subreddit, score: post.score },
    });
  }
  return items;
}

export const redditDiscoveryProvider: DiscoverySourceProvider = {
  id: "reddit",
  name: "Reddit",
  sourceKey: "discovery.reddit",
  version: "1.0.0",
  async fetch(context: DiscoveryFetchContext): Promise<DiscoveryRawItem[]> {
    if (!isLiveDiscoveryFetchEnabled()) {
      return [];
    }

    const limit = Math.min(context.limit ?? 10, 25);
    const subreddits =
      (context.config?.subreddits as string[] | undefined) ?? DEFAULT_SUBREDDITS;
    const sub = subreddits[0] ?? "Entrepreneur";
    const response = await fetch(
      `https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=${limit}`,
      {
        headers: { "User-Agent": "InfinityDiscoveryEngine/1.0" },
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      return [];
    }

    const json: unknown = await response.json();
    return parseRedditListing(json).slice(0, limit);
  },
};

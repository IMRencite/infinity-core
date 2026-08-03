import type { DiscoveryFetchContext, DiscoveryRawItem, DiscoverySourceProvider } from "../types/provider";
import { isLiveDiscoveryFetchEnabled } from "./config";

async function fetchStory(id: number): Promise<DiscoveryRawItem | null> {
  const response = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) return null;
  const story = (await response.json()) as Record<string, unknown>;
  const title = String(story.title ?? "").trim();
  if (!title) return null;
  const url = String(story.url ?? `https://news.ycombinator.com/item?id=${id}`);
  return {
    externalId: String(id),
    title,
    description: title,
    url,
    category: "technology",
    market: "b2b",
    keywords: ["hackernews", "tech"],
    publishedAt: story.time ? new Date(Number(story.time) * 1_000).toISOString() : undefined,
    payload: { provider: "hackernews", score: story.score, descendants: story.descendants },
  };
}

export const hackerNewsDiscoveryProvider: DiscoverySourceProvider = {
  id: "hackernews",
  name: "Hacker News",
  sourceKey: "discovery.hackernews",
  version: "1.0.0",
  async fetch(context: DiscoveryFetchContext): Promise<DiscoveryRawItem[]> {
    if (!isLiveDiscoveryFetchEnabled()) {
      return [];
    }

    const limit = Math.min(context.limit ?? 10, 30);
    const top = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      signal: AbortSignal.timeout(10_000),
    });
    if (!top.ok) return [];
    const ids = (await top.json()) as number[];
    const slice = ids.slice(0, limit);
    const items: DiscoveryRawItem[] = [];
    for (const id of slice) {
      const item = await fetchStory(id);
      if (item) items.push(item);
    }
    return items;
  },
};

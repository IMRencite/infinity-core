import type { DiscoveryFetchContext, DiscoveryRawItem, DiscoverySourceProvider } from "../types/provider";
import { isLiveDiscoveryFetchEnabled } from "./config";

function extractTagContent(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const matches: string[] = [];
  let match = regex.exec(xml);
  while (match) {
    matches.push(match[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "");
    match = regex.exec(xml);
  }
  return matches;
}

export const rssDiscoveryProvider: DiscoverySourceProvider = {
  id: "rss",
  name: "RSS Feeds",
  sourceKey: "discovery.rss",
  version: "1.0.0",
  async fetch(context: DiscoveryFetchContext): Promise<DiscoveryRawItem[]> {
    const feedUrls =
      (context.config?.feedUrls as string[] | undefined) ??
      (process.env.DISCOVERY_RSS_FEED_URLS?.split(",").map((u) => u.trim()).filter(Boolean) ??
        []);

    const inlineItems = context.config?.items as DiscoveryRawItem[] | undefined;
    if (inlineItems?.length) {
      return inlineItems.slice(0, context.limit ?? inlineItems.length);
    }

    if (!isLiveDiscoveryFetchEnabled() || feedUrls.length === 0) {
      return [];
    }

    const limit = Math.min(context.limit ?? 10, 25);
    const items: DiscoveryRawItem[] = [];

    for (const feedUrl of feedUrls) {
      if (items.length >= limit) break;
      try {
        const response = await fetch(feedUrl, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) continue;
        const xml = await response.text();
        const titles = extractTagContent(xml, "title");
        const links = extractTagContent(xml, "link");
        const descriptions = extractTagContent(xml, "description");

        for (let i = 0; i < titles.length && items.length < limit; i += 1) {
          const title = titles[i];
          if (!title || title.toLowerCase() === "rss") continue;
          items.push({
            externalId: `${feedUrl}#${i}`,
            title,
            description: (descriptions[i] ?? title).slice(0, 2_000),
            url: links[i] ?? feedUrl,
            category: "market_signal",
            market: "general",
            keywords: ["rss", new URL(feedUrl).hostname],
            payload: { provider: "rss", feedUrl },
          });
        }
      } catch {
        continue;
      }
    }

    return items;
  },
};

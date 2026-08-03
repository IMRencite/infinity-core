import type { DiscoveryFetchContext, DiscoveryRawItem, DiscoverySourceProvider } from "../types/provider";
import { isLiveDiscoveryFetchEnabled } from "./config";

export const productHuntDiscoveryProvider: DiscoverySourceProvider = {
  id: "product_hunt",
  name: "Product Hunt",
  sourceKey: "discovery.product_hunt",
  version: "1.0.0",
  async fetch(context: DiscoveryFetchContext): Promise<DiscoveryRawItem[]> {
    if (!isLiveDiscoveryFetchEnabled()) {
      return [];
    }

    const token = process.env.PRODUCT_HUNT_API_TOKEN?.trim();
    if (!token) {
      return [];
    }

    const limit = Math.min(context.limit ?? 10, 20);
    const query = `
      query { posts(first: ${limit}, order: VOTES) {
        edges { node { id name tagline url votesCount } }
      } }
    `;

    const response = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) return [];

    const json = (await response.json()) as {
      data?: { posts?: { edges?: { node?: Record<string, unknown> }[] } };
    };
    const edges = json.data?.posts?.edges ?? [];
    const items: DiscoveryRawItem[] = [];
    for (const edge of edges) {
      const node = edge.node;
      if (!node) continue;
      const title = String(node.name ?? "").trim();
      if (!title) continue;
      items.push({
        externalId: String(node.id ?? title),
        title,
        description: String(node.tagline ?? title),
        url: String(node.url ?? "https://www.producthunt.com"),
        category: "product_demand",
        market: "b2b",
        keywords: ["producthunt", "launch"],
        payload: { provider: "product_hunt", votes: node.votesCount },
      });
    }
    return items;
  },
};

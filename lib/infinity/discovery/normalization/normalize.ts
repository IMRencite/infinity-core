import { createHash } from "node:crypto";
import type { DiscoveryRawItem } from "../types/provider";
import type { DiscoveredOpportunity } from "../types/opportunity";

function stableId(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export function normalizeDiscoveryItem(
  item: DiscoveryRawItem,
  sourceProviderId: string,
): DiscoveredOpportunity {
  const discoveredAt = item.publishedAt ?? new Date().toISOString();
  const keywords = item.keywords ?? [];
  const url = item.url.trim() || `unknown://${sourceProviderId}/${item.externalId}`;

  return {
    id: stableId([sourceProviderId, item.externalId, url]),
    title: item.title.trim(),
    description: item.description.trim() || item.title.trim(),
    source: sourceProviderId,
    url,
    category: item.category ?? "other",
    market: item.market ?? "general",
    keywords,
    estimatedDemand: 0,
    estimatedCompetition: 0,
    estimatedRevenuePotential: 0,
    confidence: 0,
    discoveredAt,
    rawPayload: {
      ...item.payload,
      externalId: item.externalId,
      normalizedBy: "discovery_engine_v1",
    },
  };
}

export function normalizeDiscoveryBatch(
  items: DiscoveryRawItem[],
  sourceProviderId: string,
): DiscoveredOpportunity[] {
  return items.map((item) => normalizeDiscoveryItem(item, sourceProviderId));
}

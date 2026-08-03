import { createHash } from "node:crypto";
import type { DiscoveredOpportunity } from "../types/opportunity";

export function buildOpportunityDedupKey(
  organizationId: string,
  opportunity: Pick<DiscoveredOpportunity, "source" | "url" | "title">,
): string {
  const normalizedUrl = opportunity.url.trim().toLowerCase();
  const normalizedTitle = opportunity.title.trim().toLowerCase();
  const hash = createHash("sha256")
    .update(`${organizationId}|${opportunity.source}|${normalizedUrl}|${normalizedTitle}`)
    .digest("hex")
    .slice(0, 40);
  return `discovery:${hash}`;
}

export class DiscoveryDedupeSet {
  private readonly keys = new Set<string>();

  constructor(private readonly organizationId: string) {}

  isDuplicate(opportunity: DiscoveredOpportunity): boolean {
    const key = buildOpportunityDedupKey(this.organizationId, opportunity);
    if (this.keys.has(key)) {
      return true;
    }
    this.keys.add(key);
    return false;
  }

  size(): number {
    return this.keys.size;
  }
}

export function dedupeOpportunities(
  organizationId: string,
  opportunities: DiscoveredOpportunity[],
): { unique: DiscoveredOpportunity[]; skipped: number } {
  const set = new DiscoveryDedupeSet(organizationId);
  const unique: DiscoveredOpportunity[] = [];
  let skipped = 0;

  for (const opportunity of opportunities) {
    if (set.isDuplicate(opportunity)) {
      skipped += 1;
      continue;
    }
    unique.push(opportunity);
  }

  return { unique, skipped };
}

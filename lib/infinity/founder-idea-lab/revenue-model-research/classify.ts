import type { FounderResearchFinding } from "../research-packet";
import type { RevenueModelType } from "./types";

const TYPE_PATTERNS: Array<{ type: RevenueModelType; pattern: RegExp; weight: number }> = [
  { type: "HYBRID_SOFTWARE_SERVICE", pattern: /\b(managed|done-for-you|full.?service).{0,40}(saas|platform|cms|software|website)\b|\b(saas|platform|cms).{0,40}(managed|seo|content|retainer)\b/i, weight: 4 },
  { type: "SUBSCRIPTION_PLUS_SETUP", pattern: /\b(setup|onboarding|implementation).{0,30}(subscription|monthly|retainer)\b|\b(subscription|monthly).{0,30}(setup|onboarding)\b/i, weight: 4 },
  { type: "SUBSCRIPTION_SAAS", pattern: /\b(saas|subscription|monthly package|monthly plan|recurring)\b/i, weight: 3 },
  { type: "MANAGED_SERVICE_RETAINER", pattern: /\b(retainer|managed service|done-for-you|agency package)\b/i, weight: 3 },
  { type: "PER_LOCATION", pattern: /\bper\s+location|\/\s*location\b/i, weight: 4 },
  { type: "PER_USER", pattern: /\bper\s+user|\/\s*user\b/i, weight: 4 },
  { type: "PER_SEAT", pattern: /\bper\s+seat|\/\s*seat\b/i, weight: 4 },
  { type: "PRODUCTIZED_SERVICE", pattern: /\bproductized service|fixed[- ]scope package\b/i, weight: 3 },
  { type: "USAGE_BASED", pattern: /\b(usage[- ]based|metered|per request|consumption)\b/i, weight: 4 },
  { type: "COMMISSION", pattern: /\bcommission\b|\btake\s*rate\b|\brev(?:enue)?\s*share\b/i, weight: 4 },
  { type: "MARKETPLACE_TAKE_RATE", pattern: /\bmarketplace\b.{0,20}(take|fee|commission)/i, weight: 4 },
  { type: "TRANSACTION_FEE", pattern: /\btransaction fee|per transaction|payment fee\b/i, weight: 3 },
  { type: "ADVERTISING", pattern: /\badvertising|ad revenue|sponsored listing\b/i, weight: 3 },
  { type: "LEAD_GENERATION", pattern: /\blead gen|per lead|pay.?per.?lead\b/i, weight: 3 },
  { type: "LICENSING", pattern: /\blicen[sc]e fee|software license\b/i, weight: 3 },
  { type: "FREEMIUM_UPSELL", pattern: /\bfreemium|free plan|upgrade to paid\b/i, weight: 3 },
  { type: "ONE_TIME_IMPLEMENTATION", pattern: /\b(one[- ]time|implementation project|build fee)\b/i, weight: 2 },
];

export function classifyRevenueModelTypes(text: string): Array<{ type: RevenueModelType; weight: number }> {
  const hits: Array<{ type: RevenueModelType; weight: number }> = [];
  for (const row of TYPE_PATTERNS) {
    if (row.pattern.test(text)) hits.push({ type: row.type, weight: row.weight });
  }
  return hits;
}

export function primaryRevenueModelType(text: string): RevenueModelType {
  const hits = classifyRevenueModelTypes(text);
  if (!hits.length) return "UNKNOWN";
  hits.sort((a, b) => b.weight - a.weight);
  const top = hits[0]!;
  const software = /\b(saas|cms|platform|software|website)\b/i.test(text);
  const service = /\b(managed|seo|content|retainer|done-for-you|setup)\b/i.test(text);
  if (software && service && (top.type === "SUBSCRIPTION_SAAS" || top.type === "MANAGED_SERVICE_RETAINER")) {
    return "HYBRID_SOFTWARE_SERVICE";
  }
  if (/\bsetup\b/i.test(text) && top.type === "SUBSCRIPTION_SAAS") return "SUBSCRIPTION_PLUS_SETUP";
  return top.type;
}

export function classifyFromFindings(findings: FounderResearchFinding[]): RevenueModelType {
  return primaryRevenueModelType(findings.map((item) => item.claim).join(" "));
}

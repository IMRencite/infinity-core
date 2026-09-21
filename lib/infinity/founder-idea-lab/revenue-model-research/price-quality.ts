import { classifySourceClass, extractMoneyObservations, SOURCE_CLASS_RANK } from "./extract";
import { canContributeToCorePricing } from "./numeric-contribution";
import { classifyPriceRole, type PriceRole } from "./price-role";
import { publisherIndependenceKey, isOpaqueVertexRedirect } from "./source-independence";
import type { RevenueEvidenceSufficiency } from "./types";
import type { VentureContext } from "../comparable-economics/qualify";

export type PriceSourceQualityBand = "HIGH" | "MEDIUM" | "LOW";

export type QualifiedCorePriceEvidence = {
  role: PriceRole;
  quality: PriceSourceQualityBand;
  independentKey: string;
  entity: string | null;
  closed: boolean;
  sourceUrl: string | null;
};

export function priceSourceQualityFromUrl(url: string | null | undefined): PriceSourceQualityBand {
  if (!url) return "LOW";
  if (/vertexaisearch\.cloud\.google\.com/i.test(url)) return "LOW";
  const cls = classifySourceClass(url);
  if (cls === "OFFICIAL_PRICING_PAGE" || cls === "OFFICIAL_PLAN_PAGE" || cls === "OFFICIAL_PRODUCT_PAGE") return "HIGH";
  if (SOURCE_CLASS_RANK[cls] >= 40) return "MEDIUM";
  return "LOW";
}

export function sourceHost(url: string | null | undefined): string {
  if (!url) return "unknown";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function independentKey(url: string | null | undefined, entity: string | null): string {
  return publisherIndependenceKey({ url, entity: isOpaqueVertexRedirect(url) ? null : entity });
}

function namedEntity(claim: string): string | null {
  const match = claim.match(
    /\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b.*?(?:charges?|sells?|operates?|plans?|pricing|subscription|retainer)|(?:charges?|sells?|operates?)\b.*?([A-Z][A-Za-z0-9]+)/,
  );
  return match?.[1] ?? match?.[2] ?? null;
}

export function collectQualifiedCorePrices(input: {
  findings: Array<{ claim: string; sourceUrls?: string[]; verifiesFounderCompetitor?: string | null }>;
  context?: VentureContext | null;
}): QualifiedCorePriceEvidence[] {
  const out: QualifiedCorePriceEvidence[] = [];
  for (const finding of input.findings) {
    const role = classifyPriceRole(finding.claim, input.context);
    const url = finding.sourceUrls?.[0] ?? null;
    const quality = priceSourceQualityFromUrl(url);
    const entity = finding.verifiesFounderCompetitor ?? namedEntity(finding.claim);
    for (const observation of extractMoneyObservations(finding.claim)) {
      if (!canContributeToCorePricing(observation, role, finding.claim)) continue;
      out.push({
        role,
        quality,
        independentKey: independentKey(url, entity),
        entity,
        closed: observation.boundKind === "CLOSED",
        sourceUrl: url,
      });
    }
  }
  return out;
}

/**
 * Closed prices alone cannot force SUFFICIENT.
 * A: 2+ independent MEDIUM/HIGH direct core prices
 * B: 1 HIGH direct + 2+ independent MEDIUM/HIGH adjacent/category
 * C: 2+ independent MEDIUM/HIGH core (direct or adjacent) including ≥1 direct
 */
export function assessPricingEvidenceQuality(input: {
  findings: Array<{ claim: string; sourceUrls?: string[]; verifiesFounderCompetitor?: string | null }>;
  context?: VentureContext | null;
}): {
  status: RevenueEvidenceSufficiency;
  independentQualityCount: number;
  directQualityCount: number;
  reason: string;
} {
  const prices = collectQualifiedCorePrices(input);
  if (!prices.length) {
    return { status: "INSUFFICIENT", independentQualityCount: 0, directQualityCount: 0, reason: "No qualified core monthly prices." };
  }
  const qualityOk = prices.filter((item) => item.quality === "MEDIUM" || item.quality === "HIGH");
  const independent = new Set(qualityOk.map((item) => item.independentKey));
  const directQuality = qualityOk.filter((item) => item.role === "DIRECT_COMPARABLE_CORE_PRICE");
  const independentDirect = new Set(directQuality.map((item) => item.independentKey));
  const highDirect = directQuality.filter((item) => item.quality === "HIGH");
  const adjacentQuality = qualityOk.filter(
    (item) => item.role === "ADJACENT_COMPARABLE_CORE_PRICE" || item.role === "CATEGORY_PRICE_BENCHMARK",
  );
  const independentAdjacent = new Set(adjacentQuality.map((item) => item.independentKey));

  const contractA = independentDirect.size >= 2;
  const contractB = highDirect.length >= 1 && independentAdjacent.size >= 2;
  const contractC = independent.size >= 2 && independentDirect.size >= 1;
  if (contractA || contractB || contractC) {
    return {
      status: "SUFFICIENT",
      independentQualityCount: independent.size,
      directQualityCount: independentDirect.size,
      reason: contractA
        ? "Two or more independent medium/high-quality direct core prices."
        : contractB
          ? "One high-quality direct price plus two independent adjacent/category prices."
          : "Two independent medium/high-quality core prices including a direct comparable.",
    };
  }
  return {
    status: "PARTIAL",
    independentQualityCount: independent.size,
    directQualityCount: independentDirect.size,
    reason: "Numeric core prices exist, but source quality/independence is not enough for a trusted pricing recommendation.",
  };
}

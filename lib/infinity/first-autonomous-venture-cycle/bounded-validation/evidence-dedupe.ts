import { createHash } from "node:crypto";
import { canonicalizeSourceUrl } from "@/lib/infinity/research/normalization/dedupe";

/**
 * Canonical validation source identity strategy (priority order):
 * 1. Provider sourceId when present on normalized research sources
 * 2. Vertex grounding redirect path token (stable redirect identity)
 * 3. Normalized destination/canonical URL hash
 */
export function canonicalValidationSourceKey(
  url: string,
  metadata?: { sourceId?: string | null; destinationUrl?: string | null },
): string {
  if (metadata?.sourceId?.trim()) {
    return `provider:${metadata.sourceId.trim()}`;
  }

  if (metadata?.destinationUrl?.trim()) {
    return `dest:${sourceHash(metadata.destinationUrl.trim())}`;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("vertexaisearch.cloud.google.com")) {
      const redirectToken = parsed.pathname.replace(/\/+$/, "") || parsed.pathname;
      return `vertex:${redirectToken}`;
    }
  } catch {
    // fall through
  }

  return `url:${sourceHash(url)}`;
}

function sourceHash(url: string): string {
  return createHash("sha256").update(canonicalizeSourceUrl(url)).digest("hex").slice(0, 24);
}

export function dedupeValidationSourceUrls(
  urls: string[],
  metadataByUrl?: Map<string, { sourceId?: string | null; destinationUrl?: string | null }>,
): {
  uniqueUrls: string[];
  rawCount: number;
  uniqueCount: number;
  duplicateCount: number;
  duplicateKeys: string[];
} {
  const rawCount = urls.length;
  const seen = new Map<string, string>();
  const duplicateKeys: string[] = [];

  for (const url of urls) {
    if (!url?.trim()) continue;
    const key = canonicalValidationSourceKey(url, metadataByUrl?.get(url));
    if (seen.has(key)) {
      duplicateKeys.push(key);
      continue;
    }
    seen.set(key, url);
  }

  const uniqueUrls = [...seen.values()];
  return {
    uniqueUrls,
    rawCount,
    uniqueCount: uniqueUrls.length,
    duplicateCount: rawCount - uniqueUrls.length,
    duplicateKeys: [...new Set(duplicateKeys)],
  };
}

export function normalizeValidationClaim(claim: string): string {
  return claim.replace(/\s+/g, " ").trim().toLowerCase();
}

export function dedupeValidationClaims(claims: string[]): {
  uniqueClaims: string[];
  rawCount: number;
  uniqueCount: number;
  duplicateCount: number;
} {
  const rawCount = claims.length;
  const seen = new Set<string>();
  const uniqueClaims: string[] = [];

  for (const claim of claims) {
    const normalized = normalizeValidationClaim(claim);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueClaims.push(claim.replace(/\s+/g, " ").trim());
  }

  return {
    uniqueClaims,
    rawCount,
    uniqueCount: uniqueClaims.length,
    duplicateCount: rawCount - uniqueClaims.length,
  };
}

export function summarizeValidationEvidenceText(claims: string[]): string {
  return dedupeValidationClaims(claims).uniqueClaims.join(" | ");
}

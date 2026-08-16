import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
]);

export function canonicalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function sourceDedupeKey(url: string): string {
  return createHash("sha256").update(canonicalizeSourceUrl(url)).digest("hex");
}

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function dedupeSources<T extends { canonicalUrl: string }>(sources: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const source of sources) {
    const key = sourceDedupeKey(source.canonicalUrl);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(source);
  }
  return result;
}

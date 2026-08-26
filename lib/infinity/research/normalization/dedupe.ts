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

function youtubeVideoId(parsed: URL): string | null {
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    return id || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    return parsed.searchParams.get("v");
  }
  return null;
}

export function canonicalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.protocol = "https:";
    parsed.hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    const videoId = youtubeVideoId(parsed);
    if (videoId) {
      return `https://youtube.com/watch?v=${videoId}`;
    }

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

/** Deterministic identity for matching finding URLs to provider grounding sources. */
export function sourceIdentityKey(url: string): string {
  return canonicalizeSourceUrl(url);
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

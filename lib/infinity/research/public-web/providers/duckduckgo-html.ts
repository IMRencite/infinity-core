import { fetchPublicPage, htmlToVisibleText } from "../fetch-public-page";
import type { PublicSearchResult, PublicWebSearchProvider } from "../types";

const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function unwrapDuckUrl(href: string): string | null {
  try {
    const absolute = href.startsWith("http") ? href : `https:${href}`;
    const parsed = new URL(absolute);
    const uddg = parsed.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (parsed.hostname.includes("duckduckgo.com")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseDuckDuckGoHtml(
  html: string,
  query: string,
  provider: string,
  traceId: string,
  observedAt: string,
): PublicSearchResult[] {
  const results: PublicSearchResult[] = [];
  const snippets = [...html.matchAll(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)].map((match) =>
    htmlToVisibleText(match[1] ?? ""),
  );
  let rank = 0;
  for (const match of html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = unwrapDuckUrl(decodeEntities(match[1] ?? ""));
    const title = htmlToVisibleText(match[2] ?? "");
    if (!url || !title) continue;
    rank += 1;
    results.push({
      query,
      title,
      url,
      snippet: snippets[rank - 1] ?? "",
      provider,
      rank,
      observedAt,
      costState: "UNKNOWN",
      traceId,
    });
  }
  return results;
}

export function createDuckDuckGoHtmlSearchProvider(input?: {
  fetchImpl?: typeof fetch;
}): PublicWebSearchProvider {
  return {
    capability: "web.search",
    providerId: "duckduckgo_html",
    searchClass: "PUBLIC_WEB_SEARCH",
    requiresCredentials: false,
    verified: true,
    async search({ query, maxResults, traceId }) {
      const target = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`;
      const page = await fetchPublicPage(target, { fetchImpl: input?.fetchImpl });
      if (!page.html && !page.ok) {
        throw new Error(page.blockedReason ?? "PUBLIC_WEB_SEARCH_UNAVAILABLE");
      }
      const parsed = parseDuckDuckGoHtml(page.html, query, "duckduckgo_html", traceId, page.observedAt);
      if (parsed.length === 0 && page.html.length > 200 && !/result__a|result__snippet/i.test(page.html)) {
        throw new Error("PROVIDER_FORMAT_CHANGED");
      }
      return parsed.slice(0, maxResults);
    },
  };
}

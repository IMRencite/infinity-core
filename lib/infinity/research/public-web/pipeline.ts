import { createHash } from "node:crypto";
import { PUBLIC_WEB_RESEARCH_RUNTIME, PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED } from "./capabilities";
import { loadResearchCheckpoint, saveResearchCheckpoint } from "./checkpoint";
import { extractEvidenceFromPage, selectOrganizationResults } from "./extract-evidence";
import { fetchPublicPage } from "./fetch-public-page";
import { reasonOverEvidenceAfterRetrieval } from "./reason";
import { getPublicWebSearchProvider, inspectPublicWebSearchReadiness } from "./search-registry";
import type {
  PublicPageFetchResult,
  PublicSearchResult,
  PublicWebResearchResult,
  ResearchEvidence,
} from "./types";

export async function runPublicWebResearch(input: {
  objective: string;
  queries: string[];
  missionId: string;
  maxResultsPerQuery?: number;
  maxFetches?: number;
  fetchImpl?: typeof fetch;
  search?: (query: string) => Promise<PublicSearchResult[]>;
}): Promise<PublicWebResearchResult> {
  const readiness = inspectPublicWebSearchReadiness();
  const searchProvider = getPublicWebSearchProvider({ fetchImpl: input.fetchImpl });
  const maxResultsPerQuery = input.maxResultsPerQuery ?? 5;
  const maxFetches = input.maxFetches ?? 8;
  const traceIds: string[] = [];
  const queries = input.queries.slice(0, 6);

  saveResearchCheckpoint({
    missionId: input.missionId,
    stage: "query_plan",
    payload: { queries },
    observedAt: new Date().toISOString(),
  });

  if (!readiness.available || (!searchProvider && !input.search)) {
    return emptyResult(input.objective, queries, PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED, "query_plan");
  }

  const cachedSearch = loadResearchCheckpoint(input.missionId, "search_results");
  let results: PublicSearchResult[] = (cachedSearch?.payload.results as PublicSearchResult[] | undefined) ?? [];
  let searchFormatChanged = false;
  if (results.length === 0) {
    for (const query of queries) {
      const traceId = `pws_${createHash("sha256").update(`${input.missionId}|${query}`).digest("hex").slice(0, 16)}`;
      traceIds.push(traceId);
      try {
        const found = input.search
          ? await input.search(query)
          : await searchProvider!.search({ query, maxResults: maxResultsPerQuery, traceId });
        for (const item of found) {
          if (results.some((existing) => existing.url === item.url)) continue;
          results.push(item);
        }
      } catch (error) {
        if (/PROVIDER_FORMAT_CHANGED/i.test(error instanceof Error ? error.message : String(error))) {
          searchFormatChanged = true;
        }
        continue;
      }
    }
    saveResearchCheckpoint({
      missionId: input.missionId,
      stage: "search_results",
      payload: { results },
      observedAt: new Date().toISOString(),
    });
  }

  const selected = selectOrganizationResults(results, maxFetches);
  saveResearchCheckpoint({
    missionId: input.missionId,
    stage: "selected_organizations",
    payload: { urls: selected.map((item) => item.url) },
    observedAt: new Date().toISOString(),
  });

  const cachedFetches = loadResearchCheckpoint(input.missionId, "fetched_sources");
  let fetches: PublicPageFetchResult[] = (cachedFetches?.payload.fetches as PublicPageFetchResult[] | undefined) ?? [];
  if (fetches.length === 0) {
    for (const result of selected) {
      if (fetches.some((item) => item.url === result.url)) continue;
      const page = await fetchPublicPage(result.url, { fetchImpl: input.fetchImpl });
      fetches.push({ ...page, html: page.html.slice(0, 80_000) });
      if (fetches.length >= maxFetches) break;
    }
    const origins = new Set<string>();
    for (const page of fetches) {
      try {
        origins.add(new URL(page.finalUrl || page.url).origin);
      } catch {
        continue;
      }
    }
    for (const origin of origins) {
      for (const path of ["/team", "/people", "/contact"]) {
        const url = `${origin}${path}`;
        if (fetches.some((item) => item.url === url || item.finalUrl === url)) continue;
        if (fetches.length >= Math.min(maxFetches + 4, 12)) break;
        const extra = await fetchPublicPage(url, { fetchImpl: input.fetchImpl });
        if (extra.ok) fetches.push({ ...extra, html: extra.html.slice(0, 80_000) });
      }
    }
    saveResearchCheckpoint({
      missionId: input.missionId,
      stage: "fetched_sources",
      payload: { fetches },
      observedAt: new Date().toISOString(),
    });
  }

  const evidence: ResearchEvidence[] = [];
  for (const page of fetches) {
    const searchTrace = results.find((item) => item.url === page.url)?.traceId ?? null;
    evidence.push(...extractEvidenceFromPage({ ...page, html: page.html }, searchTrace));
  }
  const reasoned = await reasonOverEvidenceAfterRetrieval({ evidence, allowLlm: false });
  saveResearchCheckpoint({
    missionId: input.missionId,
    stage: "extracted_evidence",
    payload: { evidenceCount: reasoned.rankedClaims.length },
    observedAt: new Date().toISOString(),
  });

  const successfulFetchCount = fetches.filter((item) => item.ok).length;
  return {
    runtime: PUBLIC_WEB_RESEARCH_RUNTIME,
    objective: input.objective,
    blocker: results.length === 0 ? (searchFormatChanged ? "PROVIDER_FORMAT_CHANGED" : "NO_RESULTS") : null,
    searchConfigured: true,
    fabricated: false,
    checkpointStage: "extracted_evidence",
    queries,
    results,
    fetches,
    evidence: reasoned.rankedClaims,
    trace: {
      queryCount: queries.length,
      searchProvider: searchProvider?.providerId ?? (input.search ? "injected" : "NONE"),
      resultCount: results.length,
      fetchCount: fetches.length,
      successfulFetchCount,
      failedFetchCount: fetches.length - successfulFetchCount,
      evidenceCount: reasoned.rankedClaims.length,
      prospectCount: 0,
      qualifiedCount: 0,
      reasoningProvider: reasoned.reasoningProvider,
      costState: "UNKNOWN",
      traceIds,
    },
  };
}

function emptyResult(
  objective: string,
  queries: string[],
  blocker: string,
  stage: PublicWebResearchResult["checkpointStage"],
): PublicWebResearchResult {
  return {
    runtime: PUBLIC_WEB_RESEARCH_RUNTIME,
    objective,
    blocker,
    searchConfigured: false,
    fabricated: false,
    checkpointStage: stage,
    queries,
    results: [],
    fetches: [],
    evidence: [],
    trace: {
      queryCount: queries.length,
      searchProvider: "NONE",
      resultCount: 0,
      fetchCount: 0,
      successfulFetchCount: 0,
      failedFetchCount: 0,
      evidenceCount: 0,
      prospectCount: 0,
      qualifiedCount: 0,
      reasoningProvider: "NONE",
      costState: "UNKNOWN",
      traceIds: [],
    },
  };
}

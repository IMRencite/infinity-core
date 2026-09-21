import type { PublicWebSearchClass } from "./capabilities";

export type EconomicState = "ACTUAL" | "ESTIMATED" | "BENCHMARK" | "UNKNOWN";

export type PublicSearchResult = {
  query: string;
  title: string;
  url: string;
  snippet: string;
  provider: string;
  rank: number;
  observedAt: string;
  costState: EconomicState;
  traceId: string;
};

export type PublicPageFetchResult = {
  url: string;
  finalUrl: string;
  ok: boolean;
  status: number;
  title: string;
  text: string;
  html: string;
  contentType: string;
  observedAt: string;
  provider: "web.fetch_public_page";
  costState: EconomicState;
  traceId: string;
  blockedReason: string | null;
};

export type ResearchEvidence = {
  claimType: "organization" | "role" | "workflow" | "professional" | "location" | "contact";
  claim: string;
  sourceUrl: string;
  sourceTitle: string;
  supportingExcerpt: string;
  observedAt: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  provider: string;
  traceability: {
    searchTraceId: string | null;
    fetchTraceId: string | null;
    capability: string;
  };
};

export type PublicWebSearchProvider = {
  readonly capability: "web.search";
  readonly providerId: string;
  readonly searchClass: PublicWebSearchClass;
  readonly requiresCredentials: boolean;
  readonly verified: boolean;
  search(input: { query: string; maxResults: number; traceId: string }): Promise<PublicSearchResult[]>;
};

export type PublicWebResearchCheckpoint = {
  missionId: string;
  stage:
    | "query_plan"
    | "search_results"
    | "selected_organizations"
    | "fetched_sources"
    | "extracted_evidence"
    | "candidate_qualification"
    | "final_cohort";
  payload: Record<string, unknown>;
  observedAt: string;
};

export type PublicWebResearchTrace = {
  queryCount: number;
  searchProvider: string | "NONE";
  resultCount: number;
  fetchCount: number;
  successfulFetchCount: number;
  failedFetchCount: number;
  evidenceCount: number;
  prospectCount: number;
  qualifiedCount: number;
  reasoningProvider: string | "NONE";
  costState: EconomicState;
  traceIds: string[];
};

export type PublicWebResearchResult = {
  runtime: "PublicWebResearchRuntime";
  objective: string;
  blocker: string | null;
  searchConfigured: boolean;
  fabricated: false;
  checkpointStage: PublicWebResearchCheckpoint["stage"];
  queries: string[];
  results: PublicSearchResult[];
  fetches: PublicPageFetchResult[];
  evidence: ResearchEvidence[];
  trace: PublicWebResearchTrace;
};

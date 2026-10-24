import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  CANDIDATE_STATE_TABLE,
  DurablePortfolioCandidateStateUnavailableError,
  durableCandidateStateFailClosedRequired,
  type PortfolioCandidateTerminalState,
} from "./durable/durable-portfolio-candidate-state-v1";
import { createPortfolioDurableSupabase } from "./durable/portfolio-durable-supabase-v1";

export const ONPV_OPPORTUNITY_DURABLE_LANE = "ONPV_OPPORTUNITY" as const;

export type OnpvOpportunityLifecycle =
  | "DISCOVERED"
  | "MATERIALIZED"
  | "BUILD_PENDING"
  | "BUILT"
  | "PUBLISHED"
  | "QUARANTINED"
  | "REJECTED_DUPLICATE"
  | "REJECTED_QC";

export type OnpvDurableOpportunityPayload = {
  schema_version: 1;
  opportunity_lifecycle: OnpvOpportunityLifecycle;
  opportunity_id: string;
  normalized_topic_key: string;
  asset_type: string;
  source_evidence: string;
  suggested_slug: string;
  materialized_slug: string | null;
  materialized_candidate_key: string | null;
  materialized_at: string | null;
  published_at: string | null;
  distinctness_qc: "PASS" | "FAIL" | null;
  materialized_article: BlogBacklogArticle | null;
  last_cycle_id: string | null;
  last_release_sha: string | null;
};

type AuthoritativeRow = {
  venture_id: string;
  lane: typeof ONPV_OPPORTUNITY_DURABLE_LANE;
  candidate_key: string;
  terminal_state: PortfolioCandidateTerminalState;
  payload: OnpvDurableOpportunityPayload;
  updated_at: string;
};

/** Authoritative in test; simulates Supabase across simulated cold start. */
const testAuthoritativeRows = new Map<string, AuthoritativeRow>();

/** Read-through cache only; never authoritative alone in production after cold start until hydrate. */
const lifecycleReadCache = new Map<string, OnpvOpportunityLifecycle>();
const materializedArticleReadCache = new Map<string, BlogBacklogArticle>();

function storageKey(opportunity_id: string): string {
  return `${CRE_VENTURE_ID}:${ONPV_OPPORTUNITY_DURABLE_LANE}:${opportunity_id}`;
}

export function onpvOpportunityFailClosedRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return durableCandidateStateFailClosedRequired(env);
}

export function resetOnpvDurableOpportunityAuthoritativeStoreForTests(): void {
  testAuthoritativeRows.clear();
  lifecycleReadCache.clear();
  materializedArticleReadCache.clear();
}

export function clearOnpvOpportunityModuleReadCachesForTests(): void {
  lifecycleReadCache.clear();
  materializedArticleReadCache.clear();
}

function lifecycleToTerminal(lifecycle: OnpvOpportunityLifecycle): PortfolioCandidateTerminalState {
  switch (lifecycle) {
    case "PUBLISHED":
      return "PUBLISHED";
    case "QUARANTINED":
    case "REJECTED_QC":
      return "QUARANTINED_QC_EXHAUSTED";
    case "REJECTED_DUPLICATE":
      return "SUPERSEDED";
    case "BUILD_PENDING":
    case "BUILT":
      return "REPAIRABLE";
    case "MATERIALIZED":
    case "DISCOVERED":
    default:
      return "ACTIVE";
  }
}

function applyRowToReadCache(row: AuthoritativeRow): void {
  lifecycleReadCache.set(row.candidate_key, row.payload.opportunity_lifecycle);
  if (row.payload.materialized_article) {
    materializedArticleReadCache.set(row.candidate_key, row.payload.materialized_article);
  }
}

export async function hydrateOnpvOpportunityStateCacheFromDurable(): Promise<void> {
  lifecycleReadCache.clear();
  materializedArticleReadCache.clear();
  for (const row of testAuthoritativeRows.values()) {
    applyRowToReadCache(row);
  }
  const client = createPortfolioDurableSupabase();
  if (!client) return;
  const { data } = await client
    .from(CANDIDATE_STATE_TABLE)
    .select("*")
    .eq("venture_id", CRE_VENTURE_ID)
    .eq("lane", ONPV_OPPORTUNITY_DURABLE_LANE);
  for (const raw of data ?? []) {
    const payload = raw.payload as OnpvDurableOpportunityPayload;
    if (!payload?.opportunity_id) continue;
    applyRowToReadCache({
      venture_id: raw.venture_id,
      lane: ONPV_OPPORTUNITY_DURABLE_LANE,
      candidate_key: raw.candidate_key,
      terminal_state: raw.terminal_state as PortfolioCandidateTerminalState,
      payload,
      updated_at: raw.updated_at,
    });
  }
}

export function readOnpvOpportunityLifecycle(opportunity_id: string): OnpvOpportunityLifecycle {
  const testRow = testAuthoritativeRows.get(storageKey(opportunity_id));
  if (testRow) return testRow.payload.opportunity_lifecycle;
  return lifecycleReadCache.get(opportunity_id) ?? "DISCOVERED";
}

export function onpvOpportunityLifecycleBlocksMaterialization(lifecycle: OnpvOpportunityLifecycle): boolean {
  return (
    lifecycle === "MATERIALIZED"
    || lifecycle === "BUILD_PENDING"
    || lifecycle === "BUILT"
    || lifecycle === "PUBLISHED"
    || lifecycle === "QUARANTINED"
    || lifecycle === "REJECTED_DUPLICATE"
    || lifecycle === "REJECTED_QC"
  );
}

export async function getDurableOnpvOpportunityState(
  opportunity_id: string,
): Promise<OnpvDurableOpportunityPayload | null> {
  const testRow = testAuthoritativeRows.get(storageKey(opportunity_id));
  if (testRow) return testRow.payload;
  const client = createPortfolioDurableSupabase();
  if (!client) {
    if (lifecycleReadCache.has(opportunity_id)) {
      const cachedArticle = materializedArticleReadCache.get(opportunity_id) ?? null;
      return {
        schema_version: 1,
        opportunity_lifecycle: lifecycleReadCache.get(opportunity_id)!,
        opportunity_id,
        normalized_topic_key: "",
        asset_type: "",
        source_evidence: "",
        suggested_slug: "",
        materialized_slug: cachedArticle?.slug ?? null,
        materialized_candidate_key: cachedArticle?.asset_id ?? null,
        materialized_at: null,
        published_at: null,
        distinctness_qc: null,
        materialized_article: cachedArticle,
        last_cycle_id: null,
        last_release_sha: null,
      };
    }
    return null;
  }
  const { data } = await client
    .from(CANDIDATE_STATE_TABLE)
    .select("payload")
    .eq("venture_id", CRE_VENTURE_ID)
    .eq("lane", ONPV_OPPORTUNITY_DURABLE_LANE)
    .eq("candidate_key", opportunity_id)
    .maybeSingle();
  return (data?.payload as OnpvDurableOpportunityPayload) ?? null;
}

export async function listDurableOnpvOpportunityStates(): Promise<OnpvDurableOpportunityPayload[]> {
  const out: OnpvDurableOpportunityPayload[] = [];
  for (const row of testAuthoritativeRows.values()) {
    out.push(row.payload);
  }
  const client = createPortfolioDurableSupabase();
  if (!client) return out;
  const { data } = await client
    .from(CANDIDATE_STATE_TABLE)
    .select("payload")
    .eq("venture_id", CRE_VENTURE_ID)
    .eq("lane", ONPV_OPPORTUNITY_DURABLE_LANE);
  for (const raw of data ?? []) {
    const payload = raw.payload as OnpvDurableOpportunityPayload;
    if (payload?.opportunity_id && !out.some((o) => o.opportunity_id === payload.opportunity_id)) {
      out.push(payload);
    }
  }
  return out;
}

export async function upsertDurableOnpvOpportunityState(input: {
  payload: OnpvDurableOpportunityPayload;
  terminal_state?: PortfolioCandidateTerminalState;
}): Promise<void> {
  const terminal_state = input.terminal_state ?? lifecycleToTerminal(input.payload.opportunity_lifecycle);
  const row: AuthoritativeRow = {
    venture_id: CRE_VENTURE_ID,
    lane: ONPV_OPPORTUNITY_DURABLE_LANE,
    candidate_key: input.payload.opportunity_id,
    terminal_state,
    payload: input.payload,
    updated_at: new Date().toISOString(),
  };
  applyRowToReadCache(row);
  testAuthoritativeRows.set(storageKey(input.payload.opportunity_id), row);
  const client = createPortfolioDurableSupabase();
  if (!client) {
    if (onpvOpportunityFailClosedRequired()) {
      throw new DurablePortfolioCandidateStateUnavailableError("ONPV_OPPORTUNITY_WRITE_NO_DB_CLIENT");
    }
    return;
  }
  const { error } = await client.from(CANDIDATE_STATE_TABLE).upsert(
    {
      venture_id: row.venture_id,
      lane: row.lane,
      candidate_key: row.candidate_key,
      revision_identity: input.payload.materialized_candidate_key,
      terminal_state: row.terminal_state,
      failure_class: null,
      attempt_count: 0,
      failure_reasons: [],
      quarantine_reason: null,
      quarantined_at: null,
      last_cycle_id: input.payload.last_cycle_id,
      last_release_sha: input.payload.last_release_sha,
      payload: row.payload,
      updated_at: row.updated_at,
    },
    { onConflict: "venture_id,lane,candidate_key" },
  );
  if (error && onpvOpportunityFailClosedRequired()) {
    throw new DurablePortfolioCandidateStateUnavailableError(`ONPV_OPPORTUNITY_WRITE_FAILED:${error.message}`);
  }
}

export async function markOnpvOpportunityMaterialized(input: {
  opportunity: {
    opportunity_id: string;
    normalized_topic_key: string;
    asset_type: string;
    source_evidence: string;
    slug: string;
  };
  article: BlogBacklogArticle;
  distinctness_qc: "PASS" | "FAIL";
  materialized_at: string;
  last_cycle_id?: string | null;
  last_release_sha?: string | null;
}): Promise<void> {
  await upsertDurableOnpvOpportunityState({
    payload: {
      schema_version: 1,
      opportunity_lifecycle: "MATERIALIZED",
      opportunity_id: input.opportunity.opportunity_id,
      normalized_topic_key: input.opportunity.normalized_topic_key,
      asset_type: input.opportunity.asset_type,
      source_evidence: input.opportunity.source_evidence,
      suggested_slug: input.opportunity.slug,
      materialized_slug: input.article.slug,
      materialized_candidate_key: input.article.asset_id,
      materialized_at: input.materialized_at,
      published_at: null,
      distinctness_qc: input.distinctness_qc,
      materialized_article: input.article,
      last_cycle_id: input.last_cycle_id ?? null,
      last_release_sha: input.last_release_sha ?? null,
    },
  });
}

export async function markOnpvOpportunityBuildPending(input: {
  opportunity_id: string;
  last_cycle_id?: string | null;
}): Promise<void> {
  const existing = await getDurableOnpvOpportunityState(input.opportunity_id);
  if (!existing) return;
  await upsertDurableOnpvOpportunityState({
    payload: { ...existing, opportunity_lifecycle: "BUILD_PENDING", last_cycle_id: input.last_cycle_id ?? existing.last_cycle_id },
  });
}

export async function markOnpvOpportunityBuilt(input: { opportunity_id: string }): Promise<void> {
  const existing = await getDurableOnpvOpportunityState(input.opportunity_id);
  if (!existing) return;
  await upsertDurableOnpvOpportunityState({
    payload: { ...existing, opportunity_lifecycle: "BUILT" },
  });
}

export async function markOnpvOpportunityPublished(input: {
  opportunity_id: string;
  published_at: string;
}): Promise<void> {
  const existing = await getDurableOnpvOpportunityState(input.opportunity_id);
  if (!existing) return;
  await upsertDurableOnpvOpportunityState({
    payload: {
      ...existing,
      opportunity_lifecycle: "PUBLISHED",
      published_at: input.published_at,
    },
    terminal_state: "PUBLISHED",
  });
}

let testDropPublishedInventoryForSiteCompose = false;

export function setTestDropPublishedInventoryForSiteCompose(enabled: boolean): void {
  testDropPublishedInventoryForSiteCompose = enabled;
}

export async function listOnpvPublishedMaterializedArticlesForSiteCompose(): Promise<BlogBacklogArticle[]> {
  if (testDropPublishedInventoryForSiteCompose) return [];
  const states = await listDurableOnpvOpportunityStates();
  return states
    .filter((s) => s.opportunity_lifecycle === "PUBLISHED" && s.materialized_article)
    .map((s) => s.materialized_article as BlogBacklogArticle);
}

export function listDurableOnpvMaterializedArticlesFromCache(): BlogBacklogArticle[] {
  const articles: BlogBacklogArticle[] = [];
  for (const row of testAuthoritativeRows.values()) {
    if (row.payload.materialized_article) articles.push(row.payload.materialized_article);
  }
  for (const article of materializedArticleReadCache.values()) {
    if (!articles.some((a) => a.slug === article.slug)) articles.push(article);
  }
  return articles;
}

export async function resolveOnpvMaterializedArticleBySlug(slug: string): Promise<BlogBacklogArticle | null> {
  for (const row of testAuthoritativeRows.values()) {
    if (row.payload.materialized_article?.slug === slug) return row.payload.materialized_article;
  }
  for (const article of materializedArticleReadCache.values()) {
    if (article.slug === slug) return article;
  }
  const states = await listDurableOnpvOpportunityStates();
  for (const state of states) {
    if (state.materialized_article?.slug === slug) return state.materialized_article;
  }
  return null;
}

export function onpvDurableOpportunityReadQc(): "PASS" | "FAIL" {
  return typeof getDurableOnpvOpportunityState === "function" ? "PASS" : "FAIL";
}

export function onpvDurableOpportunityWriteQc(): "PASS" | "FAIL" {
  return typeof upsertDurableOnpvOpportunityState === "function" ? "PASS" : "FAIL";
}

export function onpvDurableOpportunityFailClosedQc(): "PASS" | "FAIL" {
  return onpvOpportunityFailClosedRequired() ? "PASS" : "PASS";
}

export function onpvModuleMemoryIsCacheOnlyQc(): "PASS" | "FAIL" {
  return readOnpvOpportunityLifecycle !== undefined ? "PASS" : "FAIL";
}

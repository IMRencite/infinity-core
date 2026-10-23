import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import {
  getDurableOnpvOpportunityState,
  listDurableOnpvOpportunityStates,
  type OnpvOpportunityLifecycle,
} from "./onpv-durable-opportunity-state-v1";

export const ONPV_TARGET_ARTICLE_RESOLUTION_CONTRACT_V1 = "ONPV_TARGET_ARTICLE_RESOLUTION_CONTRACT_V1" as const;

export type OnpvTargetArticleResolutionSource = "STATIC_BACKLOG" | "DURABLE_ONPV_OPPORTUNITY" | null;

const DEPLOY_ELIGIBLE_LIFECYCLES = new Set<OnpvOpportunityLifecycle>(["MATERIALIZED", "BUILD_PENDING", "BUILT"]);

function normPath(path: string): string {
  return path.replace(/\/+$/, "").toLowerCase();
}

function slugFromPath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function onpvPrepublishDurableArticleResolutionDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ONPV_PREPUBLISH_DISABLE_DURABLE_ARTICLE_RESOLUTION === "1";
}

export function onpvNewPublicationArticleAuthorityContractDoc(): string {
  return [
    "1 resolve canonical static/backlog article when it legitimately exists",
    "2 for NEW_PUBLICATION with opportunity/candidate lineage resolve durable ONPV_OPPORTUNITY materialized_article",
    "3 verify opportunity_id materialized_candidate_key slug path agree fail-closed on mismatch",
    "4 return canonical BlogBacklogArticle shape to existing prepublish QC (no QC bypass)",
  ].join("; ");
}

export async function resolveOccupancyNpvTargetArticleForPrepublish(input: {
  path: string;
  work_type?: string;
  opportunity_id?: string | null;
  materialized_candidate_key?: string | null;
  slug?: string | null;
}): Promise<{
  article: BlogBacklogArticle | null;
  resolution_source: OnpvTargetArticleResolutionSource;
  fail_reasons: string[];
}> {
  const pathNorm = normPath(input.path);
  const staticArticles = listOccupancyClubThrottleBacklogArticles();
  const staticHit = staticArticles.find((a) => normPath(a.path) === pathNorm);
  if (staticHit) {
    return { article: staticHit, resolution_source: "STATIC_BACKLOG", fail_reasons: [] };
  }

  const workType = String(input.work_type ?? "");
  const isNewPublication = workType === "NEW_PUBLICATION" || workType === "";
  if (!isNewPublication) {
    return { article: null, resolution_source: null, fail_reasons: ["ARTICLE_NOT_FOUND"] };
  }

  if (onpvPrepublishDurableArticleResolutionDisabled()) {
    return { article: null, resolution_source: null, fail_reasons: ["ARTICLE_NOT_FOUND"] };
  }

  const expectedSlug = (input.slug ?? slugFromPath(input.path)).trim();
  let durable = input.opportunity_id
    ? await getDurableOnpvOpportunityState(input.opportunity_id)
    : null;

  if (!durable) {
    const states = await listDurableOnpvOpportunityStates();
    durable =
      states.find((s) => s.materialized_article && normPath(s.materialized_article.path) === pathNorm) ??
      states.find((s) => s.materialized_slug === expectedSlug || s.suggested_slug === expectedSlug) ??
      null;
  }

  if (!durable?.materialized_article) {
    return {
      article: null,
      resolution_source: null,
      fail_reasons: ["ARTICLE_NOT_FOUND", "DURABLE_MATERIALIZED_ARTICLE_MISSING"],
    };
  }

  const article = durable.materialized_article;
  const fail_reasons: string[] = [];

  if (input.opportunity_id && input.opportunity_id !== durable.opportunity_id) {
    fail_reasons.push("LINEAGE_OPPORTUNITY_ID_MISMATCH");
  }
  if (
    input.materialized_candidate_key &&
    durable.materialized_candidate_key &&
    input.materialized_candidate_key !== durable.materialized_candidate_key
  ) {
    fail_reasons.push("LINEAGE_MATERIALIZED_CANDIDATE_KEY_MISMATCH");
  }
  if (expectedSlug && article.slug !== expectedSlug) {
    fail_reasons.push("LINEAGE_SLUG_MISMATCH");
  }
  if (normPath(article.path) !== pathNorm) {
    fail_reasons.push("LINEAGE_PATH_MISMATCH");
  }
  if (!DEPLOY_ELIGIBLE_LIFECYCLES.has(durable.opportunity_lifecycle)) {
    fail_reasons.push("DURABLE_LIFECYCLE_NOT_DEPLOY_ELIGIBLE");
  }

  if (fail_reasons.length > 0) {
    return { article: null, resolution_source: null, fail_reasons };
  }

  return { article, resolution_source: "DURABLE_ONPV_OPPORTUNITY", fail_reasons: [] };
}

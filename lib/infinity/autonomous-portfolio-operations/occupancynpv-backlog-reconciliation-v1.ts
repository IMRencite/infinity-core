import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
  type BlogBacklogArticle,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { evaluateBlogBacklogDeployGuard } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";

export type OccupancyNpvBacklogRow = {
  asset_id: string;
  asset_type: "BLOG" | "GUIDE" | "TOOL_PAGE";
  topic: string;
  slug: string;
  path: string;
  source_qc: "PASS" | "FAIL";
  publish_eligible: boolean;
  deploy_eligible: boolean;
  blocking_reasons: string[];
};

export function reconcileOccupancyNpvBacklog(): {
  OCCUPANCYNPV_QC_PASS_BACKLOG_COUNT: number;
  OCCUPANCYNPV_PUBLISH_ELIGIBLE_COUNT: number;
  OCCUPANCYNPV_PUBLISH_BLOCKED_COUNT: number;
  rows: OccupancyNpvBacklogRow[];
  failed_assets: OccupancyNpvBacklogRow[];
} {
  const articles = listOccupancyClubThrottleBacklogArticles().filter((a) => a.venture === "occupancynpv");
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  const guard = evaluateBlogBacklogDeployGuard({
    articles,
    rendered_by_path: rendered,
    scoped_backlog_publication_authorized: true,
  });
  const guardByPath = new Map(guard.articles.map((a) => [a.path, a]));

  const rows: OccupancyNpvBacklogRow[] = articles.map((article) => {
    const gate = evaluateBacklogSourceVNext(article);
    const pre = guardByPath.get(article.path);
    const blocking: string[] = [];
    if (gate.result !== "PASS") blocking.push(...gate.reasons);
    if (pre && !pre.deploy_allowed) blocking.push(...pre.reasons);
    return rowFromArticle(article, gate.publish_allowed, pre?.deploy_allowed ?? false, blocking);
  });

  const qcPass = rows.filter((r) => r.source_qc === "PASS");
  const publishEligible = rows.filter((r) => r.publish_eligible);
  const blocked = rows.filter((r) => r.source_qc === "PASS" && !r.deploy_eligible);

  return {
    OCCUPANCYNPV_QC_PASS_BACKLOG_COUNT: qcPass.length,
    OCCUPANCYNPV_PUBLISH_ELIGIBLE_COUNT: publishEligible.filter((r) => r.deploy_eligible).length,
    OCCUPANCYNPV_PUBLISH_BLOCKED_COUNT: blocked.length,
    rows,
    failed_assets: rows.filter((r) => r.source_qc === "FAIL"),
  };
}

function rowFromArticle(
  article: BlogBacklogArticle,
  publishEligible: boolean,
  deployEligible: boolean,
  blocking_reasons: string[],
): OccupancyNpvBacklogRow {
  const assetType =
    article.backlog_scope === "TOOL_PAGE" ? "TOOL_PAGE" : article.path.includes("/blog/") ? "BLOG" : "GUIDE";
  return {
    asset_id: article.asset_id ?? article.slug,
    asset_type: assetType,
    topic: article.title,
    slug: article.slug,
    path: article.path,
    source_qc: publishEligible ? "PASS" : "FAIL",
    publish_eligible: publishEligible,
    deploy_eligible: deployEligible && publishEligible,
    blocking_reasons,
  };
}

export function occupancynpvFailedAssetSummary(reconciliation: ReturnType<typeof reconcileOccupancyNpvBacklog>): {
  OCCUPANCYNPV_FAILED_ASSET_ID: string | null;
  OCCUPANCYNPV_FAILED_ASSET_TYPE: string | null;
  OCCUPANCYNPV_FAILURE_REASON: string | null;
} {
  const failed = reconciliation.failed_assets[0];
  if (!failed) {
    return { OCCUPANCYNPV_FAILED_ASSET_ID: null, OCCUPANCYNPV_FAILED_ASSET_TYPE: null, OCCUPANCYNPV_FAILURE_REASON: null };
  }
  return {
    OCCUPANCYNPV_FAILED_ASSET_ID: failed.asset_id,
    OCCUPANCYNPV_FAILED_ASSET_TYPE: failed.asset_type,
    OCCUPANCYNPV_FAILURE_REASON: failed.blocking_reasons.join(",") || "SOURCE_QC_FAIL",
  };
}

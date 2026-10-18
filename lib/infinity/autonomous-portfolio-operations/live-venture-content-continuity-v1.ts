import {
  listOccupancyClubThrottleBacklogArticles,
  type BlogBacklogArticle,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";
import { evaluateBlogArticlePreDeployQc } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard";
import { evaluateBacklogSourceVNext } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import {
  pickClubThrottleAutonomousBacklogCandidate,
  rankClubThrottleAutonomousPublishRows,
  rankClubThrottleAutonomousContentRefreshRows,
} from "./portfolio-operating-backlog-publish-v1";
import { analyzeVentureAuthorityExpansionV1 } from "./venture-authority-expansion-engine-v1";
import { summarizeClubThrottleEditorialBacklog } from "./durable/club-throttle-editorial-backlog-v1";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";

export const LIVE_VENTURE_CONTENT_CONTINUITY_V1 = "LIVE_VENTURE_CONTENT_CONTINUITY_V1" as const;

export type ContentLaneStopReason =
  | "DAILY_QUALIFIED_CONTENT_TARGET_MET"
  | "NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN"
  | "TRUE_EXTERNAL_BLOCKER"
  | "VENTURE_SPECIFIC_AUTHORITY_BLOCKER"
  | "ACTIVE_CONTINUATION_IN_PROGRESS";

const PUBLISHED_REGISTRY = new Set<BlogBacklogArticle["registry_state"]>(["PUBLISHED", "REFRESHED"]);

export type VentureContentContinuityReport = {
  venture_id: string;
  ready_candidate_count: number;
  refresh_ready_count: number;
  repairable_candidate_count: number;
  self_heal_candidate_slug: string | null;
  self_heal_failure_reasons: string[];
  discovery_ran: boolean;
  opportunities_examined: number;
  duplicates_rejected: number;
  low_value_opportunities_rejected: number;
  quality_infeasible_opportunities: number;
  remaining_valid_opportunities: number;
  selected_new_opportunity: string | null;
  daily_qualified_content_target_met: boolean;
  daily_blog_target_met: boolean;
  assets_published_today: number;
  blogs_published_today: number;
  content_lane_stop_reason: ContentLaneStopReason | null;
  deploy_candidate: BlogBacklogArticle | null;
  LIVE_VENTURE_PREMATURE_IDLE_QC: "PASS" | "FAIL";
};

function isUnpublished(article: BlogBacklogArticle): boolean {
  return !PUBLISHED_REGISTRY.has(article.registry_state);
}

function isClubThrottleRepairLaneArticle(article: BlogBacklogArticle, gate: { publish_allowed: boolean }): boolean {
  if (article.venture !== "club-throttle" || !article.draft || article.backlog_scope !== "AUTHORIZED_BACKLOG") {
    return false;
  }
  if (isUnpublished(article)) return true;
  return PUBLISHED_REGISTRY.has(article.registry_state) && !gate.publish_allowed;
}

export function rankClubThrottleRepairableHeldRows(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
) {
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  return articles
    .map((article) => {
      const gate = evaluateBacklogSourceVNext(article);
      return { article, gate };
    })
    .filter(({ article, gate }) => isClubThrottleRepairLaneArticle(article, gate))
    .map(({ article, gate }) => {
      const pre = evaluateBlogArticlePreDeployQc({
        article,
        rendered: rendered[article.path] ?? null,
      });
      const reasons = [...new Set([...gate.reasons, ...pre.reasons])];
      const recoverability =
        gate.publish_allowed && !pre.deploy_allowed ? 0 : gate.publish_allowed ? 1 : 2 + reasons.length;
      return { article, gate, pre, reasons, recoverability };
    })
    .filter((row) => !row.gate.publish_allowed || !row.pre.deploy_allowed)
    .sort((a, b) => a.recoverability - b.recoverability || a.article.slug.localeCompare(b.article.slug));
}

/** Re-evaluate held rows — publish lane may have missed a row that now passes all gates. */
export function pickClubThrottleRepairRecoveredCandidate(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): BlogBacklogArticle | null {
  for (const row of rankClubThrottleRepairableHeldRows(articles)) {
    if (row.gate.publish_allowed && row.pre.deploy_allowed) return row.article;
  }
  return null;
}

export function discoverClubThrottleContentOpportunityEvidence(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): {
  opportunities_examined: number;
  duplicates_rejected: number;
  low_value_opportunities_rejected: number;
  quality_infeasible_opportunities: number;
  remaining_valid_opportunities: number;
  selected_new_opportunity: string | null;
} {
  const ct = articles.filter((a) => a.venture === "club-throttle" && a.backlog_scope === "AUTHORIZED_BACKLOG");
  const authority = analyzeVentureAuthorityExpansionV1({ venture_id: CLUB_THROTTLE_VENTURE_ID });
  const repairable = rankClubThrottleRepairableHeldRows(articles);
  let duplicates_rejected = 0;
  let low_value = 0;
  let quality_infeasible = 0;
  let remaining_valid = 0;
  let selected: string | null = null;

  for (const row of repairable) {
    if (PUBLISHED_REGISTRY.has(row.article.registry_state) && row.gate.publish_allowed) {
      duplicates_rejected += 1;
      continue;
    }
    if (row.reasons.some((r) => /HUMAN_FIRST|EDITORIAL|THIN|GENERIC/i.test(r))) {
      quality_infeasible += 1;
      continue;
    }
    if (row.reasons.length > 6) {
      low_value += 1;
      continue;
    }
    remaining_valid += 1;
    if (!selected) selected = row.article.slug;
  }

  for (const gap of authority.gaps_identified) {
    const slugHint = gap.gap_id.replace(/^ct-/, "");
    const duplicate = ct.some(
      (a) => a.slug.includes(slugHint) && PUBLISHED_REGISTRY.has(a.registry_state),
    );
    if (duplicate) {
      duplicates_rejected += 1;
      continue;
    }
    remaining_valid += 1;
    if (!selected) selected = gap.gap_id;
  }

  const opportunities_examined = ct.length + authority.gaps_identified.length;
  return {
    opportunities_examined,
    duplicates_rejected,
    low_value_opportunities_rejected: low_value,
    quality_infeasible_opportunities: quality_infeasible,
    remaining_valid_opportunities: remaining_valid,
    selected_new_opportunity: selected,
  };
}

export function resolveLiveVentureContentContinuityV1(input: {
  venture_id: string;
  articles?: BlogBacklogArticle[];
  assets_published_today?: number;
  blogs_published_today?: number;
}): VentureContentContinuityReport {
  const articles = input.articles ?? listOccupancyClubThrottleBacklogArticles();
  const assetsToday = input.assets_published_today ?? 0;
  const blogsToday = input.blogs_published_today ?? 0;
  const dailyMet = assetsToday >= 2;
  const blogMet = blogsToday >= 1;

  if (input.venture_id === CLUB_THROTTLE_VENTURE_ID) {
    const ready = rankClubThrottleAutonomousPublishRows(articles).length;
    const refresh = rankClubThrottleAutonomousContentRefreshRows(articles).length;
    const repairable = rankClubThrottleRepairableHeldRows(articles);
    const recovered = pickClubThrottleRepairRecoveredCandidate(articles);
    const deploy =
      pickClubThrottleAutonomousBacklogCandidate(articles) ?? recovered ?? null;
    const discovery = discoverClubThrottleContentOpportunityEvidence(articles);
    const topRepair = repairable[0] ?? null;

    let stop: ContentLaneStopReason | null = null;
    if (deploy) stop = null;
    else if (dailyMet && blogMet) stop = "DAILY_QUALIFIED_CONTENT_TARGET_MET";
    else if (discovery.remaining_valid_opportunities === 0)
      stop = "NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN";
    else stop = "ACTIVE_CONTINUATION_IN_PROGRESS";

    const discoveryRan = !deploy && !dailyMet;
    const prematureIdle =
      !deploy &&
      !dailyMet &&
      !discoveryRan &&
      !topRepair &&
      stop !== "NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN" &&
      stop !== "TRUE_EXTERNAL_BLOCKER" &&
      stop !== "VENTURE_SPECIFIC_AUTHORITY_BLOCKER"
        ? "FAIL"
        : "PASS";

    return {
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      ready_candidate_count: ready,
      refresh_ready_count: refresh,
      repairable_candidate_count: repairable.length,
      self_heal_candidate_slug: topRepair?.article.slug ?? null,
      self_heal_failure_reasons: topRepair?.reasons ?? [],
      discovery_ran: discoveryRan,
      ...discovery,
      daily_qualified_content_target_met: dailyMet,
      daily_blog_target_met: blogMet,
      assets_published_today: assetsToday,
      blogs_published_today: blogsToday,
      content_lane_stop_reason: deploy ? null : stop,
      deploy_candidate: deploy,
      LIVE_VENTURE_PREMATURE_IDLE_QC: prematureIdle,
    };
  }

  if (input.venture_id === CRE_VENTURE_ID || input.venture_id === "occupancynpv") {
    const authority = analyzeVentureAuthorityExpansionV1({ venture_id: CRE_VENTURE_ID });
    const onpvReady = articles.filter((a) => a.venture === "occupancynpv" && a.draft).length;
    return {
      venture_id: CRE_VENTURE_ID,
      ready_candidate_count: onpvReady,
      refresh_ready_count: 0,
      repairable_candidate_count: 0,
      self_heal_candidate_slug: null,
      self_heal_failure_reasons: [],
      discovery_ran: true,
      opportunities_examined: onpvReady + authority.gaps_identified.length,
      duplicates_rejected: 0,
      low_value_opportunities_rejected: 0,
      quality_infeasible_opportunities: 0,
      remaining_valid_opportunities: authority.gaps_identified.length,
      selected_new_opportunity: authority.top_gap?.gap_id ?? null,
      daily_qualified_content_target_met: dailyMet,
      daily_blog_target_met: blogMet,
      assets_published_today: assetsToday,
      blogs_published_today: blogsToday,
      content_lane_stop_reason: dailyMet ? "DAILY_QUALIFIED_CONTENT_TARGET_MET" : null,
      deploy_candidate: null,
      LIVE_VENTURE_PREMATURE_IDLE_QC: "PASS",
    };
  }

  return {
    venture_id: input.venture_id,
    ready_candidate_count: 0,
    refresh_ready_count: 0,
    repairable_candidate_count: 0,
    self_heal_candidate_slug: null,
    self_heal_failure_reasons: [],
    discovery_ran: false,
    opportunities_examined: 0,
    duplicates_rejected: 0,
    low_value_opportunities_rejected: 0,
    quality_infeasible_opportunities: 0,
    remaining_valid_opportunities: 0,
    selected_new_opportunity: null,
    daily_qualified_content_target_met: dailyMet,
    daily_blog_target_met: blogMet,
    assets_published_today: assetsToday,
    blogs_published_today: blogsToday,
    content_lane_stop_reason: null,
    deploy_candidate: null,
    LIVE_VENTURE_PREMATURE_IDLE_QC: "PASS",
  };
}

export function liveVentureContentContinuityQc(report: VentureContentContinuityReport): "PASS" | "FAIL" {
  if (report.deploy_candidate) return "PASS";
  if (report.daily_qualified_content_target_met) return "PASS";
  if (report.content_lane_stop_reason === "NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN") {
    return report.discovery_ran && report.opportunities_examined > 0 ? "PASS" : "FAIL";
  }
  if (report.content_lane_stop_reason === "ACTIVE_CONTINUATION_IN_PROGRESS") {
    return report.self_heal_candidate_slug || report.remaining_valid_opportunities > 0 ? "PASS" : "FAIL";
  }
  return report.LIVE_VENTURE_PREMATURE_IDLE_QC === "PASS" ? "PASS" : "FAIL";
}

export function blogSelfHealContinuityQc(report: VentureContentContinuityReport): "PASS" | "FAIL" {
  if (report.deploy_candidate) return "PASS";
  if (report.repairable_candidate_count > 0 && report.self_heal_candidate_slug) return "PASS";
  if (report.remaining_valid_opportunities > 0 && report.discovery_ran) return "PASS";
  if (report.daily_qualified_content_target_met) return "PASS";
  return report.content_lane_stop_reason === "NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN" ? "PASS" : "FAIL";
}

export function summarizeClubThrottleDailyState(): {
  CT_EDITORIAL: ReturnType<typeof summarizeClubThrottleEditorialBacklog>;
  continuity: VentureContentContinuityReport;
} {
  const editorial = summarizeClubThrottleEditorialBacklog();
  const continuity = resolveLiveVentureContentContinuityV1({ venture_id: CLUB_THROTTLE_VENTURE_ID });
  return { CT_EDITORIAL: editorial, continuity };
}

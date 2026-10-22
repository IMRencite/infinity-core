import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
  type BlogBacklogArticle,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";
import { evaluateBlogArticlePreDeployQc } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard";
import {
  hydrateClubThrottlePublishedRevisionDigests,
  isBacklogRefreshRevisionAlreadyCurrent,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-refresh-current-revision-v1";
import { evaluateOccupancyNpvInternalLinkMaintenancePreDeployQc } from "./occupancynpv-internal-link-maintenance-prepublish-v1";

const AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS = new Set(["cam-first-year"]);

/** Live verified editorial — refresh deploy must not re-queue without a new content revision. */
const CLUB_THROTTLE_AUTONOMOUS_REFRESH_EXCLUDED_SLUGS = new Set([
  "how-riders-choose-a-shirt",
  "bike-night-etiquette",
  "group-ride-etiquette",
]);

const PUBLISHED_REGISTRY_STATES = new Set<BlogBacklogArticle["registry_state"]>(["PUBLISHED", "REFRESHED"]);

function isNewPublicationEligible(article: BlogBacklogArticle): boolean {
  return !PUBLISHED_REGISTRY_STATES.has(article.registry_state);
}

export const ONPV_LEASE_AUTHORITY_CLUSTER_PATHS = [
  "/blog/occupancy-costs/what-is-occupancy-cost-versus-rent/",
  "/blog/leasing/gross-lease-vs-net-lease-for-tenants/",
  "/blog/leasing/what-numbers-do-you-need-to-compare-two-leases/",
  "/blog/leasing/how-do-you-compare-two-commercial-lease-options/",
  "/compare-commercial-leases",
] as const;

export function rankOccupancyNpvRepairableHeldRows(articles: BlogBacklogArticle[]) {
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  return articles
    .filter(
      (a) =>
        a.venture === "occupancynpv" &&
        a.draft &&
        a.backlog_scope === "AUTHORIZED_BACKLOG" &&
        !AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS.has(a.slug) &&
        isNewPublicationEligible(a),
    )
    .map((article) => ({
      article,
      gate: evaluateBacklogSourceVNext(article),
      pre: evaluateBlogArticlePreDeployQc({
        article,
        rendered: rendered[article.path] ?? null,
      }),
    }))
    .filter((row) => !row.gate.publish_allowed || !row.pre.deploy_allowed)
    .sort((a, b) => a.article.slug.localeCompare(b.article.slug));
}

export function pickOccupancyNpvAutonomousBuildCandidate(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): BlogBacklogArticle | null {
  const ready = pickOccupancyNpvAutonomousBacklogCandidate(articles);
  if (ready) return null;
  return rankOccupancyNpvRepairableHeldRows(articles)[0]?.article ?? null;
}

export function rankOccupancyNpvAutonomousPublishRows(articles: BlogBacklogArticle[]) {
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  return articles
    .filter(
      (a) =>
        a.venture === "occupancynpv" &&
        a.draft &&
        a.backlog_scope === "AUTHORIZED_BACKLOG" &&
        !AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS.has(a.slug) &&
        isNewPublicationEligible(a),
    )
    .map((article) => ({
      article,
      gate: evaluateBacklogSourceVNext(article),
      pre: evaluateBlogArticlePreDeployQc({
        article,
        rendered: rendered[article.path] ?? null,
      }),
    }))
    .filter((row) => row.gate.publish_allowed && row.pre.deploy_allowed)
    .sort((a, b) => a.article.slug.localeCompare(b.article.slug));
}

/** When ranked pre-deploy rows are empty, pick highest-ranked unpublished eligible asset (quality gates unchanged). */
export function pickUnpublishedEligibleOccupancyNpvBacklogFallbackV1(
  articles: BlogBacklogArticle[],
): BlogBacklogArticle | null {
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  const rows = articles
    .filter(
      (a) =>
        a.venture === "occupancynpv" &&
        a.draft &&
        a.backlog_scope === "AUTHORIZED_BACKLOG" &&
        !AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS.has(a.slug) &&
        !PUBLISHED_REGISTRY_STATES.has(a.registry_state),
    )
    .map((article) => ({
      article,
      gate: evaluateBacklogSourceVNext(article),
      pre: evaluateBlogArticlePreDeployQc({
        article,
        rendered: rendered[article.path] ?? null,
      }),
    }))
    .filter((row) => row.gate.publish_allowed && row.pre.deploy_allowed)
    .sort((a, b) => a.article.slug.localeCompare(b.article.slug));
  return rows[0]?.article ?? null;
}

export function pickOccupancyNpvAutonomousBacklogCandidate(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): BlogBacklogArticle | null {
  const ranked = rankOccupancyNpvAutonomousPublishRows(articles);
  if (ranked[0]?.article) return ranked[0].article;
  return pickUnpublishedEligibleOccupancyNpvBacklogFallbackV1(articles);
}

export function countBacklogPublishCandidates(articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles()): number {
  return rankOccupancyNpvAutonomousPublishRows(articles).length;
}

export function rankClubThrottleAutonomousPublishRows(articles: BlogBacklogArticle[]) {
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  return articles
    .filter(
      (a) =>
        a.venture === "club-throttle" &&
        a.draft &&
        a.backlog_scope === "AUTHORIZED_BACKLOG" &&
        isNewPublicationEligible(a),
    )
    .map((article) => ({
      article,
      gate: evaluateBacklogSourceVNext(article),
      pre: evaluateBlogArticlePreDeployQc({
        article,
        rendered: rendered[article.path] ?? null,
      }),
    }))
    .filter((row) => row.gate.publish_allowed && row.pre.deploy_allowed)
    .sort((a, b) => a.article.slug.localeCompare(b.article.slug));
}

export function rankClubThrottleAutonomousContentRefreshRows(articles: BlogBacklogArticle[]) {
  hydrateClubThrottlePublishedRevisionDigests(articles);
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  return articles
    .filter(
      (a) =>
        a.venture === "club-throttle" &&
        a.draft &&
        a.backlog_scope === "AUTHORIZED_BACKLOG" &&
        PUBLISHED_REGISTRY_STATES.has(a.registry_state) &&
        !CLUB_THROTTLE_AUTONOMOUS_REFRESH_EXCLUDED_SLUGS.has(a.slug),
    )
    .map((article) => ({
      article,
      gate: evaluateBacklogSourceVNext(article),
      pre: evaluateBlogArticlePreDeployQc({
        article,
        rendered: rendered[article.path] ?? null,
      }),
    }))
    .filter((row) => row.gate.publish_allowed && row.pre.deploy_allowed)
    .filter((row) => !isBacklogRefreshRevisionAlreadyCurrent(row.article, rendered[row.article.path] ?? null))
    .sort((a, b) => a.article.slug.localeCompare(b.article.slug));
}

export function pickClubThrottleAutonomousBacklogCandidate(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): BlogBacklogArticle | null {
  hydrateClubThrottlePublishedRevisionDigests(articles);
  const publish = rankClubThrottleAutonomousPublishRows(articles)[0]?.article;
  if (publish) return publish;
  return rankClubThrottleAutonomousContentRefreshRows(articles)[0]?.article ?? null;
}

export const CLUB_THROTTLE_AFTER_DARK_REFRESH_PROBE_SLUG = "how-to-ride-after-dark" as const;

/** Minimal cycle diagnostic so null picker results expose exact gate/pre-deploy state. */
export function buildClubThrottleAutonomousPublishCycleDiagnostic(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): {
  publish_lane_ready_count: number;
  refresh_lane_ready_count: number;
  ct_refresh_probe: {
    slug: string;
    registry_state: BlogBacklogArticle["registry_state"];
    refresh_lane_excluded: boolean;
    publish_allowed: boolean;
    deploy_allowed: boolean;
    reasons: string[];
  } | null;
} {
  const publishRanked = rankClubThrottleAutonomousPublishRows(articles);
  const refreshRanked = rankClubThrottleAutonomousContentRefreshRows(articles);
  const rendered = buildBacklogRenderedEvidenceMap(articles);
  const probeArticle =
    articles.find((a) => a.slug === CLUB_THROTTLE_AFTER_DARK_REFRESH_PROBE_SLUG && a.venture === "club-throttle") ?? null;
  if (!probeArticle) {
    return {
      publish_lane_ready_count: publishRanked.length,
      refresh_lane_ready_count: refreshRanked.length,
      ct_refresh_probe: null,
    };
  }
  const gate = evaluateBacklogSourceVNext(probeArticle);
  const pre = evaluateBlogArticlePreDeployQc({
    article: probeArticle,
    rendered: rendered[probeArticle.path] ?? null,
  });
  return {
    publish_lane_ready_count: publishRanked.length,
    refresh_lane_ready_count: refreshRanked.length,
    ct_refresh_probe: {
      slug: probeArticle.slug,
      registry_state: probeArticle.registry_state,
      refresh_lane_excluded: CLUB_THROTTLE_AUTONOMOUS_REFRESH_EXCLUDED_SLUGS.has(probeArticle.slug),
      publish_allowed: gate.publish_allowed,
      deploy_allowed: pre.deploy_allowed,
      reasons: [...new Set([...gate.reasons, ...pre.reasons])],
    },
  };
}

export function clubThrottleBacklogCandidateWorkType(
  article: BlogBacklogArticle,
): "NEW_PUBLICATION" | "CONTENT_REFRESH" {
  return PUBLISHED_REGISTRY_STATES.has(article.registry_state) ? "CONTENT_REFRESH" : "NEW_PUBLICATION";
}

export function evaluateOnpvInternalLinkClusterQc(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): { ONPV_INTERNAL_LINK_CLUSTER_QC: "PASS" | "FAIL"; missing: string[] } {
  const clusterPaths = new Set(
    ONPV_LEASE_AUTHORITY_CLUSTER_PATHS.filter((p) => p.startsWith("/blog/")).map((p) => p.replace(/\/+$/, "").toLowerCase()),
  );
  const missing: string[] = [];
  for (const path of clusterPaths) {
    const article = articles.find((a) => a.venture === "occupancynpv" && a.path.replace(/\/+$/, "").toLowerCase() === path);
    if (!article?.draft) {
      missing.push(`${path}:NO_DRAFT`);
      continue;
    }
    const links = new Set((article.draft.internal_links ?? []).map((l) => l.replace(/\/+$/, "").toLowerCase()));
    for (const target of clusterPaths) {
      if (target === path) continue;
      if (!links.has(target)) {
        missing.push(`${path}->${target}`);
      }
    }
    if (path.includes("/leasing/") || path.includes("/occupancy-costs/")) {
      const tool = "/compare-commercial-leases".replace(/\/+$/, "").toLowerCase();
      if (!links.has(tool)) missing.push(`${path}->${tool}`);
    }
  }
  return { ONPV_INTERNAL_LINK_CLUSTER_QC: missing.length === 0 ? "PASS" : "FAIL", missing };
}

export function evaluateOccupancyNpvTargetPrepublishQc(input: {
  path: string;
  work_type?: string;
  articles?: BlogBacklogArticle[];
}): { OCCUPANCYNPV_TARGET_PREPUBLISH_QC: "PASS" | "FAIL"; reasons: string[] } {
  const articles = input.articles ?? listOccupancyClubThrottleBacklogArticles();
  const article = articles.find((a) => a.path.replace(/\/+$/, "") === input.path.replace(/\/+$/, ""));
  if (!article) {
    return { OCCUPANCYNPV_TARGET_PREPUBLISH_QC: "FAIL", reasons: ["ARTICLE_NOT_FOUND"] };
  }
  const rendered = buildBacklogRenderedEvidenceMap([article]);
  if (
    input.work_type === "INTERNAL_LINK_UPDATE" &&
    PUBLISHED_REGISTRY_STATES.has(article.registry_state)
  ) {
    const maintenance = evaluateOccupancyNpvInternalLinkMaintenancePreDeployQc({
      article,
      rendered: rendered[article.path] ?? null,
    });
    return {
      OCCUPANCYNPV_TARGET_PREPUBLISH_QC: maintenance.ONPV_INTERNAL_LINK_MAINTENANCE_PREPUBLISH_QC,
      reasons: maintenance.reasons,
    };
  }
  const gate = evaluateBacklogSourceVNext(article);
  const pre = evaluateBlogArticlePreDeployQc({ article, rendered: rendered[article.path] ?? null });
  const reasons = [...gate.reasons, ...pre.reasons];
  return {
    OCCUPANCYNPV_TARGET_PREPUBLISH_QC:
      gate.publish_allowed && pre.deploy_allowed ? "PASS" : "FAIL",
    reasons,
  };
}

import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
  type BlogBacklogArticle,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { reconcileOccupancyNpvBacklog } from "./occupancynpv-backlog-reconciliation-v1";

const AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS = new Set(["cam-first-year"]);

export function pickOccupancyNpvAutonomousBacklogCandidate(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): BlogBacklogArticle | null {
  const reconciliation = reconcileOccupancyNpvBacklog();
  const deployEligiblePaths = new Set(
    reconciliation.rows.filter((r) => r.deploy_eligible).map((r) => r.path.replace(/\/+$/, "").toLowerCase()),
  );
  const ranked = articles
    .filter(
      (a) =>
        a.venture === "occupancynpv" &&
        a.draft &&
        !AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS.has(a.slug) &&
        deployEligiblePaths.has(a.path.replace(/\/+$/, "").toLowerCase()),
    )
    .map((a) => ({ article: a, gate: evaluateBacklogSourceVNext(a) }))
    .filter((row) => row.gate.publish_allowed)
    .sort((a, b) => a.article.slug.localeCompare(b.article.slug));
  return ranked[0]?.article ?? null;
}

export function countBacklogPublishCandidates(articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles()): number {
  const reconciliation = reconcileOccupancyNpvBacklog();
  const deployEligiblePaths = new Set(
    reconciliation.rows.filter((r) => r.deploy_eligible).map((r) => r.path.replace(/\/+$/, "").toLowerCase()),
  );
  return articles.filter(
    (a) =>
      a.venture === "occupancynpv" &&
      !AUTONOMOUS_PUBLISH_EXCLUDED_SLUGS.has(a.slug) &&
      deployEligiblePaths.has(a.path.replace(/\/+$/, "").toLowerCase()) &&
      evaluateBacklogSourceVNext(a).publish_allowed,
  ).length;
}

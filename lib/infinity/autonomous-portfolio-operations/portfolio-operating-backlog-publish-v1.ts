import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
  type BlogBacklogArticle,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";

export function pickOccupancyNpvAutonomousBacklogCandidate(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): BlogBacklogArticle | null {
  const ranked = articles
    .filter((a) => a.venture === "occupancynpv" && a.draft)
    .map((a) => ({ article: a, gate: evaluateBacklogSourceVNext(a) }))
    .filter((row) => row.gate.publish_allowed)
    .sort((a, b) => a.article.slug.localeCompare(b.article.slug));
  return ranked[0]?.article ?? null;
}

export function countBacklogPublishCandidates(articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles()): number {
  return articles.filter((a) => a.venture === "occupancynpv" && evaluateBacklogSourceVNext(a).publish_allowed).length;
}

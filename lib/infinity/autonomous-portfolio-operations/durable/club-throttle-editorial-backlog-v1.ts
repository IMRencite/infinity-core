import {
  evaluateBacklogSourceVNext,
  listOccupancyClubThrottleBacklogArticles,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";

export function summarizeClubThrottleEditorialBacklog(): {
  CT_EDITORIAL_BACKLOG_COUNT: number;
  CT_EDITORIAL_PUBLISH_ELIGIBLE_COUNT: number;
  CT_EDITORIAL_HOLD_COUNT: number;
} {
  const articles = listOccupancyClubThrottleBacklogArticles().filter((a) => a.venture === "club-throttle");
  let eligible = 0;
  let hold = 0;
  const publishedStates = new Set(["PUBLISHED", "REFRESHED"]);
  for (const article of articles) {
    const gate = evaluateBacklogSourceVNext(article);
    const unpublished = !publishedStates.has(article.registry_state);
    if (gate.publish_allowed && unpublished) eligible += 1;
    else if (!gate.publish_allowed) hold += 1;
  }
  return {
    CT_EDITORIAL_BACKLOG_COUNT: articles.length,
    CT_EDITORIAL_PUBLISH_ELIGIBLE_COUNT: eligible,
    CT_EDITORIAL_HOLD_COUNT: hold,
  };
}

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
  for (const article of articles) {
    const gate = evaluateBacklogSourceVNext(article);
    if (gate.publish_allowed) eligible += 1;
    else hold += 1;
  }
  return {
    CT_EDITORIAL_BACKLOG_COUNT: articles.length,
    CT_EDITORIAL_PUBLISH_ELIGIBLE_COUNT: eligible,
    CT_EDITORIAL_HOLD_COUNT: hold,
  };
}

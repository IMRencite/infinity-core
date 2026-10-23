import { describe, expect, it, vi } from "vitest";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import {
  rankClubThrottleAutonomousContentRefreshRows,
  pickClubThrottleAutonomousBacklogCandidate,
} from "../portfolio-operating-backlog-publish-v1";
import {
  hydrateClubThrottlePublishedRevisionDigests,
  isBacklogRefreshRevisionAlreadyCurrent,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-refresh-current-revision-v1";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";
import * as publishedInventory from "@/lib/infinity/organic-growth-engine/continuous/published-blog-inventory";

describe("CT ranking stale state regression v1", () => {
  it("CT_RANKING_NO_MUTATION_QC: ranking does not mutate published registry", () => {
    const spy = vi.spyOn(publishedInventory, "registerPublishedBlogRecord");
    const articles = listOccupancyClubThrottleBacklogArticles();
    rankClubThrottleAutonomousContentRefreshRows(articles);
    pickClubThrottleAutonomousBacklogCandidate(articles);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("CT_REFRESH_RANKING_STALE_STATE_REGRESSION_QC: hydrate reconciles already-current refresh to NOOP", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const afterDark = articles.find((a) => a.slug === "how-to-ride-after-dark");
    expect(afterDark).toBeTruthy();
    const rendered = buildBacklogRenderedEvidenceMap(articles);
    const beforeRank = rankClubThrottleAutonomousContentRefreshRows(articles);
    expect(beforeRank.some((r) => r.article.slug === "how-to-ride-after-dark")).toBe(true);
    hydrateClubThrottlePublishedRevisionDigests(articles);
    expect(
      isBacklogRefreshRevisionAlreadyCurrent(afterDark!, rendered[afterDark!.path] ?? null),
    ).toBe(true);
    const afterRank = rankClubThrottleAutonomousContentRefreshRows(articles);
    expect(afterRank.some((r) => r.article.slug === "how-to-ride-after-dark")).toBe(false);
  });
});

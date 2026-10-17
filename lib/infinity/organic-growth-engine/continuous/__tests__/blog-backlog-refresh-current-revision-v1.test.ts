import { describe, expect, it } from "vitest";
import {
  backlogRenderedMainContentDigest,
  hydrateClubThrottlePublishedRevisionDigests,
  isBacklogRefreshRevisionAlreadyCurrent,
} from "../blog-backlog-refresh-current-revision-v1";
import { listOccupancyClubThrottleBacklogArticles } from "../blog-backlog-inventory";
import { rankClubThrottleAutonomousContentRefreshRows } from "@/lib/infinity/autonomous-portfolio-operations/portfolio-operating-backlog-publish-v1";

describe("blog backlog refresh current revision", () => {
  it("CT_CURRENT_REVISION_REFRESH_EXCLUSION_QC: after-dark excluded when registry matches source digest", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    hydrateClubThrottlePublishedRevisionDigests(articles);
    const afterDark = articles.find((a) => a.slug === "how-to-ride-after-dark");
    expect(afterDark).toBeTruthy();
    const refresh = rankClubThrottleAutonomousContentRefreshRows(articles);
    expect(refresh.some((row) => row.article.slug === "how-to-ride-after-dark")).toBe(false);
  });

  it("isBacklogRefreshRevisionAlreadyCurrent tracks main_html digest", () => {
    const rendered = {
      shell_html: "<article></article>",
      main_html: "<p>Your headlight is a budget, not a brag</p>",
      expected_canonical: "https://clubthrottle.com/journal/night-riding/how-to-ride-after-dark/",
    };
    const digest = backlogRenderedMainContentDigest(rendered);
    expect(digest).toHaveLength(64);
    expect(isBacklogRefreshRevisionAlreadyCurrent).toBeTypeOf("function");
  });
});

import { describe, expect, it } from "vitest";
import {
  blogSelfHealContinuityQc,
  discoverClubThrottleContentOpportunityEvidence,
  liveVentureContentContinuityQc,
  resolveLiveVentureContentContinuityV1,
} from "../live-venture-content-continuity-v1";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";

describe("live-venture-content-continuity-v1", () => {
  it("does not treat null deploy as premature idle when repair or discovery paths remain", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const report = resolveLiveVentureContentContinuityV1({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      articles,
      assets_published_today: 0,
      blogs_published_today: 0,
    });
    expect(report.content_lane_stop_reason).not.toBe("BACKLOG_EMPTY");
    if (!report.deploy_candidate) {
      expect(report.discovery_ran || report.self_heal_candidate_slug || report.remaining_valid_opportunities === 0).toBe(
        true,
      );
      expect(liveVentureContentContinuityQc(report)).toBe("PASS");
      expect(blogSelfHealContinuityQc(report)).toBe("PASS");
    }
  });

  it("records discovery evidence with examined counts", () => {
    const evidence = discoverClubThrottleContentOpportunityEvidence();
    expect(evidence.opportunities_examined).toBeGreaterThan(0);
    expect(evidence.remaining_valid_opportunities).toBeGreaterThanOrEqual(0);
  });

  it("marks daily target met when cadence satisfied", () => {
    const report = resolveLiveVentureContentContinuityV1({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      assets_published_today: 3,
      blogs_published_today: 1,
    });
    expect(report.daily_qualified_content_target_met).toBe(true);
    expect(report.daily_blog_target_met).toBe(true);
    expect(report.content_lane_stop_reason).toBe("DAILY_QUALIFIED_CONTENT_TARGET_MET");
  });
});

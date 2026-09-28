import { describe, expect, it } from "vitest";
import { occupancynpvCamFirstYearKnownBadDraft } from "../occupancynpv-cam-first-year-known-bad";
import { occupancynpvInterestRateDraft } from "../occupancynpv-blog";
import { occupancynpvLiveCapRateDraft } from "../occupancynpv-live-page";
import { CONTENT_QUALITY_FRAMEWORK_VERSION, evaluateContentQualityFramework } from "../content-quality-framework";
import { occupancynpvBlogIndexSource } from "../occupancynpv-blog";
import { selectReaderFavorites } from "@/lib/infinity/performance-intelligence-engine/reader-favorite-score";
import { evaluateCacheAwareLiveVerification } from "../live-cache-verification";
import { auditPublicContentGeneratorDrift } from "../content-framework-drift";
import { occupancynpvCamFirstYearDraft } from "../occupancynpv-cam-first-year-page";
import { occupancynpvCamFirstYearPreRepairDraft } from "../occupancynpv-cam-first-year-prerepair";

describe("canonical content quality framework", () => {
  it("calibrates strong evergreen, strong blog, and thin newest blog", () => {
    expect(CONTENT_QUALITY_FRAMEWORK_VERSION).toBe("content-quality-framework-v4");
    expect(evaluateContentQualityFramework(occupancynpvLiveCapRateDraft()).result).toBe("PASS");
    expect(evaluateContentQualityFramework(occupancynpvInterestRateDraft()).result).toBe("PASS");
    expect(evaluateContentQualityFramework(occupancynpvCamFirstYearKnownBadDraft()).result).toBe("FAIL");
    expect(evaluateContentQualityFramework(occupancynpvCamFirstYearPreRepairDraft()).result).toBe("FAIL");
    expect(evaluateContentQualityFramework(occupancynpvCamFirstYearDraft()).result).toBe("PASS");
  });

  it("finds zero uncontrolled public content generators", () => {
    const audit = auditPublicContentGeneratorDrift();
    expect(audit.audited).toBe(4);
    expect(audit.uncontrolled).toEqual([]);
    expect(audit.result).toBe("PASS");
  });

  it("shows both OccupancyNPV articles in the main editorial roll", () => {
    const html = occupancynpvBlogIndexSource();
    expect(html).toContain("data-blog-main-roll");
    expect(html).toContain("cam-first-year");
    expect(html).toContain("how-interest-rates-affect-commercial-property-values");
    expect(html).toContain("data-blog-all-articles");
    expect(html).toContain("Featured Blogs");
    expect(html).toContain("Featured Reads");
    expect(html).not.toMatch(/Latest Blogs|Reader Favorites|Most Popular|Readers Love|Trending/);
  });

  it("uses Featured Reads until first-party popularity evidence exists", () => {
    const selected = selectReaderFavorites({
      rows: [
        { path: "/blog/a/", qualified_views: 1, engaged_sessions: 0, completion_proxy: 0, repeat_readers: 0 },
      ],
      minimum_qualified_views: 25,
    });
    expect(selected.label).toBe("Featured Reads");
    expect(selected.evidence).toBe("INSUFFICIENT");
  });

  it("does not treat a stale cache HIT as production proof", () => {
    const stale = evaluateCacheAwareLiveVerification({
      url: "https://occupancynpv.com/blog/",
      captured_at: "2026-09-25T04:40:00.000Z",
      status: 200,
      cache: "HIT",
      deployment_id: "dpl_example",
      expected_marker: "cam-first-year",
      html: "<html>How do interest rates affect commercial property values?</html>",
    });
    expect(stale.result).toBe("STALE_CACHE");
    expect(stale.production_proof).toBe(false);
  });
});

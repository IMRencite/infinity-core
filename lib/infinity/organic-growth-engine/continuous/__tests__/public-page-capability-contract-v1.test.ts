import { describe, expect, it } from "vitest";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "../blog-ux";
import { composeClubThrottleJournalFiles, evaluateClubThrottleJournalIndexComposedQc } from "../club-throttle-journal";
import { goodResponsiveBrowserEvidence } from "../fixtures/render-browser-evidence-fixtures";
import {
  evaluateBuildFactoryCapabilityRegressionBlocking,
  evaluatePublicUiCapabilityRegressionQc,
  evaluateSourceCapabilityPresence,
} from "../public-page-capability-contract-v1";
import type { RenderedCapabilitySample } from "../public-page-capability-contract-v1";

function desktopCapabilitySamples(presentSidebar: boolean): RenderedCapabilitySample[] {
  const sidebar: RenderedCapabilitySample = {
    capability_id: "BLOG_SIDEBAR",
    dom_present: presentSidebar,
    visible: presentSidebar,
    width_px: presentSidebar ? 220 : 0,
    height_px: presentSidebar ? 480 : 0,
  };
  const base = (id: RenderedCapabilitySample["capability_id"], ok = true): RenderedCapabilitySample => ({
    capability_id: id,
    dom_present: ok,
    visible: ok,
    width_px: ok ? 400 : 0,
    height_px: ok ? 120 : 0,
  });
  return [
    base("BLOG_INDEX_HEADING"),
    base("BLOG_ARTICLE_INVENTORY"),
    base("BLOG_ARTICLE_CARDS"),
    base("BLOG_FEATURED_MEDIA"),
    base("BLOG_CATEGORY_DISCOVERY"),
    base("BLOG_TOPIC_DISCOVERY"),
    sidebar,
    base("BLOG_POPULAR_RESOURCES"),
    base("BLOG_LATEST_POSTS"),
    base("BLOG_INTERNAL_LINKS"),
  ];
}

describe("public-page-capability-contract-v1", () => {
  it("CT journal index compose includes required blog index capabilities", () => {
    const index = composeClubThrottleJournalFiles().find((f) => f.path === "app/journal/page.tsx")?.content ?? "";
    const qc = evaluateClubThrottleJournalIndexComposedQc(index);
    expect(qc.CT_JOURNAL_SIDEBAR_QC).toBe("PASS");
    expect(qc.BLOG_INDEX_READINESS.result).toBe("PASS");
    const caps = evaluateSourceCapabilityPresence({ profile: "BLOG_INDEX", html: index });
    expect(caps.missing).toEqual([]);
  });

  it("BUILD_FACTORY_CAPABILITY_REGRESSION_QC blocks live when sidebar capability missing", () => {
    const index = composeClubThrottleJournalFiles().find((f) => f.path === "app/journal/page.tsx")?.content ?? "";
    const stripped = index.replace(/data-blog-sidebar[\s\S]*?<\/aside>/, "");
    const gate = evaluatePublicUiCapabilityRegressionQc({
      profile: "BLOG_INDEX",
      html: stripped,
      require_browser: false,
    });
    expect(gate.result).toBe("FAIL");
    expect(
      evaluateBuildFactoryCapabilityRegressionBlocking({
        venture_rendered_quality_qc: "PASS",
        venture_required_capability_qc: gate.result,
      }),
    ).toMatchObject({ WEBSITE_LIVE_ALLOWED: false, BUILD_FACTORY_CAPABILITY_REGRESSION_QC: "PASS" });
  });

  it("mandatory browser capability evidence requires visible desktop sidebar", () => {
    const index = composeClubThrottleJournalFiles().find((f) => f.path === "app/journal/page.tsx")?.content ?? "";
    const pass = evaluatePublicUiCapabilityRegressionQc({
      profile: "BLOG_INDEX",
      html: index,
      require_browser: true,
      browser_capabilities: {
        desktop: { viewport: "desktop", capabilities: desktopCapabilitySamples(true) },
        tablet: { viewport: "tablet", capabilities: desktopCapabilitySamples(true) },
        mobile: { viewport: "mobile", capabilities: desktopCapabilitySamples(true) },
      },
    });
    expect(pass.result).toBe("PASS");
    const fail = evaluatePublicUiCapabilityRegressionQc({
      profile: "BLOG_INDEX",
      html: index,
      require_browser: true,
      browser_capabilities: {
        desktop: { viewport: "desktop", capabilities: desktopCapabilitySamples(false) },
      },
    });
    expect(fail.result).toBe("FAIL");
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS.length).toBeGreaterThan(100);
    expect(goodResponsiveBrowserEvidence().desktop).toBeTruthy();
  });
});

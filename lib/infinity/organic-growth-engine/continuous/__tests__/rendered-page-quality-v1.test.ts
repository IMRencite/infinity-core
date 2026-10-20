import { describe, expect, it } from "vitest";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "../blog-ux";
import {
  BAD_CT_SPACING_MEASUREMENTS,
  GOOD_CT_SPACING_MEASUREMENTS,
  LIVE_LEGACY_CT_SPACING_CSS_SNIPPET,
} from "../fixtures/live-club-throttle-visual-failure";
import {
  badDoubleStackResponsiveBrowserEvidence,
  BAD_DOUBLE_STACK_ADJACENT_PAIRS,
  goodResponsiveBrowserEvidence,
} from "../fixtures/render-browser-evidence-fixtures";
import { editorialSpacingCssSignalsFail } from "../editorial-article-spacing-contract";
import { evaluateRenderedAdjacentBlockSpacingQc } from "../rendered-adjacent-block-spacing-v1";
import { evaluateRenderedPageQualityQc, evaluateVentureRenderedQualityQc } from "../rendered-page-quality-v1";
import { evaluateBuildFactoryRenderBlocking } from "@/lib/infinity/venture-website-architecture/autonomous-venture-render-quality-policy-v1";

const SHELL = `<header data-blog-article-hero="true"><figure data-visual-role="FEATURED_EDITORIAL_IMAGE"><img src="/x.webp" alt="Hero" width="1600" height="900"/></figure></header>`;
const MAIN = `<h2>Section</h2><p>First paragraph with enough words to read as editorial body copy.</p><p>Second paragraph continues the thought without a giant gap.</p>`;

describe("rendered-page-quality-v1", () => {
  it("FOUNDER_BLOG_SPACING_BROWSER_REGRESSION_QC: cumulative adjacent geometry fails double-stack outcome", () => {
    const adjacent = evaluateRenderedAdjacentBlockSpacingQc(BAD_DOUBLE_STACK_ADJACENT_PAIRS);
    expect(adjacent.result).toBe("FAIL");
    expect(adjacent.reasons).toContain("COMPUTED_ADJACENT_ELEMENT_SPACING_OUTLIER");

    const bad = evaluateRenderedPageQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      boundary: "PRODUCTION_RENDER_VERIFICATION",
      browser_evidence: badDoubleStackResponsiveBrowserEvidence(),
      functional_pass: true,
    });
    expect(bad.RENDERED_PAGE_QUALITY_QC).toBe("FAIL");
    expect(bad.RENDERED_EDITORIAL_RHYTHM_QC.result).toBe("FAIL");
  });

  it("FOUNDER_BLOG_SPACING_REGRESSION_QC: legacy css still fails at unit helper", () => {
    const legacyCss = `${LIVE_LEGACY_CT_SPACING_CSS_SNIPPET}
.onpv-blog-main.pv-reading > p{margin-bottom:var(--blog-section-block-gap)}`;
    expect(editorialSpacingCssSignalsFail(legacyCss).length).toBeGreaterThan(0);
    const bad = evaluateRenderedPageQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: legacyCss,
      boundary: "UNIT_HELPER",
      spacing_measurements: BAD_CT_SPACING_MEASUREMENTS,
      functional_pass: true,
    });
    expect(bad.RENDERED_PAGE_QUALITY_QC).toBe("FAIL");
  });

  it("FOUNDER_BLOG_SPACING_REGRESSION_QC: corrected css and measurements pass at unit helper", () => {
    expect(editorialSpacingCssSignalsFail(OCCUPANCYNPV_BLOG_EDITORIAL_CSS)).toEqual([]);
    const good = evaluateRenderedPageQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      boundary: "UNIT_HELPER",
      spacing_measurements: GOOD_CT_SPACING_MEASUREMENTS,
      functional_pass: true,
    });
    expect(good.RENDERED_PAGE_QUALITY_QC).toBe("PASS");
  });

  it("MANDATORY_BROWSER_EVIDENCE_REGRESSION_QC: hard boundary fails closed without geometry", () => {
    const out = evaluateRenderedPageQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      boundary: "BUILD_FACTORY_WEBSITE_LIVE",
      functional_pass: true,
    });
    expect(out.RENDERED_PAGE_QUALITY_QC).toBe("FAIL_EVIDENCE_MISSING");
    expect(out.reasons).toContain("BROWSER_GEOMETRY_REQUIRED_BUT_MISSING");
  });

  it("FALSE_PASS_PREVENTION_REGRESSION_QC: functional pass cannot mask rhythm fail", () => {
    const out = evaluateRenderedPageQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      boundary: "UNIT_HELPER",
      spacing_measurements: BAD_CT_SPACING_MEASUREMENTS,
      functional_pass: true,
    });
    expect(out.RENDERED_PAGE_QUALITY_QC).toBe("FAIL");
  });

  it("EMPTY_REGION_REGRESSION_QC: pathological blank interval fails", () => {
    const out = evaluateRenderedPageQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      boundary: "UNIT_HELPER",
      spacing_measurements: GOOD_CT_SPACING_MEASUREMENTS,
      empty_regions: { viewport_height_px: 900, blank_vertical_intervals_px: [420] },
      functional_pass: true,
    });
    expect(out.RENDERED_EMPTY_REGION_QC.result).toBe("FAIL");
    expect(out.RENDERED_PAGE_QUALITY_QC).toBe("FAIL");
  });

  it("mandatory responsive browser evidence passes factory boundary", () => {
    const out = evaluateRenderedPageQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      boundary: "BUILD_FACTORY_WEBSITE_LIVE",
      browser_evidence: goodResponsiveBrowserEvidence(),
      functional_pass: true,
    });
    expect(out.RENDERED_PAGE_QUALITY_QC).toBe("PASS");
    expect(out.RESPONSIVE_RENDER_EVIDENCE_COMPLETE).toBe(true);
  });

  it("BUILD_FACTORY_RENDER_BLOCKING_REGRESSION_QC", () => {
    expect(
      evaluateBuildFactoryRenderBlocking({ build_complete: true, venture_rendered_quality_qc: "FAIL" }),
    ).toEqual({
      BUILD_FACTORY_RENDER_BLOCKING_REGRESSION_QC: "PASS",
      WEBSITE_LIVE_ALLOWED: false,
    });
    const blockedEvidence = evaluateVentureRenderedQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      functional_pass: true,
    });
    expect(blockedEvidence.WEBSITE_LIVE_ALLOWED).toBe(false);
    expect(blockedEvidence.VENTURE_RENDERED_QUALITY_QC).toBe("FAIL_EVIDENCE_MISSING");
    expect(
      evaluateBuildFactoryRenderBlocking({
        build_complete: true,
        venture_rendered_quality_qc: blockedEvidence.VENTURE_RENDERED_QUALITY_QC,
      }),
    ).toMatchObject({ WEBSITE_LIVE_ALLOWED: false });
    const allowed = evaluateVentureRenderedQualityQc({
      profile: "ARTICLE",
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      browser_evidence: goodResponsiveBrowserEvidence(),
      functional_pass: true,
    });
    expect(allowed.WEBSITE_LIVE_ALLOWED).toBe(true);
    expect(
      evaluateBuildFactoryRenderBlocking({ build_complete: true, venture_rendered_quality_qc: "PASS" }),
    ).toMatchObject({ WEBSITE_LIVE_ALLOWED: true });
  });
});

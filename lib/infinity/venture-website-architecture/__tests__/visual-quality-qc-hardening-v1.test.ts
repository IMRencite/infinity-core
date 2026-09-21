import { describe, expect, it } from "vitest";
import { inspectFooterLayout } from "@/lib/infinity/public-venture-design/rendered-layout/geometry";
import { founderDefectCss, founderDefectHtml } from "../visual-quality-founder-fixtures";
import {
  evaluateAuthorityVisualAssetCoverage,
  evaluateCtaVisualHierarchy,
  evaluateLongFormTextWall,
  evaluateRelatedContentDesign,
  evaluateRenderedCompositionQuality,
  evaluateRenderedTableQuality,
  evaluateSourceReferenceDesign,
  evaluateVisibleFooterGutter,
  evaluateVisualDeadSpace,
  founderRegressionScenarios,
  proveFounderFalsePositive,
} from "../visual-quality-gates";
import { VISUAL_QUALITY_REPAIR_CSS } from "../visual-quality-repair-css";
import { VISUAL_ASSET_PLANS } from "../visual-quality-assets";

const repairedHtml = `
<header className="pv-hero-photo"><img src="/media/hero-workstation.webp" alt="desk" width={1600} height={900} /><img src="/media/viz-cash-flow.svg" alt="timeline" /></header>
<div className="pv-analysis-board">
  <div className="pv-table-shell"><table className="pv-fin-table"><caption>Cash</caption><thead><tr><th>Year</th></tr></thead><tbody><tr><th>1</th></tr></tbody></table></div>
</div>
<aside className="pv-callout" data-callout="KEY_TAKEAWAY"><h3>Key takeaway</h3><p>NPV shrinks later cash.</p></aside>
<ul><li>Write the cash list first.</li></ul>
<nav className="pv-related-editorial"><li className="pv-related-card"><a href="/a">Next</a></li></nav>
<section className="pv-source-board"><h2>Trusted sources</h2></section>
<div className="pv-cta-panel"><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></div>
`;

describe("founder visual QC false-positive proof", () => {
  it("old footer padding gate passes 24px while the footer background still touches the viewport", () => {
    const old = inspectFooterLayout(founderDefectCss(), founderDefectHtml());
    const visible = evaluateVisibleFooterGutter(founderDefectCss());
    expect(old.horizontalPaddingPx).toBe(24);
    expect(old.edgeCollision).toBe(false);
    expect(old.overall).toBe("PASS");
    expect(visible.desktopMarginPx).toBe(0);
    expect(visible.backgroundTouchesViewport).toBe(true);
    expect(visible.overall).toBe("FAIL");
  });

  it("table presence and data-visualization passed while dead-space and unfinished tables now fail", () => {
    const html = founderDefectHtml();
    expect(/data-visualization/.test(html)).toBe(true);
    expect(/<table/.test(html)).toBe(true);
    expect(evaluateRenderedTableQuality(html).overall).toBe("FAIL");
    expect(evaluateVisualDeadSpace(html).overall).toBe("FAIL");
  });

  it("gradient hero and visualization attributes passed while real image coverage now fails", () => {
    const html = founderDefectHtml();
    expect(/pv-hero-authority/.test(html)).toBe(true);
    expect(evaluateAuthorityVisualAssetCoverage({ html, pageClass: "question" }).overall).toBe("FAIL");
    expect(evaluateAuthorityVisualAssetCoverage({ html, pageClass: "question" }).cssOnlyCountedAsImages).toBe(false);
  });

  it("many sections passed variety while a long prose run now fails the text-wall gate", () => {
    expect(evaluateLongFormTextWall(founderDefectHtml()).overall).toBe("FAIL");
    expect(evaluateLongFormTextWall(founderDefectHtml()).longestProseRun).toBeGreaterThan(8);
  });

  it("proves the full founder false-positive bundle", () => {
    const proof = proveFounderFalsePositive();
    expect(proof.oldFooterPaddingPass).toBe(true);
    expect(proof.oldVisibleBackgroundFail).toBe(true);
    expect(proof.newTableDeadSpaceFail).toBe(true);
    expect(proof.newImageCoverageFail).toBe(true);
    expect(proof.newTextWallFail).toBe(true);
  });
});

describe("founder regression fixtures are rejected by hardened gates", () => {
  it("has eight required founder-defect scenarios", () => {
    expect(founderRegressionScenarios()).toHaveLength(8);
  });

  it("rejects a footer visible box that touches the viewport", () => {
    const row = founderRegressionScenarios().find((item) => item.id === "footer_visible_box_touches_viewport");
    expect(evaluateVisibleFooterGutter(row?.css ?? "").overall).toBe("FAIL");
  });

  it("rejects a related-link grid that escapes designed gutters", () => {
    const row = founderRegressionScenarios().find((item) => item.id === "related_link_grid_escapes_gutter");
    expect(evaluateRelatedContentDesign(row?.html ?? "")).toBe("FAIL");
  });

  it("rejects an oversized table container with unused area", () => {
    const row = founderRegressionScenarios().find((item) => item.id === "oversized_table_unused_area");
    expect(evaluateVisualDeadSpace(row?.html ?? "").overall).toBe("FAIL");
  });

  it("rejects an authority article with no actual image asset", () => {
    const row = founderRegressionScenarios().find((item) => item.id === "authority_article_no_image_asset");
    expect(evaluateAuthorityVisualAssetCoverage({ html: row?.html ?? "", pageClass: "question" }).overall).toBe("FAIL");
  });

  it("rejects a long prose run without a composition break", () => {
    const row = founderRegressionScenarios().find((item) => item.id === "long_prose_run_no_break");
    expect(evaluateLongFormTextWall(row?.html ?? "").overall).toBe("FAIL");
  });

  it("rejects generic unstyled related-link boxes", () => {
    const row = founderRegressionScenarios().find((item) => item.id === "generic_unstyled_related_boxes");
    expect(evaluateRelatedContentDesign(row?.html ?? "")).toBe("FAIL");
  });

  it("rejects a table missing outer margin/shell", () => {
    const row = founderRegressionScenarios().find((item) => item.id === "table_missing_outer_margin");
    expect(evaluateRenderedTableQuality(row?.html ?? "").outerMargin).toBe("FAIL");
  });

  it("rejects a visual component that fills excessive width without content justification", () => {
    const row = founderRegressionScenarios().find((item) => item.id === "visual_component_excessive_width");
    expect(evaluateVisualDeadSpace(row?.html ?? "").oversizedDarkPanel).toBe(true);
  });
});

describe("hardened gates pass repaired composition", () => {
  it("accepts inset footer CSS with a 32px desktop margin and 20px mobile margin", () => {
    const footer = evaluateVisibleFooterGutter(VISUAL_QUALITY_REPAIR_CSS);
    expect(footer.desktopMarginPx).toBe(32);
    expect(footer.mobileMarginPx).toBe(20);
    expect(footer.backgroundTouchesViewport).toBe(false);
    expect(footer.overall).toBe("PASS");
  });

  it("accepts redesigned tables with shell, padding, caption, and header", () => {
    const table = evaluateRenderedTableQuality(repairedHtml);
    expect(table.overall).toBe("PASS");
    expect(table.outerMargin).toBe("PASS");
    expect(table.innerPadding).toBe("PASS");
    expect(evaluateVisualDeadSpace(repairedHtml).overall).toBe("PASS");
  });

  it("requires real image files and does not count CSS-only gradients as images", () => {
    expect(VISUAL_ASSET_PLANS).toHaveLength(4);
    expect(evaluateAuthorityVisualAssetCoverage({ html: repairedHtml, pageClass: "question" }).overall).toBe("PASS");
    expect(evaluateAuthorityVisualAssetCoverage({ html: repairedHtml, pageClass: "question" }).realImages).toBeGreaterThanOrEqual(2);
  });

  it("accepts broken-up long form, editorial related links, sources, and CTA panels", () => {
    expect(evaluateLongFormTextWall(repairedHtml).overall).toBe("PASS");
    expect(evaluateRelatedContentDesign(repairedHtml)).toBe("PASS");
    expect(evaluateSourceReferenceDesign(repairedHtml)).toBe("PASS");
    expect(evaluateCtaVisualHierarchy(repairedHtml)).toBe("PASS");
  });

  it("composition gate consumes screenshot evidence counts without claiming human taste", () => {
    const result = evaluateRenderedCompositionQuality({
      html: repairedHtml,
      css: VISUAL_QUALITY_REPAIR_CSS,
      screenshots: [{ route: "/", viewport: "1280", path: "home.png" }],
    });
    expect(result.gate).toBe("RenderedCompositionQualityGate");
    expect(result.screenshotEvidence).toBe(1);
    expect(result.overall).toBe("PASS");
  });
});

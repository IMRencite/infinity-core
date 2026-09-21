import { describe, expect, it } from "vitest";
import { evaluateDesignCoreCreativeQualityGate } from "@/lib/infinity/design-core/creative-asset-registry";
import {
  OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
  evaluateBlogRenderedVisualQualityGate,
  evaluateBlogTaxonomyChipGate,
  evaluateBlogTaxonomyContrastGate,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-ux";
import { occupancynpvBlogArticleSource } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-blog";
import {
  occupancynpvArchiveCreativeSvgs,
  occupancynpvCreativeGates,
  occupancynpvLegacyGenericCreativeSvg,
  occupancynpvUniqueCreativeSvg,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-creative";
import {
  evaluateCreativeGeometryUniqueness,
  evaluateInspectedCreativeQualityGate,
  GENERIC_LINE_CHART_PATH,
  inspectSvgCreativeQuality,
} from "../creative-quality";
import {
  evaluateInteractiveStateMatrix,
  interactionReadable,
  taxonomyChipSwatchesFromCss,
  visitedHoverCascadeConflict,
} from "../interaction-contrast";

const LEGACY_HOVER_CSS = `
.onpv-taxonomy-chip{background:#f4f7f8;color:#10232c}
.onpv-taxonomy-chip:hover{background:#10232c;color:#fff}
.onpv-taxonomy-chip:visited{color:#10232c}
`;

const renderedEvidence = {
  restRendered: true,
  hoverRendered: true,
  focusRendered: true,
  screenshotCaptured: true,
} as const;

const contrastEvidence = {
  rest_rendered: true,
  hover_rendered: true,
  focus_rendered: true,
  computed_contrast_checked: true,
  screenshot_captured: true,
} as const;

describe("QC escape: taxonomy hover cascade", () => {
  it("fails the escaped visited-after-hover CSS and requires rendered proof", () => {
    expect(visitedHoverCascadeConflict(LEGACY_HOVER_CSS)).toBe(true);
    expect(visitedHoverCascadeConflict(OCCUPANCYNPV_BLOG_EDITORIAL_CSS)).toBe(false);
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toMatch(/:hover:visited|:visited:hover/);
    const article = occupancynpvBlogArticleSource();
    expect(evaluateBlogTaxonomyChipGate(article).result).toBe("PASS");
    expect(evaluateBlogTaxonomyContrastGate(article).result).toBe("NOT_PROVEN");
    expect(evaluateBlogTaxonomyContrastGate(article, contrastEvidence).result).toBe("PASS");
    const escaped = taxonomyChipSwatchesFromCss(LEGACY_HOVER_CSS);
    expect(escaped.filter((row) => row.state === "HOVER").some((row) => !interactionReadable(row))).toBe(true);
    expect(evaluateInteractiveStateMatrix({
      swatches: escaped,
      evidence: contrastEvidence,
      requiredStates: ["REST", "HOVER", "FOCUS"],
    }).result).toBe("FAIL");
    expect(evaluateInteractiveStateMatrix({
      swatches: escaped,
      evidence: contrastEvidence,
      requiredStates: ["REST", "HOVER", "FOCUS"],
    }).reasons).toContain("UNREADABLE_HOVER");
    const currentHovers = taxonomyChipSwatchesFromCss(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).filter((row) => row.state === "HOVER");
    expect(currentHovers.every((row) => interactionReadable(row))).toBe(true);
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toMatch(/\.onpv-taxonomy-chip:hover\{[^}]*color:#ffffff/);
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toMatch(/\.onpv-taxonomy-chip:hover:visited\{[^}]*color:#ffffff/);
  });
});

describe("QC escape: archive creative quality", () => {
  it("fails the escaped generic line-chart SVGs that clipped edge labels", () => {
    const legacy = occupancynpvLegacyGenericCreativeSvg("interest-rates");
    expect(legacy).toContain(GENERIC_LINE_CHART_PATH);
    const inspected = inspectSvgCreativeQuality(legacy);
    expect(inspected.sharedTemplate).toBe(true);
    expect(inspected.tooBasic).toBe(true);
    expect(inspected.clippedEdgeText).toBe(true);
    expect(inspected.safeAspect).toBe(false);
    expect(evaluateInspectedCreativeQualityGate(legacy).result).toBe("FAIL");
    expect(evaluateDesignCoreCreativeQualityGate({
      unique: true,
      relevant: true,
      brandFit: true,
      genericFiller: false,
      textArtifacts: false,
      surfaceFit: true,
      svg: legacy,
      source: "/media/blog/interest-rates.svg",
    }).result).toBe("FAIL");
  });

  it("does not accept caller booleans for an uninspected SVG", () => {
    expect(evaluateDesignCoreCreativeQualityGate({
      unique: true,
      relevant: true,
      brandFit: true,
      genericFiller: false,
      textArtifacts: false,
      surfaceFit: true,
      source: "/media/blog/interest-rates.svg",
    }).result).toBe("NOT_PROVEN");
  });

  it("passes unique 4:3 compositions and fails a cloned geometry set", () => {
    const unique = occupancynpvUniqueCreativeSvg("interest-rates");
    expect(unique).not.toContain(GENERIC_LINE_CHART_PATH);
    expect(unique).not.toMatch(/<text\b/);
    expect(inspectSvgCreativeQuality(unique).reasons).toEqual([]);
    expect(evaluateInspectedCreativeQualityGate(unique).result).toBe("PASS");
    const svgs = occupancynpvArchiveCreativeSvgs();
    expect(evaluateCreativeGeometryUniqueness(svgs).result).toBe("PASS");
    expect(evaluateCreativeGeometryUniqueness([svgs[0]!, svgs[0]!]).result).toBe("FAIL");
    const gates = occupancynpvCreativeGates();
    expect(gates.uniqueness.result).toBe("PASS");
    expect(gates.quality.result).toBe("PASS");
    expect(gates.inspected.every((row) => !row.genericFiller && !row.textArtifacts && row.safeAspect)).toBe(true);
  });

  it("keeps rendered visual QC unproven until hover and archive SVGs are inspected", () => {
    const surfaces = ["/blog/", "/blog/article/", "/blog/category/valuation/", "/blog/tag/interest-rates/"];
    const widths = [1440, 1280, 1024, 768, 390];
    expect(evaluateBlogRenderedVisualQualityGate({ surfaces, widths }).result).toBe("NOT_PROVEN");
    expect(evaluateBlogRenderedVisualQualityGate({
      surfaces,
      widths,
      ...renderedEvidence,
      svgContents: [occupancynpvLegacyGenericCreativeSvg("interest-rates")],
    }).result).toBe("FAIL");
    expect(evaluateBlogRenderedVisualQualityGate({
      surfaces,
      widths,
      ...renderedEvidence,
      svgContents: occupancynpvArchiveCreativeSvgs(),
      heroObjectFit: "contain",
    }).result).toBe("PASS");
    expect(evaluateBlogRenderedVisualQualityGate({
      surfaces,
      widths,
      ...renderedEvidence,
      svgContents: occupancynpvArchiveCreativeSvgs(),
      heroObjectFit: "cover",
    }).result).toBe("FAIL");
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toMatch(/onpv-blog-hero__visual img\{[^}]*object-fit:contain/);
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toMatch(/onpv-blog-archive-card img\{[^}]*object-fit:contain/);
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).not.toMatch(/onpv-blog-(featured__media|latest-card|archive-card) img\{[^}]*object-fit:cover/);
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).not.toMatch(/onpv-blog-hero__visual\{[^}]*max-height:12rem/);
  });
});

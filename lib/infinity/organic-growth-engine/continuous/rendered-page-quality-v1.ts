import {
  editorialSpacingCssSignalsFail,
  evaluateEditorialSpacingQc,
  type EditorialSpacingMeasurement,
} from "./editorial-article-spacing-contract";
import {
  BROWSER_GEOMETRY_REQUIRED_BUT_MISSING,
  evaluateMandatoryBrowserEvidencePresence,
  isResponsiveBrowserEvidenceComplete,
  RENDER_FAIL_EVIDENCE_MISSING,
  type RenderQcBoundary,
  type ResponsiveBrowserEvidenceV1,
} from "./render-browser-evidence-v1";
import {
  evaluateRenderedAdjacentBlockSpacingQc,
  RENDERED_ADJACENT_BLOCK_SPACING_QC,
} from "./rendered-adjacent-block-spacing-v1";
import { evaluateRenderedEditorialRhythmGate } from "./rendered-editorial-rhythm-gate";
import type { OrganicNamedGate } from "./types";

export const RENDERED_PAGE_QUALITY_QC = "RENDERED_PAGE_QUALITY_QC" as const;
export const RENDERED_EDITORIAL_RHYTHM_QC = "RENDERED_EDITORIAL_RHYTHM_QC" as const;
export const RENDERED_EMPTY_REGION_QC = "RENDERED_EMPTY_REGION_QC" as const;
export const RESPONSIVE_RENDER_QC = "RESPONSIVE_RENDER_QC" as const;

export type RenderPageQualityResult = "PASS" | "FAIL" | typeof RENDER_FAIL_EVIDENCE_MISSING;

export type RenderPageProfile =
  | "HOMEPAGE"
  | "LANDING"
  | "SERVICE"
  | "PRODUCT"
  | "ARTICLE"
  | "BLOG_INDEX"
  | "CATEGORY_ARCHIVE"
  | "TAG_ARCHIVE"
  | "COMPARISON"
  | "GUIDE"
  | "RESOURCE";

export type RenderedEmptyRegionMeasurement = {
  viewport_height_px: number;
  blank_vertical_intervals_px: number[];
};

export type ResponsiveRenderMeasurements = {
  desktop?: EditorialSpacingMeasurement | null;
  tablet?: EditorialSpacingMeasurement | null;
  mobile?: EditorialSpacingMeasurement | null;
};

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

function editorialFromResponsiveBrowser(bundle: ResponsiveBrowserEvidenceV1): ResponsiveRenderMeasurements {
  return {
    desktop: bundle.desktop?.editorial_rhythm ?? null,
    tablet: bundle.tablet?.editorial_rhythm ?? null,
    mobile: bundle.mobile?.editorial_rhythm ?? null,
  };
}

function emptyFromResponsiveBrowser(
  bundle: ResponsiveBrowserEvidenceV1,
): RenderedEmptyRegionMeasurement | null {
  const desktop = bundle.desktop?.empty_regions;
  if (!desktop) return null;
  const merged = [
    ...desktop.blank_vertical_intervals_px,
    ...(bundle.tablet?.empty_regions.blank_vertical_intervals_px ?? []),
    ...(bundle.mobile?.empty_regions.blank_vertical_intervals_px ?? []),
  ];
  return {
    viewport_height_px: desktop.viewport_height_px,
    blank_vertical_intervals_px: merged,
  };
}

export function evaluateRenderedEmptyRegionQc(input: RenderedEmptyRegionMeasurement): OrganicNamedGate {
  const reasons: string[] = [];
  const vh = input.viewport_height_px;
  for (const interval of input.blank_vertical_intervals_px) {
    if (interval > Math.max(160, vh * 0.22)) reasons.push("EXCESSIVE_VERTICAL_WHITESPACE");
    if (interval > vh * 0.45) reasons.push("EMPTY_RESERVED_REGION");
  }
  return named(RENDERED_EMPTY_REGION_QC, reasons);
}

export function evaluateResponsiveRenderQc(
  measurements: ResponsiveRenderMeasurements,
  options?: { require_full_matrix?: boolean },
): OrganicNamedGate {
  const reasons: string[] = [];
  const viewports: Array<keyof ResponsiveRenderMeasurements> = ["desktop", "tablet", "mobile"];
  for (const viewport of viewports) {
    const sample = measurements[viewport];
    if (!sample) {
      if (options?.require_full_matrix) reasons.push(`RESPONSIVE_SAMPLE_MISSING_${viewport.toUpperCase()}`);
      continue;
    }
    const spacing = evaluateEditorialSpacingQc(sample);
    if (spacing.result !== "PASS") reasons.push(`${viewport}_RHYTHM_FAIL`, ...spacing.reasons);
  }
  if (options?.require_full_matrix) {
    for (const viewport of viewports) {
      if (!measurements[viewport]) reasons.push(`RESPONSIVE_SAMPLE_MISSING_${viewport.toUpperCase()}`);
    }
  }
  return named(RESPONSIVE_RENDER_QC, reasons);
}

export function evaluateRenderedPageQualityQc(input: {
  profile: RenderPageProfile;
  shell_html: string;
  main_html: string;
  editorial_css: string;
  boundary?: RenderQcBoundary;
  spacing_measurements?: EditorialSpacingMeasurement | null;
  browser_evidence?: ResponsiveBrowserEvidenceV1 | null;
  empty_regions?: RenderedEmptyRegionMeasurement | null;
  responsive?: ResponsiveRenderMeasurements | null;
  functional_pass?: boolean;
}): {
  RENDERED_PAGE_QUALITY_QC: RenderPageQualityResult;
  RENDERED_ADJACENT_BLOCK_SPACING_QC: OrganicNamedGate;
  RENDERED_EDITORIAL_RHYTHM_QC: OrganicNamedGate;
  RENDERED_EMPTY_REGION_QC: OrganicNamedGate;
  RESPONSIVE_RENDER_QC: OrganicNamedGate;
  RESPONSIVE_RENDER_EVIDENCE_COMPLETE: boolean;
  reasons: string[];
} {
  const boundary = input.boundary ?? "UNIT_HELPER";
  const mandatory = evaluateMandatoryBrowserEvidencePresence({ boundary, browser_evidence: input.browser_evidence });
  const reasons: string[] = [];
  if (input.functional_pass === false) reasons.push("FUNCTIONAL_BASELINE_FAIL");

  if (!mandatory.ok) {
    reasons.push(...mandatory.reasons);
    return {
      RENDERED_PAGE_QUALITY_QC: RENDER_FAIL_EVIDENCE_MISSING,
      RENDERED_ADJACENT_BLOCK_SPACING_QC: named(RENDERED_ADJACENT_BLOCK_SPACING_QC, [BROWSER_GEOMETRY_REQUIRED_BUT_MISSING]),
      RENDERED_EDITORIAL_RHYTHM_QC: named(RENDERED_EDITORIAL_RHYTHM_QC, [BROWSER_GEOMETRY_REQUIRED_BUT_MISSING]),
      RENDERED_EMPTY_REGION_QC: named(RENDERED_EMPTY_REGION_QC, [BROWSER_GEOMETRY_REQUIRED_BUT_MISSING]),
      RESPONSIVE_RENDER_QC: named(RESPONSIVE_RENDER_QC, [BROWSER_GEOMETRY_REQUIRED_BUT_MISSING]),
      RESPONSIVE_RENDER_EVIDENCE_COMPLETE: false,
      reasons: [...new Set(reasons)],
    };
  }

  const requireMatrix = boundary !== "UNIT_HELPER";
  const browserBundle = input.browser_evidence ?? null;
  const spacingFromBrowser =
    browserBundle?.desktop?.editorial_rhythm ?? input.spacing_measurements ?? null;
  const adjacentPairs = browserBundle?.desktop?.adjacent_block_pairs ?? [];
  const adjacent =
    adjacentPairs.length > 0
      ? evaluateRenderedAdjacentBlockSpacingQc(adjacentPairs)
      : requireMatrix
        ? named(RENDERED_ADJACENT_BLOCK_SPACING_QC, [BROWSER_GEOMETRY_REQUIRED_BUT_MISSING])
        : named(RENDERED_ADJACENT_BLOCK_SPACING_QC, []);
  if (adjacent.result !== "PASS") reasons.push(...adjacent.reasons);

  const rhythm = evaluateRenderedEditorialRhythmGate({
    shell_html: input.shell_html,
    main_html: input.main_html,
    editorial_css: input.editorial_css,
    spacing_measurements: spacingFromBrowser,
    browser_geometry_required: boundary !== "UNIT_HELPER",
  });
  reasons.push(...rhythm.reasons);

  const emptyInput =
    input.empty_regions
    ?? (browserBundle ? emptyFromResponsiveBrowser(browserBundle) : null);
  const empty =
    emptyInput != null
      ? evaluateRenderedEmptyRegionQc(emptyInput)
      : named(
          RENDERED_EMPTY_REGION_QC,
          boundary !== "UNIT_HELPER" ? [BROWSER_GEOMETRY_REQUIRED_BUT_MISSING] : input.profile === "ARTICLE" ? ["empty_region_measurements_missing"] : [],
        );
  if (emptyInput != null && empty.result !== "PASS") reasons.push(...empty.reasons);
  else if (requireMatrix && empty.result !== "PASS") reasons.push(...empty.reasons);

  const responsiveInput =
    input.responsive ?? (browserBundle ? editorialFromResponsiveBrowser(browserBundle) : null);
  const responsive =
    responsiveInput != null
      ? evaluateResponsiveRenderQc(responsiveInput, { require_full_matrix: requireMatrix })
      : named(RESPONSIVE_RENDER_QC, requireMatrix ? [BROWSER_GEOMETRY_REQUIRED_BUT_MISSING] : ["responsive_matrix_not_run"]);
  if (responsiveInput != null && responsive.result !== "PASS") reasons.push(...responsive.reasons);
  else if (requireMatrix && responsive.result !== "PASS") reasons.push(...responsive.reasons);

  if (input.profile === "ARTICLE" && editorialSpacingCssSignalsFail(input.editorial_css).length) {
    reasons.push(...editorialSpacingCssSignalsFail(input.editorial_css));
  }

  if (browserBundle && requireMatrix) {
    for (const viewport of ["desktop", "tablet", "mobile"] as const) {
      const pairs = browserBundle[viewport]?.adjacent_block_pairs ?? [];
      const vpAdjacent = evaluateRenderedAdjacentBlockSpacingQc(pairs);
      if (vpAdjacent.result !== "PASS") reasons.push(`${viewport}_ADJACENT_SPACING_FAIL`, ...vpAdjacent.reasons);
    }
  }

  const unique = [...new Set(reasons)];
  const evidenceComplete = browserBundle ? isResponsiveBrowserEvidenceComplete(browserBundle) : !requireMatrix;
  return {
    RENDERED_PAGE_QUALITY_QC: unique.length ? "FAIL" : "PASS",
    RENDERED_ADJACENT_BLOCK_SPACING_QC: adjacent,
    RENDERED_EDITORIAL_RHYTHM_QC: named(RENDERED_EDITORIAL_RHYTHM_QC, rhythm.reasons),
    RENDERED_EMPTY_REGION_QC: empty,
    RESPONSIVE_RENDER_QC: responsive,
    RESPONSIVE_RENDER_EVIDENCE_COMPLETE: evidenceComplete,
    reasons: unique,
  };
}

export function evaluateVentureRenderedQualityQc(
  input: Parameters<typeof evaluateRenderedPageQualityQc>[0],
): {
  VENTURE_RENDERED_QUALITY_QC: "PASS" | "FAIL" | typeof RENDER_FAIL_EVIDENCE_MISSING;
  WEBSITE_LIVE_ALLOWED: boolean;
  detail: ReturnType<typeof evaluateRenderedPageQualityQc>;
} {
  const detail = evaluateRenderedPageQualityQc({
    ...input,
    boundary: input.boundary ?? "BUILD_FACTORY_WEBSITE_LIVE",
  });
  const pass = detail.RENDERED_PAGE_QUALITY_QC === "PASS";
  return {
    VENTURE_RENDERED_QUALITY_QC: detail.RENDERED_PAGE_QUALITY_QC,
    WEBSITE_LIVE_ALLOWED: pass,
    detail,
  };
}

export function evaluateVentureBlogRenderQc(
  input: Parameters<typeof evaluateRenderedPageQualityQc>[0],
): {
  VENTURE_BLOG_RENDER_QC: "PASS" | "FAIL" | typeof RENDER_FAIL_EVIDENCE_MISSING;
  detail: ReturnType<typeof evaluateRenderedPageQualityQc>;
} {
  const detail = evaluateRenderedPageQualityQc({
    ...input,
    profile: input.profile ?? "ARTICLE",
    boundary: input.boundary ?? "NEW_VENTURE_BLOG_LAUNCH",
  });
  const pass = detail.RENDERED_PAGE_QUALITY_QC === "PASS";
  return { VENTURE_BLOG_RENDER_QC: pass ? "PASS" : detail.RENDERED_PAGE_QUALITY_QC, detail };
}

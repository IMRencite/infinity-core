import type { EditorialSpacingMeasurement } from "./editorial-article-spacing-contract";
import type { AdjacentBlockSpacingSample } from "./rendered-adjacent-block-spacing-v1";
import type { RenderedEmptyRegionMeasurement } from "./rendered-page-quality-v1";

export const BROWSER_GEOMETRY_REQUIRED_BUT_MISSING = "BROWSER_GEOMETRY_REQUIRED_BUT_MISSING" as const;
export const RENDER_FAIL_EVIDENCE_MISSING = "FAIL_EVIDENCE_MISSING" as const;

export type RenderQcBoundary =
  | "UNIT_HELPER"
  | "AUTONOMOUS_PUBLICATION_APPROVAL"
  | "PRODUCTION_RENDER_VERIFICATION"
  | "BUILD_FACTORY_WEBSITE_LIVE"
  | "NEW_VENTURE_BLOG_LAUNCH"
  | "SHARED_TEMPLATE_RELEASE_QC";

export type RenderBrowserViewport = "desktop" | "tablet" | "mobile";

export type RenderBrowserEvidenceV1 = {
  stage: "PREDEPLOY" | "PRODUCTION";
  viewport: RenderBrowserViewport;
  adjacent_block_pairs: AdjacentBlockSpacingSample[];
  editorial_rhythm: EditorialSpacingMeasurement;
  empty_regions: RenderedEmptyRegionMeasurement;
};

export type ResponsiveBrowserEvidenceV1 = Partial<Record<RenderBrowserViewport, RenderBrowserEvidenceV1>>;

export type RenderBrowserEvidenceBundleV1 = {
  preddeploy?: ResponsiveBrowserEvidenceV1;
  production?: ResponsiveBrowserEvidenceV1;
};

export function requiresMandatoryBrowserEvidence(boundary: RenderQcBoundary): boolean {
  return boundary !== "UNIT_HELPER";
}

export function isResponsiveBrowserEvidenceComplete(bundle: ResponsiveBrowserEvidenceV1 | null | undefined): boolean {
  if (!bundle) return false;
  return Boolean(bundle.desktop && bundle.tablet && bundle.mobile);
}

export function responsiveBrowserEvidenceMissingReasons(
  bundle: ResponsiveBrowserEvidenceV1 | null | undefined,
): string[] {
  const reasons: string[] = [];
  if (!bundle?.desktop) reasons.push("BROWSER_DESKTOP_EVIDENCE_MISSING");
  if (!bundle?.tablet) reasons.push("BROWSER_TABLET_EVIDENCE_MISSING");
  if (!bundle?.mobile) reasons.push("BROWSER_MOBILE_EVIDENCE_MISSING");
  return reasons;
}

export function isRenderBrowserEvidenceSampleComplete(sample: RenderBrowserEvidenceV1 | null | undefined): boolean {
  if (!sample) return false;
  return (
    sample.adjacent_block_pairs.length > 0
    && sample.editorial_rhythm.heading_body_gaps_px.length > 0
    && sample.empty_regions.viewport_height_px > 0
  );
}

export function evaluateMandatoryBrowserEvidencePresence(input: {
  boundary: RenderQcBoundary;
  browser_evidence?: ResponsiveBrowserEvidenceV1 | null;
  require_production_stage?: boolean;
}): { ok: boolean; reasons: string[] } {
  if (!requiresMandatoryBrowserEvidence(input.boundary)) {
    return { ok: true, reasons: [] };
  }
  const reasons: string[] = [];
  if (!isResponsiveBrowserEvidenceComplete(input.browser_evidence)) {
    reasons.push(BROWSER_GEOMETRY_REQUIRED_BUT_MISSING, ...responsiveBrowserEvidenceMissingReasons(input.browser_evidence));
    return { ok: false, reasons };
  }
  for (const viewport of ["desktop", "tablet", "mobile"] as const) {
    const sample = input.browser_evidence![viewport]!;
    if (!isRenderBrowserEvidenceSampleComplete(sample)) {
      reasons.push(`BROWSER_${viewport.toUpperCase()}_SAMPLE_INCOMPLETE`);
    }
  }
  if (input.require_production_stage && !input.browser_evidence?.desktop?.stage) {
    reasons.push("PRODUCTION_BROWSER_STAGE_MISSING");
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

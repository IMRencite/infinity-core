import type { EditorialSpacingMeasurement } from "../editorial-article-spacing-contract";
import {
  BAD_CT_SPACING_MEASUREMENTS,
  GOOD_CT_SPACING_MEASUREMENTS,
} from "./live-club-throttle-visual-failure";
import type { AdjacentBlockSpacingSample } from "../rendered-adjacent-block-spacing-v1";
import type { RenderBrowserEvidenceV1, ResponsiveBrowserEvidenceV1 } from "../render-browser-evidence-v1";
import type { RenderedEmptyRegionMeasurement } from "../rendered-page-quality-v1";

const EMPTY_GOOD: RenderedEmptyRegionMeasurement = {
  viewport_height_px: 900,
  blank_vertical_intervals_px: [12, 8],
};

function sampleFrom(
  viewport: RenderBrowserEvidenceV1["viewport"],
  editorial: EditorialSpacingMeasurement,
  pairs: AdjacentBlockSpacingSample[],
): RenderBrowserEvidenceV1 {
  return {
    stage: "PREDEPLOY",
    viewport,
    adjacent_block_pairs: pairs,
    editorial_rhythm: editorial,
    empty_regions: EMPTY_GOOD,
  };
}

/** Cumulative geometry matching production-corrected editorial rhythm (~18–58px relationships). */
export const GOOD_ADJACENT_BLOCK_PAIRS: AdjacentBlockSpacingSample[] = [
  { from_role: "H2", to_role: "P", relation: "heading_to_first_body", gap_px: 20, from_line_height_px: 28, from_font_size_px: 22 },
  { from_role: "P", to_role: "P", relation: "paragraph_to_paragraph", gap_px: 18 },
  { from_role: "P", to_role: "H2", relation: "paragraph_to_next_heading", gap_px: 58 },
  { from_role: "H2", to_role: "P", relation: "heading_to_first_body", gap_px: 21, from_line_height_px: 28, from_font_size_px: 22 },
];

/** Double-stacked spacing outcome — CSS strings may look individually valid. */
export const BAD_DOUBLE_STACK_ADJACENT_PAIRS: AdjacentBlockSpacingSample[] = [
  { from_role: "H2", to_role: "P", relation: "heading_to_first_body", gap_px: 96, from_line_height_px: 28, from_font_size_px: 22 },
  { from_role: "P", to_role: "P", relation: "paragraph_to_paragraph", gap_px: 88 },
  { from_role: "P", to_role: "H2", relation: "paragraph_to_next_heading", gap_px: 140 },
];

export function goodResponsiveBrowserEvidence(): ResponsiveBrowserEvidenceV1 {
  return {
    desktop: sampleFrom("desktop", GOOD_CT_SPACING_MEASUREMENTS, GOOD_ADJACENT_BLOCK_PAIRS),
    tablet: sampleFrom("tablet", GOOD_CT_SPACING_MEASUREMENTS, GOOD_ADJACENT_BLOCK_PAIRS),
    mobile: sampleFrom("mobile", GOOD_CT_SPACING_MEASUREMENTS, GOOD_ADJACENT_BLOCK_PAIRS),
  };
}

export function badDoubleStackResponsiveBrowserEvidence(): ResponsiveBrowserEvidenceV1 {
  return {
    desktop: sampleFrom("desktop", BAD_CT_SPACING_MEASUREMENTS, BAD_DOUBLE_STACK_ADJACENT_PAIRS),
    tablet: sampleFrom("tablet", BAD_CT_SPACING_MEASUREMENTS, BAD_DOUBLE_STACK_ADJACENT_PAIRS),
    mobile: sampleFrom("mobile", BAD_CT_SPACING_MEASUREMENTS, BAD_DOUBLE_STACK_ADJACENT_PAIRS),
  };
}

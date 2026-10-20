import {
  EDITORIAL_SPACING_TARGETS,
  evaluateEditorialSpacingQc,
  type EditorialSpacingMeasurement,
} from "./editorial-article-spacing-contract";
import type { OrganicNamedGate } from "./types";

export const RENDERED_ADJACENT_BLOCK_SPACING_QC = "RENDERED_ADJACENT_BLOCK_SPACING_QC" as const;

export type AdjacentBlockRole =
  | "H1"
  | "H2"
  | "H3"
  | "P"
  | "UL"
  | "OL"
  | "FIGURE"
  | "SECTION"
  | "MEDIA"
  | "OTHER";

export type AdjacentBlockRelation =
  | "heading_to_first_body"
  | "paragraph_to_paragraph"
  | "paragraph_to_next_heading"
  | "paragraph_to_list"
  | "paragraph_to_media"
  | "section_to_section"
  | "list_to_next_heading"
  | "other";

/** Cumulative rendered distance: next.top - current.bottom (px). */
export type AdjacentBlockSpacingSample = {
  from_role: AdjacentBlockRole;
  to_role: AdjacentBlockRole;
  relation: AdjacentBlockRelation;
  gap_px: number;
  from_line_height_px?: number;
  from_font_size_px?: number;
};

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function editorialMeasurementFromAdjacentPairs(
  pairs: AdjacentBlockSpacingSample[],
): EditorialSpacingMeasurement {
  return {
    heading_body_gaps_px: pairs
      .filter((p) => p.relation === "heading_to_first_body")
      .map((p) => p.gap_px),
    paragraph_gaps_px: pairs.filter((p) => p.relation === "paragraph_to_paragraph").map((p) => p.gap_px),
    section_gaps_px: pairs.filter((p) => p.relation === "paragraph_to_next_heading").map((p) => p.gap_px),
  };
}

function failThresholdForRelation(relation: AdjacentBlockRelation): number {
  const t = EDITORIAL_SPACING_TARGETS;
  switch (relation) {
    case "heading_to_first_body":
      return t.h2_to_first_paragraph_fail_px;
    case "paragraph_to_paragraph":
      return t.paragraph_to_paragraph_fail_px;
    case "paragraph_to_next_heading":
    case "list_to_next_heading":
    case "section_to_section":
      return t.section_end_to_next_h2_fail_px;
    default:
      return t.paragraph_to_paragraph_fail_px;
  }
}

/** Outcome-based spacing QC — detects double-stacking and other cumulative outliers. */
export function evaluateRenderedAdjacentBlockSpacingQc(pairs: AdjacentBlockSpacingSample[]): OrganicNamedGate {
  const reasons: string[] = [];
  if (!pairs.length) {
    return named(RENDERED_ADJACENT_BLOCK_SPACING_QC, ["adjacent_block_samples_missing"]);
  }
  for (const sample of pairs) {
    const limit = failThresholdForRelation(sample.relation);
    if (sample.gap_px > limit) {
      reasons.push("COMPUTED_ADJACENT_ELEMENT_SPACING_OUTLIER");
      reasons.push(`ADJACENT_GAP_${sample.relation.toUpperCase()}_TOO_LARGE`);
    }
    if (
      sample.relation === "heading_to_first_body"
      && sample.from_line_height_px
      && sample.gap_px > sample.from_line_height_px * 3.5
    ) {
      reasons.push("HEADING_CONTENT_DISCONNECT");
    }
  }

  const headingToBody = pairs.filter((p) => p.relation === "heading_to_first_body").map((p) => p.gap_px);
  const paraToPara = pairs.filter((p) => p.relation === "paragraph_to_paragraph").map((p) => p.gap_px);
  const paraToHeading = pairs.filter((p) => p.relation === "paragraph_to_next_heading").map((p) => p.gap_px);

  if (headingToBody.length && paraToHeading.length) {
    const maxHeadingBody = Math.max(...headingToBody);
    const minSection = Math.min(...paraToHeading);
    if (maxHeadingBody >= minSection) reasons.push("SECTION_TRANSITION_NOT_GREATER_THAN_HEADING_BODY");
  }
  if (paraToPara.length && paraToHeading.length) {
    const maxPara = Math.max(...paraToPara);
    const minSection = Math.min(...paraToHeading);
    if (maxPara >= minSection) reasons.push("PARAGRAPH_RHYTHM_OUTLIER");
  }

  const derived = editorialMeasurementFromAdjacentPairs(pairs);
  const rhythm = evaluateEditorialSpacingQc(derived);
  if (rhythm.result !== "PASS") reasons.push(...rhythm.reasons);

  return named(RENDERED_ADJACENT_BLOCK_SPACING_QC, reasons);
}

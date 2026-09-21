import {
  COMMERCIAL_PAGE_LAYOUT_CONSISTENCY_GATE,
  SECTION_CONTAINER_ALIGNMENT_GATE,
  type NamedDepthGate,
  type SectionAlignmentObservation,
} from "./types";

const WIDTH_TOLERANCE_PX = 8;

export const RELATED_PATHS_WIDTH_DEFECT_CAUSE =
  "Related product paths is nested inside .vg-container.pv-prose, which is capped at --pv-measure (~52rem). .pv-prose .sn-block.pv-wide-module then breakouts the card grid to --pv-authority-shell (70rem). The [data-surface] / ancestor background stays on the prose-width section, so cards escape the background (52/70 ≈ 75%)." as const;

export function evaluateSectionContainerAlignmentGate(
  observations: readonly SectionAlignmentObservation[],
): NamedDepthGate {
  const reasons: string[] = [];
  for (const row of observations) {
    if (row.overflowX) reasons.push(`HORIZONTAL_OVERFLOW:${row.section}`);
    if (row.background.width + WIDTH_TOLERANCE_PX < row.content.width) {
      reasons.push(`BACKGROUND_NARROWER_THAN_CONTENT:${row.section}`);
    }
    if (row.content.left + WIDTH_TOLERANCE_PX < row.background.left || row.content.right > row.background.right + WIDTH_TOLERANCE_PX) {
      reasons.push(`CARDS_ESCAPE_BACKGROUND:${row.section}`);
    }
    if (Math.abs(row.background.left - row.container.left) > WIDTH_TOLERANCE_PX
      || Math.abs(row.background.right - row.container.right) > WIDTH_TOLERANCE_PX) {
      reasons.push(`BACKGROUND_CONTAINER_EDGE_MISMATCH:${row.section}`);
    }
    if (row.background.width > row.container.width + WIDTH_TOLERANCE_PX) {
      reasons.push(`BACKGROUND_WIDER_THAN_CONTAINER:${row.section}`);
    }
  }
  if (observations.length === 0) reasons.push("SECTION_GEOMETRY_NOT_MEASURED");
  return {
    gate: SECTION_CONTAINER_ALIGNMENT_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateCommercialPageLayoutConsistencyGate(input: {
  related?: SectionAlignmentObservation | null;
  adjacent?: SectionAlignmentObservation | null;
}): NamedDepthGate {
  const reasons: string[] = [];
  if (!input.related) {
    return { gate: COMMERCIAL_PAGE_LAYOUT_CONSISTENCY_GATE, result: "FAIL", reasons: ["RELATED_PATHS_GEOMETRY_MISSING"] };
  }
  const alignment = evaluateSectionContainerAlignmentGate([input.related]);
  reasons.push(...alignment.reasons);
  if (input.adjacent && Math.abs(input.related.container.width - input.adjacent.container.width) > 24) {
    reasons.push("RELATED_PATHS_WIDTH_DISCONTINUITY");
  }
  return {
    gate: COMMERCIAL_PAGE_LAYOUT_CONSISTENCY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function relatedPathsStructuralDefect(html: string, css = ""): string[] {
  const reasons: string[] = [];
  const nestedBreakout = /pv-prose[\s\S]{0,4000}sn-block[\s\S]{0,200}pv-wide-module/i.test(html)
    || /className="vg-container pv-prose[\s\S]*data-section-type="SEMANTIC_NAVIGATION"[\s\S]*sn-block pv-wide-module/i.test(html);
  if (nestedBreakout && !/onpv-related-paths/i.test(html)) {
    reasons.push("RELATED_PATHS_NESTED_IN_PROSE_WITH_SHELL_BREAKOUT");
  }
  if (/pv-prose \.sn-block\.pv-wide-module[\s\S]{0,200}--pv-authority-shell/i.test(css) && /onpv-related-paths/.test(html) === false) {
    reasons.push("PROSE_CHILD_NAV_BREAKOUT_STILL_APPLIED");
  }
  return reasons;
}

export function relatedPathsAligned(html: string, css = ""): boolean {
  return /onpv-related-paths/i.test(html)
    && /Related product paths/i.test(html)
    && /onpv-related-paths > \.vg-container\.pv-authority-shell/.test(css)
    && /onpv-related-paths \.sn-block/.test(css)
    && !/onpv-related-paths[\s\S]{0,80}pv-wide-module/.test(html)
    && relatedPathsStructuralDefect(html, css).length === 0;
}

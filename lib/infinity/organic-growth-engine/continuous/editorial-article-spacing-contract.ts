import type { OrganicNamedGate } from "./types";

export const EDITORIAL_ARTICLE_SPACING_CONTRACT = "EditorialArticleSpacingContract" as const;
export const EDITORIAL_SPACING_QC_GATE = "EditorialSpacingQc" as const;

/** Desktop editorial rhythm targets (px). Rendered QC uses these as upper bounds for failure. */
export const EDITORIAL_SPACING_TARGETS = {
  h2_to_first_paragraph_max_px: 28,
  h2_to_first_paragraph_fail_px: 90,
  paragraph_to_paragraph_max_px: 24,
  paragraph_to_paragraph_fail_px: 72,
  section_end_to_next_h2_typical_px: 56,
  section_end_to_next_h2_fail_px: 120,
  h3_to_text_max_px: 24,
  h3_to_text_fail_px: 80,
} as const;

export type EditorialSpacingMeasurement = {
  heading_body_gaps_px: number[];
  paragraph_gaps_px: number[];
  section_gaps_px: number[];
};

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

/**
 * Evaluate spacing from precomputed layout metrics (browser evidence or fixture).
 * Source CSS alone is not sufficient for PASS — callers supply measured gaps.
 */
export function evaluateEditorialSpacingQc(measurements: EditorialSpacingMeasurement | null): OrganicNamedGate {
  const reasons: string[] = [];
  if (!measurements) {
    return named(EDITORIAL_SPACING_QC_GATE, ["spacing_measurements_missing"]);
  }
  const t = EDITORIAL_SPACING_TARGETS;
  for (const gap of measurements.heading_body_gaps_px) {
    if (gap > t.h2_to_first_paragraph_fail_px) reasons.push("HEADING_BODY_GAP_TOO_LARGE");
  }
  for (const gap of measurements.paragraph_gaps_px) {
    if (gap > t.paragraph_to_paragraph_fail_px) reasons.push("PARAGRAPH_GAP_TOO_LARGE");
  }
  for (const gap of measurements.section_gaps_px) {
    if (gap > t.section_end_to_next_h2_fail_px) reasons.push("SECTION_GAP_TOO_LARGE");
  }
  return named(EDITORIAL_SPACING_QC_GATE, reasons);
}

/** Heuristic when only HTML + CSS string available (structural hints, not a substitute for layout proof). */
export function editorialSpacingCssSignalsFail(css: string): string[] {
  const reasons: string[] = [];
  if (/\.onpv-blog-main\.pv-reading[^}]*gap:\s*var\(--blog-section-block-gap\)/.test(css)) {
    reasons.push("flex_gap_on_prose_children");
  }
  if (/\.onpv-blog-main[^}]*gap:\s*4rem|gap:\s*5rem|gap:\s*6rem/.test(css)) {
    reasons.push("excessive_main_column_gap");
  }
  if (!/\.onpv-blog-main\.pv-reading\s*>/.test(css)) {
    reasons.push("prose_child_spacing_rules_missing");
  }
  return reasons;
}

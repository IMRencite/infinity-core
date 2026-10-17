import { editorialSpacingCssSignalsFail, evaluateEditorialSpacingQc, type EditorialSpacingMeasurement } from "./editorial-article-spacing-contract";
import { evaluateBlogHeroShellGate } from "./blog-visual-asset-gates";
import type { OrganicNamedGate } from "./types";

export const RENDERED_EDITORIAL_RHYTHM_GATE = "RenderedEditorialRhythmGate" as const;
export const RENDERED_ARTICLE_VISUAL_QC_GATE = "RenderedArticleVisualQc" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function evaluateRenderedEditorialRhythmGate(input: {
  shell_html: string;
  main_html: string;
  editorial_css: string;
  spacing_measurements?: EditorialSpacingMeasurement | null;
}): OrganicNamedGate {
  const reasons: string[] = [];
  reasons.push(...editorialSpacingCssSignalsFail(input.editorial_css));
  if (!input.main_html.includes("<h2")) reasons.push("ORPHAN_HEADING");
  if (/>\s*<\/(?:div|section)>\s*<h2/.test(input.main_html)) reasons.push("EMPTY_CONTENT_BLOCK");
  if (input.spacing_measurements) {
    const spacing = evaluateEditorialSpacingQc(input.spacing_measurements);
    if (spacing.result !== "PASS") reasons.push(...spacing.reasons);
  }
  const hero = evaluateBlogHeroShellGate(input.shell_html);
  if (hero.result !== "PASS") reasons.push(...hero.reasons);
  return named(RENDERED_EDITORIAL_RHYTHM_GATE, reasons);
}

export function evaluateRenderedArticleVisualQc(input: {
  shell_html: string;
  main_html: string;
  editorial_css: string;
  spacing_measurements?: EditorialSpacingMeasurement | null;
}): OrganicNamedGate {
  const rhythm = evaluateRenderedEditorialRhythmGate(input);
  return named(RENDERED_ARTICLE_VISUAL_QC_GATE, rhythm.reasons);
}

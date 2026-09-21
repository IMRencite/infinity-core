import { contrastRatio, parseCssColor } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import { qcResultFromEvidence, type InteractionState, type QcEvidenceRecord, type QcGateResult } from "./contract";

export const INTERACTIVE_CONTRAST_MIN = 4.5;

export type InteractionSwatch = {
  state: InteractionState;
  color: string;
  background: string;
  border?: string;
};

export function interactionContrast(swatch: InteractionSwatch): number | null {
  const fg = parseCssColor(swatch.color);
  const bg = parseCssColor(swatch.background);
  if (!fg || !bg) return null;
  return contrastRatio(fg, bg);
}

export function interactionReadable(swatch: InteractionSwatch, min = INTERACTIVE_CONTRAST_MIN): boolean {
  const ratio = interactionContrast(swatch);
  return ratio != null && ratio >= min && swatch.color.trim().toLowerCase() !== swatch.background.trim().toLowerCase();
}

export function parseDeclaration(css: string, selector: string, property: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = css.match(new RegExp(`(?:^|[,\\s])${escaped}(?:\\s*,[^\\{]+)?\\s*\\{([^}]+)\\}`));
  if (!block) return null;
  const match = block[1].match(new RegExp(`${property}\\s*:\\s*([^;]+)`));
  return match?.[1]?.trim() ?? null;
}

export function taxonomyChipSwatchesFromCss(css: string): InteractionSwatch[] {
  const restBg = parseDeclaration(css, ".onpv-taxonomy-chip", "background") ?? "#f4f7f8";
  const restFg = parseDeclaration(css, ".onpv-taxonomy-chip", "color") ?? "#10232c";
  const hoverBg = parseDeclaration(css, ".onpv-taxonomy-chip:hover", "background") ?? restBg;
  const hoverFg = parseDeclaration(css, ".onpv-taxonomy-chip:hover", "color") ?? restFg;
  const visitedFg = parseDeclaration(css, ".onpv-taxonomy-chip:visited", "color") ?? restFg;
  const visitedBgDeclared = parseDeclaration(css, ".onpv-taxonomy-chip:visited", "background");
  const visitedBg = visitedBgDeclared ?? restBg;
  const explicitHoverVisitedFg = parseDeclaration(css, ".onpv-taxonomy-chip:hover:visited", "color")
    ?? parseDeclaration(css, ".onpv-taxonomy-chip:visited:hover", "color");
  const explicitHoverVisitedBg = parseDeclaration(css, ".onpv-taxonomy-chip:hover:visited", "background")
    ?? parseDeclaration(css, ".onpv-taxonomy-chip:visited:hover", "background");
  const hoverIndex = css.indexOf(".onpv-taxonomy-chip:hover{");
  const visitedIndex = css.indexOf(".onpv-taxonomy-chip:visited{");
  const cascadedVisitedWins = hoverIndex >= 0 && visitedIndex > hoverIndex && !explicitHoverVisitedFg && !explicitHoverVisitedBg;
  const hoverVisitedFg = explicitHoverVisitedFg ?? (cascadedVisitedWins ? visitedFg : hoverFg);
  const hoverVisitedBg = explicitHoverVisitedBg ?? (cascadedVisitedWins ? (visitedBgDeclared ?? hoverBg) : hoverBg);
  const focusBg = parseDeclaration(css, ".onpv-taxonomy-chip:focus-visible", "background") ?? restBg;
  const focusFg = parseDeclaration(css, ".onpv-taxonomy-chip:focus-visible", "color") ?? restFg;
  const activeBg = parseDeclaration(css, ".onpv-taxonomy-chip:active", "background") ?? hoverBg;
  const activeFg = parseDeclaration(css, ".onpv-taxonomy-chip:active", "color") ?? hoverFg;
  return [
    { state: "REST", color: restFg, background: restBg },
    { state: "HOVER", color: hoverFg, background: hoverBg },
    { state: "FOCUS", color: focusFg, background: focusBg },
    { state: "ACTIVE", color: activeFg, background: activeBg },
    { state: "VISITED", color: visitedFg, background: visitedBg },
    { state: "HOVER", color: hoverVisitedFg, background: hoverVisitedBg },
  ];
}

export function visitedHoverCascadeConflict(css: string): boolean {
  const hoverIndex = css.indexOf(".onpv-taxonomy-chip:hover");
  const visitedIndex = css.indexOf(".onpv-taxonomy-chip:visited");
  const hoverVisited = css.includes(".onpv-taxonomy-chip:hover:visited") || css.includes(".onpv-taxonomy-chip:visited:hover");
  if (hoverIndex < 0 || visitedIndex < 0) return false;
  if (hoverVisited) return false;
  return visitedIndex > hoverIndex;
}

export function evaluateInteractiveStateMatrix(input: {
  swatches: InteractionSwatch[];
  evidence?: QcEvidenceRecord;
  requiredStates?: InteractionState[];
}): {
  result: QcGateResult;
  reasons: string[];
  states: Array<{ state: InteractionState; contrast: number | null; readable: boolean; proven: boolean }>;
} {
  const required = input.requiredStates ?? ["REST", "HOVER", "FOCUS"];
  const reasons: string[] = [];
  const states = input.swatches.map((swatch) => {
    const contrast = interactionContrast(swatch);
    const readable = interactionReadable(swatch);
    if (!readable) reasons.push(`UNREADABLE_${swatch.state}`);
    return { state: swatch.state, contrast, readable, proven: true };
  });
  const evidence = input.evidence ?? {};
  const proven = {
    REST: Boolean(evidence.rest_rendered && evidence.computed_contrast_checked),
    HOVER: Boolean(evidence.hover_rendered && evidence.computed_contrast_checked),
    FOCUS: Boolean(evidence.focus_rendered && evidence.computed_contrast_checked),
    ACTIVE: Boolean(evidence.active_rendered),
    VISITED: Boolean(evidence.visited_rendered),
    DISABLED: true,
    SELECTED: true,
  };
  for (const state of required) {
    if (!proven[state]) reasons.push(`${state}_NOT_PROVEN`);
  }
  return {
    result: qcResultFromEvidence({
      failed: states.some((row) => required.includes(row.state) && !row.readable),
      requiredEvidencePresent: required.every((state) => proven[state]) && !reasons.some((row) => row.endsWith("_NOT_PROVEN")),
    }),
    reasons,
    states,
  };
}

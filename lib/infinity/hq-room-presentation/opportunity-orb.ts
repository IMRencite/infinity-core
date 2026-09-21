import {
  HQ_CIRCULAR_GEOMETRY,
  VENTURE_RADAR_CIRCULAR_GEOMETRY_GATE,
  VENTURE_RADAR_OPPORTUNITY_CONTENT_GATE,
  VENTURE_RADAR_ORB_READABILITY_GATE,
  VENTURE_RADAR_SELECTION_VISIBILITY_GATE,
  type HqVisualForm,
  type NamedPresentationGate,
} from "./contract";
import { evaluateHQCircularGeometryGate, evaluateHQVisualDesignIntentGate } from "./gates";

export const OPPORTUNITY_ORB_SHORT_TITLE_MAX = 32;
export const VENTURE_RADAR_ORB_MIN_DIAMETER_PX = 168;

export type OpportunityOrbPresentation = {
  rankLabel: string;
  scoreLabel: string;
  shortTitle: string;
  fullTitle: string;
  stateLabel: string;
  monetizationLabel: string;
  selected: boolean;
  shortlisted: boolean;
  universe: boolean;
};

export function shortOpportunityLabel(title: string, max = OPPORTUNITY_ORB_SHORT_TITLE_MAX): string {
  const trimmed = title.trim();
  if (trimmed.length <= max) return trimmed;
  const noParens = trimmed.replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (noParens.length <= max && noParens.length >= 8) return noParens;
  const words = trimmed.split(/\s+/).filter(Boolean);
  let acc = "";
  for (const word of words) {
    const next = acc ? `${acc} ${word}` : word;
    if (next.length > max) break;
    acc = next;
  }
  return acc || trimmed.slice(0, max);
}

export function opportunityScoreLabel(value: string | number | null | undefined): string {
  if (value == null || value === "") return "UNKNOWN";
  if (typeof value === "number") return Number.isFinite(value) ? value.toFixed(1) : "UNKNOWN";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toUpperCase() === "UNKNOWN") return "UNKNOWN";
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : trimmed;
}

export function opportunityOrbStateLabel(input: {
  selected?: boolean;
  lifecycle?: string | null;
  selectionState?: string | null;
  shortlisted?: boolean;
}): string {
  if (input.selected) return "SELECTED";
  if (input.shortlisted || input.lifecycle === "SHORTLISTED") return "SHORTLISTED";
  const selection = input.selectionState?.trim();
  if (selection && selection !== "NOT_SELECTED") return selection.replace(/_/g, " ");
  return (input.lifecycle ?? "SCORED").replace(/_/g, " ");
}

export function buildOpportunityOrbPresentation(input: {
  title: string;
  rank?: string | number | null;
  opportunityScore?: string | number | null;
  monetizationScore?: string | number | null;
  selected?: boolean;
  shortlisted?: boolean;
  lifecycle?: string | null;
  selectionState?: string | null;
  universe?: boolean;
}): OpportunityOrbPresentation {
  const score = opportunityScoreLabel(input.opportunityScore);
  const monetization = opportunityScoreLabel(input.monetizationScore);
  const stateLabel = opportunityOrbStateLabel(input);
  return {
    rankLabel: input.rank == null || input.rank === "" ? "#—" : `#${String(input.rank).replace(/^#/, "")}`,
    scoreLabel: score,
    shortTitle: shortOpportunityLabel(input.title),
    fullTitle: input.title.trim(),
    stateLabel,
    monetizationLabel: `Mon ${monetization}`,
    selected: Boolean(input.selected),
    shortlisted: Boolean(input.shortlisted || input.lifecycle === "SHORTLISTED") && !input.selected,
    universe: input.universe === true,
  };
}

export function evaluateVentureRadarCircularGeometryGate(input: {
  intended: "OPPORTUNITY_NODE" | "UNIVERSE_SUMMARY";
  widthPx: number;
  heightPx: number;
  borderRadiusPx?: number;
  borderRadiusPercent?: number;
  renderedForm: HqVisualForm;
}): NamedPresentationGate {
  if (input.intended === "UNIVERSE_SUMMARY") {
    return { gate: VENTURE_RADAR_CIRCULAR_GEOMETRY_GATE, result: "PASS", reasons: [] };
  }
  const reasons: string[] = [];
  const geometry = evaluateHQCircularGeometryGate({
    intendedForm: "CIRCULAR_OUTPUT",
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    borderRadiusPx: input.borderRadiusPx,
    borderRadiusPercent: input.borderRadiusPercent,
  });
  reasons.push(...geometry.reasons);
  if (Math.min(input.widthPx, input.heightPx) < VENTURE_RADAR_ORB_MIN_DIAMETER_PX) {
    reasons.push("VENTURE_RADAR_ORB_TOO_SMALL");
  }
  const intent = evaluateHQVisualDesignIntentGate({ intended: "CIRCULAR_OUTPUT", rendered: input.renderedForm });
  reasons.push(...intent.reasons);
  return { gate: VENTURE_RADAR_CIRCULAR_GEOMETRY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureRadarOrbReadabilityGate(input: {
  titleReadable: boolean;
  rankReadable: boolean;
  scoreReadable: boolean;
  statusReadable: boolean;
  horizontalPaddingPx: number;
  verticalPaddingPx: number;
  textTouchesCircumference: boolean;
  overflow: boolean;
  clipped?: boolean;
  fontSizePx: number;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (!input.titleReadable) reasons.push("TITLE_UNREADABLE");
  if (!input.rankReadable) reasons.push("RANK_UNREADABLE");
  if (!input.scoreReadable) reasons.push("SCORE_UNREADABLE");
  if (!input.statusReadable) reasons.push("STATUS_UNREADABLE");
  if (input.horizontalPaddingPx < HQ_CIRCULAR_GEOMETRY.padPx) reasons.push("CIRCLE_HORIZONTAL_PADDING_CRAMPED");
  if (input.verticalPaddingPx < HQ_CIRCULAR_GEOMETRY.padPx) reasons.push("CIRCLE_VERTICAL_PADDING_CRAMPED");
  if (input.textTouchesCircumference) reasons.push("TEXT_TOUCHES_CIRCUMFERENCE");
  if (input.overflow) reasons.push("CIRCLE_OVERFLOW");
  if (input.clipped) reasons.push("CIRCLE_CLIPPING");
  if (input.fontSizePx < 12) reasons.push("TINY_FONT_WORKAROUND");
  return { gate: VENTURE_RADAR_ORB_READABILITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureRadarOpportunityContentGate(input: {
  rankVisible: boolean;
  scoreVisible: boolean;
  titleVisible: boolean;
  selectionStateVisible: boolean;
  monetizationVisible: boolean;
  monetizationUnknownForcedToZero?: boolean;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (!input.rankVisible) reasons.push("RANK_HIDDEN");
  if (!input.scoreVisible) reasons.push("OPPORTUNITY_SCORE_HIDDEN");
  if (!input.titleVisible) reasons.push("TITLE_HIDDEN");
  if (!input.selectionStateVisible) reasons.push("SELECTION_STATE_HIDDEN");
  if (!input.monetizationVisible) reasons.push("MONETIZATION_HIDDEN");
  if (input.monetizationUnknownForcedToZero) reasons.push("UNKNOWN_MONETIZATION_FORCED_TO_ZERO");
  return { gate: VENTURE_RADAR_OPPORTUNITY_CONTENT_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureRadarSelectionVisibilityGate(input: {
  selectedHasSelectedText: boolean;
  shortlistedHasShortlistedText: boolean;
  distinguishableWithoutColor: boolean;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (!input.selectedHasSelectedText) reasons.push("SELECTED_TEXT_MISSING");
  if (!input.shortlistedHasShortlistedText) reasons.push("SHORTLISTED_TEXT_MISSING");
  if (!input.distinguishableWithoutColor) reasons.push("COLOR_ONLY_SELECTION_CUE");
  return { gate: VENTURE_RADAR_SELECTION_VISIBILITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureRadarResponsiveOrbGrid(input: {
  viewportWidthPx: number;
  columnCount: number;
  circleDiameterPx: number;
  elliptical?: boolean;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.circleDiameterPx < VENTURE_RADAR_ORB_MIN_DIAMETER_PX) reasons.push("CIRCLE_SHRUNK_UNREADABLE");
  if (input.elliptical) reasons.push("UNINTENDED_ELLIPSE");
  if (input.viewportWidthPx >= 1440 && input.columnCount > 5) reasons.push("GRID_TOO_DENSE_FOR_VIEWPORT");
  if (input.viewportWidthPx < 1280 && input.columnCount > 4) reasons.push("GRID_TOO_DENSE_FOR_VIEWPORT");
  if (input.viewportWidthPx < 900 && input.columnCount > 3) reasons.push("GRID_TOO_DENSE_FOR_VIEWPORT");
  if (input.viewportWidthPx < 640 && input.columnCount > 2) reasons.push("GRID_TOO_DENSE_FOR_VIEWPORT");
  return { gate: "VentureRadarResponsiveOrbGrid", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

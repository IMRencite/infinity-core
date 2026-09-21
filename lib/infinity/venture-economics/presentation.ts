export const PROFIT_LAB_CARD_SPACING_GATE = "ProfitLabCardSpacingGate" as const;
export const RENDERED_PROFIT_LAB_ECONOMICS_QUALITY_GATE = "RenderedProfitLabEconomicsQualityGate" as const;
export const LONG_ECONOMICS_PILL_THRESHOLD = 48;

export type EconomicsPresentationKind = "status_badge" | "classification_tag" | "economic_value" | "explanation";

export const PROFIT_LAB_SPACING_TOKENS = {
  valuePadX: 22,
  valuePadY: 18,
  explanationPadX: 22,
  explanationPadY: 18,
  lineHeight: 1.5,
  minTextBorderGap: 16,
} as const;

export function economicsPresentationKind(value: string | null | undefined): EconomicsPresentationKind {
  if (!value) return "status_badge";
  const trimmed = value.trim();
  if (trimmed.length > LONG_ECONOMICS_PILL_THRESHOLD || /UNKNOWN —|contact-sales|general-purpose|labor, not a product/i.test(trimmed)) {
    return "explanation";
  }
  if (/^(HIGH|MEDIUM|LOW|WEAK|MODERATE|STRONG|OBSERVED|MODELED|UNKNOWN)$/i.test(trimmed)) {
    return "classification_tag";
  }
  if (/^\$|%|year|month|Per-Deal|CAC|LTV/i.test(trimmed) || trimmed.length <= 24) {
    return "economic_value";
  }
  return trimmed.length > 28 ? "explanation" : "status_badge";
}

export function presentationClassName(kind: EconomicsPresentationKind, value?: string): string {
  if (kind === "explanation") return "hq-econ-explanation-body";
  if (kind === "classification_tag") return "hq-circular-orb";
  if (kind === "economic_value") {
    return (value?.trim().length ?? 0) > 28 ? "hq-econ-value-card" : "hq-circular-orb";
  }
  return "hq-econ-status-badge";
}

export function evaluateProfitLabCardSpacingGate(input: {
  horizontalPaddingPx: number;
  verticalPaddingPx: number;
  lineHeight: number;
  textBorderGapPx: number;
  longTextInCompactPill: boolean;
  overflow: boolean;
}): { gate: string; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.horizontalPaddingPx < PROFIT_LAB_SPACING_TOKENS.valuePadX) reasons.push("HORIZONTAL_PADDING_CRAMPED");
  if (input.verticalPaddingPx < PROFIT_LAB_SPACING_TOKENS.valuePadY) reasons.push("VERTICAL_PADDING_CRAMPED");
  if (input.lineHeight < PROFIT_LAB_SPACING_TOKENS.lineHeight) reasons.push("LINE_HEIGHT_CRAMPED");
  if (input.textBorderGapPx < PROFIT_LAB_SPACING_TOKENS.minTextBorderGap) reasons.push("TEXT_BORDER_COLLISION");
  if (input.longTextInCompactPill) reasons.push("LONG_TEXT_IN_COMPACT_PILL");
  if (input.overflow) reasons.push("OVERFLOW_OR_CLIPPING");
  return { gate: PROFIT_LAB_CARD_SPACING_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateRenderedProfitLabEconomicsQualityGate(input: {
  source: "founder_physical_browser" | "served_screenshot" | "computed_geometry" | "css_source";
  spacing: ReturnType<typeof evaluateProfitLabCardSpacingGate>;
  occupancynpvPricePreserved: boolean;
}): { gate: string; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons = [...input.spacing.reasons];
  if (!input.occupancynpvPricePreserved) reasons.push("OCCUPANCYNPV_PRICE_CHANGED");
  return { gate: RENDERED_PROFIT_LAB_ECONOMICS_QUALITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

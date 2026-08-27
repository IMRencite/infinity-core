export const ECONOMIC_EVIDENCE_CLASSES = [
  "OBSERVED",
  "VALIDATION_ESTIMATE",
  "COMPARABLE_MODELED",
  "FOUNDER_HYPOTHESIS",
  "UNKNOWN",
] as const;

export type EconomicEvidenceClass = (typeof ECONOMIC_EVIDENCE_CLASSES)[number];

export const ECONOMIC_CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW", "NONE"] as const;
export type EconomicConfidenceLevel = (typeof ECONOMIC_CONFIDENCE_LEVELS)[number];

/**
 * Classes are never equivalent. Only OBSERVED may satisfy the strongest BUILD economics gate.
 * Existing Founder/BUILD policy does not accept VALIDATION_ESTIMATE or COMPARABLE_MODELED as observed CAC/LTV.
 */
export function provenanceMaySatisfyBuildEconomics(cls: EconomicEvidenceClass): boolean {
  return cls === "OBSERVED";
}

export function provenanceMaySatisfyDecisionPlanning(cls: EconomicEvidenceClass): boolean {
  return cls === "OBSERVED" || cls === "VALIDATION_ESTIMATE" || cls === "COMPARABLE_MODELED";
}

export type EconomicRange = {
  low: number | null;
  base: number | null;
  high: number | null;
};

export function unknownRange(): EconomicRange {
  return { low: null, base: null, high: null };
}

export function isKnownNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function rangeHasValue(range: EconomicRange | null | undefined): boolean {
  if (!range) return false;
  return isKnownNumber(range.low) || isKnownNumber(range.base) || isKnownNumber(range.high);
}

/**
 * Policy sentinel: unknown economic values stay null and are never coerced to 0.
 * The engine never reports a conversion; callers must keep missing values as null.
 */
export function unknownToZero(_value: number | null | undefined): false {
  return false;
}

export type EconomicAssumption = {
  id: string;
  name: string;
  range: EconomicRange;
  unit: string;
  provenance: EconomicEvidenceClass;
  confidence: EconomicConfidenceLevel;
  sourceRefs: string[];
  assumption: string;
  calculationMethod: string;
  freshness: string | null;
  uncertainty: string;
};

export function formatRange(range: EconomicRange, prefix = ""): string {
  if (!rangeHasValue(range)) return "UNKNOWN";
  const fmt = (value: number | null) => (isKnownNumber(value) ? `${prefix}${Math.round(value)}` : "UNKNOWN");
  if (
    isKnownNumber(range.low) &&
    isKnownNumber(range.high) &&
    range.low !== range.high
  ) {
    const base = isKnownNumber(range.base) ? ` (base ${fmt(range.base)})` : "";
    return `${fmt(range.low)}–${fmt(range.high)}${base}`;
  }
  return fmt(range.base ?? range.low ?? range.high);
}

export function bandAround(base: number, fraction = 0.4): EconomicRange {
  return {
    low: Math.round(base * (1 - fraction)),
    base: Math.round(base),
    high: Math.round(base * (1 + fraction)),
  };
}

export function midpointRange(low: number, high: number): EconomicRange {
  return { low, base: Math.round((low + high) / 2), high };
}

export function mergeRanges(ranges: EconomicRange[]): EconomicRange {
  const lows = ranges.map((item) => item.low).filter(isKnownNumber);
  const bases = ranges.map((item) => item.base).filter(isKnownNumber);
  const highs = ranges.map((item) => item.high).filter(isKnownNumber);
  if (!lows.length && !bases.length && !highs.length) return unknownRange();
  return {
    low: lows.length ? Math.min(...lows) : bases.length ? Math.min(...bases) : null,
    base: bases.length
      ? Math.round(bases.reduce((sum, value) => sum + value, 0) / bases.length)
      : lows.length && highs.length
        ? Math.round((Math.min(...lows) + Math.max(...highs)) / 2)
        : null,
    high: highs.length ? Math.max(...highs) : bases.length ? Math.max(...bases) : null,
  };
}

export function confidenceFromSupport(input: {
  sourceCount: number;
  comparableCount: number;
  grounded: boolean;
}): EconomicConfidenceLevel {
  if (!input.grounded || input.sourceCount === 0) return input.sourceCount > 0 ? "LOW" : "NONE";
  if (input.sourceCount >= 3 && input.comparableCount >= 2) return "HIGH";
  if (input.sourceCount >= 1) return "MEDIUM";
  return "LOW";
}

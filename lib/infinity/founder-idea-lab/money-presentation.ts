import type { EconomicConfidenceLevel, EconomicRange } from "./comparable-economics/provenance";
import { rangeHasValue } from "./comparable-economics/provenance";

export type CanonicalMetricPresentation = {
  displayRange: string;
  displayBase: string;
  displayConfidence: string;
  displayQualifier: string;
  low: number | null;
  base: number | null;
  high: number | null;
  organic: string | null;
  paid: string | null;
  category: string | null;
};

export function roundModeledUsd(value: number): number {
  if (value >= 1000) return Math.round(value / 10) * 10;
  if (value >= 100) return Math.round(value);
  return Math.round(value);
}

export function formatApproximateUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not known yet";
  const rounded = roundModeledUsd(value);
  return `~$${rounded.toLocaleString("en-US")}`;
}

export function formatUsdRange(low: number | null, high: number | null): string {
  if (low == null && high == null) return "Not known yet";
  if (low != null && high != null && low !== high) {
    return `$${roundModeledUsd(low).toLocaleString("en-US")}–$${roundModeledUsd(high).toLocaleString("en-US")}`;
  }
  return formatApproximateUsd(low ?? high);
}

export function confidenceLabel(confidence: EconomicConfidenceLevel | string | null | undefined): string {
  const raw = String(confidence ?? "NONE").toUpperCase();
  if (raw === "HIGH") return "High";
  if (raw === "MEDIUM") return "Medium";
  if (raw === "LOW") return "Low";
  return "Not enough data";
}

export function presentUsdMetric(input: {
  range?: EconomicRange | null;
  confidence?: EconomicConfidenceLevel | string | null;
  qualifier?: string;
  organic?: number | null;
  paid?: number | null;
  category?: number | null;
  unknownLabel?: string;
}): CanonicalMetricPresentation {
  const range = input.range ?? { low: null, base: null, high: null };
  const unknown = input.unknownLabel ?? "Not known yet";
  if (!rangeHasValue(range)) {
    return {
      displayRange: unknown,
      displayBase: unknown,
      displayConfidence: confidenceLabel(input.confidence),
      displayQualifier: input.qualifier ?? "",
      low: null,
      base: null,
      high: null,
      organic: input.organic != null ? formatApproximateUsd(input.organic) : null,
      paid: input.paid != null ? formatApproximateUsd(input.paid) : null,
      category: input.category != null ? formatApproximateUsd(input.category) : null,
    };
  }
  const low = range.low;
  const high = range.high;
  const base = range.base ?? range.low ?? range.high;
  const confidence = String(input.confidence ?? "NONE").toUpperCase();
  const qualifier =
    input.qualifier ??
    (confidence === "LOW" ? "Preliminary estimate" : confidence === "MEDIUM" ? "Modeled estimate" : "");
  return {
    displayRange: formatUsdRange(low, high),
    displayBase: formatApproximateUsd(base),
    displayConfidence: confidenceLabel(input.confidence),
    displayQualifier: qualifier,
    low,
    base,
    high,
    organic: input.organic != null ? formatApproximateUsd(input.organic) : null,
    paid: input.paid != null ? formatApproximateUsd(input.paid) : null,
    category: input.category != null ? formatApproximateUsd(input.category) : null,
  };
}

export function presentCacCopy(presentation: CanonicalMetricPresentation): string {
  const lines = [
    presentation.displayQualifier || "Preliminary CAC estimate",
    `About ${presentation.displayBase.replace(/^~/, "")}`,
    "",
    "Range",
    presentation.displayRange,
  ];
  if (presentation.organic) {
    lines.push("", "Organic benchmark", presentation.organic);
  }
  if (presentation.paid) {
    lines.push("", "Paid benchmark", presentation.paid);
  }
  if (presentation.category && !presentation.paid) {
    lines.push("", "Category / generic benchmark", presentation.category);
  }
  lines.push("", "Confidence", presentation.displayConfidence);
  lines.push(
    "",
    "Why",
    presentation.organic || presentation.paid || presentation.category
      ? "Infinity found only weak or same-source market benchmarks."
      : "Infinity found only one weak market benchmark.",
  );
  lines.push("", "Next", "Find stronger CAC benchmarks and measure actual acquisition cost.");
  return lines.join("\n");
}

import type { EconomicConfidenceLevel } from "../comparable-economics/provenance";
import type { BenchmarkCoverageStatus } from "./types";
import { presentCacCopy, presentUsdMetric, type CanonicalMetricPresentation } from "../money-presentation";

export function founderLowConfidenceCacCopy(
  input: number | { base: number; low?: number | null; high?: number | null; organic?: number | null; paid?: number | null; category?: number | null },
): string {
  const spec = typeof input === "number" ? { base: input, low: null, high: null } : input;
  const presentation = presentUsdMetric({
    range: { low: spec.low ?? null, base: spec.base, high: spec.high ?? null },
    confidence: "LOW",
    qualifier: "Preliminary CAC estimate",
    organic: spec.organic,
    paid: spec.paid,
    category: spec.category,
  });
  return presentCacCopy(presentation);
}

export function formatSingleWeakUsd(amount: number): string {
  return presentUsdMetric({ range: { low: amount, base: amount, high: amount }, confidence: "LOW" }).displayBase.replace(/^~/, "");
}

export function cacValidationTarget(input: {
  amount: number | null;
  confidence: EconomicConfidenceLevel;
  coverage: BenchmarkCoverageStatus;
}): string {
  if (input.amount == null || input.coverage === "BENCHMARK_INSUFFICIENT") return "Measure CAC.";
  if (input.confidence === "LOW" || input.coverage === "BENCHMARK_PARTIAL") {
    return `Determine whether CAC is near the preliminary ${formatSingleWeakUsd(input.amount)} benchmark or materially different.`;
  }
  return `Can we acquire customers below approximately ${formatSingleWeakUsd(input.amount)}?`;
}

export function canonicalCacPresentation(input: {
  range: { low: number | null; base: number | null; high: number | null };
  confidence: EconomicConfidenceLevel;
  organic?: number | null;
  paid?: number | null;
  category?: number | null;
}): CanonicalMetricPresentation {
  return presentUsdMetric({
    range: input.range,
    confidence: input.confidence,
    qualifier: input.confidence === "LOW" ? "Preliminary CAC estimate" : "Modeled CAC estimate",
    organic: input.organic,
    paid: input.paid,
    category: input.category,
  });
}

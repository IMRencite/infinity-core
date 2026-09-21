import { unknownRange, type EconomicConfidenceLevel, type EconomicEvidenceClass, type EconomicRange } from "../comparable-economics/provenance";
import type { BenchmarkAggregation, BenchmarkDimension, QualifiedBenchmark } from "./types";
import { confidenceFromAcceptedQuality } from "./confidence";

function center(range: EconomicRange): number | null {
  return range.base ?? range.low ?? range.high;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2;
  return sorted[mid]!;
}

function relevanceWeight(item: QualifiedBenchmark): number {
  if (item.relevance === "HIGH_RELEVANCE") return 3;
  if (item.relevance === "MEDIUM_RELEVANCE") return 2;
  return 1;
}

function weightedMedian(items: Array<{ value: number; weight: number }>): number | null {
  if (!items.length) return null;
  const sorted = [...items].sort((left, right) => left.value - right.value);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return median(sorted.map((item) => item.value));
  let acc = 0;
  for (const item of sorted) {
    acc += item.weight;
    if (acc >= total / 2) return item.value;
  }
  return sorted[sorted.length - 1]!.value;
}

function isOutlier(value: number, cohort: number[]): boolean {
  const mid = median(cohort);
  if (mid == null || mid === 0) return false;
  return value > mid * 3 || value < mid / 3;
}

export function feedsBaseCase(item: QualifiedBenchmark): boolean {
  return item.relevance === "HIGH_RELEVANCE" || item.relevance === "MEDIUM_RELEVANCE" || item.relevance === "LOW_RELEVANCE";
}

export function aggregateDimension(dimension: BenchmarkDimension, items: QualifiedBenchmark[]): BenchmarkAggregation {
  const forDim = items.filter((item) => item.dimension === dimension);
  const acceptedPool = forDim.filter(feedsBaseCase);
  const centers = acceptedPool.map((item) => center(item.range)).filter((value): value is number => value != null);
  const outliers = acceptedPool.filter((item) => {
    const value = center(item.range);
    return value != null && isOutlier(value, centers);
  });
  const rejected = [
    ...forDim.filter((item) => item.relevance === "REJECTED" || item.relevance === "LOW_RELEVANCE"),
    ...outliers,
  ];
  const accepted = acceptedPool.filter((item) => !outliers.includes(item));
  const acceptedCenters = accepted.map((item) => center(item.range)).filter((value): value is number => value != null);
  const lows = accepted.map((item) => item.range.low).filter((value): value is number => value != null);
  const highs = accepted.map((item) => item.range.high).filter((value): value is number => value != null);
  const rawCenters = forDim.map((item) => center(item.range)).filter((value): value is number => value != null);
  const rawLows = forDim.map((item) => item.range.low).filter((value): value is number => value != null);
  const rawHighs = forDim.map((item) => item.range.high).filter((value): value is number => value != null);

  const weighted =
    accepted.length >= 4
      ? weightedMedian(
          accepted
            .map((item) => {
              const value = center(item.range);
              return value == null ? null : { value, weight: relevanceWeight(item) };
            })
            .filter((item): item is { value: number; weight: number } => item != null),
        )
      : null;
  const base = accepted.length >= 4 && weighted != null ? weighted : median(acceptedCenters);
  const method: BenchmarkAggregation["method"] =
    accepted.length === 0 ? "none" : accepted.length === 1 ? "single_observation" : accepted.length >= 4 ? "weighted_median" : "median";
  const acceptedRange: EconomicRange = acceptedCenters.length
    ? {
        low: lows.length ? Math.min(...lows) : Math.min(...acceptedCenters),
        base,
        high: highs.length ? Math.max(...highs) : Math.max(...acceptedCenters),
      }
    : unknownRange();
  const rawRange: EconomicRange = rawCenters.length
    ? {
        low: rawLows.length ? Math.min(...rawLows) : Math.min(...rawCenters),
        base: median(rawCenters),
        high: rawHighs.length ? Math.max(...rawHighs) : Math.max(...rawCenters),
      }
    : unknownRange();

  const spread =
    acceptedRange.low != null && acceptedRange.high != null && acceptedRange.low > 0
      ? acceptedRange.high / acceptedRange.low
      : 1;
  const conflict = accepted.length >= 2 && spread >= 2.5;
  const hosts = new Set(
    accepted.map((item) => {
      try {
        return new URL(item.sourceUrl).hostname;
      } catch {
        return item.sourceUrl;
      }
    }),
  );
  const provenance: EconomicEvidenceClass =
    accepted.some((item) => item.provenance === "COMPANY_COMPARABLE") && accepted.some((item) => item.provenance === "CATEGORY_BENCHMARK")
      ? "COMPARABLE_MODELED"
      : accepted[0]?.provenance ?? "UNKNOWN";
  let confidence: EconomicConfidenceLevel = confidenceFromAcceptedQuality(accepted);
  if (conflict) confidence = "LOW";
  if (accepted.length === 0) confidence = "NONE";

  return {
    dimension,
    sampleCount: forDim.length,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    rawRange,
    acceptedRange,
    base,
    method,
    rejectedOutliers: outliers,
    conflict,
    conflictWhy: conflict ? "Credible accepted benchmarks disagree by more than 2.5x; range is retained and not silently averaged." : null,
    sourceCount: forDim.length,
    independentSourceCount: hosts.size,
    provenance: accepted.length ? (conflict ? "CATEGORY_BENCHMARK" : provenance) : "UNKNOWN",
    confidence,
  };
}

export function aggregateAll(items: QualifiedBenchmark[]): Partial<Record<BenchmarkDimension, BenchmarkAggregation>> {
  const dimensions = [...new Set(items.map((item) => item.dimension))];
  const out: Partial<Record<BenchmarkDimension, BenchmarkAggregation>> = {};
  for (const dimension of dimensions) {
    out[dimension] = aggregateDimension(dimension, items);
  }
  return out;
}

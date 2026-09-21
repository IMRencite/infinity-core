import type { EconomicConfidenceLevel } from "../comparable-economics/provenance";
import type { BenchmarkCoverageStatus, BenchmarkSourceClass, QualifiedBenchmark } from "./types";
import { sourceQualityHigh, sourceQualityScore } from "./quality";
import { isOpaqueVertexRedirect, publisherIndependenceKey } from "../revenue-model-research/source-independence";

const RANK: Record<EconomicConfidenceLevel, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };

export function weakestConfidence(...levels: Array<EconomicConfidenceLevel | null | undefined>): EconomicConfidenceLevel {
  let worst: EconomicConfidenceLevel = "HIGH";
  let seen = false;
  for (const level of levels) {
    if (!level) continue;
    seen = true;
    if (RANK[level] < RANK[worst]) worst = level;
  }
  return seen ? worst : "NONE";
}

export function sourceQualityMedium(sourceClass: BenchmarkSourceClass): boolean {
  return sourceQualityScore(sourceClass) >= 0.7;
}

function independentHost(url: string, companyName?: string | null): string {
  return publisherIndependenceKey({
    url,
    entity: isOpaqueVertexRedirect(url) ? null : companyName,
  });
}

/**
 * SUFFICIENT requires:
 * A. one HIGH-quality directly relevant benchmark, OR
 * B. 2+ independent MEDIUM-quality relevant benchmarks, OR
 * C. caller-supplied component model (acceptedCount bump handled by caller).
 * A single UNSOURCED_SEO_PAGE observation is PARTIAL at most.
 */
export function coverageFromAcceptedQuality(accepted: QualifiedBenchmark[]): BenchmarkCoverageStatus {
  const relevant = accepted.filter(
    (item) => item.relevance === "HIGH_RELEVANCE" || item.relevance === "MEDIUM_RELEVANCE" || item.relevance === "LOW_RELEVANCE",
  );
  if (!relevant.length) return "BENCHMARK_INSUFFICIENT";
  const high = relevant.filter((item) => sourceQualityHigh(item.sourceClass) && item.relevance === "HIGH_RELEVANCE");
  if (high.length >= 1) return "BENCHMARK_SUFFICIENT";
  const medium = relevant.filter((item) => sourceQualityMedium(item.sourceClass) && item.relevance !== "LOW_RELEVANCE");
  const hosts = new Set(medium.map((item) => independentHost(item.sourceUrl, item.companyName)));
  if (medium.length >= 2 && hosts.size >= 2) return "BENCHMARK_SUFFICIENT";
  return "BENCHMARK_PARTIAL";
}

export function confidenceFromAcceptedQuality(accepted: QualifiedBenchmark[]): EconomicConfidenceLevel {
  const relevant = accepted.filter(
    (item) => item.relevance === "HIGH_RELEVANCE" || item.relevance === "MEDIUM_RELEVANCE" || item.relevance === "LOW_RELEVANCE",
  );
  if (!relevant.length) return "NONE";
  if (coverageFromAcceptedQuality(accepted) === "BENCHMARK_SUFFICIENT") {
    return relevant.some((item) => sourceQualityHigh(item.sourceClass) && item.relevance === "HIGH_RELEVANCE") ? "HIGH" : "MEDIUM";
  }
  return "LOW";
}

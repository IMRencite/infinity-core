import { RESEARCH_LIMITS } from "../constants";
import type { ResearchCostPolicy } from "../cost-governance";

export type ResearchCoveragePolicy = {
  maxLogicalInitialPhases: 1;
  maxGapFillPhases: 1;
  maxInitialQueries: number;
  maxGapFillQueries: number;
  maxRevenueGapFillPhases: 1;
  maxRevenueGapFillQueries: number;
  maxRevenueGapFillQueryHardCap: 8;
  maxBenchmarkGapFillPhases: 1;
  maxBenchmarkGapFillQueries: number;
  maxBenchmarkGapFillQueryHardCap: 8;
  maxQualityReplacementPhases: 1;
  maxQualityReplacementQueries: number;
  maxQualityReplacementQueryHardCap: 8;
  maxFindings: number;
  maxEstimatedCostUsd: number;
  maxRetries: number;
  timeoutMs: number;
};

export function loadResearchCoveragePolicy(
  env: Record<string, string | undefined> = process.env,
  costPolicy?: Pick<ResearchCostPolicy, "maxEstimatedCostUsd" | "maxRetries" | "maxSearchQueries" | "timeoutMs">,
): ResearchCoveragePolicy {
  const configuredSearch = Number(
    env.RESEARCH_COVERAGE_MAX_INITIAL_QUERIES ??
      costPolicy?.maxSearchQueries ??
      env.RESEARCH_MAX_SEARCH_QUERIES ??
      8,
  );
  const configuredGapFill = Number(env.RESEARCH_COVERAGE_MAX_GAP_FILL_QUERIES ?? 4);
  const configuredRevenue = Number(env.RESEARCH_REVENUE_MAX_GAP_FILL_QUERIES ?? 5);
  const configuredBenchmark = Number(env.RESEARCH_BENCHMARK_MAX_GAP_FILL_QUERIES ?? 5);
  return {
    maxLogicalInitialPhases: 1,
    maxGapFillPhases: 1,
    maxInitialQueries: Math.max(1, Math.min(12, Number.isFinite(configuredSearch) ? configuredSearch : 8)),
    maxGapFillQueries: Math.max(1, Math.min(6, Number.isFinite(configuredGapFill) ? configuredGapFill : 4)),
    maxRevenueGapFillPhases: 1,
    maxRevenueGapFillQueries: Math.max(1, Math.min(8, Number.isFinite(configuredRevenue) ? configuredRevenue : 5)),
    maxRevenueGapFillQueryHardCap: 8,
    maxBenchmarkGapFillPhases: 1,
    maxBenchmarkGapFillQueries: Math.max(1, Math.min(8, Number.isFinite(configuredBenchmark) ? configuredBenchmark : 5)),
    maxBenchmarkGapFillQueryHardCap: 8,
    maxQualityReplacementPhases: 1,
    maxQualityReplacementQueries: Math.max(1, Math.min(8, Number(env.RESEARCH_QUALITY_REPLACEMENT_MAX_QUERIES ?? 5) || 5)),
    maxQualityReplacementQueryHardCap: 8,
    maxFindings: RESEARCH_LIMITS.maxFindings,
    maxEstimatedCostUsd: costPolicy?.maxEstimatedCostUsd ?? Number(env.RESEARCH_MAX_ESTIMATED_COST_USD ?? 2),
    maxRetries: costPolicy?.maxRetries ?? Number(env.RESEARCH_MAX_RETRIES ?? env.GEMINI_MAX_RETRIES ?? 2),
    timeoutMs: costPolicy?.timeoutMs ?? Number(env.RESEARCH_TIMEOUT_MS ?? 90_000),
  };
}

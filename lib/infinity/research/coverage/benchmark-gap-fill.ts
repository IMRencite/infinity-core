import { estimateResearchCostUsd } from "../cost-pricing";
import type { NormalizedEvidenceItem, NormalizedSource } from "../types";
import type { ResearchCoveragePolicy } from "./policy";
import {
  isRedundantQuery,
  selectBoundedQueries,
  type PlannedResearchQuery,
  type ResearchCoverageSeed,
} from "./queries";
import { benchmarkEconomicsQueries } from "@/lib/infinity/founder-idea-lab/benchmark-economics/queries";
import { extractBenchmarkObservations } from "@/lib/infinity/founder-idea-lab/benchmark-economics/extract";
import { qualifyBenchmarks } from "@/lib/infinity/founder-idea-lab/benchmark-economics/qualify";
import { aggregateAll, feedsBaseCase } from "@/lib/infinity/founder-idea-lab/benchmark-economics/aggregate";
import { modelRetention } from "@/lib/infinity/founder-idea-lab/benchmark-economics/model-retention";
import { coverageFromAcceptedQuality } from "@/lib/infinity/founder-idea-lab/benchmark-economics/confidence";
import { coreMonthlyRangeFromFindings } from "@/lib/infinity/founder-idea-lab/revenue-model-research/extract";
import { rangeHasValue } from "@/lib/infinity/founder-idea-lab/comparable-economics/provenance";
import type { FounderResearchFinding } from "@/lib/infinity/founder-idea-lab/research-packet";
import type { VentureContext } from "@/lib/infinity/founder-idea-lab/comparable-economics/qualify";

export const BENCHMARK_ECONOMICS_STOP_REASONS = [
  "BENCHMARK_ECONOMICS_SUFFICIENT",
  "NO_RESEARCHABLE_BENCHMARK_GAP",
  "BENCHMARK_BUDGET_EXHAUSTED",
  "BENCHMARK_GAP_FILL_LIMIT",
  "LOW_BENCHMARK_INFORMATION_VALUE",
  "PROVIDER_FAILURE",
] as const;

export type BenchmarkEconomicsStopReason = (typeof BENCHMARK_ECONOMICS_STOP_REASONS)[number];

function contextFromSeed(seed?: ResearchCoverageSeed): VentureContext {
  return {
    title: seed?.ideaTitle ?? "",
    description: seed?.ideaTitle ?? "",
    targetCustomer: seed?.targetCustomer ?? "",
    problem: "",
    proposedSolution: seed?.ideaTitle ?? "",
    businessModelHypothesis: "",
    pricingHypothesis: "",
  };
}

function findingsFromEvidence(
  evidence: Array<Pick<NormalizedEvidenceItem, "claim" | "grounded"> & { sourceUrls?: string[] }>,
  sources: Pick<NormalizedSource, "url">[],
): FounderResearchFinding[] {
  const fallback = sources[0]?.url ? [sources[0].url] : [];
  return evidence.map((item, index) => ({
    findingId: `bench-plan-${index}`,
    dimension: "capital_efficiency",
    claim: item.claim,
    polarity: "mixed",
    grounded: item.grounded,
    confidence: 0.5,
    sourceUrls: item.sourceUrls?.length ? item.sourceUrls : fallback,
    limitations: [],
  }));
}

export function assessBenchmarkPlannerCoverage(input: {
  evidence: Array<Pick<NormalizedEvidenceItem, "claim" | "grounded"> & { sourceUrls?: string[] }>;
  sources?: Pick<NormalizedSource, "url">[];
  seed?: ResearchCoverageSeed;
}): { missing: string[]; sufficient: boolean; researchable: boolean } {
  const claims = input.evidence.map((item) => item.claim);
  const findings = findingsFromEvidence(input.evidence, input.sources ?? []);
  const qualified = qualifyBenchmarks(extractBenchmarkObservations(findings), contextFromSeed(input.seed));
  const accepted = qualified.filter(feedsBaseCase);
  const aggregations = aggregateAll(qualified);
  const retention = modelRetention({ aggregations, qualified });
  const cac = coverageFromAcceptedQuality(accepted.filter((item) => item.dimension === "customer_acquisition_cost"));
  const margin = coverageFromAcceptedQuality(accepted.filter((item) => item.dimension === "gross_margin"));
  const retentionCoverage = coverageFromAcceptedQuality(
    accepted.filter(
      (item) =>
        (item.dimension === "monthly_churn" && item.churnKind === "monthly_logo") ||
        (item.dimension === "annual_churn" && item.churnKind === "annual_logo") ||
        (item.dimension === "retention_rate" && (item.churnKind === "annual_logo" || item.churnKind === "customer_retention")) ||
        item.dimension === "customer_lifetime",
    ),
  );
  const arpu = rangeHasValue(coreMonthlyRangeFromFindings(claims));
  const conversion = accepted.some(
    (item) =>
      item.dimension === "visitor_to_lead_conversion" ||
      item.dimension === "lead_to_customer_conversion" ||
      item.dimension === "sales_close_rate",
  );
  const salesCycle = accepted.some((item) => item.dimension === "sales_cycle_days");
  const lifetimeUsable = rangeHasValue(retention.lifetimeMonths);
  const sufficient =
    arpu && cac === "BENCHMARK_SUFFICIENT" && margin === "BENCHMARK_SUFFICIENT" && retentionCoverage === "BENCHMARK_SUFFICIENT" && lifetimeUsable;
  const missing: string[] = [];
  if (cac !== "BENCHMARK_SUFFICIENT") missing.push("cac");
  if (retentionCoverage !== "BENCHMARK_SUFFICIENT" || !lifetimeUsable) missing.push("churn");
  if (margin !== "BENCHMARK_SUFFICIENT") missing.push("margin");
  if (!arpu) missing.push("arpu");
  if (!conversion) missing.push("conversion");
  if (!salesCycle) missing.push("sales_cycle");
  return { missing, sufficient, researchable: !sufficient };
}

export type BenchmarkGapFillDecision =
  | { eligible: false; reason: BenchmarkEconomicsStopReason; queries: [] }
  | { eligible: true; reason: "BENCHMARK_ECONOMICS_GAP_RESEARCHABLE"; queries: PlannedResearchQuery[] };

export function evaluateBenchmarkGapFillEligibility(input: {
  materialCoverageSufficient: boolean;
  evidence: Array<Pick<NormalizedEvidenceItem, "claim" | "grounded"> & { sourceUrls?: string[] }>;
  sources: Pick<NormalizedSource, "url">[];
  policy: ResearchCoveragePolicy;
  seed?: ResearchCoverageSeed;
  issuedQueries: PlannedResearchQuery[];
  benchmarkGapFillPhasesUsed: number;
  recordedCostUsd: number | null;
  estimatedGapFillCostUsd: number | null;
}): BenchmarkGapFillDecision {
  if (!input.materialCoverageSufficient) {
    return { eligible: false, reason: "NO_RESEARCHABLE_BENCHMARK_GAP", queries: [] };
  }
  const coverage = assessBenchmarkPlannerCoverage({ evidence: input.evidence, sources: input.sources, seed: input.seed });
  if (coverage.sufficient) {
    return { eligible: false, reason: "BENCHMARK_ECONOMICS_SUFFICIENT", queries: [] };
  }
  if (input.benchmarkGapFillPhasesUsed >= input.policy.maxBenchmarkGapFillPhases) {
    return { eligible: false, reason: "BENCHMARK_GAP_FILL_LIMIT", queries: [] };
  }
  if (
    input.recordedCostUsd != null &&
    (input.recordedCostUsd > input.policy.maxEstimatedCostUsd ||
      (input.estimatedGapFillCostUsd != null && input.recordedCostUsd + input.estimatedGapFillCostUsd > input.policy.maxEstimatedCostUsd))
  ) {
    return { eligible: false, reason: "BENCHMARK_BUDGET_EXHAUSTED", queries: [] };
  }
  if (!coverage.researchable) {
    return { eligible: false, reason: "NO_RESEARCHABLE_BENCHMARK_GAP", queries: [] };
  }
  const critical = coverage.missing.filter((item) => item === "cac" || item === "churn" || item === "margin" || item === "arpu");
  const candidates = benchmarkEconomicsQueries(input.seed ?? {}, (critical.length ? critical : coverage.missing).slice(0, 4));
  const issued = input.issuedQueries.map((query) => query.query);
  const queries = selectBoundedQueries(
    candidates.filter((candidate) => !isRedundantQuery(candidate.query, issued)),
    issued,
    Math.min(input.policy.maxBenchmarkGapFillQueries, input.policy.maxBenchmarkGapFillQueryHardCap),
  );
  if (queries.length === 0) {
    return { eligible: false, reason: "LOW_BENCHMARK_INFORMATION_VALUE", queries: [] };
  }
  return { eligible: true, reason: "BENCHMARK_ECONOMICS_GAP_RESEARCHABLE", queries };
}

export function estimateBenchmarkGapFillCostUsd(modelId: string, queryCount: number): number | null {
  return estimateResearchCostUsd({
    modelId,
    inputTokens: 800,
    outputTokens: 800,
    searchQueryCount: queryCount,
  }).estimatedCostUsd;
}

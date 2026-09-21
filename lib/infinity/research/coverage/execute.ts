import { estimateResearchCostUsd } from "../cost-pricing";
import type { ResearchResult } from "../types";
import { assessResearchResultCoverage, type ResearchCoverageAssessment } from "./assess";
import { evaluateGapFillEligibility, type ResearchPhaseStopReason } from "./gap-fill";
import { mergeNormalizedResearch } from "./merge";
import type { ResearchCoveragePlan } from "./plan";
import type { ResearchCoveragePolicy } from "./policy";
import type { PlannedResearchQuery, ResearchCoverageSeed } from "./queries";
import {
  assessRevenuePlannerCoverage,
  evaluateRevenueGapFillEligibility,
  type RevenueModelStopReason,
} from "./revenue-gap-fill";
import {
  assessBenchmarkPlannerCoverage,
  evaluateBenchmarkGapFillEligibility,
  type BenchmarkEconomicsStopReason,
} from "./benchmark-gap-fill";
import {
  evaluateQualityReplacementEligibility,
  beginQualityReplacementPhase,
  type QualityReplacementStopReason,
} from "./quality-replacement";

export type ResearchCallTelemetry = {
  initialResearchCallCount: number;
  transportRetryCount: number;
  gapFillCallCount: number;
  revenueGapFillCallCount: number;
  benchmarkGapFillCallCount: number;
  qualityReplacementCallCount: number;
  totalProviderCalls: number;
};

export type CoverageDirectedPhase =
  | "initial"
  | "gap_fill"
  | "revenue_model_gap_fill"
  | "benchmark_economics_gap_fill"
  | "quality_replacement";

export type CoverageDirectedPhaseInput = {
  phase: CoverageDirectedPhase;
  queries: PlannedResearchQuery[];
};

export type CoverageDirectedPhaseOutput = {
  result: ResearchResult;
  attemptCount: number;
};

export type CoverageDirectedStopReason =
  | ResearchPhaseStopReason
  | RevenueModelStopReason
  | BenchmarkEconomicsStopReason
  | QualityReplacementStopReason;

export type CoverageDirectedPhaseLog = {
  phase: CoverageDirectedPhase;
  queries: string[];
  findingsBefore: number;
  findingsAfter: number;
  sourcesBefore: number;
  sourcesAfter: number;
  materialCoverageBefore: boolean;
  materialCoverageAfter: boolean;
  attemptCount: number;
  estimatedCostUsd: number | null;
};

export async function runCoverageDirectedPhases(input: {
  plan: ResearchCoveragePlan;
  policy: ResearchCoveragePolicy;
  seed?: ResearchCoverageSeed;
  objective?: string;
  modelId: string;
  executePhase: (phase: CoverageDirectedPhaseInput) => Promise<CoverageDirectedPhaseOutput>;
}): Promise<{
  result: ResearchResult;
  coverage: ResearchCoverageAssessment;
  telemetry: ResearchCallTelemetry;
  stopReason: CoverageDirectedStopReason;
  issuedQueries: PlannedResearchQuery[];
  phaseLog: CoverageDirectedPhaseLog[];
}> {
  const phaseLog: CoverageDirectedPhaseLog[] = [];
  const logPhase = (
    phase: CoverageDirectedPhase,
    queries: PlannedResearchQuery[],
    before: { findings: number; sources: number; material: boolean },
    afterResult: ResearchResult,
    afterCoverage: ResearchCoverageAssessment,
    attemptCount: number,
  ) => {
    phaseLog.push({
      phase,
      queries: queries.map((query) => query.query),
      findingsBefore: before.findings,
      findingsAfter: afterResult.evidence.length,
      sourcesBefore: before.sources,
      sourcesAfter: afterResult.sources.length,
      materialCoverageBefore: before.material,
      materialCoverageAfter: afterCoverage.materialCoverageSufficient,
      attemptCount,
      estimatedCostUsd: afterResult.estimatedCostUsd,
    });
  };

  const initialQueries = input.plan.steps.find((step) => step.phase === "initial")?.queries ?? [];
  const initial = await input.executePhase({ phase: "initial", queries: initialQueries });
  let result = initial.result;
  let coverage = assessResearchResultCoverage(result);
  logPhase("initial", initialQueries, { findings: 0, sources: 0, material: false }, result, coverage, initial.attemptCount);
  const issuedQueries = [...initialQueries];
  let transportRetryCount = Math.max(0, initial.attemptCount - 1);
  let gapFillCallCount = 0;
  let revenueGapFillCallCount = 0;
  let benchmarkGapFillCallCount = 0;
  let qualityReplacementCallCount = 0;
  let totalProviderCalls = initial.attemptCount;

  const estimatedGapFill = estimateResearchCostUsd({
    modelId: input.modelId,
    inputTokens: 800,
    outputTokens: 800,
    searchQueryCount: input.policy.maxGapFillQueries,
  });

  const decision = evaluateGapFillEligibility({
    assessment: coverage,
    plan: input.plan,
    policy: input.policy,
    seed: input.seed,
    objective: input.objective,
    issuedQueries,
    gapFillPhasesUsed: 0,
    recordedCostUsd: result.estimatedCostUsd,
    estimatedGapFillCostUsd: estimatedGapFill.estimatedCostUsd,
  });

  if (decision.eligible) {
    const before = { findings: result.evidence.length, sources: result.sources.length, material: coverage.materialCoverageSufficient };
    const gapFill = await input.executePhase({ phase: "gap_fill", queries: decision.queries });
    gapFillCallCount = 1;
    transportRetryCount += Math.max(0, gapFill.attemptCount - 1);
    totalProviderCalls += gapFill.attemptCount;
    issuedQueries.push(...decision.queries);
    result = mergeNormalizedResearch(result, gapFill.result);
    coverage = assessResearchResultCoverage(result);
    logPhase("gap_fill", decision.queries, before, result, coverage, gapFill.attemptCount);
  }

  const telemetry = (): ResearchCallTelemetry => ({
    initialResearchCallCount: 1,
    transportRetryCount,
    gapFillCallCount,
    revenueGapFillCallCount,
    benchmarkGapFillCallCount,
    qualityReplacementCallCount,
    totalProviderCalls,
  });

  if (!coverage.materialCoverageSufficient) {
    return {
      result,
      coverage,
      telemetry: telemetry(),
      stopReason: decision.eligible ? "max_gap_fill_reached" : decision.reason,
      issuedQueries,
      phaseLog,
    };
  }

  const estimatedRevenueFill = estimateResearchCostUsd({
    modelId: input.modelId,
    inputTokens: 800,
    outputTokens: 800,
    searchQueryCount: Math.min(input.policy.maxRevenueGapFillQueries, input.policy.maxRevenueGapFillQueryHardCap),
  });

  const revenueDecision = evaluateRevenueGapFillEligibility({
    materialCoverageSufficient: coverage.materialCoverageSufficient,
    evidence: result.evidence,
    sources: result.sources,
    policy: input.policy,
    seed: input.seed,
    issuedQueries,
    revenueGapFillPhasesUsed: 0,
    recordedCostUsd: result.estimatedCostUsd,
    estimatedGapFillCostUsd: estimatedRevenueFill.estimatedCostUsd,
  });

  if (!revenueDecision.eligible && revenueDecision.reason !== "REVENUE_MODEL_SUFFICIENT" && revenueDecision.reason !== "CORE_PRICING_SUFFICIENT_SETUP_REMAINS") {
    // Continue to benchmark research even when revenue gap-fill did not run.
  } else if (revenueDecision.eligible) {
    const before = { findings: result.evidence.length, sources: result.sources.length, material: coverage.materialCoverageSufficient };
    const revenueFill = await input.executePhase({
      phase: "revenue_model_gap_fill",
      queries: revenueDecision.queries,
    });
    revenueGapFillCallCount = 1;
    transportRetryCount += Math.max(0, revenueFill.attemptCount - 1);
    totalProviderCalls += revenueFill.attemptCount;
    issuedQueries.push(...revenueDecision.queries);
    result = mergeNormalizedResearch(result, revenueFill.result);
    coverage = assessResearchResultCoverage(result);
    logPhase("revenue_model_gap_fill", revenueDecision.queries, before, result, coverage, revenueFill.attemptCount);
  }

  const estimatedBenchmarkFill = estimateResearchCostUsd({
    modelId: input.modelId,
    inputTokens: 800,
    outputTokens: 800,
    searchQueryCount: Math.min(input.policy.maxBenchmarkGapFillQueries, input.policy.maxBenchmarkGapFillQueryHardCap),
  });
  const benchmarkDecision = evaluateBenchmarkGapFillEligibility({
    materialCoverageSufficient: coverage.materialCoverageSufficient,
    evidence: result.evidence,
    sources: result.sources,
    policy: input.policy,
    seed: input.seed,
    issuedQueries,
    benchmarkGapFillPhasesUsed: 0,
    recordedCostUsd: result.estimatedCostUsd,
    estimatedGapFillCostUsd: estimatedBenchmarkFill.estimatedCostUsd,
  });
  if (benchmarkDecision.eligible) {
    const before = { findings: result.evidence.length, sources: result.sources.length, material: coverage.materialCoverageSufficient };
    const benchFill = await input.executePhase({
      phase: "benchmark_economics_gap_fill",
      queries: benchmarkDecision.queries,
    });
    benchmarkGapFillCallCount = 1;
    transportRetryCount += Math.max(0, benchFill.attemptCount - 1);
    totalProviderCalls += benchFill.attemptCount;
    issuedQueries.push(...benchmarkDecision.queries);
    result = mergeNormalizedResearch(result, benchFill.result);
    coverage = assessResearchResultCoverage(result);
    logPhase("benchmark_economics_gap_fill", benchmarkDecision.queries, before, result, coverage, benchFill.attemptCount);
  }

  const estimatedQualityFill = estimateResearchCostUsd({
    modelId: input.modelId,
    inputTokens: 800,
    outputTokens: 800,
    searchQueryCount: Math.min(input.policy.maxQualityReplacementQueries, input.policy.maxQualityReplacementQueryHardCap),
  });
  const qualityDecision = evaluateQualityReplacementEligibility({
    materialCoverageSufficient: coverage.materialCoverageSufficient,
    evidence: result.evidence,
    sources: result.sources,
    policy: input.policy,
    seed: input.seed,
    issuedQueries,
    qualityReplacementPhasesUsed: 0,
    recordedCostUsd: result.estimatedCostUsd,
    estimatedGapFillCostUsd: estimatedQualityFill.estimatedCostUsd,
  });
  if (qualityDecision.eligible) {
    const before = { findings: result.evidence.length, sources: result.sources.length, material: coverage.materialCoverageSufficient };
    void beginQualityReplacementPhase(qualityDecision);
    const qualityFill = await input.executePhase({
      phase: "quality_replacement",
      queries: qualityDecision.queries,
    });
    qualityReplacementCallCount = 1;
    transportRetryCount += Math.max(0, qualityFill.attemptCount - 1);
    totalProviderCalls += qualityFill.attemptCount;
    issuedQueries.push(...qualityDecision.queries);
    result = mergeNormalizedResearch(result, qualityFill.result);
    coverage = assessResearchResultCoverage(result);
    logPhase("quality_replacement", qualityDecision.queries, before, result, coverage, qualityFill.attemptCount);
  }

  const afterRevenue = assessRevenuePlannerCoverage({ evidence: result.evidence, sources: result.sources, seed: input.seed });
  const afterBench = assessBenchmarkPlannerCoverage({ evidence: result.evidence, sources: result.sources, seed: input.seed });
  const afterQuality = evaluateQualityReplacementEligibility({
    materialCoverageSufficient: coverage.materialCoverageSufficient,
    evidence: result.evidence,
    sources: result.sources,
    policy: input.policy,
    seed: input.seed,
    issuedQueries,
    qualityReplacementPhasesUsed: qualityReplacementCallCount,
    recordedCostUsd: result.estimatedCostUsd,
    estimatedGapFillCostUsd: 0,
  });
  const stopReason: CoverageDirectedStopReason = afterQuality.state === "QUALITY_REPLACEMENT_SUCCEEDED"
    ? "QUALITY_REPLACEMENT_SUCCEEDED"
    : qualityDecision.eligible
      ? "QUALITY_REPLACEMENT_EXHAUSTED"
      : afterBench.sufficient
        ? "BENCHMARK_ECONOMICS_SUFFICIENT"
        : qualityDecision.reason !== "NO_QUALITY_REPLACEMENT_GAP" && qualityDecision.reason !== "QUALITY_REPLACEMENT_SUCCEEDED"
          ? qualityDecision.reason
        : benchmarkDecision.eligible
          ? "BENCHMARK_GAP_FILL_LIMIT"
          : benchmarkDecision.reason !== "NO_RESEARCHABLE_BENCHMARK_GAP"
            ? benchmarkDecision.reason
            : afterRevenue.status === "REVENUE_MODEL_SUFFICIENT"
              ? afterRevenue.stopReason ?? "REVENUE_MODEL_SUFFICIENT"
              : revenueDecision.eligible
                ? "REVENUE_GAP_FILL_LIMIT"
                : revenueDecision.reason;

  return {
    result,
    coverage,
    telemetry: telemetry(),
    stopReason,
    issuedQueries,
    phaseLog,
  };
}

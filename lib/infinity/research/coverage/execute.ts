import { estimateResearchCostUsd } from "../cost-pricing";
import type { ResearchResult } from "../types";
import { assessResearchResultCoverage, type ResearchCoverageAssessment } from "./assess";
import { evaluateGapFillEligibility, type ResearchPhaseStopReason } from "./gap-fill";
import { mergeNormalizedResearch } from "./merge";
import type { ResearchCoveragePlan } from "./plan";
import type { ResearchCoveragePolicy } from "./policy";
import type { PlannedResearchQuery, ResearchCoverageSeed } from "./queries";

export type ResearchCallTelemetry = {
  initialResearchCallCount: number;
  transportRetryCount: number;
  gapFillCallCount: number;
  totalProviderCalls: number;
};

export type CoverageDirectedPhaseInput = {
  phase: "initial" | "gap_fill";
  queries: PlannedResearchQuery[];
};

export type CoverageDirectedPhaseOutput = {
  result: ResearchResult;
  attemptCount: number;
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
  stopReason: ResearchPhaseStopReason;
  issuedQueries: PlannedResearchQuery[];
}> {
  const initialQueries = input.plan.steps.find((step) => step.phase === "initial")?.queries ?? [];
  const initial = await input.executePhase({ phase: "initial", queries: initialQueries });
  let result = initial.result;
  let coverage = assessResearchResultCoverage(result);
  const issuedQueries = [...initialQueries];
  let transportRetryCount = Math.max(0, initial.attemptCount - 1);
  let gapFillCallCount = 0;
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

  if (!decision.eligible) {
    return {
      result,
      coverage,
      telemetry: {
        initialResearchCallCount: 1,
        transportRetryCount,
        gapFillCallCount: 0,
        totalProviderCalls,
      },
      stopReason: decision.reason,
      issuedQueries,
    };
  }

  const gapFill = await input.executePhase({ phase: "gap_fill", queries: decision.queries });
  gapFillCallCount = 1;
  transportRetryCount += Math.max(0, gapFill.attemptCount - 1);
  totalProviderCalls += gapFill.attemptCount;
  issuedQueries.push(...decision.queries);
  result = mergeNormalizedResearch(result, gapFill.result);
  coverage = assessResearchResultCoverage(result);

  return {
    result,
    coverage,
    telemetry: {
      initialResearchCallCount: 1,
      transportRetryCount,
      gapFillCallCount,
      totalProviderCalls,
    },
    stopReason: coverage.materialCoverageSufficient ? "material_coverage_sufficient" : "max_gap_fill_reached",
    issuedQueries,
  };
}

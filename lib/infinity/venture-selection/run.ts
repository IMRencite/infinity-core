import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { redactSecrets } from "@/lib/infinity/research/redaction";
import { runAdversarialReview } from "./adversarial/review";
import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
  prioritizeValidationExperiments,
} from "./assumptions/register";
import { assessBuildability, assessSpeedToValue } from "./buildability/assess";
import {
  assertVentureSelectionExecutable,
  loadVentureSelectionConfig,
} from "./config";
import {
  applyResourceConstraintsToDecisions,
  classifyDecision,
  passesBuildGate,
  simulateResourceAllocation,
} from "./decisions/classify";
import {
  calculateCapitalEfficiencyMetrics,
  calculateExpectedValue,
  deriveExpectedValueInputs,
} from "./economics/expected-value";
import {
  buildVentureSelectionHandoff,
  generateSelectionExplanation,
} from "./explanation/generate";
import { classifyVentureSelectionFailure } from "./failures";
import { loadCandidateBundlesForSelection } from "./load/load-candidates";
import {
  applyPortfolioCorrelationPenalties,
  generateQueueReason,
  inferDependencyTags,
  rankPortfolioEvaluations,
} from "./portfolio/rank";
import {
  buildVentureSelectionReport,
  findVentureSelectionRunByIdempotencyKey,
  insertVentureSelectionRun,
  markVentureSelectionRunFailed,
  persistCandidateEvaluationBundle,
  persistResourceAllocationSnapshot,
  updateVentureSelectionRun,
} from "./persistence";
import { calculateSelectionScore } from "./scoring/selection-score";
import { calculateValidationDimensions } from "./scoring/validation-score";
import type {
  CandidateEvaluationDraft,
  RunVentureSelectionInput,
  RunVentureSelectionOutput,
} from "./types";

async function evaluateCandidateDraft(input: {
  candidate: import("./types").LoadedCandidateBundle;
  config: ReturnType<typeof loadVentureSelectionConfig>;
  runAdversarial: boolean;
}): Promise<CandidateEvaluationDraft> {
  const assumptions = buildAssumptionRegister(input.candidate);
  const fatal = analyzeFatalAssumptions(assumptions);
  const buildability = assessBuildability(input.candidate);
  const speedToValue = assessSpeedToValue(input.candidate);
  const expectedValueInputs = deriveExpectedValueInputs(input.candidate);
  const expectedValueDerived = calculateExpectedValue(expectedValueInputs);
  const capitalEfficiencyMetrics = calculateCapitalEfficiencyMetrics({
    startupCapital: expectedValueInputs.startupCapital,
    expected12MonthProfit: expectedValueDerived.expected12MonthProfit,
    probabilityAdjustedGrossProfit: expectedValueDerived.probabilityAdjustedGrossProfit,
    monthlyBurn: Math.round((input.candidate.monetization?.primaryPlan?.estimatedFixedCosts ?? 40000) / 12),
  });

  let adversarialReview = null;
  if (input.runAdversarial) {
    try {
      adversarialReview = await runAdversarialReview(input.candidate);
    } catch {
      adversarialReview = null;
    }
  }

  const { dimensions, validationScore } = calculateValidationDimensions({
    candidate: input.candidate,
    buildability,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    adversarialRiskInputs: adversarialReview?.riskInputs,
  });

  const { selectionScore, selectionScoreInputs } = calculateSelectionScore({
    candidate: input.candidate,
    validationScore,
    buildability,
    expectedValue: expectedValueDerived,
    speedToValue,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    adversarialRiskInputs: adversarialReview?.riskInputs,
  });

  const dependencyTags = inferDependencyTags(input.candidate);
  const experimentPriorities = prioritizeValidationExperiments({
    candidate: input.candidate,
    assumptions,
  });

  const confidence =
    Math.round(
      (((input.candidate.monetization?.recommendation.confidence ?? 0.5) +
        (1 - fatal.assumptionUncertaintyScore) +
        (adversarialReview?.confidence ?? 0.5)) /
        3) *
        10000,
    ) / 10000;

  return {
    candidate: input.candidate,
    assumptions,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    blockingAssumptions: fatal.blockingAssumptions,
    validationScore,
    validationDimensions: dimensions,
    buildability,
    speedToValue,
    expectedValueInputs,
    expectedValueDerived,
    capitalEfficiencyMetrics,
    selectionScoreInputs,
    selectionScore,
    portfolioAdjustedScore: selectionScore,
    dependencyTags,
    correlationPenalties: [],
    experimentPriorities,
    adversarialReview,
    decision: "HOLD",
    recommendedNextAction: "",
    queueReason: "",
    explanation: {
      whyThisOpportunity: "",
      whyNow: "",
      whyInfinityCanBuildIt: "",
      whyCustomersWillPay: "",
      whyThisModel: "",
      whyItRanksAboveAlternatives: "",
      largestRisks: [],
      fatalAssumptions: [],
      validationNeeded: [],
      expectedEconomics: {},
      resourceRequirements: {},
      confidence,
    },
    handoff: null,
    confidence,
  };
}

export async function runVentureSelectionCycle(
  admin: AdminSupabaseClient,
  input: RunVentureSelectionInput,
): Promise<RunVentureSelectionOutput> {
  const config = loadVentureSelectionConfig();
  assertVentureSelectionExecutable(config);

  const existing = await findVentureSelectionRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );
  if (existing?.status === "completed" && existing.selection_report) {
    return {
      ok: true,
      ventureSelectionRunId: existing.id,
      report: existing.selection_report as never,
      evaluations: [],
      resourceAllocation: existing.resource_allocation_snapshot as never,
    };
  }

  const bundles = await loadCandidateBundlesForSelection(admin, input.organizationId, {
    candidateIds: input.opportunityCandidateIds,
    monetizationRunId: input.monetizationRunId,
    maxCandidates: input.maxCandidates ?? config.maxCandidatesPerRun,
  });

  if (bundles.length === 0) {
    throw new Error("No candidates with monetization analyses available for venture selection.");
  }

  const correlationId = randomUUID();
  const runRow =
    existing ??
    (await insertVentureSelectionRun(admin, {
      organizationId: input.organizationId,
      correlationId,
      idempotencyKey: input.idempotencyKey,
      opportunityCandidateIds: bundles.map((bundle) => bundle.candidateId),
      discoveryRunIds: [...new Set(bundles.map((bundle) => bundle.discoveryRunId))],
      monetizationRunIds: [
        ...new Set(bundles.map((bundle) => bundle.monetization!.monetizationRunId)),
      ],
      monetizationRunId: input.monetizationRunId ?? bundles[0]?.monetization?.monetizationRunId,
    }));

  let adversarialCount = 0;
  let tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  try {
    await updateVentureSelectionRun(admin, input.organizationId, runRow.id, {
      status: "validating",
    });

    const drafts: CandidateEvaluationDraft[] = [];
    for (const candidate of bundles) {
      const draft = await evaluateCandidateDraft({
        candidate,
        config,
        runAdversarial:
          config.runAdversarialReview && adversarialCount < config.maxAdversarialReviewsPerRun,
      });
      if (draft.adversarialReview) {
        adversarialCount += 1;
        tokenUsage = {
          inputTokens: tokenUsage.inputTokens + draft.adversarialReview.tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens + draft.adversarialReview.tokenUsage.outputTokens,
          totalTokens: tokenUsage.totalTokens + draft.adversarialReview.tokenUsage.totalTokens,
        };
      }
      drafts.push(draft);
    }

    let evaluations = applyPortfolioCorrelationPenalties(drafts);
    evaluations = rankPortfolioEvaluations(evaluations);

    const allocationPreview = simulateResourceAllocation({
      rankedEvaluations: evaluations,
      constraints: config.resourceConstraints,
    });

    evaluations = evaluations.map((evaluation) => {
      const buildGate = passesBuildGate({
        evaluation,
        thresholds: config.buildGateThresholds,
      });
      const hasResourceCapacity = allocationPreview.allocations.some(
        (item) =>
          item.candidateId === evaluation.candidate.candidateId && item.decision === "BUILD",
      ) || buildGate.passes;

      const classified = classifyDecision({
        evaluation,
        buildGatePassed: buildGate.passes,
        buildGateReasons: buildGate.reasons,
        hasResourceCapacity,
        decisionThresholds: config.decisionThresholds,
      });

      return {
        ...evaluation,
        decision: classified.decision,
        recommendedNextAction: classified.recommendedNextAction,
      };
    });

    evaluations = rankPortfolioEvaluations(evaluations);
    const resourceAllocation = simulateResourceAllocation({
      rankedEvaluations: evaluations,
      constraints: config.resourceConstraints,
    });
    evaluations = applyResourceConstraintsToDecisions({ evaluations, allocation: resourceAllocation });

    evaluations = evaluations.map((evaluation, index) => {
      const higherRankedTitles = evaluations
        .slice(0, index)
        .map((item) => item.candidate.title);
      const explanation = generateSelectionExplanation({
        evaluation,
        rank: index + 1,
        totalCandidates: evaluations.length,
        higherRankedTitles,
      });
      const handoff =
        evaluation.decision === "BUILD"
          ? buildVentureSelectionHandoff({ ...evaluation, explanation })
          : null;

      return {
        ...evaluation,
        explanation,
        handoff,
        queueReason: generateQueueReason(evaluation, index + 1, evaluations.length),
      };
    });

    await updateVentureSelectionRun(admin, input.organizationId, runRow.id, {
      status: "ranking",
    });

    for (const [index, evaluation] of evaluations.entries()) {
      await persistCandidateEvaluationBundle(admin, {
        organizationId: input.organizationId,
        ventureSelectionRunId: runRow.id,
        evaluation,
        queueRank: index + 1,
      });
    }

    await persistResourceAllocationSnapshot(admin, {
      organizationId: input.organizationId,
      ventureSelectionRunId: runRow.id,
      snapshot: resourceAllocation,
    });

    const report = buildVentureSelectionReport({
      evaluations,
      reasoningRunIds: [],
      costSummary: {
        adversarialReviewCount: adversarialCount,
        tokenUsage,
        estimatedCostUsd: null,
      },
    });

    const serialized = JSON.stringify(report);
    if (redactSecrets(serialized) !== serialized) {
      throw new Error("Secret leak detected in venture selection report.");
    }

    await updateVentureSelectionRun(admin, input.organizationId, runRow.id, {
      status: "completed",
      completed_at: report.completedAt,
      candidates_evaluated: evaluations.length,
      build_count: report.buildCount,
      validate_count: report.validateCount,
      hold_count: report.holdCount,
      reject_count: report.rejectCount,
      handoffs_created: report.handoffsCreated,
      token_usage: tokenUsage as never,
      resource_allocation_snapshot: resourceAllocation as never,
      selection_report: report as never,
      failure_classification: null,
      error_message: null,
    });

    return {
      ok: true,
      ventureSelectionRunId: runRow.id,
      report,
      evaluations,
      resourceAllocation,
    };
  } catch (error) {
    const classified = classifyVentureSelectionFailure(error);
    await markVentureSelectionRunFailed(admin, input.organizationId, runRow.id, {
      classification: classified.classification,
      message: classified.message,
      status: classified.classification === "budget_exceeded" ? "policy_blocked" : "failed",
    });
    return {
      ok: false,
      ventureSelectionRunId: runRow.id,
      status: classified.classification === "budget_exceeded" ? "policy_blocked" : "failed",
      failureClassification: classified.classification,
      message: classified.message,
    };
  }
}

export async function runVentureSelectionV1Test(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<RunVentureSelectionOutput> {
  const suffix = process.env.VENTURE_SELECTION_TEST_IDEMPOTENCY_SUFFIX?.trim() || "v1";
  return runVentureSelectionCycle(admin, {
    organizationId,
    idempotencyKey: `venture-selection-v1-test:${organizationId}:${suffix}`,
    maxCandidates: Number(process.env.VENTURE_SELECTION_MAX_CANDIDATES ?? 8),
    runPurpose: "venture_selection_verification",
  });
}

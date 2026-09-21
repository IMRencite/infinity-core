import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
} from "@/lib/infinity/venture-selection/assumptions/register";
import type { AssumptionRecord, LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";
import { CycleBudgetGovernor } from "../budget-governor";
import {
  acquireValidationEvidenceViaResearch,
  recordValidationResearchBudget,
} from "./acquire-evidence";
import { classifyAssumptionKind } from "./evidence-relevance";
import { rescoreAfterValidation } from "./rescore";
import type { ValidationExperimentRecord } from "./types";

export type RunValidationAcquisitionProbeInput = {
  admin: AdminSupabaseClient;
  organizationId: string;
  candidate: LoadedCandidateBundle;
  blockingAssumptionText?: string;
  cycleKey?: string;
  budget?: CycleBudgetGovernor;
  adversarialRiskInputs?: Record<string, number>;
};

export type ValidationAcquisitionProbeResult = {
  ok: boolean;
  technicalFailure: boolean;
  candidateId: string;
  candidateTitle: string;
  blockingAssumption: string;
  validationRunId: string;
  experiment: ValidationExperimentRecord | null;
  evidenceTable: Array<{
    source: string;
    novelty: "NEW" | "REUSED";
    relevance: string;
    quantitativeMatch: boolean;
    validationResult: string;
  }>;
  preAssumptionUncertainty: number | null;
  postAssumptionUncertainty: number | null;
  uncertaintyDelta: number | null;
  uncertaintyDeltaReason: string | null;
  preFatalAssumptionRisk: number;
  postFatalAssumptionRisk: number;
  executionStatus: string | null;
  validationResult: string | null;
  researchRunId: string | null;
  provider: string | null;
  model: string | null;
  providerCalls: number;
  newSourceCount: number;
  reusedSourceCount: number;
  costUsd: number | null;
  costKnown: boolean;
  budgetRecordedOnce: boolean;
  acquisitionReady: boolean;
  message: string | null;
};

function selectBlockingAssumption(
  assumptions: AssumptionRecord[],
  preferredText?: string,
): AssumptionRecord | null {
  if (preferredText) {
    const exact = assumptions.find((item) => item.assumption === preferredText);
    if (exact) return exact;
  }

  const cac = assumptions.find(
    (item) => classifyAssumptionKind(item) === "quantitative_cac",
  );
  if (cac) return cac;

  return [...assumptions].sort((a, b) => b.fatalRiskContribution - a.fatalRiskContribution)[0] ?? null;
}

export async function runValidationAcquisitionProbe(
  input: RunValidationAcquisitionProbeInput,
): Promise<ValidationAcquisitionProbeResult> {
  const validationRunId = randomUUID();
  const budget = input.budget ?? new CycleBudgetGovernor();
  const preAssumptions = buildAssumptionRegister(input.candidate, {
    adversarialRiskInputs: input.adversarialRiskInputs,
  });
  const preFatal = analyzeFatalAssumptions(preAssumptions);
  const blockingAssumption = selectBlockingAssumption(
    preAssumptions,
    input.blockingAssumptionText,
  );

  if (!blockingAssumption) {
    return {
      ok: false,
      technicalFailure: true,
      candidateId: input.candidate.candidateId,
      candidateTitle: input.candidate.title,
      blockingAssumption: input.blockingAssumptionText ?? "",
      validationRunId,
      experiment: null,
      evidenceTable: [],
      preAssumptionUncertainty: null,
      postAssumptionUncertainty: null,
      uncertaintyDelta: null,
      uncertaintyDeltaReason: "No blocking assumption found on candidate.",
      preFatalAssumptionRisk: preFatal.fatalAssumptionRiskScore,
      postFatalAssumptionRisk: preFatal.fatalAssumptionRiskScore,
      executionStatus: null,
      validationResult: null,
      researchRunId: null,
      provider: null,
      model: null,
      providerCalls: 0,
      newSourceCount: 0,
      reusedSourceCount: 0,
      costUsd: null,
      costKnown: false,
      budgetRecordedOnce: false,
      acquisitionReady: false,
      message: "No blocking assumption found.",
    };
  }

  budget.assertRoom("bounded_validation", 0.5);

  const idempotencyKey = `favc1-validation-acquisition-probe:${input.organizationId}:${input.candidate.candidateId}:${input.cycleKey ?? validationRunId}:${blockingAssumption.category}`;

  const acquisition = await acquireValidationEvidenceViaResearch({
    admin: input.admin,
    organizationId: input.organizationId,
    candidate: input.candidate,
    assumption: blockingAssumption,
    idempotencyKey,
    runPurpose: "favc1_bounded_validation_acquisition_probe",
  });

  if (!acquisition.ok) {
    return {
      ok: false,
      technicalFailure: true,
      candidateId: input.candidate.candidateId,
      candidateTitle: input.candidate.title,
      blockingAssumption: blockingAssumption.assumption,
      validationRunId,
      experiment: null,
      evidenceTable: [],
      preAssumptionUncertainty: blockingAssumption.uncertaintyScore,
      postAssumptionUncertainty: blockingAssumption.uncertaintyScore,
      uncertaintyDelta: 0,
      uncertaintyDeltaReason: acquisition.message,
      preFatalAssumptionRisk: preFatal.fatalAssumptionRiskScore,
      postFatalAssumptionRisk: preFatal.fatalAssumptionRiskScore,
      executionStatus: "FAILED",
      validationResult: null,
      researchRunId: acquisition.researchRunId,
      provider: null,
      model: null,
      providerCalls: 0,
      newSourceCount: 0,
      reusedSourceCount: 0,
      costUsd: null,
      costKnown: false,
      budgetRecordedOnce: false,
      acquisitionReady: false,
      message: acquisition.message,
    };
  }

  recordValidationResearchBudget({ budget, experiment: acquisition.experiment });
  const budgetRecordedOnce =
    budget.ledger.filter((entry) => entry.stage === "bounded_validation").length === 1;

  const postEvaluation = rescoreAfterValidation({
    preValidationEvaluation: {
      candidate: input.candidate,
      assumptions: preAssumptions,
      fatalAssumptionRiskScore: preFatal.fatalAssumptionRiskScore,
      assumptionUncertaintyScore: preFatal.assumptionUncertaintyScore,
      blockingAssumptions: preFatal.blockingAssumptions,
      validationScore: 70,
      validationDimensions: {},
      buildability: { buildabilityScore: 75 } as never,
      speedToValue: {} as never,
      expectedValueInputs: {} as never,
      expectedValueDerived: { expectedRoi: 2 } as never,
      capitalEfficiencyMetrics: {},
      selectionScoreInputs: {},
      selectionScore: 74,
      portfolioAdjustedScore: 74,
      dependencyTags: [],
      correlationPenalties: [],
      experimentPriorities: [],
      adversarialReview: input.adversarialRiskInputs
        ? {
            provider: "openai",
            model: "probe",
            summary: "",
            findings: [],
            riskInputs: input.adversarialRiskInputs,
            confidence: 0.6,
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            estimatedCostUsd: null,
          }
        : null,
      decision: "VALIDATE",
      recommendedNextAction: "",
      queueReason: "",
      explanation: {} as never,
      handoff: null,
      confidence: 0.7,
    },
    validationEvidence: [acquisition.validationEvidence],
  });

  const uncertaintyDelta =
    acquisition.postAssumptionUncertainty - acquisition.preAssumptionUncertainty;
  const uncertaintyDeltaReason =
    acquisition.experiment.uncertaintyReduction === 0
      ? `Relevance=${acquisition.experiment.relevanceClass}; newSources=${acquisition.experiment.newSourceCount}; no credit applied.`
      : `Relevance=${acquisition.experiment.relevanceClass}; uncertainty reduced by ${acquisition.experiment.uncertaintyReduction.toFixed(3)}.`;

  return {
    ok: true,
    technicalFailure: false,
    candidateId: input.candidate.candidateId,
    candidateTitle: input.candidate.title,
    blockingAssumption: blockingAssumption.assumption,
    validationRunId,
    experiment: acquisition.experiment,
    evidenceTable: acquisition.evidenceItems.map((item) => ({
      source: item.sourceUrl,
      novelty: item.novelty,
      relevance: item.relevance,
      quantitativeMatch: item.quantitativeMatch,
      validationResult: item.validationResult,
    })),
    preAssumptionUncertainty: acquisition.preAssumptionUncertainty,
    postAssumptionUncertainty: acquisition.postAssumptionUncertainty,
    uncertaintyDelta,
    uncertaintyDeltaReason,
    preFatalAssumptionRisk: preFatal.fatalAssumptionRiskScore,
    postFatalAssumptionRisk: postEvaluation.fatalAssumptionRiskScore,
    executionStatus: acquisition.experiment.executionStatus,
    validationResult: acquisition.experiment.validationResult,
    researchRunId: acquisition.experiment.researchRunId ?? null,
    provider: acquisition.experiment.provider ?? null,
    model: acquisition.experiment.model ?? null,
    providerCalls: acquisition.experiment.providerCalls,
    newSourceCount: acquisition.experiment.newSourceCount,
    reusedSourceCount: acquisition.experiment.reusedSourceCount,
    costUsd: acquisition.experiment.costUsd,
    costKnown: acquisition.experiment.costKnown ?? false,
    budgetRecordedOnce,
    acquisitionReady: acquisition.experiment.newSourceCount > 0,
    message: acquisition.experiment.newSourceCount > 0
      ? "Acquired new grounded sources via provider-backed research."
      : "Research completed but no new sources relative to prior candidate evidence.",
  };
}

import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { CycleBudgetGovernor } from "../budget-governor";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";
import { acquireValidationEvidenceViaResearch } from "./acquire-evidence";
import { FAVC1_VALIDATION_MAX_ACQUISITION_CALLS, FAVC1_VALIDATION_MAX_ROUNDS } from "./constants";
import { executeAllowedValidationExperiments } from "./experiments";
import {
  humanizeBlockingAssumption,
  selectEscalationBlocker,
  shouldEscalateRoundAfterSynthesis,
} from "./escalation-policy";
import { postValidationEvaluationId, rescoreAfterValidation } from "./rescore";
import { selectValidationCandidate } from "./select-candidate";
import type { BoundedValidationResult } from "./types";

export type RunBoundedFavc1ValidationInput = {
  organizationId: string;
  cycleKey: string;
  discoveryRunId: string | null;
  monetizationRunId: string | null;
  ventureSelectionRunId: string | null;
  evaluations: CandidateEvaluationDraft[];
  budget: CycleBudgetGovernor;
  validationRound?: number;
};

function skippedResult(input: {
  cycleKey: string;
  discoveryRunId: string | null;
  monetizationRunId: string | null;
  ventureSelectionRunId: string | null;
  message: string;
}): BoundedValidationResult {
  const validationRunId = randomUUID();
  return {
    ok: true,
    outcome: "VALIDATE",
    promotedToBuild: false,
    technicalFailure: false,
    terminalMessage: input.message,
    validationRunId,
    postValidationEvaluationId: validationRunId,
    selectedCandidate: null,
    preValidationFatalRisk: null,
    postValidationFatalRisk: null,
    preValidationDecision: null,
    postValidationDecision: null,
    experiments: [],
    rejectedExperimentTypes: [],
    synthesisStepCount: 0,
    acquisitionStepCount: 0,
    acquisitionDecision: null,
    acquisitionReason: null,
    lineage: {
      cycleKey: input.cycleKey,
      discoveryRunId: input.discoveryRunId,
      monetizationRunId: input.monetizationRunId,
      ventureSelectionRunId: input.ventureSelectionRunId,
      selectedValidationCandidateId: null,
      validationRunId,
      postValidationEvaluationId: null,
      finalDecision: "VALIDATE",
      selectionReason: null,
      validationRound: 0,
      synthesisStepCount: 0,
      acquisitionStepCount: 0,
      acquisitionDecision: null,
      acquisitionReason: null,
      experiments: [],
    },
    costUsd: 0,
    costKnown: true,
    providerCalls: 0,
    postValidationEvaluation: null,
  };
}

export async function runBoundedFavc1ValidationLoop(
  admin: AdminSupabaseClient,
  input: RunBoundedFavc1ValidationInput,
): Promise<BoundedValidationResult> {
  const validationRound = input.validationRound ?? 1;
  if (validationRound > FAVC1_VALIDATION_MAX_ROUNDS) {
    return skippedResult({
      cycleKey: input.cycleKey,
      discoveryRunId: input.discoveryRunId,
      monetizationRunId: input.monetizationRunId,
      ventureSelectionRunId: input.ventureSelectionRunId,
      message: "Bounded validation round limit reached.",
    });
  }

  const buildCount = input.evaluations.filter((evaluation) => evaluation.decision === "BUILD").length;
  const validateCount = input.evaluations.filter((evaluation) => evaluation.decision === "VALIDATE").length;

  if (buildCount > 0 || validateCount === 0) {
    return skippedResult({
      cycleKey: input.cycleKey,
      discoveryRunId: input.discoveryRunId,
      monetizationRunId: input.monetizationRunId,
      ventureSelectionRunId: input.ventureSelectionRunId,
      message: "Bounded validation not required for current selection pool.",
    });
  }

  input.budget.assertRoom("bounded_validation");

  const selected = selectValidationCandidate(input.evaluations);
  if (!selected) {
    return skippedResult({
      cycleKey: input.cycleKey,
      discoveryRunId: input.discoveryRunId,
      monetizationRunId: input.monetizationRunId,
      ventureSelectionRunId: input.ventureSelectionRunId,
      message: "No VALIDATE candidate had an autonomously executable validation experiment.",
    });
  }

  const preValidationEvaluation = input.evaluations.find(
    (evaluation) => evaluation.candidate.candidateId === selected.candidateId,
  );
  if (!preValidationEvaluation) {
    const validationRunId = randomUUID();
    return {
      ok: false,
      outcome: "TECHNICAL_FAILURE",
      promotedToBuild: false,
      technicalFailure: true,
      terminalMessage: "Selected validation candidate missing from evaluation pool.",
      validationRunId,
      postValidationEvaluationId: postValidationEvaluationId(validationRunId, selected.candidateId),
      selectedCandidate: {
        candidateId: selected.candidateId,
        title: selected.title,
        selectionReason: selected.selectionReason,
      },
      preValidationFatalRisk: null,
      postValidationFatalRisk: null,
      preValidationDecision: null,
      postValidationDecision: null,
      experiments: [],
      rejectedExperimentTypes: [],
      synthesisStepCount: 0,
      acquisitionStepCount: 0,
      acquisitionDecision: null,
      acquisitionReason: null,
      lineage: {
        cycleKey: input.cycleKey,
        discoveryRunId: input.discoveryRunId,
        monetizationRunId: input.monetizationRunId,
        ventureSelectionRunId: input.ventureSelectionRunId,
        selectedValidationCandidateId: selected.candidateId,
        validationRunId,
        postValidationEvaluationId: null,
        finalDecision: "TECHNICAL_FAILURE",
        selectionReason: selected.selectionReason,
        validationRound,
        synthesisStepCount: 0,
        acquisitionStepCount: 0,
        acquisitionDecision: null,
        acquisitionReason: null,
        experiments: [],
      },
      costUsd: 0,
      costKnown: true,
      providerCalls: 0,
      postValidationEvaluation: null,
    };
  }

  const validationRunId = randomUUID();

  // STEP A — reuse/synthesize existing persisted evidence (no provider calls).
  const synthesis = executeAllowedValidationExperiments({
    candidate: preValidationEvaluation.candidate,
    assumptions: preValidationEvaluation.assumptions,
    maxExperiments: 2,
    providerCalls: 0,
  });

  const synthesisStepCount = synthesis.experiments.length > 0 ? 1 : 0;
  let experiments = [...synthesis.experiments];
  let validationEvidence = [...synthesis.validationEvidence];
  let providerCalls = 0;
  let acquisitionStepCount = 0;
  let acquisitionDecision: BoundedValidationResult["acquisitionDecision"] = null;
  let acquisitionReason: string | null = null;
  let costUsd = 0;
  let costKnown = true;

  const postSynthesisEvaluation = rescoreAfterValidation({
    preValidationEvaluation,
    validationEvidence,
  });

  const synthesisResolved =
    postSynthesisEvaluation.decision === "BUILD" ||
    !shouldEscalateRoundAfterSynthesis({
      assumptions: preValidationEvaluation.assumptions,
      synthesisExperiments: synthesis.experiments,
      preFatalRisk: preValidationEvaluation.fatalAssumptionRiskScore,
    });

  // STEP B — bounded provider acquisition within the same validation round.
  if (!synthesisResolved) {
    input.budget.assertRoom("bounded_validation", 0.5);

    const escalation = selectEscalationBlocker({
      assumptions: preValidationEvaluation.assumptions,
      synthesisExperiments: synthesis.experiments,
      preFatalRisk: preValidationEvaluation.fatalAssumptionRiskScore,
      maxAcquisitionCalls: FAVC1_VALIDATION_MAX_ACQUISITION_CALLS,
    });

    if (escalation) {
      acquisitionDecision = escalation.decision;
      acquisitionReason = escalation.reason;

      if (escalation.decision === "RUN") {
        const idempotencyKey = `favc1-validation-acquisition:${input.organizationId}:${selected.candidateId}:${input.cycleKey}:${validationRunId}`;

        const acquisition = await acquireValidationEvidenceViaResearch({
          admin,
          organizationId: input.organizationId,
          candidate: preValidationEvaluation.candidate,
          assumption: escalation.assumption,
          idempotencyKey,
          runPurpose: "favc1_bounded_validation_acquisition",
        });

        if (!acquisition.ok) {
          return {
            ok: false,
            outcome: "TECHNICAL_FAILURE",
            promotedToBuild: false,
            technicalFailure: true,
            terminalMessage: acquisition.message,
            validationRunId,
            postValidationEvaluationId: postValidationEvaluationId(validationRunId, selected.candidateId),
            selectedCandidate: {
              candidateId: selected.candidateId,
              title: selected.title,
              selectionReason: selected.selectionReason,
            },
            preValidationFatalRisk: preValidationEvaluation.fatalAssumptionRiskScore,
            postValidationFatalRisk: preValidationEvaluation.fatalAssumptionRiskScore,
            preValidationDecision: preValidationEvaluation.decision,
            postValidationDecision: preValidationEvaluation.decision,
            experiments,
            rejectedExperimentTypes: synthesis.rejectedExperimentTypes,
            synthesisStepCount,
            acquisitionStepCount: 0,
            acquisitionDecision,
            acquisitionReason,
            lineage: {
              cycleKey: input.cycleKey,
              discoveryRunId: input.discoveryRunId,
              monetizationRunId: input.monetizationRunId,
              ventureSelectionRunId: input.ventureSelectionRunId,
              selectedValidationCandidateId: selected.candidateId,
              validationRunId,
              postValidationEvaluationId: null,
              finalDecision: "TECHNICAL_FAILURE",
              selectionReason: selected.selectionReason,
              validationRound,
              synthesisStepCount,
              acquisitionStepCount: 0,
              acquisitionDecision,
              acquisitionReason,
              experiments,
            },
            costUsd: 0,
            costKnown: false,
            providerCalls: 0,
            postValidationEvaluation: null,
          };
        }

        acquisitionStepCount = 1;
        providerCalls = acquisition.experiment.providerCalls;
        costUsd = acquisition.experiment.costUsd;
        costKnown = acquisition.experiment.costKnown ?? acquisition.experiment.costUsd != null;
        experiments.push(acquisition.experiment);
        validationEvidence.push(acquisition.validationEvidence);
      }
    } else {
      acquisitionDecision = "SKIP";
      acquisitionReason = "No eligible blocker passed VOI gate for provider acquisition.";
    }
  } else if (synthesis.experiments.length === 0) {
    acquisitionDecision = "SKIP";
    acquisitionReason = "No synthesis experiments could be constructed from persisted evidence.";
  } else {
    acquisitionDecision = "SKIP";
    acquisitionReason = "Existing synthesized evidence was sufficient — provider acquisition not required.";
  }

  if (experiments.length === 0) {
    return {
      ok: true,
      outcome: "VALIDATE",
      promotedToBuild: false,
      technicalFailure: false,
      terminalMessage:
        "Candidate still requires validation after bounded autonomous validation; no verifiable evidence could be synthesized.",
      validationRunId,
      postValidationEvaluationId: postValidationEvaluationId(validationRunId, selected.candidateId),
      selectedCandidate: {
        candidateId: selected.candidateId,
        title: selected.title,
        selectionReason: selected.selectionReason,
      },
      preValidationFatalRisk: preValidationEvaluation.fatalAssumptionRiskScore,
      postValidationFatalRisk: preValidationEvaluation.fatalAssumptionRiskScore,
      preValidationDecision: preValidationEvaluation.decision,
      postValidationDecision: preValidationEvaluation.decision,
      experiments,
      rejectedExperimentTypes: synthesis.rejectedExperimentTypes,
      synthesisStepCount,
      acquisitionStepCount,
      acquisitionDecision,
      acquisitionReason,
      lineage: {
        cycleKey: input.cycleKey,
        discoveryRunId: input.discoveryRunId,
        monetizationRunId: input.monetizationRunId,
        ventureSelectionRunId: input.ventureSelectionRunId,
        selectedValidationCandidateId: selected.candidateId,
        validationRunId,
        postValidationEvaluationId: postValidationEvaluationId(validationRunId, selected.candidateId),
        finalDecision: "VALIDATE",
        selectionReason: selected.selectionReason,
        validationRound,
        synthesisStepCount,
        acquisitionStepCount,
        acquisitionDecision,
        acquisitionReason,
        experiments,
      },
      costUsd,
      costKnown,
      providerCalls,
      postValidationEvaluation: preValidationEvaluation,
    };
  }

  const postValidationEvaluation = rescoreAfterValidation({
    preValidationEvaluation,
    validationEvidence,
  });
  const postEvaluationId = postValidationEvaluationId(validationRunId, selected.candidateId);

  let outcome: BoundedValidationResult["outcome"] = "VALIDATE";
  let terminalMessage = "Candidate still requires validation after bounded autonomous validation.";
  let promotedToBuild = false;

  if (postValidationEvaluation.decision === "BUILD") {
    outcome = "BUILD";
    promotedToBuild = true;
    terminalMessage = "Bounded validation reduced fatal assumption risk enough to promote candidate to BUILD.";
  } else if (postValidationEvaluation.decision === "REJECT") {
    outcome = "REJECT";
    terminalMessage = "Candidate rejected after bounded autonomous validation.";
  }

  return {
    ok: true,
    outcome,
    promotedToBuild,
    technicalFailure: false,
    terminalMessage,
    validationRunId,
    postValidationEvaluationId: postEvaluationId,
    selectedCandidate: {
      candidateId: selected.candidateId,
      title: selected.title,
      selectionReason: selected.selectionReason,
    },
    preValidationFatalRisk: preValidationEvaluation.fatalAssumptionRiskScore,
    postValidationFatalRisk: postValidationEvaluation.fatalAssumptionRiskScore,
    preValidationDecision: preValidationEvaluation.decision,
    postValidationDecision: postValidationEvaluation.decision,
    experiments,
    rejectedExperimentTypes: synthesis.rejectedExperimentTypes,
    synthesisStepCount,
    acquisitionStepCount,
    acquisitionDecision,
    acquisitionReason,
    lineage: {
      cycleKey: input.cycleKey,
      discoveryRunId: input.discoveryRunId,
      monetizationRunId: input.monetizationRunId,
      ventureSelectionRunId: input.ventureSelectionRunId,
      selectedValidationCandidateId: selected.candidateId,
      validationRunId,
      postValidationEvaluationId: postEvaluationId,
      finalDecision: outcome,
      selectionReason: selected.selectionReason,
      validationRound,
      synthesisStepCount,
      acquisitionStepCount,
      acquisitionDecision,
      acquisitionReason,
      experiments,
    },
    costUsd,
    costKnown,
    providerCalls,
    postValidationEvaluation,
  };
}

export { humanizeBlockingAssumption };

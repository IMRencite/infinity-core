import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  type SelectionDecision,
} from "@/lib/infinity/venture-selection/constants";
import { passesBuildGate } from "@/lib/infinity/venture-selection/decisions/classify";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";

export type Favc1SelectionStopReasonPath =
  | "individual_viability_rejection"
  | "build_gate_failure"
  | "validation_required"
  | "safety_constraints"
  | "resource_constrained";

export type Favc1SelectionStopReason = {
  message: string;
  structured: {
    path: Favc1SelectionStopReasonPath;
    buildCount: number;
    validateCount: number;
    holdCount: number;
    rejectCount: number;
    candidatesEvaluated: number;
  };
};

function countDecisions(evaluations: Array<{ decision: SelectionDecision }>) {
  const counts = { BUILD: 0, VALIDATE: 0, HOLD: 0, REJECT: 0 };
  for (const evaluation of evaluations) {
    counts[evaluation.decision] += 1;
  }
  return counts;
}

export function deriveFavc1SelectionStopReason(
  evaluations: CandidateEvaluationDraft[],
): Favc1SelectionStopReason {
  const counts = countDecisions(evaluations);
  const structuredBase = {
    buildCount: counts.BUILD,
    validateCount: counts.VALIDATE,
    holdCount: counts.HOLD,
    rejectCount: counts.REJECT,
    candidatesEvaluated: evaluations.length,
  };

  const gateResults = evaluations.map((evaluation) => ({
    evaluation,
    gate: passesBuildGate({
      evaluation,
      thresholds: DEFAULT_BUILD_GATE_THRESHOLDS,
    }),
  }));

  const allBelowViability = evaluations.every(
    (evaluation) => evaluation.selectionScore < DEFAULT_DECISION_THRESHOLDS.rejectSelectionScore,
  );
  if (allBelowViability) {
    return {
      message: "No candidate met minimum venture viability thresholds.",
      structured: { ...structuredBase, path: "individual_viability_rejection" },
    };
  }

  // Validation uncertainty must not be labeled as first-cycle safety failure.
  if (counts.VALIDATE > 0 && counts.BUILD === 0) {
    return {
      message: "No candidate was ready to BUILD; one or more candidates require validation.",
      structured: { ...structuredBase, path: "validation_required" },
    };
  }

  const allSafetyBlocked = gateResults.every(({ gate }) =>
    gate.reasons.some((reason) =>
      /Platform dependency too high|Regulatory risk too high|Startup capital exceeds maximum/i.test(
        reason,
      ),
    ),
  );
  if (allSafetyBlocked && counts.BUILD === 0) {
    return {
      message: "No candidate satisfied first-cycle safety constraints.",
      structured: { ...structuredBase, path: "safety_constraints" },
    };
  }

  if (counts.HOLD > 0 && counts.BUILD === 0 && counts.VALIDATE === 0) {
    return {
      message: "No candidate was ready to BUILD; viable candidates deferred by resource constraints.",
      structured: { ...structuredBase, path: "resource_constrained" },
    };
  }

  const anyBuildGateCandidate = gateResults.some(
    ({ evaluation, gate }) =>
      !gate.passes &&
      evaluation.selectionScore >= DEFAULT_DECISION_THRESHOLDS.rejectSelectionScore,
  );
  if (anyBuildGateCandidate && counts.BUILD === 0) {
    return {
      message: "No candidate satisfied the BUILD gate.",
      structured: { ...structuredBase, path: "build_gate_failure" },
    };
  }

  return {
    message: "No candidate met minimum venture viability thresholds.",
    structured: { ...structuredBase, path: "individual_viability_rejection" },
  };
}

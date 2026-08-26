import type { SelectionDecision } from "../constants";
import type {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  DEFAULT_RESOURCE_CONSTRAINTS,
} from "../constants";
import type { CandidateEvaluationDraft, ResourceAllocationSnapshot } from "../types";

/** Fail-closed BUILD reason: missing CAC/LTV/ratio is not numeric zero. */
export const UNKNOWN_UNIT_ECONOMICS_REASON =
  "Unit economics unknown; LTV/CAC is not zero.";
export const UNKNOWN_EXPECTED_ROI_REASON =
  "Expected ROI unknown because unit economics are unknown.";

function isKnownNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isUnknownEconomicsReason(reason: string): boolean {
  return reason === UNKNOWN_UNIT_ECONOMICS_REASON || reason === UNKNOWN_EXPECTED_ROI_REASON;
}

export function passesBuildGate(input: {
  evaluation: CandidateEvaluationDraft;
  thresholds: typeof DEFAULT_BUILD_GATE_THRESHOLDS;
}): { passes: boolean; reasons: string[] } {
  const plan = input.evaluation.candidate.monetization?.primaryPlan;
  const reasons: string[] = [];

  if (input.evaluation.portfolioAdjustedScore < input.thresholds.minSelectionScore) {
    reasons.push(`Selection score below minimum (${input.evaluation.portfolioAdjustedScore}).`);
  }
  if ((input.evaluation.candidate.monetization?.monetizationScore ?? 0) < input.thresholds.minMonetizationScore) {
    reasons.push("Monetization score below minimum.");
  }
  if (input.evaluation.validationScore < input.thresholds.minValidationScore) {
    reasons.push("Validation score below minimum.");
  }
  if (input.evaluation.buildability.buildabilityScore < input.thresholds.minBuildabilityScore) {
    reasons.push("Buildability score below minimum.");
  }
  if (input.evaluation.confidence < input.thresholds.minEvidenceConfidence) {
    reasons.push("Evidence confidence below minimum.");
  }
  if (input.evaluation.fatalAssumptionRiskScore > input.thresholds.maxFatalAssumptionRisk) {
    reasons.push("Fatal assumption risk too high.");
  }
  if ((plan?.estimatedCapitalRequired ?? 0) > input.thresholds.maxStartupCapital) {
    reasons.push("Startup capital exceeds maximum.");
  }
  if ((plan?.platformDependencyRisk ?? 0) > input.thresholds.maxPlatformDependency) {
    reasons.push("Platform dependency too high.");
  }
  if ((plan?.regulatoryRisk ?? 0) > input.thresholds.maxRegulatoryRisk) {
    reasons.push("Regulatory risk too high.");
  }

  const cacKnown = isKnownNumber(plan?.estimatedCAC);
  const ltvKnown = isKnownNumber(plan?.estimatedLTV);
  const ratioKnown = isKnownNumber(plan?.ltvCacRatio);
  const unitEconomicsKnown = cacKnown && ltvKnown && ratioKnown;
  const expectedRoi = input.evaluation.expectedValueDerived.expectedRoi;

  if (!unitEconomicsKnown) {
    reasons.push(UNKNOWN_UNIT_ECONOMICS_REASON);
    reasons.push(UNKNOWN_EXPECTED_ROI_REASON);
  } else {
    if (!isKnownNumber(expectedRoi)) {
      reasons.push("Expected ROI unknown.");
    } else if (expectedRoi < input.thresholds.minExpectedRoi) {
      reasons.push("Expected ROI below minimum.");
    }
    if (plan!.ltvCacRatio! < input.thresholds.minLtvCacRatio) {
      reasons.push("LTV/CAC below minimum.");
    }
  }

  return { passes: reasons.length === 0, reasons };
}

export function classifyDecision(input: {
  evaluation: CandidateEvaluationDraft;
  buildGatePassed: boolean;
  buildGateReasons: string[];
  hasResourceCapacity: boolean;
  decisionThresholds: typeof DEFAULT_DECISION_THRESHOLDS;
}): { decision: SelectionDecision; recommendedNextAction: string } {
  const score = input.evaluation.portfolioAdjustedScore;

  if (score < input.decisionThresholds.rejectSelectionScore) {
    return {
      decision: "REJECT",
      recommendedNextAction: "Archive candidate and monitor for major market changes only.",
    };
  }

  if (input.buildGatePassed && input.hasResourceCapacity) {
    return {
      decision: "BUILD",
      recommendedNextAction: "Prepare Company Builder handoff when policy gates allow.",
    };
  }

  const assumptionBlocked = input.buildGateReasons.some((reason) =>
    /assumption|confidence|validation/i.test(reason),
  );
  const unknownEconomics = input.buildGateReasons.some(isUnknownEconomicsReason);
  const knownEconomicsBlocked = input.buildGateReasons.some(
    (reason) =>
      !isUnknownEconomicsReason(reason) && /ROI|capital|LTV|Monetization/i.test(reason),
  );

  if (
    score >= input.decisionThresholds.validateSelectionScore &&
    (assumptionBlocked ||
      input.evaluation.blockingAssumptions.length > 0 ||
      input.evaluation.fatalAssumptionRiskScore > 0.35)
  ) {
    return {
      decision: "VALIDATE",
      recommendedNextAction: "Run highest-priority validation experiments before build consideration.",
    };
  }

  if (score >= input.decisionThresholds.holdSelectionScore && !input.hasResourceCapacity) {
    return {
      decision: "HOLD",
      recommendedNextAction: "Revisit when resource capacity opens or evidence improves.",
    };
  }

  if (score >= input.decisionThresholds.validateSelectionScore && !input.buildGatePassed) {
    // Unknown CAC/LTV must not coerce a validation-grade idea into HOLD.
    // Known-bad numeric economics (LTV/CAC, ROI, capital) may still HOLD.
    if (unknownEconomics) {
      return {
        decision: "VALIDATE",
        recommendedNextAction: "Execute validation experiments to learn unit economics before build consideration.",
      };
    }
    return {
      decision: knownEconomicsBlocked ? "HOLD" : "VALIDATE",
      recommendedNextAction: knownEconomicsBlocked
        ? "Defer until economics improve or capital constraints relax."
        : "Execute validation experiments to resolve build gate failures.",
    };
  }

  if (score >= input.decisionThresholds.rejectSelectionScore) {
    return {
      decision: "HOLD",
      recommendedNextAction: "Monitor and rescan when evidence freshness expires.",
    };
  }

  return {
    decision: "REJECT",
    recommendedNextAction: "Do not pursue under current evidence and economics.",
  };
}

export function simulateResourceAllocation(input: {
  rankedEvaluations: CandidateEvaluationDraft[];
  constraints: ResourceAllocationSnapshot["constraints"];
}): ResourceAllocationSnapshot {
  let remainingCapital = input.constraints.availableVentureCapital;
  let remainingBuilds = input.constraints.maxSimultaneousBuilds;
  let remainingValidations = input.constraints.maxSimultaneousValidations;

  const allocations: ResourceAllocationSnapshot["allocations"] = [];
  const unallocatedCandidates: string[] = [];

  for (const evaluation of input.rankedEvaluations) {
    const capitalRequired =
      evaluation.candidate.monetization?.primaryPlan?.estimatedCapitalRequired ?? 0;

    if (evaluation.decision === "BUILD") {
      if (remainingBuilds > 0 && remainingCapital >= capitalRequired) {
        allocations.push({
          candidateId: evaluation.candidate.candidateId,
          decision: "BUILD",
          allocatedCapital: capitalRequired,
          allocatedValidationSlots: 0,
          reason: "Allocated build slot and capital within simulated constraints.",
        });
        remainingCapital -= capitalRequired;
        remainingBuilds -= 1;
        continue;
      }
      unallocatedCandidates.push(evaluation.candidate.candidateId);
      continue;
    }

    if (evaluation.decision === "VALIDATE" && remainingValidations > 0) {
      allocations.push({
        candidateId: evaluation.candidate.candidateId,
        decision: "VALIDATE",
        allocatedCapital: 0,
        allocatedValidationSlots: 1,
        reason: "Allocated validation experiment capacity.",
      });
      remainingValidations -= 1;
      continue;
    }

    if (evaluation.decision === "HOLD" || evaluation.decision === "REJECT") {
      unallocatedCandidates.push(evaluation.candidate.candidateId);
    }
  }

  return {
    constraints: input.constraints,
    allocations,
    unallocatedCandidates,
    summary: {
      allocatedBuilds: allocations.filter((item) => item.decision === "BUILD").length,
      allocatedValidations: allocations.filter((item) => item.decision === "VALIDATE").length,
      remainingCapital,
      remainingBuilds,
      remainingValidations,
    },
  };
}

export function applyResourceConstraintsToDecisions(input: {
  evaluations: CandidateEvaluationDraft[];
  allocation: ResourceAllocationSnapshot;
}): CandidateEvaluationDraft[] {
  const allocatedBuildIds = new Set(
    input.allocation.allocations.filter((item) => item.decision === "BUILD").map((item) => item.candidateId),
  );

  return input.evaluations.map((evaluation) => {
    if (evaluation.decision !== "BUILD") return evaluation;
    if (allocatedBuildIds.has(evaluation.candidate.candidateId)) return evaluation;

    return {
      ...evaluation,
      decision: "HOLD",
      recommendedNextAction:
        "Passed build gate but deferred due to simulated resource constraints.",
      queueReason: `${evaluation.queueReason} Resource allocation deferred this candidate.`,
    };
  });
}

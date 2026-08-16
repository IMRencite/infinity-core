import { randomUUID } from "node:crypto";
import type { LearningDecisionType, OptimizationActionType } from "../constants";
import type { Experiment, LearningDecision, OptimizationOpportunity } from "../types";

const ACTION_TO_DECISION: Partial<Record<OptimizationActionType, LearningDecisionType>> = {
  EXPAND: "EXPAND",
  REFRESH: "REFRESH",
  REPAIR: "REPAIR",
  REWRITE: "REWRITE",
  RELINK: "RELINK",
  PRUNE: "PRUNE",
  CHANGE_CREATIVE: "CHANGE_CREATIVE",
  CHANGE_OFFER: "CHANGE_OFFER",
  CHANGE_PRICE: "CHANGE_PRICING",
  CHANGE_ACQUISITION_MIX: "CHANGE_ACQUISITION",
  PAUSE: "PAUSE",
  PIVOT: "PIVOT",
  SHUTDOWN: "SHUTDOWN",
  REQUEST_MORE_EVIDENCE: "COLLECT_MORE_DATA",
  IMPROVE_CONVERSION: "REPAIR",
  FIX_TECHNICAL_ISSUE: "REPAIR",
};

export function buildLearningDecisions(input: {
  opportunities: OptimizationOpportunity[];
  intelligenceCostUsd?: number;
  policyBlockedActions?: OptimizationActionType[];
}): LearningDecision[] {
  return input.opportunities.map((opp) => {
    const decisionType = ACTION_TO_DECISION[opp.actionType] ?? "KEEP";
    let status: LearningDecision["status"] = "PROPOSED";

    if (input.policyBlockedActions?.includes(opp.actionType)) {
      status = "BLOCKED";
    } else if (opp.economicDecision === "COLLECT_MORE_DATA") {
      status = "MORE_DATA_REQUIRED";
    } else if (opp.economicDecision === "REJECT" || opp.economicDecision === "DEFER") {
      status = "PROPOSED";
    } else if (opp.economicDecision === "EXECUTE_NOW" || opp.economicDecision === "QUEUE") {
      status = "READY";
    } else if (opp.economicDecision === "TEST_FIRST") {
      status = "PROPOSED";
    }

    return {
      decisionId: randomUUID(),
      ventureId: opp.ventureId,
      decisionType,
      status,
      diagnosisId: opp.diagnosisId,
      opportunityId: opp.opportunityId,
      evidence: opp.supportingEvidence,
      economicAnalysis: [
        `Expected upside $${opp.expectedUpsideUsd}`,
        `Estimated cost $${opp.estimatedCostUsd}`,
        `Economic decision: ${opp.economicDecision}`,
      ],
      confidence: opp.confidence,
      expectedOutcome: `Improve ${opp.actionType} for ${opp.target}`,
      attributionConfidence: "INFERRED",
      intelligenceCostUsd: input.intelligenceCostUsd ?? 0,
    };
  });
}

export function buildExperimentFromOpportunity(opportunity: OptimizationOpportunity): Experiment {
  const successMetric =
    opportunity.actionType === "CHANGE_CREATIVE"
      ? "ctr"
      : opportunity.actionType === "IMPROVE_CONVERSION"
        ? "conversion_rate"
        : "sessions";

  return {
    experimentId: randomUUID(),
    ventureId: opportunity.ventureId,
    hypothesis: opportunity.supportingEvidence[1] ?? "Optimization test",
    baselineVariant: "control",
    testVariant: "variant_a",
    successMetric,
    guardrailMetrics: ["provider_cost", "repair_count"],
    window: "week",
    status: "planned",
  };
}

export function applyExperimentResult(
  experiment: Experiment,
  result: Experiment["result"],
): Experiment {
  return { ...experiment, status: "completed", result };
}

export function mapDecisionToMissionTarget(decision: LearningDecision): string | null {
  switch (decision.decisionType) {
    case "CHANGE_CREATIVE":
      return "creative_media";
    case "REFRESH":
    case "RELINK":
    case "REWRITE":
      return "organic_growth";
    case "REPAIR":
    case "EXPAND":
      return "product_asset_builder";
    case "PAUSE":
    case "SHUTDOWN":
      return "external_action";
    default:
      return null;
  }
}

export function shouldUseAiDiagnosis(input: {
  expectedUpsideUsd: number;
  intelligenceCostUsd: number;
  maxAiCostUsd: number;
}): boolean {
  if (input.expectedUpsideUsd < 50) return false;
  if (input.intelligenceCostUsd >= input.maxAiCostUsd) return false;
  return input.expectedUpsideUsd / Math.max(input.intelligenceCostUsd, 0.01) >= 10;
}

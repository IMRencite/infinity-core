import type { AssumptionRecord } from "@/lib/infinity/venture-selection/types";
import {
  FAVC1_VALIDATION_MAX_ACQUISITION_CALLS,
  isAllowedValidationExperimentType,
  mapValidationMethodToAllowedExperiment,
} from "./constants";
import { classifyAssumptionKind } from "./evidence-relevance";
import type { ValidationExperimentRecord } from "./types";

export const FAVC1_BUILD_FATAL_RISK_THRESHOLD = 0.45;
export const FAVC1_ESTIMATED_ACQUISITION_COST_USD = 0.002;
export const FAVC1_VOI_RUN_THRESHOLD = 4;

const GROUNDED_RESEARCH_EXPERIMENT_TYPES = new Set([
  "comparable_benchmark_research",
  "distribution_economics_research",
  "search_demand_evidence",
  "public_demand_evidence_research",
  "grounded_competitor_research",
  "pricing_evidence_research",
  "public_pricing_comparison",
  "public_review_pain_validation",
]);

export type AcquisitionDecision = "RUN" | "SKIP";

export type AcquisitionDecisionRecord = {
  decision: AcquisitionDecision;
  reason: string;
  voiScore: number;
  assumption: AssumptionRecord;
  synthesisExperiment: ValidationExperimentRecord;
};

export function humanizeBlockingAssumption(assumption: AssumptionRecord): string {
  const kind = classifyAssumptionKind(assumption);
  if (kind === "quantitative_cac") return "customer acquisition cost";
  if (kind === "quantitative_customer_count") return "year-one customer acquisition";
  if (kind === "pricing") return "pricing viability";
  if (assumption.category === "demand") return "market demand";
  if (assumption.category === "acquisition") return "distribution economics";
  return assumption.category.replace(/_/g, " ");
}

export function isAssumptionEligibleForGroundedAcquisition(assumption: AssumptionRecord): boolean {
  const kind = classifyAssumptionKind(assumption);
  if (kind === "quantitative_cac" || kind === "quantitative_customer_count") {
    return true;
  }

  const mapped = mapValidationMethodToAllowedExperiment(assumption.validationMethod);
  if (!mapped || !isAllowedValidationExperimentType(mapped)) {
    return false;
  }

  return GROUNDED_RESEARCH_EXPERIMENT_TYPES.has(mapped);
}

export function isSynthesisSufficient(experiment: ValidationExperimentRecord): boolean {
  if (experiment.providerCalls > 0) {
    return experiment.uncertaintyReduction > 0 && experiment.relevanceClass === "DIRECT";
  }

  if (
    experiment.relevanceClass === "DIRECT" &&
    experiment.uncertaintyReduction > 0 &&
    experiment.validationResult === "SUPPORTED"
  ) {
    return true;
  }

  return false;
}

export function shouldEscalateAfterSynthesis(input: {
  experiment: ValidationExperimentRecord;
  assumption: AssumptionRecord;
  buildFatalRiskThreshold?: number;
}): boolean {
  if (input.experiment.synthesisOnly !== true || input.experiment.providerCalls > 0) {
    return false;
  }

  if (isSynthesisSufficient(input.experiment)) {
    return false;
  }

  if (input.experiment.newEvidenceFound && input.experiment.relevanceClass === "DIRECT") {
    return false;
  }

  const unresolvedResult =
    input.experiment.validationResult === "INCONCLUSIVE" ||
    (input.experiment.validationResult === "PARTIALLY_SUPPORTED" &&
      input.experiment.uncertaintyReduction === 0);

  if (!unresolvedResult) {
    return false;
  }

  const reusedOnlyInsufficient =
    !input.experiment.newEvidenceFound &&
    (input.experiment.relevanceClass === "IRRELEVANT" ||
      input.experiment.relevanceClass === "INDIRECT" ||
      input.experiment.reusedSourceCount > 0);

  if (!reusedOnlyInsufficient) {
    return false;
  }

  const blockingRemains =
    input.assumption.uncertaintyScore >= 0.35 || input.assumption.fatalRiskContribution >= 0.08;

  if (!blockingRemains) {
    return false;
  }

  return isAssumptionEligibleForGroundedAcquisition(input.assumption);
}

export function evaluateAcquisitionVoi(input: {
  assumption: AssumptionRecord;
  preFatalRisk: number;
  buildFatalRiskThreshold?: number;
  estimatedProviderCostUsd?: number;
}): { decision: AcquisitionDecision; reason: string; voiScore: number } {
  const buildThreshold = input.buildFatalRiskThreshold ?? FAVC1_BUILD_FATAL_RISK_THRESHOLD;
  const possibleDecisionImpact = Math.max(0, input.preFatalRisk - buildThreshold);

  if (possibleDecisionImpact < 0.02) {
    return {
      decision: "SKIP",
      reason:
        "Provider research cannot materially affect BUILD eligibility — fatal risk already near decision boundary.",
      voiScore: 0,
    };
  }

  const kind = classifyAssumptionKind(input.assumption);
  const resolvability =
    kind === "quantitative_cac" || kind === "quantitative_customer_count" ? 0.75 : 0.45;
  const feasibility = isAssumptionEligibleForGroundedAcquisition(input.assumption) ? 1 : 0;
  const cost = Math.max(input.estimatedProviderCostUsd ?? FAVC1_ESTIMATED_ACQUISITION_COST_USD, 0.0005);
  const voiScore = (possibleDecisionImpact * resolvability * feasibility) / cost;

  if (voiScore < FAVC1_VOI_RUN_THRESHOLD) {
    return {
      decision: "SKIP",
      reason: `VOI score ${voiScore.toFixed(2)} below threshold ${FAVC1_VOI_RUN_THRESHOLD}.`,
      voiScore,
    };
  }

  return {
    decision: "RUN",
    reason: `VOI score ${voiScore.toFixed(2)} — acquisition may resolve ${humanizeBlockingAssumption(input.assumption)} blocker.`,
    voiScore,
  };
}

export function selectEscalationBlocker(input: {
  assumptions: AssumptionRecord[];
  synthesisExperiments: ValidationExperimentRecord[];
  preFatalRisk: number;
  buildFatalRiskThreshold?: number;
  maxAcquisitionCalls?: number;
}): AcquisitionDecisionRecord | null {
  const maxCalls = input.maxAcquisitionCalls ?? FAVC1_VALIDATION_MAX_ACQUISITION_CALLS;
  if (maxCalls <= 0) {
    return null;
  }

  const candidates: AcquisitionDecisionRecord[] = [];

  for (const experiment of input.synthesisExperiments) {
    const assumption = input.assumptions.find(
      (item) => item.assumption === experiment.blockingAssumptionId,
    );
    if (!assumption) continue;

    if (!shouldEscalateAfterSynthesis({ experiment, assumption, buildFatalRiskThreshold: input.buildFatalRiskThreshold })) {
      continue;
    }

    const voi = evaluateAcquisitionVoi({
      assumption,
      preFatalRisk: input.preFatalRisk,
      buildFatalRiskThreshold: input.buildFatalRiskThreshold,
    });

    if (voi.decision === "SKIP") {
      continue;
    }

    candidates.push({
      decision: voi.decision,
      reason: voi.reason,
      voiScore: voi.voiScore,
      assumption,
      synthesisExperiment: experiment,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const impactDiff = b.assumption.fatalRiskContribution - a.assumption.fatalRiskContribution;
    if (impactDiff !== 0) return impactDiff;
    return b.voiScore - a.voiScore;
  });

  return candidates[0] ?? null;
}

export function shouldEscalateRoundAfterSynthesis(input: {
  assumptions: AssumptionRecord[];
  synthesisExperiments: ValidationExperimentRecord[];
  preFatalRisk: number;
  buildFatalRiskThreshold?: number;
}): boolean {
  return selectEscalationBlocker(input) != null;
}

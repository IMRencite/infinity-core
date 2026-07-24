import type { Tables } from "@/lib/supabase/database.types";
import { DEFAULT_MODEL_THRESHOLDS } from "./constants";
import type {
  DecisionModel,
  EvaluationDimensionScores,
  PolicyEvaluationResult,
} from "./types";

type MissionPolicy = Tables<"mission_policies">;

function readJsonFlag(value: unknown, key: string): boolean {
  if (typeof value === "object" && value !== null && !Array.isArray(value) && key in value) {
    return Boolean((value as Record<string, unknown>)[key]);
  }

  return false;
}

export function evaluateMissionPolicies(
  model: DecisionModel,
  policies: MissionPolicy[],
  context: {
    isSparseValidation: boolean;
    recommendation: string;
  },
): PolicyEvaluationResult {
  const reasons: string[] = [];
  const checks: Record<string, boolean> = {};
  let blocked = false;
  let requiresApproval = true;

  const modelRequirements =
    typeof model.policy_requirements === "object" &&
    model.policy_requirements !== null &&
    !Array.isArray(model.policy_requirements)
      ? (model.policy_requirements as Record<string, unknown>)
      : {};

  const createsVenturesAllowed = policies.some((policy) =>
    readJsonFlag(policy.config, "creates_ventures"),
  );

  checks.creates_ventures_allowed = createsVenturesAllowed;
  if (!createsVenturesAllowed) {
    reasons.push("Mission policy prohibits venture creation.");
  }

  if (context.isSparseValidation) {
    checks.sparse_validation_data = false;
    reasons.push("System-validation or sparse discovery data detected.");
    blocked =
      context.recommendation === "approve_build" ||
      context.recommendation === "approve_initiative" ||
      context.recommendation === "acquire";
  } else {
    checks.sparse_validation_data = true;
  }

  if (
    readJsonFlag(modelRequirements, "requires_human_approval_for_build") &&
    (context.recommendation === "approve_build" || context.recommendation === "acquire")
  ) {
    requiresApproval = true;
    reasons.push("Build and acquisition recommendations require human approval.");
  }

  const boundedAutonomy = policies.some(
    (policy) => policy.autonomy_level === "bounded_autonomy",
  );
  checks.bounded_autonomy = boundedAutonomy;

  if (
    boundedAutonomy &&
    (context.recommendation === "approve_build" || context.recommendation === "acquire")
  ) {
    requiresApproval = true;
  }

  if (context.recommendation === "approve_build" && !createsVenturesAllowed) {
    blocked = true;
  }

  return {
    passed: !blocked,
    blocked,
    requiresApproval,
    reasons,
    checks,
  };
}

export function generateRecommendation(input: {
  model: DecisionModel;
  overallScore: number | null;
  confidenceScore: number | null;
  missingDimensions: string[];
  isSparseValidation: boolean;
  policyResults: PolicyEvaluationResult;
}): string {
  const thresholds =
    typeof input.model.decision_thresholds === "object" &&
    input.model.decision_thresholds !== null &&
    !Array.isArray(input.model.decision_thresholds)
      ? { ...DEFAULT_MODEL_THRESHOLDS, ...(input.model.decision_thresholds as Record<string, number>) }
      : DEFAULT_MODEL_THRESHOLDS;

  if (input.policyResults.blocked) {
    if (input.isSparseValidation) {
      return input.confidenceScore !== null &&
        input.confidenceScore <= thresholds.research_more_max_confidence
        ? "research_more"
        : "validate";
    }

    return "hold";
  }

  if (input.isSparseValidation) {
    return "validate";
  }

  if (
    input.overallScore !== null &&
    input.overallScore <= thresholds.reject_max_overall
  ) {
    return "reject";
  }

  if (
    input.confidenceScore !== null &&
    input.confidenceScore <= thresholds.research_more_max_confidence
  ) {
    return "research_more";
  }

  if (
    input.overallScore !== null &&
    input.overallScore >= thresholds.approve_build_min_overall &&
    input.confidenceScore !== null &&
    input.confidenceScore >= thresholds.approve_build_min_confidence &&
    !input.isSparseValidation
  ) {
    return "approve_build";
  }

  if (
    input.overallScore !== null &&
    input.overallScore >= thresholds.approve_initiative_min_overall &&
    input.confidenceScore !== null &&
    input.confidenceScore >= thresholds.approve_initiative_min_confidence
  ) {
    return "approve_initiative";
  }

  if (
    input.overallScore !== null &&
    input.overallScore >= thresholds.validate_min_overall
  ) {
    return "validate";
  }

  if (input.missingDimensions.length >= 5) {
    return "research_more";
  }

  return "monitor";
}

export function deriveCompositeScores(dimensions: EvaluationDimensionScores): {
  expectedValueScore: number | null;
  strategicFitScore: number | null;
  capitalEfficiencyScore: number | null;
  compoundingScore: number | null;
  riskAdjustedScore: number | null;
} {
  const read = (key: string) => dimensions[key]?.score ?? null;

  const profitability = read("profitability");
  const demand = read("demand");
  const strategicFit = read("strategic_fit");
  const capitalEfficiency = read("startup_cost_efficiency");
  const compounding = read("compounding_potential");
  const regulatory = read("regulatory_risk");
  const overallCandidates = [profitability, demand].filter((value) => value !== null) as number[];

  const expectedValueScore =
    overallCandidates.length > 0
      ? Math.round(
          (overallCandidates.reduce((sum, value) => sum + value, 0) /
            overallCandidates.length) *
            100,
        ) / 100
      : null;

  const riskAdjustedScore =
    expectedValueScore !== null && regulatory !== null
      ? Math.round(((expectedValueScore + regulatory) / 2) * 100) / 100
      : expectedValueScore;

  return {
    expectedValueScore,
    strategicFitScore: strategicFit,
    capitalEfficiencyScore: capitalEfficiency,
    compoundingScore: compounding,
    riskAdjustedScore,
  };
}

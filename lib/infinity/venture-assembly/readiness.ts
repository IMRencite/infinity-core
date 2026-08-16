import type { ReadinessEvaluationResult } from "./types";
import { READINESS_DIMENSIONS } from "./constants";

export function evaluateLaunchReadiness(input: {
  hasStrategyTraceability: boolean;
  identityComplete: boolean;
  businessModelComplete: boolean;
  buildComplete: boolean;
  qaComplete: boolean;
  reproducibilityComplete: boolean;
  monetizationDefined: boolean;
  marketingDefined: boolean;
  operationsDefined: boolean;
  legalIdentified: boolean;
  analyticsDefined: boolean;
  externalDependenciesIdentified: boolean;
  internalBlockers: string[];
}): ReadinessEvaluationResult {
  const dimensions: Record<string, boolean> = {
    strategy_complete: input.hasStrategyTraceability,
    identity_complete: input.identityComplete,
    business_model_complete: input.businessModelComplete,
    build_complete: input.buildComplete,
    qa_complete: input.qaComplete,
    reproducibility_complete: input.reproducibilityComplete,
    monetization_defined: input.monetizationDefined,
    marketing_defined: input.marketingDefined,
    operations_defined: input.operationsDefined,
    legal_requirements_identified: input.legalIdentified,
    analytics_defined: input.analyticsDefined,
    external_dependencies_identified: input.externalDependenciesIdentified,
  };

  const blockers = [...input.internalBlockers];
  for (const key of READINESS_DIMENSIONS) {
    if (!dimensions[key]) {
      blockers.push(`dimension_incomplete:${key}`);
    }
  }

  let readinessStatus: ReadinessEvaluationResult["readinessStatus"] = "internally_ready";
  if (blockers.some((b) => b.startsWith("dimension_incomplete:"))) {
    readinessStatus = blockers.length > 3 ? "blocked" : "needs_review";
  }
  if (input.internalBlockers.length > 0) {
    readinessStatus = "blocked";
  }

  return {
    readinessStatus,
    dimensions,
    blockers,
    notes: [
      "internally_ready means internal work permitted today is complete; external launch dependencies may remain unresolved.",
    ],
  };
}

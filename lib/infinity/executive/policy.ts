import { DEFAULT_EXECUTIVE_POLICY, isExecutiveDecision } from "./constants";
import type { ExecutivePolicy } from "./types";
import { mergeExecutivePolicy } from "./types";

export { DEFAULT_EXECUTIVE_POLICY, isExecutiveDecision, mergeExecutivePolicy };

export function validateExecutivePolicy(policy: ExecutivePolicy): void {
  if (policy.maxConcurrentBuilds < 1) {
    throw new Error("Executive policy maxConcurrentBuilds must be at least 1.");
  }

  if (policy.maxQueueDepth < 1) {
    throw new Error("Executive policy maxQueueDepth must be at least 1.");
  }

  if (policy.maxPortfolioConcentration <= 0 || policy.maxPortfolioConcentration > 1) {
    throw new Error("Executive policy maxPortfolioConcentration must be between 0 and 1.");
  }
}

export function defaultExecutivePolicy(): ExecutivePolicy {
  return mergeExecutivePolicy(DEFAULT_EXECUTIVE_POLICY);
}

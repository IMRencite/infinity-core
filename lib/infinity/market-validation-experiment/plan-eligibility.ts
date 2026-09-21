import type { NormalizedAccountPlan } from "./economic-read-types";
import { getEconomicReadVerification } from "./economic-read-verification";

export type ProviderPlanEligibility = {
  plan: string | null;
  previousPlan: string | null;
  commercialUse: "YES" | "NO" | "UNKNOWN";
  marketValidationExperiment: "PASS" | "FAIL";
  planGateOnly: true;
  authorizesDeployment: false;
  costImpliedByPlan: false;
  reason: string;
};

export function normalizeProviderPlanName(plan: string | null | undefined): string | null {
  if (!plan) return null;
  const value = plan.trim().toLowerCase();
  return value.length ? value : null;
}

export function evaluateProviderPlanEligibility(
  plan: string | null | undefined,
  previousPlan: string | null = "hobby",
): ProviderPlanEligibility {
  const normalized = normalizeProviderPlanName(plan);
  if (!normalized) {
    return {
      plan: null,
      previousPlan,
      commercialUse: "UNKNOWN",
      marketValidationExperiment: "FAIL",
      planGateOnly: true,
      authorizesDeployment: false,
      costImpliedByPlan: false,
      reason: "Provider plan is unknown. MARKET_VALIDATION_EXPERIMENT plan gate fails.",
    };
  }
  if (normalized === "hobby") {
    return {
      plan: normalized,
      previousPlan,
      commercialUse: "NO",
      marketValidationExperiment: "FAIL",
      planGateOnly: true,
      authorizesDeployment: false,
      costImpliedByPlan: false,
      reason: "PLAN_REFRESH_DID_NOT_CONFIRM_PRO. Hobby does not clear commercial MARKET_VALIDATION_EXPERIMENT eligibility.",
    };
  }
  if (normalized === "pro" || normalized === "enterprise") {
    return {
      plan: normalized,
      previousPlan,
      commercialUse: "YES",
      marketValidationExperiment: "PASS",
      planGateOnly: true,
      authorizesDeployment: false,
      costImpliedByPlan: false,
      reason: `${normalized} clears the provider-plan gate only. It does not classify deployment cost or authorize a write.`,
    };
  }
  return {
    plan: normalized,
    previousPlan,
    commercialUse: "UNKNOWN",
    marketValidationExperiment: "FAIL",
    planGateOnly: true,
    authorizesDeployment: false,
    costImpliedByPlan: false,
    reason: `Unrecognized provider plan '${normalized}' does not clear the plan gate.`,
  };
}

export function inspectFreshPlanEligibility(previousPlan = "hobby"): ProviderPlanEligibility {
  const live = getEconomicReadVerification();
  const plan = live.snapshot.plan?.plan ?? null;
  return evaluateProviderPlanEligibility(plan, previousPlan);
}

export function planReplacedStaleHobby(input: {
  previous: NormalizedAccountPlan | null;
  fresh: NormalizedAccountPlan | null;
}): boolean {
  const previous = normalizeProviderPlanName(input.previous?.plan);
  const fresh = normalizeProviderPlanName(input.fresh?.plan);
  return previous === "hobby" && fresh !== "hobby" && fresh != null;
}

import type { PolicyOutcome, SpendCategory, VentureBudget } from "../types";

export type SpendPolicyConfig = {
  domainAutoSpendLimitUsd: number | null;
  premiumDomainHitlThresholdUsd: number | null;
  recurringInfraHitlThresholdUsd: number | null;
  marketingRequiresSeparateAuthority: boolean;
};

export const DEFAULT_SPEND_POLICY: SpendPolicyConfig = {
  domainAutoSpendLimitUsd: null,
  premiumDomainHitlThresholdUsd: null,
  recurringInfraHitlThresholdUsd: null,
  marketingRequiresSeparateAuthority: true,
};

export type PolicyEvaluationInput = {
  category: SpendCategory;
  requestedAmountUsd: number;
  estimatedRecurringAmountUsd: number | null;
  budget: VentureBudget | null;
  config: SpendPolicyConfig;
  isPremiumDomain?: boolean;
  renewalPriceUnknown?: boolean;
};

export type PolicyEvaluationResult = {
  outcome: PolicyOutcome;
  reason: string;
  remainingBudgetUsd: number | null;
};

export function evaluateSpendPolicy(input: PolicyEvaluationInput): PolicyEvaluationResult {
  const { category, requestedAmountUsd, budget, config } = input;

  if (!Number.isFinite(requestedAmountUsd)) {
    return { outcome: "DENIED", reason: "Requested amount is UNKNOWN and cannot authorize as zero", remainingBudgetUsd: null };
  }

  if (category === "MARKETING" && config.marketingRequiresSeparateAuthority) {
    return { outcome: "HITL_REQUIRED", reason: "Marketing spend requires separate authority", remainingBudgetUsd: null };
  }

  if (input.renewalPriceUnknown && category === "DOMAIN_REGISTRATION") {
    return {
      outcome: "HITL_REQUIRED",
      reason: "Domain renewal price is UNKNOWN — human review required before registration",
      remainingBudgetUsd: null,
    };
  }

  const authorized = budget?.authorizedBudgetUsd;
  const spent = budget?.actualSpendUsd ?? 0;
  const remaining = authorized != null ? authorized - spent : null;

  if (authorized != null && requestedAmountUsd > authorized - spent) {
    return { outcome: "DENIED", reason: "Requested amount exceeds venture authorized budget", remainingBudgetUsd: remaining };
  }

  if (input.isPremiumDomain || (config.premiumDomainHitlThresholdUsd != null && requestedAmountUsd > config.premiumDomainHitlThresholdUsd)) {
    return { outcome: "HITL_REQUIRED", reason: "Premium domain purchase requires human approval", remainingBudgetUsd: remaining };
  }

  if (
    input.estimatedRecurringAmountUsd != null &&
    config.recurringInfraHitlThresholdUsd != null &&
    input.estimatedRecurringAmountUsd > config.recurringInfraHitlThresholdUsd
  ) {
    return { outcome: "HITL_REQUIRED", reason: "Recurring infrastructure exceeds configured threshold", remainingBudgetUsd: remaining };
  }

  if (config.domainAutoSpendLimitUsd != null && category === "DOMAIN_REGISTRATION" && requestedAmountUsd <= config.domainAutoSpendLimitUsd) {
    return { outcome: "AUTO_ALLOWED", reason: "Within configured domain auto-spend limit", remainingBudgetUsd: remaining };
  }

  if (category === "DOMAIN_REGISTRATION") {
    return { outcome: "CONDITIONALLY_ALLOWED", reason: "Domain registration allowed pending explicit authorization", remainingBudgetUsd: remaining };
  }

  return { outcome: "CONDITIONALLY_ALLOWED", reason: "Default conditional allowance", remainingBudgetUsd: remaining };
}

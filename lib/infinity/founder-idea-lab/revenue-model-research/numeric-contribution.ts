import type { ExtractedMoneyObservation } from "./types";
import {
  arpuWeightForRole,
  isCoreMonthlyPriceRole,
  observationIsCoreMonthly,
  type PriceRole,
} from "./price-role";
import { classifyPricingCluster, clusterExcludedFromCoreArpu } from "./pricing-cluster";

export const PRICE_CLUSTERS = ["CORE_PLATFORM", "MANAGED_SERVICE", "ADD_ON_TOOLING"] as const;
export type PriceCluster = (typeof PRICE_CLUSTERS)[number];

/**
 * Canonical eligibility for numeric core-platform pricing.
 * UI, ARPU, and comparable.numericPricingContribution must all use this.
 */
export function canContributeToCorePricing(
  observation: ExtractedMoneyObservation,
  role: PriceRole,
  claim?: string,
): boolean {
  if (!isCoreMonthlyPriceRole(role)) return false;
  if (arpuWeightForRole(role) <= 0) return false;
  const cluster = classifyPricingCluster(claim ?? observation.sourceText);
  if (clusterExcludedFromCoreArpu(cluster)) {
    if (!claim && cluster === "OTHER") return observationIsCoreMonthly(observation, role);
    return false;
  }
  return observationIsCoreMonthly(observation, role);
}

export function canContributeToManagedServicePricing(
  observation: ExtractedMoneyObservation,
  role: PriceRole,
): boolean {
  if (role !== "MANAGED_SERVICE_RETAINER") return false;
  if (observation.vagueLanguage || observation.kind === "SETUP_FEE" || observation.kind === "CHURN" || observation.kind === "GROSS_MARGIN") {
    return false;
  }
  return observation.kind === "MONTHLY_PRICE" || observation.monthlyRecurringEquivalent != null || observation.amountLow != null;
}

export function canContributeToAddOnPricing(
  observation: ExtractedMoneyObservation,
  role: PriceRole,
): boolean {
  if (role !== "ADD_ON_PRICE" && role !== "TOOLING_PRICE") return false;
  if (observation.vagueLanguage || observation.kind === "CHURN" || observation.kind === "GROSS_MARGIN") return false;
  return observation.amountLow != null || observation.amount != null || observation.monthlyRecurringEquivalent != null;
}

export function clusterForRole(role: PriceRole): PriceCluster | null {
  if (isCoreMonthlyPriceRole(role)) return "CORE_PLATFORM";
  if (role === "MANAGED_SERVICE_RETAINER") return "MANAGED_SERVICE";
  if (role === "ADD_ON_PRICE" || role === "TOOLING_PRICE") return "ADD_ON_TOOLING";
  return null;
}

export function founderComparableRoleLabel(input: {
  numericPricingContribution: boolean;
  priceRole: PriceRole | null;
  strategicComparable: boolean;
}): string {
  if (input.numericPricingContribution && input.priceRole === "DIRECT_COMPARABLE_CORE_PRICE") {
    return "Direct pricing comparable";
  }
  if (input.numericPricingContribution && (input.priceRole === "ADJACENT_COMPARABLE_CORE_PRICE" || input.priceRole === "CATEGORY_PRICE_BENCHMARK")) {
    return "Adjacent pricing comparable";
  }
  if (input.priceRole === "MANAGED_SERVICE_RETAINER") return "Adjacent service comparable";
  if (input.priceRole === "ADD_ON_PRICE" || input.priceRole === "TOOLING_PRICE") {
    return "Tool/add-on pricing — not used for core platform price";
  }
  if (input.strategicComparable) return "Strategic competitor — not used for pricing";
  return "Named in research — not used for pricing";
}

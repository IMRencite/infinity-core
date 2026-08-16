import type { LoadedMonetizationPlan } from "@/lib/infinity/venture-selection/types";
import type {
  EconomicsValueSource,
  ResolvedMonetizationEconomics,
  VentureOrganicContext,
} from "../types";

function classifySource(
  fromPlan: number | null | undefined,
  fromContext: number | null | undefined,
  derived: number,
): { value: number; source: EconomicsValueSource } {
  if (fromPlan != null && Number.isFinite(fromPlan) && fromPlan > 0) {
    return { value: fromPlan, source: "MONETIZATION_PLAN" };
  }
  if (fromContext != null && Number.isFinite(fromContext) && fromContext > 0) {
    return { value: fromContext, source: "VENTURE_CONTEXT" };
  }
  return { value: derived, source: "DERIVED_ESTIMATE" };
}

export function resolveMonetizationEconomics(
  context: VentureOrganicContext,
  plan: LoadedMonetizationPlan | null,
): ResolvedMonetizationEconomics {
  const ltv = classifySource(plan?.estimatedLTV, context.customerLifetimeValue, 500);
  const aov = classifySource(
    plan?.estimatedPriceBase,
    context.averageOrderValue,
    ltv.value * 0.2,
  );
  const customersY1 = plan?.estimatedCustomersYear1 ?? null;
  const convDerived =
    customersY1 && customersY1 > 0 ? Math.min(0.15, customersY1 / 100_000) : 0.02;
  const conv = classifySource(null, context.conversionRateEstimate, convDerived);

  const grossMarginPercent =
    plan?.estimatedGrossMarginPercent != null && plan.estimatedGrossMarginPercent > 0
      ? plan.estimatedGrossMarginPercent
      : 65;

  let minMarginalPageValue = 0;
  if (plan?.ltvCacRatio != null && plan.ltvCacRatio < 1) {
    minMarginalPageValue = 50;
  } else if (plan?.estimatedGrossRevenueYear1 != null && plan.estimatedGrossRevenueYear1 < 10_000) {
    minMarginalPageValue = 25;
  }

  return {
    customerLifetimeValue: ltv.value,
    averageOrderValue: aov.value,
    conversionRateEstimate: conv.value,
    grossMarginPercent,
    minMarginalPageValue,
    sources: {
      customerLifetimeValue: ltv.source,
      averageOrderValue: aov.source,
      conversionRateEstimate: conv.source,
      grossMarginPercent:
        plan?.estimatedGrossMarginPercent != null ? "MONETIZATION_PLAN" : "DERIVED_ESTIMATE",
      minMarginalPageValue: plan ? "MONETIZATION_PLAN" : "DERIVED_ESTIMATE",
    },
    monetizationPlanId: plan?.id ?? null,
    opportunityCandidateId: null,
  };
}

export function economicsInfluenceApproval(
  economics: ResolvedMonetizationEconomics,
  marginalExpansionValue: number,
): "APPROVE" | "DEFER" | "REJECT" {
  if (marginalExpansionValue < economics.minMarginalPageValue) {
    return economics.minMarginalPageValue >= 50 ? "REJECT" : "DEFER";
  }
  return "APPROVE";
}

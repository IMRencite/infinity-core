import type { MediaOpportunityDecision } from "../constants";
import type { LoadedMonetizationPlan } from "@/lib/infinity/venture-selection/types";
import type { MediaEconomicsContext, MediaPurpose, MediaVentureContext } from "../types";

export function resolveMediaEconomics(
  context: MediaVentureContext,
  plan: LoadedMonetizationPlan | null,
): MediaEconomicsContext {
  const ltv = plan?.estimatedLTV ?? 500;
  const revenueY1 = plan?.estimatedGrossRevenueYear1 ?? 100_000;
  const grossMargin = (plan?.estimatedGrossMarginPercent ?? 60) / 100;

  const expectedConversionValue = Math.round(ltv * 0.05);
  const expectedTrafficValue = Math.round(revenueY1 * 0.002 * grossMargin);
  const expectedReuseValue = 200;
  const expectedAssetValue = expectedConversionValue + expectedTrafficValue + expectedReuseValue;

  const minMarginalAssetValue =
    plan && plan.ltvCacRatio != null && plan.ltvCacRatio < 1 ? 900 : 350;

  return {
    expectedAssetValue,
    expectedTrafficValue,
    expectedConversionValue,
    expectedReuseValue,
    generationCostEstimate: 0.06,
    reviewCostEstimate: 0.01,
    assemblyCostEstimate: 0.005,
    minMarginalAssetValue,
    sources: {
      expectedConversionValue: plan ? "KNOWN" : "DERIVED",
      expectedTrafficValue: plan ? "DERIVED" : "ESTIMATED",
      minMarginalAssetValue: plan ? "DERIVED" : "ESTIMATED",
    },
  };
}

export function evaluateMediaEconomics(input: {
  expectedValue: number;
  estimatedCost: number;
  minMarginalAssetValue: number;
  purpose: MediaPurpose;
}): { decision: MediaOpportunityDecision; reasons: string[] } {
  const marginal = input.expectedValue - input.estimatedCost * 100;
  const reasons: string[] = [];

  if (marginal < input.minMarginalAssetValue * 0.25) {
    return {
      decision: "REJECT",
      reasons: ["Marginal media value below rejection threshold", `marginal=${marginal}`],
    };
  }

  if (marginal < input.minMarginalAssetValue) {
    return {
      decision: "DEFER",
      reasons: ["Marginal media value below approval threshold", `marginal=${marginal}`],
    };
  }

  if (input.purpose === "long_form_video" && marginal < input.minMarginalAssetValue * 2) {
    return {
      decision: "DEFER",
      reasons: ["Long-form video requires higher marginal value"],
    };
  }

  if (input.estimatedCost > 1.5 && marginal > input.minMarginalAssetValue * 3) {
    reasons.push("Premium tier justified by economics");
    return { decision: "CREATE_PREMIUM", reasons };
  }

  if (input.estimatedCost < 0.02 || input.purpose === "diagram") {
    reasons.push("Economy/deterministic path sufficient");
    return { decision: "CREATE_ECONOMY", reasons };
  }

  reasons.push(`Approved with marginal value ${marginal}`);
  return { decision: "CREATE_STANDARD", reasons };
}

export function economicsInfluenceQualityTier(input: {
  decision: MediaOpportunityDecision;
  economics: MediaEconomicsContext;
}): "premium" | "standard" | "economy" | "deterministic" {
  if (input.decision === "DETERMINISTIC_ONLY") return "deterministic";
  if (input.decision === "CREATE_ECONOMY") return "economy";
  if (input.decision === "CREATE_PREMIUM") return "premium";
  if (input.economics.expectedAssetValue > 3000) return "premium";
  return "standard";
}

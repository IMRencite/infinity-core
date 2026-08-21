import type { MonetizationPlanDraft, RevenueStreamDraft } from "@/lib/infinity/monetization-engine/types";
import type { PaymentArchitectureEvidence } from "./types";

export function evidenceFromMonetizationPlan(
  plan: Pick<
    MonetizationPlanDraft,
    "modelType" | "pricingModel" | "billingFrequency" | "payer" | "beneficiary" | "revenueStreams"
  >,
): PaymentArchitectureEvidence {
  const primaryStream: RevenueStreamDraft | undefined = plan.revenueStreams.find((stream) => stream.streamRole === "primary");
  const takeRatePercent =
    primaryStream?.estimatedShareOfRevenuePercent ??
    plan.revenueStreams.find((stream) => stream.estimatedShareOfRevenuePercent != null)?.estimatedShareOfRevenuePercent ??
    null;
  const marketplace = /marketplace|commission/.test(`${plan.modelType} ${plan.pricingModel}`.toLowerCase());
  return {
    monetizationModelType: plan.modelType,
    pricingModel: plan.pricingModel,
    billingFrequency: plan.billingFrequency,
    payer: plan.payer,
    beneficiary: plan.beneficiary,
    takeRatePercent,
    hasDistinctBuyers: marketplace || Boolean(plan.payer),
    hasDistinctSellers: marketplace || (plan.beneficiary !== plan.payer && Boolean(plan.beneficiary)),
    sellersReceivePlatformPayouts: marketplace ? true : null,
  };
}

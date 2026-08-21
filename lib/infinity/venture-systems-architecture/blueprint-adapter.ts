import type { LoadedVentureSelectionHandoff, VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { MonetizationPlanDraft } from "@/lib/infinity/monetization-engine/types";
import { evidenceFromMonetizationPlan } from "@/lib/infinity/payment-architecture";
import type { VentureSystemsEvidence } from "./types";
import { buildVentureSystemsContract } from "./build-contract";

export function evidenceFromMonetization(plan: Pick<MonetizationPlanDraft, "modelType" | "pricingModel" | "billingFrequency" | "payer" | "beneficiary" | "revenueStreams">): VentureSystemsEvidence {
  const paymentEvidence = evidenceFromMonetizationPlan(plan);
  return {
    monetizationModelType: plan.modelType,
    paymentEvidence,
    depositPayment: /deposit/.test(`${plan.pricingModel} ${plan.billingFrequency}`.toLowerCase()),
    finalPayment: /final|remainder|balance/.test(`${plan.pricingModel}`.toLowerCase()),
  };
}

export function evidenceFromVentureBlueprint(blueprint: VentureBlueprintDraft): VentureSystemsEvidence {
  return {
    ventureType: blueprint.core.ventureType,
    businessConcept: `${blueprint.core.businessSummary} ${blueprint.core.solution}`,
    monetizationModelType: blueprint.core.primaryMonetizationModel,
    hasDistinctBuyers: /marketplace/.test(blueprint.core.ventureType),
    hasDistinctSellers: /marketplace/.test(blueprint.core.ventureType),
    seoIsPrimaryAcquisition: blueprint.core.customerAcquisitionStrategy.toLowerCase().includes("seo"),
  };
}

export function evidenceFromVentureHandoff(handoff: LoadedVentureSelectionHandoff): VentureSystemsEvidence {
  return {
    businessConcept: handoff.businessConcept,
    monetizationModelType: handoff.primaryMonetizationModel,
    businessModelCandidates: handoff.businessModelCandidates,
  };
}

export function systemsContractForBlueprint(blueprint: VentureBlueprintDraft) {
  return buildVentureSystemsContract(evidenceFromVentureBlueprint(blueprint));
}

export function systemsContractForHandoff(handoff: LoadedVentureSelectionHandoff) {
  return buildVentureSystemsContract(evidenceFromVentureHandoff(handoff));
}

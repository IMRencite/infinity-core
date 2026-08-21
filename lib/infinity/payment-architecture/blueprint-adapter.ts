import type { LoadedVentureSelectionHandoff, VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { PaymentArchitectureEvidence } from "./types";
import { selectPaymentArchitecture } from "./selector";
import { buildPaymentArchitectureContract, type PaymentArchitectureBuildContract } from "./build-contract";

export function evidenceFromVentureHandoff(handoff: LoadedVentureSelectionHandoff): PaymentArchitectureEvidence {
  return {
    monetizationModelType: handoff.primaryMonetizationModel,
    businessModelCandidates: handoff.businessModelCandidates,
    revenueMechanism: handoff.pricingStrategy,
    payer: handoff.targetCustomer,
    beneficiary: handoff.targetCustomer,
  };
}

export function evidenceFromVentureBlueprint(blueprint: VentureBlueprintDraft): PaymentArchitectureEvidence {
  const marketplace = /marketplace/.test(
    `${blueprint.core.ventureType} ${blueprint.core.primaryMonetizationModel}`.toLowerCase(),
  );
  return {
    monetizationModelType: blueprint.core.primaryMonetizationModel,
    revenueMechanism: blueprint.core.pricingStrategy,
    payer: blueprint.core.payer,
    beneficiary: blueprint.core.beneficiary,
    hasDistinctBuyers: marketplace,
    hasDistinctSellers: marketplace,
    sellersReceivePlatformPayouts: marketplace ? true : null,
  };
}

export function paymentContractForBlueprint(blueprint: VentureBlueprintDraft): PaymentArchitectureBuildContract {
  const evidence = evidenceFromVentureBlueprint(blueprint);
  return buildPaymentArchitectureContract(selectPaymentArchitecture(evidence), evidence);
}

export function paymentContractForHandoff(handoff: LoadedVentureSelectionHandoff): PaymentArchitectureBuildContract {
  const evidence = evidenceFromVentureHandoff(handoff);
  return buildPaymentArchitectureContract(selectPaymentArchitecture(evidence), evidence);
}

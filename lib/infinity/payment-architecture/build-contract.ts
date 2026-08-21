import type { PaymentArchitectureEvidence, PaymentArchitectureSelection, PaymentPartyModel } from "./types";
import type { PaymentRequirement } from "./constants";

export type PaymentArchitectureBuildContract = {
  businessModel: PaymentArchitectureSelection["businessModel"];
  architecture: PaymentArchitectureSelection["selectedArchitecture"];
  architectureKind: PaymentArchitectureSelection["architectureKind"];
  requiredCapabilities: PaymentRequirement[];
  providerCandidates: PaymentArchitectureSelection["providerCandidates"];
  sellerModel: PaymentPartyModel | null;
  buyerModel: PaymentPartyModel | null;
  commissionModel: {
    kind: "PLATFORM_COMMISSION" | "TRANSACTION_FEE" | "NONE";
    takeRatePercent: number | null;
  };
  checkoutRequirements: PaymentRequirement[];
  onboardingRequirements: PaymentRequirement[];
  refundRequirements: PaymentRequirement[];
  disputeRequirements: PaymentRequirement[];
  payoutRequirements: PaymentRequirement[];
  testModeRequired: true;
  liveWriteAuthorityRequired: false;
  cursorChoosesArchitectureIndependently: false;
  infinitySuppliesArchitecture: true;
};

function party(role: "BUYER" | "SELLER", label: string | null | undefined): PaymentPartyModel | null {
  if (!label) return null;
  return { role, label };
}

export function buildPaymentArchitectureContract(
  selection: PaymentArchitectureSelection,
  evidence: PaymentArchitectureEvidence = {},
): PaymentArchitectureBuildContract {
  const required = selection.requiredCapabilities;
  return {
    businessModel: selection.businessModel,
    architecture: selection.selectedArchitecture,
    architectureKind: selection.architectureKind,
    requiredCapabilities: required,
    providerCandidates: selection.providerCandidates,
    sellerModel: party("SELLER", evidence.sellerRole),
    buyerModel: party("BUYER", evidence.buyerRole),
    commissionModel: {
      kind:
        evidence.takeRatePercent != null && evidence.takeRatePercent > 0
          ? "PLATFORM_COMMISSION"
          : selection.architectureKind === "MARKETPLACE_MULTI_PARTY"
            ? "PLATFORM_COMMISSION"
            : "NONE",
      takeRatePercent: evidence.takeRatePercent ?? null,
    },
    checkoutRequirements: required.filter((item) => item === "BUYER_CHECKOUT" || item === "ONE_TIME_PAYMENT" || item === "RECURRING_SUBSCRIPTION"),
    onboardingRequirements: required.filter((item) => item === "SELLER_ONBOARDING"),
    refundRequirements: required.filter((item) => item === "REFUND_SUPPORT"),
    disputeRequirements: required.filter((item) => item === "DISPUTE_SUPPORT"),
    payoutRequirements: required.filter((item) => item === "SELLER_PAYOUT" || item === "SELLER_BALANCE"),
    testModeRequired: true,
    liveWriteAuthorityRequired: false,
    cursorChoosesArchitectureIndependently: false,
    infinitySuppliesArchitecture: true,
  };
}

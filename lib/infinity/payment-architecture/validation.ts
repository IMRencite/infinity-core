import type { PaymentArchitectureEvidence, PaymentArchitectureSelection, PaymentValidationGap } from "./types";

const ISO_CURRENCY = /^[A-Z]{3}$/;

export function validatePaymentArchitecture(
  evidence: PaymentArchitectureEvidence,
  selection: PaymentArchitectureSelection,
): PaymentValidationGap[] {
  const gaps: PaymentValidationGap[] = [];
  const takeRate = evidence.takeRatePercent;
  const marketplace = selection.architectureKind === "MARKETPLACE_MULTI_PARTY";

  if (takeRate != null && takeRate < 0) {
    gaps.push({ code: "NEGATIVE_TAKE_RATE", message: "Take rate cannot be negative." });
  }
  if (takeRate != null && takeRate > 100) {
    gaps.push({ code: "PLATFORM_FEE_EXCEEDS_100", message: "Platform fee cannot exceed 100% of GMV." });
  }

  if (evidence.currency && !ISO_CURRENCY.test(evidence.currency.trim().toUpperCase())) {
    gaps.push({ code: "UNKNOWN_CURRENCY", message: "Currency must be a 3-letter ISO code." });
  }

  if (marketplace) {
    const buyers = evidence.hasDistinctBuyers ?? Boolean(evidence.buyerRole);
    const sellers = evidence.hasDistinctSellers ?? Boolean(evidence.sellerRole);
    if (!buyers || !sellers) {
      gaps.push({
        code: "MARKETPLACE_WITHOUT_BUYER_SELLER_DISTINCTION",
        message: "Marketplace architecture requires distinct buyer and seller roles.",
      });
    }
    if (sellers && evidence.sellersReceivePlatformPayouts === false) {
      gaps.push({
        code: "SELLER_WITHOUT_PAYOUT_MODEL",
        message: "Sellers exist but no platform payout model is present.",
      });
    }
    if (takeRate != null && takeRate > 0 && evidence.sellersReceivePlatformPayouts === false) {
      gaps.push({
        code: "COMMISSION_WITHOUT_SELLER_ALLOCATION",
        message: "Commission is specified but seller allocation is absent.",
      });
    }
    if (
      selection.requiredCapabilities.includes("SELLER_PAYOUT") &&
      !selection.providerCandidates.some((candidate) => candidate.capability === "MARKETPLACE_PAYMENTS")
    ) {
      gaps.push({
        code: "PAYOUT_WITHOUT_MARKETPLACE_CAPABILITY",
        message: "Seller payout is required but no marketplace payment capability is selected.",
      });
    }
    if (evidence.sellerCountryConstraints?.includes("UNKNOWN")) {
      gaps.push({
        code: "UNRESOLVED_SELLER_COUNTRY_CONSTRAINTS",
        message: "Seller-country constraints are present but unresolved.",
      });
    }
  }

  return gaps;
}

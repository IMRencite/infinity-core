import type { PaymentArchitectureEvidence } from "../types";

export const ART_MARKETPLACE_FIXTURE: PaymentArchitectureEvidence = {
  monetizationModelType: "two_sided_marketplace",
  listingType: "MARKETPLACE_LISTING",
  buyerRole: "COLLECTORS",
  sellerRole: "ARTISTS",
  hasDistinctBuyers: true,
  hasDistinctSellers: true,
  sellersReceivePlatformPayouts: true,
  takeRatePercent: 15,
  currency: "USD",
  revenueMechanism: "PLATFORM_COMMISSION",
  pricingModel: "platform commission",
};

import type { PaymentBusinessModel, PaymentRequirement } from "./constants";
import type { PaymentArchitectureEvidence } from "./types";

const MARKETPLACE_REQUIREMENTS: PaymentRequirement[] = [
  "BUYER_CHECKOUT",
  "SELLER_ONBOARDING",
  "MULTI_PARTY_PAYMENT",
  "PLATFORM_FEE",
  "SELLER_BALANCE",
  "SELLER_PAYOUT",
  "REFUND_SUPPORT",
  "DISPUTE_SUPPORT",
];

export function requirementsForBusinessModel(
  model: PaymentBusinessModel,
  evidence: PaymentArchitectureEvidence = {},
): PaymentRequirement[] {
  switch (model) {
    case "MARKETPLACE":
      return [...MARKETPLACE_REQUIREMENTS];
    case "SERVICE_PLATFORM":
      return evidence.sellersReceivePlatformPayouts === false
        ? ["BUYER_CHECKOUT", "ONE_TIME_PAYMENT", "INVOICE_SUPPORT", "REFUND_SUPPORT"]
        : [...MARKETPLACE_REQUIREMENTS];
    case "SAAS_SUBSCRIPTION":
      return ["RECURRING_SUBSCRIPTION", "BUYER_CHECKOUT", "REFUND_SUPPORT", "DISPUTE_SUPPORT"];
    case "USAGE_BASED":
      return ["USAGE_METERING", "BUYER_CHECKOUT", "RECURRING_SUBSCRIPTION", "REFUND_SUPPORT"];
    case "DIRECT_COMMERCE":
      return ["ONE_TIME_PAYMENT", "BUYER_CHECKOUT", "REFUND_SUPPORT", "DISPUTE_SUPPORT"];
    case "DIGITAL_PRODUCT":
      return evidence.hasDistinctSellers
        ? [...MARKETPLACE_REQUIREMENTS]
        : ["ONE_TIME_PAYMENT", "BUYER_CHECKOUT", "REFUND_SUPPORT"];
    case "LEAD_GENERATION":
      return /subscription|invoice|fee/.test(`${evidence.revenueMechanism ?? ""} ${evidence.pricingModel ?? ""}`.toLowerCase())
        ? ["INVOICE_SUPPORT", "ONE_TIME_PAYMENT"]
        : [];
    case "NO_DIRECT_PAYMENT":
      return [];
  }
}

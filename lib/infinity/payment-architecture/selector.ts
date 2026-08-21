import { MARKETPLACE_PAYMENT_CAPABILITY, type PaymentArchitectureKind, type SelectedPaymentArchitecture } from "./constants";
import { classifyPaymentBusinessModel } from "./business-model-classifier";
import { requirementsForBusinessModel } from "./requirements";
import { unresolvedPaymentPolicy } from "./policy";
import type { PaymentArchitectureEvidence, PaymentArchitectureSelection, PaymentProviderCandidate } from "./types";

function kindForModel(
  model: ReturnType<typeof classifyPaymentBusinessModel>,
  evidence: PaymentArchitectureEvidence,
): PaymentArchitectureKind {
  switch (model) {
    case "MARKETPLACE":
      return "MARKETPLACE_MULTI_PARTY";
    case "SERVICE_PLATFORM":
      return evidence.sellersReceivePlatformPayouts === false ? "DIRECT_INVOICING" : "MARKETPLACE_MULTI_PARTY";
    case "SAAS_SUBSCRIPTION":
      return "BILLING_SUBSCRIPTIONS";
    case "USAGE_BASED":
      return "USAGE_BASED_BILLING";
    case "DIRECT_COMMERCE":
      return "DIRECT_PAYMENTS";
    case "DIGITAL_PRODUCT":
      return evidence.hasDistinctSellers ? "MARKETPLACE_MULTI_PARTY" : "DIRECT_PAYMENTS";
    case "LEAD_GENERATION": {
      const text = `${evidence.revenueMechanism ?? ""} ${evidence.pricingModel ?? ""}`.toLowerCase();
      return /subscription|invoice|fee|billing/.test(text) ? "DIRECT_INVOICING" : "NO_CUSTOMER_PAYMENT";
    }
    case "NO_DIRECT_PAYMENT":
      return "NO_CUSTOMER_PAYMENT";
  }
}

function stripeCandidate(
  kind: PaymentArchitectureKind,
  preferred: boolean,
): PaymentProviderCandidate | null {
  switch (kind) {
    case "MARKETPLACE_MULTI_PARTY":
      return {
        providerId: "stripe_connect",
        providerName: "Stripe Connect",
        capability: MARKETPLACE_PAYMENT_CAPABILITY,
        implementation: "STRIPE_CONNECT_MARKETPLACE",
        preferred,
      };
    case "DIRECT_PAYMENTS":
      return {
        providerId: "stripe",
        providerName: "Stripe",
        capability: "DIRECT_PAYMENTS",
        implementation: "DIRECT_STRIPE_PAYMENTS",
        preferred,
      };
    case "BILLING_SUBSCRIPTIONS":
      return {
        providerId: "stripe_billing",
        providerName: "Stripe Billing",
        capability: "RECURRING_BILLING",
        implementation: "STRIPE_BILLING_SUBSCRIPTIONS",
        preferred,
      };
    case "USAGE_BASED_BILLING":
      return {
        providerId: "stripe_usage",
        providerName: "Stripe Billing",
        capability: "USAGE_BILLING",
        implementation: "STRIPE_USAGE_BASED_BILLING",
        preferred,
      };
    default:
      return null;
  }
}

export function selectPaymentArchitecture(
  evidence: PaymentArchitectureEvidence,
  options: { preferStripe?: boolean } = {},
): PaymentArchitectureSelection {
  const preferStripe = options.preferStripe !== false;
  const businessModel = classifyPaymentBusinessModel(evidence);
  const architectureKind = kindForModel(businessModel, evidence);
  const requiredCapabilities = requirementsForBusinessModel(businessModel, evidence);
  const stripe = stripeCandidate(architectureKind, preferStripe);
  const providerCandidates = stripe ? [stripe] : [];
  const selectedArchitecture: SelectedPaymentArchitecture =
    stripe && preferStripe ? stripe.implementation : architectureKind;
  const unresolvedPolicy = unresolvedPaymentPolicy(architectureKind, evidence);
  const connectAccountType = evidence.resolvedPolicy?.connectAccountType ?? "REQUIRES_PLATFORM_POLICY_CHOICE";

  return {
    businessModel,
    architectureKind,
    selectedArchitecture,
    requiredCapabilities,
    providerCandidates,
    connectAccountType,
    unresolvedPolicy,
    liveWriteAuthorityRequired: false,
    testModeRequired: true,
  };
}

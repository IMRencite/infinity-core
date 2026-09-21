import { CRE_VENTURE_ID } from "./constants";
import type { CommercializationReadinessResult, CreCommercializationPlan, FutureAuthorizationReadiness, VentureOperationalRecord } from "./types";

export type CommercializationBlockerContext = {
  namecheapAccountAction?: boolean;
  stripeAccountAction?: boolean;
  stripeIdentityVerified?: boolean;
  namecheapReadsVerified?: boolean;
  cloudflareRegistrarVerified?: boolean;
};

export function orderedCommercializationBlockers(
  record: VentureOperationalRecord,
  extras: CommercializationBlockerContext = {},
): string[] {
  const blockers: string[] = [];
  const namecheapBlocked =
    extras.namecheapAccountAction === true ||
    extras.namecheapReadsVerified === false ||
    /NAMECHEAP_API_USER_BLOCKED|PROVIDER_ACCOUNT_BLOCKED/i.test(record.domain_registration_state);
  const stripeBlocked =
    extras.stripeAccountAction === true ||
    extras.stripeIdentityVerified === false ||
    (extras.stripeIdentityVerified !== true && record.payment_account_binding.kind === "ENV_KEY");
  if (namecheapBlocked) blockers.push("NAMECHEAP_ACCOUNT_ACTION");
  if (stripeBlocked) blockers.push("STRIPE_ACCOUNT_ACTION");
  if (record.primary_domain === "UNCONFIGURED") blockers.push("DOMAIN_PURCHASE");
  if (record.payment_provider === "UNCONFIGURED" || record.payment_products.length === 0) {
    blockers.push("PAYMENT_CONFIGURATION");
  }
  if (
    record.legal_configuration_state !== "LEGAL_CONFIGURATION_COMPLETE" ||
    record.privacy_policy_url === "UNCONFIGURED" ||
    record.terms_of_service_url === "UNCONFIGURED"
  ) {
    blockers.push("LEGAL_CONFIGURATION");
  }
  if (record.primary_domain !== "UNCONFIGURED" && record.dns_state === "UNCONFIGURED") {
    blockers.push("DNS_CONFIGURATION");
  }
  if (record.primary_domain !== "UNCONFIGURED" && (record.ssl_state === "UNCONFIGURED" || record.canonical_url === "UNCONFIGURED")) {
    blockers.push("PRODUCTION_DOMAIN_BINDING");
  }
  if (record.primary_domain !== "UNCONFIGURED" && record.ssl_state === "UNCONFIGURED") {
    blockers.push("SSL_VERIFICATION");
  }
  if (record.checkout_state === "UNCONFIGURED") blockers.push("CHECKOUT_CONFIGURATION");
  if (record.payment_webhooks.kind === "UNCONFIGURED") blockers.push("WEBHOOK_CONFIGURATION");
  if (record.analytics_provider === "UNCONFIGURED") blockers.push("ANALYTICS_CONFIGURATION");
  const paidOfferExists = record.payment_products.length > 0 && record.payment_prices.length > 0;
  if (paidOfferExists && record.fulfillment_state !== "FULFILLMENT_READY") {
    blockers.push("FULFILLMENT_CONFIGURATION");
  }
  if (
    record.payment_provider === "UNCONFIGURED" ||
    record.revenue_state === "UNCONFIGURED" ||
    record.revenue_state === "ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT"
  ) {
    blockers.push("PAYMENT_ACTIVATION");
  }
  if (record.public_launch_state !== "YES") blockers.push("PUBLIC_LAUNCH");
  return blockers;
}

export function evaluateVentureCommercializationReadiness(
  record: VentureOperationalRecord,
  extras: CommercializationBlockerContext = {},
): CommercializationReadinessResult {
  const reasons: string[] = [];
  const orderedBlockers = orderedCommercializationBlockers(record, extras);
  if (orderedBlockers.includes("NAMECHEAP_ACCOUNT_ACTION")) reasons.push("namecheap_account_action_required");
  if (orderedBlockers.includes("STRIPE_ACCOUNT_ACTION")) reasons.push("stripe_account_action_required");
  if (record.primary_domain === "UNCONFIGURED") reasons.push("domain_unconfigured");
  if (record.dns_state === "UNCONFIGURED") reasons.push("dns_unconfigured");
  if (record.ssl_state === "UNCONFIGURED") reasons.push("ssl_unconfigured");
  if (record.privacy_policy_url === "UNCONFIGURED" || record.terms_of_service_url === "UNCONFIGURED") {
    reasons.push("legal_pages_unconfigured");
  }
  if (record.analytics_provider === "UNCONFIGURED") reasons.push("analytics_unconfigured");
  if (record.payment_provider === "UNCONFIGURED") reasons.push("payments_unconfigured");
  if (record.revenue_state === "UNCONFIGURED") reasons.push("revenue_telemetry_unconfigured");
  const domainNeeded = record.primary_domain === "UNCONFIGURED";
  const dnsNeeded = record.primary_domain !== "UNCONFIGURED" && record.dns_state === "UNCONFIGURED";
  const paymentNeeded = record.payment_provider === "UNCONFIGURED";
  const domainSelected = record.domain_history.some((row) => row.event === "SELECTED" || row.event === "PURCHASED");
  const providerAccessBlocked = orderedBlockers.includes("NAMECHEAP_ACCOUNT_ACTION") || orderedBlockers.includes("STRIPE_ACCOUNT_ACTION");
  if (record.public_launch_state === "YES") {
    return { gate: "VentureCommercializationReadinessGate", result: "PRODUCTION_READY", reasons, orderedBlockers };
  }
  if (providerAccessBlocked) {
    return { gate: "VentureCommercializationReadinessGate", result: "MULTIPLE_ACTIONS_REQUIRED", reasons, orderedBlockers };
  }
  if (domainNeeded && paymentNeeded && (domainSelected || record.pricing_state === "HYPOTHESIS_RECONCILED" || record.payment_products.length > 0)) {
    return { gate: "VentureCommercializationReadinessGate", result: "MULTIPLE_ACTIONS_REQUIRED", reasons, orderedBlockers };
  }
  if (domainNeeded) {
    return { gate: "VentureCommercializationReadinessGate", result: "DOMAIN_ACTION_REQUIRED", reasons, orderedBlockers };
  }
  if (dnsNeeded && paymentNeeded) {
    return { gate: "VentureCommercializationReadinessGate", result: "MULTIPLE_ACTIONS_REQUIRED", reasons, orderedBlockers };
  }
  if (dnsNeeded) {
    return { gate: "VentureCommercializationReadinessGate", result: "DNS_ACTION_REQUIRED", reasons, orderedBlockers };
  }
  if (paymentNeeded) {
    return { gate: "VentureCommercializationReadinessGate", result: "PAYMENT_CONFIGURATION_REQUIRED", reasons, orderedBlockers };
  }
  return { gate: "VentureCommercializationReadinessGate", result: "NOT_READY", reasons, orderedBlockers };
}

export function buildCreCommercializationPlan(record: VentureOperationalRecord): CreCommercializationPlan {
  const readiness = evaluateVentureCommercializationReadiness(record);
  return {
    plan: "CRECommercializationPlan",
    executed: false,
    currentReadiness: readiness.result,
    nextDomainRequirement: "Select and authorize a real production domain; do not purchase in this foundation.",
    nextPaymentRequirement: "Verify Stripe capabilities, then separately authorize product/price/checkout configuration.",
    dependencyGraph: [
      { id: "accepted_public_artifact", requirement: "Accepted public artifact", dependsOn: [], authorized: false, executed: false },
      { id: "real_domain", requirement: "Real domain", dependsOn: ["accepted_public_artifact"], authorized: false, executed: false },
      { id: "dns", requirement: "DNS", dependsOn: ["real_domain"], authorized: false, executed: false },
      { id: "ssl", requirement: "SSL", dependsOn: ["dns"], authorized: false, executed: false },
      { id: "production_binding", requirement: "Production deployment binding", dependsOn: ["ssl"], authorized: false, executed: false },
      { id: "legal_urls", requirement: "Legal URLs", dependsOn: ["production_binding"], authorized: false, executed: false },
      { id: "analytics_search", requirement: "Analytics/search integrations", dependsOn: ["production_binding"], authorized: false, executed: false },
      { id: "sender_identity", requirement: "Sender identity", dependsOn: ["real_domain"], authorized: false, executed: false },
      { id: "payment_provider_verification", requirement: "Payment provider verification", dependsOn: ["legal_urls"], authorized: false, executed: false },
      { id: "payment_configuration", requirement: "Payment configuration", dependsOn: ["payment_provider_verification"], authorized: false, executed: false },
      { id: "checkout", requirement: "Checkout", dependsOn: ["payment_configuration"], authorized: false, executed: false },
      { id: "revenue_telemetry", requirement: "Revenue telemetry", dependsOn: ["checkout"], authorized: false, executed: false },
    ],
  };
}

export function futureAuthorizationReadiness(): FutureAuthorizationReadiness[] {
  void CRE_VENTURE_ID;
  return [
    { authorization: "DOMAIN_ACQUISITION", status: "PLAN_READY", blocker: "DOMAIN_ACQUISITION_AUTHORIZATION_REQUIRED" },
    { authorization: "DNS_CONFIGURATION", status: "BLOCKED", blocker: "DOMAIN_ACQUISITION_AUTHORIZATION_REQUIRED" },
    { authorization: "PRODUCTION_DOMAIN_BINDING", status: "BLOCKED", blocker: "DNS_CONFIGURATION_AUTHORIZATION_REQUIRED" },
    { authorization: "PAYMENT_CONFIGURATION", status: "PLAN_READY", blocker: "PAYMENT_CONFIGURATION_AUTHORIZATION_REQUIRED" },
    { authorization: "PAYMENT_ACTIVATION", status: "BLOCKED", blocker: "PAYMENT_CONFIGURATION_AUTHORIZATION_REQUIRED" },
    { authorization: "PUBLIC_LAUNCH", status: "BLOCKED", blocker: "PUBLIC_LAUNCH_AUTHORIZATION_REQUIRED" },
  ];
}

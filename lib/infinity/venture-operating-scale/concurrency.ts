import type { MissionConcurrencyDecision } from "./types";

export type ConcurrentMissionKind =
  | "INBOUND_OBSERVER"
  | "COMMERCIALIZATION_FOUNDATION"
  | "PERFORMANCE_INGESTION"
  | "CONTENT_GENERATION"
  | "RESEARCH"
  | "PROVIDER_VERIFICATION"
  | "DOMAIN_ACQUISITION"
  | "DOMAIN_REGISTRATION_WRITE"
  | "STRIPE_CAPABILITY_VERIFICATION"
  | "STRIPE_OBJECT_CREATE"
  | "LEGAL_RECONCILIATION"
  | "DEPLOYMENT_MUTATION"
  | "DNS_MUTATION"
  | "PAYMENT_CONFIGURATION_WRITE"
  | "OUTREACH_COHORT"
  | "PROVIDER_ACCESS_REPAIR"
  | "SECOND_VENTURE_BUILD";

export function evaluateMissionConcurrencyGate(input: {
  proposed: ConcurrentMissionKind;
  active: ConcurrentMissionKind[];
  sameActiveArtifact?: boolean;
  sameOutreachCohort?: boolean;
}): MissionConcurrencyDecision {
  const active = new Set(input.active);
  if (input.proposed === "DEPLOYMENT_MUTATION" && active.has("DEPLOYMENT_MUTATION") && input.sameActiveArtifact) {
    return { gate: "MissionConcurrencyGate", outcome: "BLOCKED", reason: "CONFLICTING_DEPLOYMENT_MUTATION" };
  }
  if (input.proposed === "DNS_MUTATION" && active.has("DNS_MUTATION")) {
    return { gate: "MissionConcurrencyGate", outcome: "BLOCKED", reason: "CONFLICTING_DNS_MUTATION" };
  }
  if (input.proposed === "PAYMENT_CONFIGURATION_WRITE" && active.has("PAYMENT_CONFIGURATION_WRITE")) {
    return { gate: "MissionConcurrencyGate", outcome: "BLOCKED", reason: "CONFLICTING_PAYMENT_WRITE" };
  }
  if (input.proposed === "STRIPE_OBJECT_CREATE" && active.has("STRIPE_OBJECT_CREATE")) {
    return { gate: "MissionConcurrencyGate", outcome: "BLOCKED", reason: "DUPLICATE_STRIPE_OBJECT_CREATION" };
  }
  if (input.proposed === "DOMAIN_REGISTRATION_WRITE" && active.has("DOMAIN_REGISTRATION_WRITE")) {
    return { gate: "MissionConcurrencyGate", outcome: "BLOCKED", reason: "DUPLICATE_DOMAIN_PURCHASE" };
  }
  if (input.proposed === "OUTREACH_COHORT" && active.has("OUTREACH_COHORT") && input.sameOutreachCohort) {
    return { gate: "MissionConcurrencyGate", outcome: "BLOCKED", reason: "DUPLICATE_OUTREACH_COHORT" };
  }
  return { gate: "MissionConcurrencyGate", outcome: "ALLOWED", reason: "NO_STATE_OR_AUTHORITY_CONFLICT" };
}

export function evaluateParallelCreCommercializationConcurrency(): {
  gate: "MissionConcurrencyGate";
  outcome: "PASS" | "FAIL";
  observerPlusDomain: MissionConcurrencyDecision;
  observerPlusStripe: MissionConcurrencyDecision;
  domainPlusStripeVerify: MissionConcurrencyDecision;
  conflictingDomainPurchase: MissionConcurrencyDecision;
  conflictingDns: MissionConcurrencyDecision;
  conflictingPaymentWrite: MissionConcurrencyDecision;
} {
  const observerPlusDomain = evaluateMissionConcurrencyGate({
    proposed: "DOMAIN_ACQUISITION",
    active: ["INBOUND_OBSERVER"],
  });
  const observerPlusStripe = evaluateMissionConcurrencyGate({
    proposed: "STRIPE_CAPABILITY_VERIFICATION",
    active: ["INBOUND_OBSERVER"],
  });
  const domainPlusStripeVerify = evaluateMissionConcurrencyGate({
    proposed: "STRIPE_CAPABILITY_VERIFICATION",
    active: ["INBOUND_OBSERVER", "DOMAIN_ACQUISITION"],
  });
  const conflictingDomainPurchase = evaluateMissionConcurrencyGate({
    proposed: "DOMAIN_REGISTRATION_WRITE",
    active: ["DOMAIN_REGISTRATION_WRITE"],
  });
  const conflictingDns = evaluateMissionConcurrencyGate({
    proposed: "DNS_MUTATION",
    active: ["DNS_MUTATION"],
  });
  const conflictingPaymentWrite = evaluateMissionConcurrencyGate({
    proposed: "PAYMENT_CONFIGURATION_WRITE",
    active: ["PAYMENT_CONFIGURATION_WRITE"],
  });
  const allowed =
    observerPlusDomain.outcome === "ALLOWED" &&
    observerPlusStripe.outcome === "ALLOWED" &&
    domainPlusStripeVerify.outcome === "ALLOWED" &&
    conflictingDomainPurchase.outcome === "BLOCKED" &&
    conflictingDns.outcome === "BLOCKED" &&
    conflictingPaymentWrite.outcome === "BLOCKED";
  return {
    gate: "MissionConcurrencyGate",
    outcome: allowed ? "PASS" : "FAIL",
    observerPlusDomain,
    observerPlusStripe,
    domainPlusStripeVerify,
    conflictingDomainPurchase,
    conflictingDns,
    conflictingPaymentWrite,
  };
}

export function evaluateProviderAccessRepairConcurrency(): {
  gate: "MissionConcurrencyGate";
  outcome: "PASS" | "FAIL";
  observerPlusRepair: MissionConcurrencyDecision;
  namecheapPlusStripeRead: MissionConcurrencyDecision;
  legalPlusReads: MissionConcurrencyDecision;
  conflictingStripeCreate: MissionConcurrencyDecision;
  conflictingDomainPurchase: MissionConcurrencyDecision;
  conflictingDns: MissionConcurrencyDecision;
  conflictingPaymentWrite: MissionConcurrencyDecision;
} {
  const observerPlusRepair = evaluateMissionConcurrencyGate({
    proposed: "PROVIDER_ACCESS_REPAIR",
    active: ["INBOUND_OBSERVER"],
  });
  const namecheapPlusStripeRead = evaluateMissionConcurrencyGate({
    proposed: "STRIPE_CAPABILITY_VERIFICATION",
    active: ["INBOUND_OBSERVER", "PROVIDER_VERIFICATION"],
  });
  const legalPlusReads = evaluateMissionConcurrencyGate({
    proposed: "LEGAL_RECONCILIATION",
    active: ["INBOUND_OBSERVER", "PROVIDER_VERIFICATION", "STRIPE_CAPABILITY_VERIFICATION"],
  });
  const conflictingStripeCreate = evaluateMissionConcurrencyGate({
    proposed: "STRIPE_OBJECT_CREATE",
    active: ["STRIPE_OBJECT_CREATE"],
  });
  const conflictingDomainPurchase = evaluateMissionConcurrencyGate({
    proposed: "DOMAIN_REGISTRATION_WRITE",
    active: ["DOMAIN_REGISTRATION_WRITE"],
  });
  const conflictingDns = evaluateMissionConcurrencyGate({
    proposed: "DNS_MUTATION",
    active: ["DNS_MUTATION"],
  });
  const conflictingPaymentWrite = evaluateMissionConcurrencyGate({
    proposed: "PAYMENT_CONFIGURATION_WRITE",
    active: ["PAYMENT_CONFIGURATION_WRITE"],
  });
  const allowed =
    observerPlusRepair.outcome === "ALLOWED" &&
    namecheapPlusStripeRead.outcome === "ALLOWED" &&
    legalPlusReads.outcome === "ALLOWED" &&
    conflictingStripeCreate.outcome === "BLOCKED" &&
    conflictingDomainPurchase.outcome === "BLOCKED" &&
    conflictingDns.outcome === "BLOCKED" &&
    conflictingPaymentWrite.outcome === "BLOCKED";
  return {
    gate: "MissionConcurrencyGate",
    outcome: allowed ? "PASS" : "FAIL",
    observerPlusRepair,
    namecheapPlusStripeRead,
    legalPlusReads,
    conflictingStripeCreate,
    conflictingDomainPurchase,
    conflictingDns,
    conflictingPaymentWrite,
  };
}

export function evaluateDomainProviderAndStripeConfigurationConcurrency(): {
  gate: "MissionConcurrencyGate";
  outcome: "PASS" | "FAIL";
  observerPlusDomainVerify: MissionConcurrencyDecision;
  observerPlusStripeConfig: MissionConcurrencyDecision;
  domainPlusStripe: MissionConcurrencyDecision;
  legalPlusBoth: MissionConcurrencyDecision;
  conflictingStripeCreate: MissionConcurrencyDecision;
  conflictingDomainPurchase: MissionConcurrencyDecision;
  conflictingDns: MissionConcurrencyDecision;
  conflictingPaymentWrite: MissionConcurrencyDecision;
} {
  const observerPlusDomainVerify = evaluateMissionConcurrencyGate({
    proposed: "PROVIDER_VERIFICATION",
    active: ["INBOUND_OBSERVER"],
  });
  const observerPlusStripeConfig = evaluateMissionConcurrencyGate({
    proposed: "STRIPE_CAPABILITY_VERIFICATION",
    active: ["INBOUND_OBSERVER"],
  });
  const domainPlusStripe = evaluateMissionConcurrencyGate({
    proposed: "STRIPE_CAPABILITY_VERIFICATION",
    active: ["INBOUND_OBSERVER", "PROVIDER_VERIFICATION"],
  });
  const legalPlusBoth = evaluateMissionConcurrencyGate({
    proposed: "LEGAL_RECONCILIATION",
    active: ["INBOUND_OBSERVER", "PROVIDER_VERIFICATION", "STRIPE_CAPABILITY_VERIFICATION"],
  });
  const conflictingStripeCreate = evaluateMissionConcurrencyGate({
    proposed: "STRIPE_OBJECT_CREATE",
    active: ["STRIPE_OBJECT_CREATE"],
  });
  const conflictingDomainPurchase = evaluateMissionConcurrencyGate({
    proposed: "DOMAIN_REGISTRATION_WRITE",
    active: ["DOMAIN_REGISTRATION_WRITE"],
  });
  const conflictingDns = evaluateMissionConcurrencyGate({
    proposed: "DNS_MUTATION",
    active: ["DNS_MUTATION"],
  });
  const conflictingPaymentWrite = evaluateMissionConcurrencyGate({
    proposed: "PAYMENT_CONFIGURATION_WRITE",
    active: ["PAYMENT_CONFIGURATION_WRITE"],
  });
  const allowed =
    observerPlusDomainVerify.outcome === "ALLOWED" &&
    observerPlusStripeConfig.outcome === "ALLOWED" &&
    domainPlusStripe.outcome === "ALLOWED" &&
    legalPlusBoth.outcome === "ALLOWED" &&
    conflictingStripeCreate.outcome === "BLOCKED" &&
    conflictingDomainPurchase.outcome === "BLOCKED" &&
    conflictingDns.outcome === "BLOCKED" &&
    conflictingPaymentWrite.outcome === "BLOCKED";
  return {
    gate: "MissionConcurrencyGate",
    outcome: allowed ? "PASS" : "FAIL",
    observerPlusDomainVerify,
    observerPlusStripeConfig,
    domainPlusStripe,
    legalPlusBoth,
    conflictingStripeCreate,
    conflictingDomainPurchase,
    conflictingDns,
    conflictingPaymentWrite,
  };
}

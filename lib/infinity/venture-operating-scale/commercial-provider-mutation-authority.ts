export const COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION =
  "commercial_provider_mutation_authority_v1" as const;

export const PROVIDER_MUTATION_DECISIONS = [
  "ALLOW_AUTONOMOUS",
  "REQUIRE_AUTHORIZATION",
  "ESCALATE",
  "BLOCK",
] as const;
export type ProviderMutationDecision = (typeof PROVIDER_MUTATION_DECISIONS)[number];

export const PROVIDER_MUTATION_CLASSES = [
  "DOMAIN_REGISTRATION",
  "DNS_RECORD_CREATE",
  "DNS_RECORD_UPDATE",
  "DNS_RECORD_DELETE",
  "ZONE_CREATE",
  "DOMAIN_BINDING_CREATE",
  "DOMAIN_BINDING_UPDATE",
  "SSL_PROVISION",
  "STRIPE_PRODUCT_CREATE",
  "STRIPE_PRICE_CREATE",
  "STRIPE_WEBHOOK_CREATE",
  "STRIPE_WEBHOOK_UPDATE",
  "CHECKOUT_CONFIGURATION",
  "ANALYTICS_CONFIGURATION",
  "SEARCH_VERIFICATION_CONFIGURATION",
  "PAYMENT_ACTIVATION",
  "PRICE_CHANGE",
  "SUBSCRIPTION_PLAN_CHANGE",
  "MATERIAL_OFFER_CHANGE",
  "PROVIDER_PLAN_PURCHASE",
  "PROVIDER_PLAN_UPGRADE",
  "PROVIDER_RESOURCE_DELETE",
  "LEGAL_CONFIGURATION_CHANGE",
  "PUBLIC_LAUNCH",
  "DOMAIN_REMOVAL",
  "WEBHOOK_DELETE",
  "PRICE_ARCHIVE",
  "CUSTOMER_CHECKOUT_EXECUTION",
  "CUSTOMER_SUBSCRIPTION_RENEWAL",
  "CUSTOMER_PAYMENT_WEBHOOK",
] as const;
export type ProviderMutationClass = (typeof PROVIDER_MUTATION_CLASSES)[number];

export const ROUTINE_AUTONOMOUS_MUTATION_CLASSES = [
  "DNS_RECORD_CREATE",
  "DNS_RECORD_UPDATE",
  "ZONE_CREATE",
  "DOMAIN_BINDING_CREATE",
  "DOMAIN_BINDING_UPDATE",
  "SSL_PROVISION",
  "STRIPE_PRODUCT_CREATE",
  "STRIPE_PRICE_CREATE",
  "STRIPE_WEBHOOK_CREATE",
  "STRIPE_WEBHOOK_UPDATE",
  "CHECKOUT_CONFIGURATION",
  "ANALYTICS_CONFIGURATION",
] as const;
export type RoutineAutonomousMutationClass = (typeof ROUTINE_AUTONOMOUS_MUTATION_CLASSES)[number];

export const DESTRUCTIVE_MUTATION_CLASSES = [
  "DNS_RECORD_DELETE",
  "PROVIDER_RESOURCE_DELETE",
  "DOMAIN_REMOVAL",
  "WEBHOOK_DELETE",
  "PRICE_ARCHIVE",
] as const;

export const MATERIAL_ECONOMIC_MUTATION_CLASSES = [
  "PRICE_CHANGE",
  "SUBSCRIPTION_PLAN_CHANGE",
  "MATERIAL_OFFER_CHANGE",
] as const;

export const CUSTOMER_PAYMENT_RUNTIME_CLASSES = [
  "CUSTOMER_CHECKOUT_EXECUTION",
  "CUSTOMER_SUBSCRIPTION_RENEWAL",
  "CUSTOMER_PAYMENT_WEBHOOK",
] as const;

export const RISK_CLASSES = [
  "ROUTINE",
  "FINANCIAL",
  "MATERIAL_ECONOMIC",
  "DESTRUCTIVE",
  "LEGAL_IDENTITY",
  "PAYMENT_ACTIVATION",
  "PUBLIC_LAUNCH",
  "CUSTOMER_PAYMENT_RUNTIME",
  "IDENTITY_UNCERTAIN",
] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];

export const AUTHORITY_STATUSES = ["ACTIVE", "EXPIRED", "DISABLED"] as const;
export type AuthorityStatus = (typeof AUTHORITY_STATUSES)[number];

export const REVERSIBILITY_STATES = ["REVERSIBLE", "DETERMINISTIC_ROLLBACK", "IRREVERSIBLE", "UNKNOWN"] as const;
export type Reversibility = (typeof REVERSIBILITY_STATES)[number];

export const PROVIDER_MUTATION_POLICY_STATES = [
  "AUTONOMOUS_WITHIN_POLICY",
  "FOUNDER_APPROVAL_REQUIRED",
  "DISABLED",
] as const;
export type ProviderMutationPolicyState = (typeof PROVIDER_MUTATION_POLICY_STATES)[number];

export type FinancialExposure =
  | { kind: "NONE" }
  | { kind: "KNOWN"; amountUsd: number }
  | { kind: "UNKNOWN_MATERIAL" }
  | { kind: "UNKNOWN_IMMATERIAL" };

export type CommercialProviderMutationAuthority = {
  authority_id: string;
  scope: string;
  venture_scope: string;
  provider_scope: string;
  resource_scope: string;
  mutation_class: ProviderMutationClass;
  risk_class: RiskClass;
  financial_exposure: FinancialExposure["kind"];
  reversibility: Reversibility;
  requires_provider_identity: boolean;
  requires_canonical_plan: boolean;
  requires_duplicate_protection: boolean;
  requires_readback: boolean;
  requires_traceability: boolean;
  requires_eag: boolean;
  requires_treasury: boolean;
  requires_founder_approval: boolean;
  effective_from: string;
  expires_at: string | null;
  status: AuthorityStatus;
  evidence: string[];
  policy_version: typeof COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION;
};

export type PaymentActivationPolicyState =
  | "FOUNDER_APPROVAL_REQUIRED"
  | "AUTONOMOUS_WITHIN_POLICY"
  | "DISABLED";

export type ProviderMutationProposal = {
  mutationClass: string;
  venture: string;
  provider: string;
  resource: string;
  providerAccountId?: string | null;
  expectedProviderAccountId?: string | null;
  providerIdentityVerified?: boolean;
  providerAccountKnown?: boolean;
  credentialScopeClear?: boolean;
  resourceOwnershipClear?: boolean;
  ventureOwnershipVerified?: boolean;
  canonicalPlanExists?: boolean;
  mutationBounded?: boolean;
  duplicateProtected?: boolean;
  duplicateAmbiguous?: boolean;
  readbackAvailable?: boolean;
  traceabilityEnabled?: boolean;
  riskKnown?: boolean;
  policyException?: boolean;
  legalIdentityClear?: boolean;
  legalIdentityMutation?: boolean;
  accountMatch?: boolean;
  destructive?: boolean;
  temporaryResource?: boolean;
  deterministicRollback?: boolean;
  productionCustomerImpact?: boolean;
  explicitDestructiveGrant?: boolean;
  financialExposure?: FinancialExposure;
  domainSpendCeilingUsd?: number | null;
  recurringSpendCeilingUsd?: number | null;
  approvedRegistrar?: boolean;
  availabilityEvidence?: boolean;
  pricingEvidence?: boolean;
  premiumDomain?: boolean;
  premiumDomainPermitted?: boolean;
  treasuryPass?: boolean;
  eagPass?: boolean;
  budgetExists?: boolean;
  planEconomicsMatch?: boolean;
  withinApprovedEconomicBounds?: boolean;
  economicsEvaluated?: boolean;
  commercialImpactAssessed?: boolean;
  paymentActivated?: boolean;
  paymentActivationPolicy?: PaymentActivationPolicyState;
  paymentActivationGatesPass?: boolean;
  founderAuthorizationGranted?: boolean;
  canonicalPriceBound?: boolean;
  providerVerified?: boolean;
  fraudControlsPresent?: boolean;
  idempotent?: boolean;
  eventVerified?: boolean;
  authorityStatus?: AuthorityStatus;
  expiresAt?: string | null;
  now?: string;
  matchedAuthority?: CommercialProviderMutationAuthority | null;
  policyConflict?: boolean;
};

export type ProviderMutationDecisionResult = {
  decision: ProviderMutationDecision;
  mutationClass: string;
  venture: string;
  provider: string;
  resource: string;
  risk: RiskClass;
  financialExposure: FinancialExposure;
  authoritySource: string;
  policyVersion: typeof COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION;
  evidence: string[];
  reason: string;
  traceId: string;
  founderActionRequired: boolean;
};

function isMutationClass(value: string): value is ProviderMutationClass {
  return (PROVIDER_MUTATION_CLASSES as readonly string[]).includes(value);
}

function isRoutineClass(value: string): value is RoutineAutonomousMutationClass {
  return (ROUTINE_AUTONOMOUS_MUTATION_CLASSES as readonly string[]).includes(value);
}

function isDestructiveClass(value: string): boolean {
  return (DESTRUCTIVE_MUTATION_CLASSES as readonly string[]).includes(value);
}

function isMaterialEconomicClass(value: string): boolean {
  return (MATERIAL_ECONOMIC_MUTATION_CLASSES as readonly string[]).includes(value);
}

function isCustomerRuntimeClass(value: string): boolean {
  return (CUSTOMER_PAYMENT_RUNTIME_CLASSES as readonly string[]).includes(value);
}

export function classifyProviderMutationRisk(mutationClass: string): RiskClass {
  if (mutationClass === "PAYMENT_ACTIVATION") return "PAYMENT_ACTIVATION";
  if (mutationClass === "PUBLIC_LAUNCH") return "PUBLIC_LAUNCH";
  if (mutationClass === "LEGAL_CONFIGURATION_CHANGE") return "LEGAL_IDENTITY";
  if (isDestructiveClass(mutationClass)) return "DESTRUCTIVE";
  if (isMaterialEconomicClass(mutationClass)) return "MATERIAL_ECONOMIC";
  if (
    mutationClass === "DOMAIN_REGISTRATION" ||
    mutationClass === "PROVIDER_PLAN_PURCHASE" ||
    mutationClass === "PROVIDER_PLAN_UPGRADE"
  ) {
    return "FINANCIAL";
  }
  if (isCustomerRuntimeClass(mutationClass)) return "CUSTOMER_PAYMENT_RUNTIME";
  if (isRoutineClass(mutationClass) || mutationClass === "SEARCH_VERIFICATION_CONFIGURATION") return "ROUTINE";
  return "IDENTITY_UNCERTAIN";
}

export function unknownCostIsNotZero(exposure: FinancialExposure | undefined): boolean {
  if (!exposure) return true;
  if (exposure.kind === "UNKNOWN_MATERIAL" || exposure.kind === "UNKNOWN_IMMATERIAL") return true;
  return exposure.kind !== "NONE" ? exposure.amountUsd !== 0 || exposure.amountUsd === 0 : true;
}

function exposure(proposal: ProviderMutationProposal): FinancialExposure {
  return proposal.financialExposure ?? { kind: "NONE" };
}

function authorityExpired(proposal: ProviderMutationProposal): boolean {
  if (proposal.authorityStatus === "EXPIRED" || proposal.authorityStatus === "DISABLED") return true;
  const matched = proposal.matchedAuthority;
  if (matched && (matched.status === "EXPIRED" || matched.status === "DISABLED")) return true;
  const expiresAt = proposal.expiresAt ?? matched?.expires_at ?? null;
  if (!expiresAt) return false;
  const now = Date.parse(proposal.now ?? new Date().toISOString());
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(now) && Number.isFinite(expiry) && now >= expiry;
}

function identityUncertain(proposal: ProviderMutationProposal): boolean {
  if (proposal.providerIdentityVerified === false) return true;
  if (proposal.providerAccountKnown === false) return true;
  if (proposal.credentialScopeClear === false) return true;
  if (proposal.resourceOwnershipClear === false) return true;
  if (proposal.accountMatch === false) return true;
  if (
    proposal.providerAccountId &&
    proposal.expectedProviderAccountId &&
    proposal.providerAccountId !== proposal.expectedProviderAccountId
  ) {
    return true;
  }
  return false;
}

function decide(
  proposal: ProviderMutationProposal,
  decision: ProviderMutationDecision,
  reason: string,
  evidence: string[],
  authoritySource: string,
): ProviderMutationDecisionResult {
  const financialExposure = exposure(proposal);
  return {
    decision,
    mutationClass: proposal.mutationClass,
    venture: proposal.venture,
    provider: proposal.provider,
    resource: proposal.resource,
    risk: classifyProviderMutationRisk(proposal.mutationClass),
    financialExposure,
    authoritySource,
    policyVersion: COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION,
    evidence,
    reason,
    traceId: `cpm_${proposal.venture}_${proposal.mutationClass}_${proposal.resource}`.replace(/[^A-Za-z0-9_.:-]/g, "_"),
    founderActionRequired: decision === "REQUIRE_AUTHORIZATION" || decision === "ESCALATE",
  };
}

function routineGatesPass(proposal: ProviderMutationProposal): string | null {
  if (proposal.providerIdentityVerified !== true) return "provider_identity_unverified";
  if (proposal.ventureOwnershipVerified !== true) return "venture_ownership_unverified";
  if (proposal.canonicalPlanExists !== true) return "missing_canonical_plan";
  if (proposal.mutationBounded !== true) return "mutation_unbounded";
  if (proposal.duplicateAmbiguous === true) return "duplicate_ambiguity";
  if (proposal.duplicateProtected !== true) return "duplicate_protection_missing";
  if (proposal.readbackAvailable !== true) return "missing_readback";
  if (proposal.traceabilityEnabled !== true) return "missing_traceability";
  if (proposal.riskKnown !== true) return "unknown_risk";
  if (proposal.legalIdentityClear !== true) return "legal_identity_uncertainty";
  if (proposal.accountMatch !== true) return "account_mismatch";
  if (proposal.policyException === true) return "policy_exception";
  if (proposal.destructive === true) return "destructive_mutation";
  const cost = exposure(proposal);
  if (cost.kind === "UNKNOWN_MATERIAL") return "unknown_material_cost";
  if (cost.kind === "KNOWN" && !Number.isFinite(cost.amountUsd)) return "unknown_material_cost";
  return null;
}

export function evaluateCommercialProviderMutation(
  proposal: ProviderMutationProposal,
): ProviderMutationDecisionResult {
  const source = proposal.matchedAuthority
    ? proposal.matchedAuthority.authority_id
    : COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION;

  if (!isMutationClass(proposal.mutationClass)) {
    return decide(proposal, "BLOCK", "unsupported_mutation_class", ["unsupported_mutation_class"], source);
  }
  if (proposal.policyConflict === true) {
    return decide(proposal, "BLOCK", "policy_conflict", ["policy_conflict"], source);
  }
  if (authorityExpired(proposal)) {
    return decide(proposal, "BLOCK", "expired_authority", ["expired_or_disabled_authority"], source);
  }
  if (identityUncertain(proposal)) {
    return decide(
      proposal,
      "BLOCK",
      "provider_identity_uncertain",
      ["provider_identity_mismatch_or_unknown"],
      source,
    );
  }
  if (proposal.traceabilityEnabled === false) {
    return decide(proposal, "BLOCK", "missing_traceability", ["missing_traceability"], source);
  }
  if (proposal.legalIdentityClear === false) {
    return decide(proposal, "BLOCK", "legal_identity_uncertainty", ["legal_identity_uncertainty"], source);
  }
  if (proposal.canonicalPlanExists === false) {
    return decide(proposal, "BLOCK", "missing_canonical_plan", ["missing_canonical_plan"], source);
  }
  if (proposal.duplicateAmbiguous === true) {
    return decide(proposal, "BLOCK", "duplicate_ambiguity", ["duplicate_ambiguity"], source);
  }
  if (proposal.readbackAvailable === false && proposal.mutationClass !== "PUBLIC_LAUNCH") {
    return decide(proposal, "BLOCK", "missing_readback", ["missing_readback"], source);
  }
  const cost = exposure(proposal);
  if (cost.kind === "UNKNOWN_MATERIAL") {
    return decide(proposal, "BLOCK", "unknown_material_cost_is_not_zero", ["unknown_cost_not_zero"], source);
  }

  if (proposal.mutationClass === "LEGAL_CONFIGURATION_CHANGE" || proposal.legalIdentityMutation === true) {
    return decide(
      proposal,
      "REQUIRE_AUTHORIZATION",
      "legal_identity_requires_human_confirmation",
      ["founder_or_authorized_human_confirmation_required"],
      source,
    );
  }

  if (proposal.mutationClass === "PUBLIC_LAUNCH") {
    return decide(
      proposal,
      "REQUIRE_AUTHORIZATION",
      "public_launch_separate_from_payment_activation",
      ["public_launch_requires_own_readiness"],
      source,
    );
  }

  if (proposal.mutationClass === "PAYMENT_ACTIVATION") {
    const policy = proposal.paymentActivationPolicy ?? "FOUNDER_APPROVAL_REQUIRED";
    if (policy === "DISABLED") {
      return decide(proposal, "BLOCK", "payment_activation_disabled", ["payment_activation_disabled"], source);
    }
    if (proposal.founderAuthorizationGranted === true && proposal.paymentActivationGatesPass === true) {
      return decide(
        proposal,
        "ALLOW_AUTONOMOUS",
        "first_activation_founder_authorized",
        ["founder_approved_for_this_activation"],
        source,
      );
    }
    if (policy === "FOUNDER_APPROVAL_REQUIRED" || proposal.paymentActivated !== true) {
      return decide(
        proposal,
        "REQUIRE_AUTHORIZATION",
        "first_venture_payment_activation_requires_founder_approval",
        ["payment_activation_policy_founder_approval_required"],
        source,
      );
    }
    if (proposal.paymentActivationGatesPass !== true) {
      return decide(
        proposal,
        "REQUIRE_AUTHORIZATION",
        "payment_activation_gates_incomplete",
        ["payment_activation_gates_incomplete"],
        source,
      );
    }
    return decide(
      proposal,
      "ALLOW_AUTONOMOUS",
      "payment_activation_autonomous_within_policy",
      ["durable_activation_policy"],
      source,
    );
  }

  if (isCustomerRuntimeClass(proposal.mutationClass)) {
    if (proposal.paymentActivated !== true) {
      return decide(
        proposal,
        "BLOCK",
        "customer_payment_runtime_requires_activation",
        ["payment_not_activated"],
        source,
      );
    }
    if (
      proposal.canonicalPriceBound !== true ||
      proposal.providerVerified !== true ||
      proposal.idempotent !== true ||
      proposal.traceabilityEnabled !== true ||
      proposal.eventVerified !== true
    ) {
      return decide(
        proposal,
        "BLOCK",
        "customer_payment_runtime_constraints_failed",
        ["post_activation_runtime_constraints"],
        source,
      );
    }
    return decide(
      proposal,
      "ALLOW_AUTONOMOUS",
      "post_activation_customer_payment_runtime",
      ["no_per_customer_founder_approval"],
      source,
    );
  }

  if (proposal.mutationClass === "DOMAIN_REGISTRATION") {
    const ceiling = proposal.domainSpendCeilingUsd ?? null;
    const amount = cost.kind === "KNOWN" ? cost.amountUsd : null;
    if (
      proposal.approvedRegistrar !== true ||
      proposal.availabilityEvidence !== true ||
      proposal.pricingEvidence !== true ||
      proposal.canonicalPlanExists !== true ||
      proposal.providerIdentityVerified !== true ||
      proposal.duplicateProtected !== true
    ) {
      return decide(
        proposal,
        "REQUIRE_AUTHORIZATION",
        "domain_registration_evidence_incomplete",
        ["domain_purchase_gates_incomplete"],
        source,
      );
    }
    if (proposal.premiumDomain === true && proposal.premiumDomainPermitted !== true) {
      return decide(
        proposal,
        "REQUIRE_AUTHORIZATION",
        "premium_domain_not_separately_permitted",
        ["premium_domain"],
        source,
      );
    }
    if (ceiling == null) {
      return decide(
        proposal,
        "REQUIRE_AUTHORIZATION",
        "domain_purchase_without_configured_ceiling",
        ["no_autonomous_domain_spend_ceiling"],
        source,
      );
    }
    if (amount == null || amount > ceiling) {
      return decide(
        proposal,
        "REQUIRE_AUTHORIZATION",
        "domain_purchase_above_configured_ceiling",
        ["amount_exceeds_domain_spend_ceiling"],
        source,
      );
    }
    if (proposal.treasuryPass !== true || proposal.eagPass !== true) {
      return decide(
        proposal,
        "REQUIRE_AUTHORIZATION",
        "domain_purchase_treasury_or_eag_incomplete",
        ["treasury_or_eag_required"],
        source,
      );
    }
    return decide(
      proposal,
      "ALLOW_AUTONOMOUS",
      "domain_purchase_within_configured_ceiling",
      ["founder_configured_ceiling"],
      source,
    );
  }

  if (
    proposal.mutationClass === "PROVIDER_PLAN_PURCHASE" ||
    proposal.mutationClass === "PROVIDER_PLAN_UPGRADE"
  ) {
    const ceiling = proposal.recurringSpendCeilingUsd ?? null;
    const amount = cost.kind === "KNOWN" ? cost.amountUsd : null;
    if (ceiling == null) {
      return decide(
        proposal,
        "ESCALATE",
        "provider_recurring_spend_without_configured_ceiling",
        ["no_recurring_spend_ceiling"],
        source,
      );
    }
    if (amount == null || amount > ceiling) {
      return decide(
        proposal,
        "REQUIRE_AUTHORIZATION",
        "provider_recurring_spend_above_configured_ceiling",
        ["amount_exceeds_recurring_ceiling"],
        source,
      );
    }
    if (
      proposal.budgetExists !== true ||
      proposal.treasuryPass !== true ||
      proposal.eagPass !== true ||
      proposal.providerIdentityVerified !== true ||
      proposal.planEconomicsMatch !== true
    ) {
      return decide(
        proposal,
        "ESCALATE",
        "provider_plan_policy_gates_incomplete",
        ["recurring_spend_gates"],
        source,
      );
    }
    return decide(
      proposal,
      "ALLOW_AUTONOMOUS",
      "provider_recurring_spend_within_configured_ceiling",
      ["founder_configured_recurring_ceiling"],
      source,
    );
  }

  if (isMaterialEconomicClass(proposal.mutationClass)) {
    if (proposal.withinApprovedEconomicBounds !== true) {
      return decide(
        proposal,
        "ESCALATE",
        "material_economic_change_outside_canonical_bounds",
        ["economics_evaluation_required"],
        source,
      );
    }
    if (proposal.economicsEvaluated !== true || proposal.eagPass !== true || proposal.commercialImpactAssessed !== true) {
      return decide(
        proposal,
        "ESCALATE",
        "material_economic_change_missing_evaluation",
        ["decision_engine_and_eag_required"],
        source,
      );
    }
    return decide(
      proposal,
      "REQUIRE_AUTHORIZATION",
      "material_economic_change_requires_explicit_authority",
      ["not_routine_provider_configuration"],
      source,
    );
  }

  if (isDestructiveClass(proposal.mutationClass) || proposal.destructive === true) {
    const boundedAutonomy =
      proposal.temporaryResource === true &&
      proposal.deterministicRollback === true &&
      proposal.productionCustomerImpact === false &&
      proposal.explicitDestructiveGrant === true;
    if (!boundedAutonomy) {
      return decide(
        proposal,
        "ESCALATE",
        "destructive_provider_mutation_requires_stronger_policy",
        ["destructive_default_escalate"],
        source,
      );
    }
    return decide(
      proposal,
      "ALLOW_AUTONOMOUS",
      "bounded_temporary_destructive_mutation",
      ["temporary_deterministic_rollback_no_production_impact"],
      source,
    );
  }

  if (isRoutineClass(proposal.mutationClass)) {
    const failed = routineGatesPass(proposal);
    if (failed) {
      return decide(proposal, "BLOCK", failed, [failed], source);
    }
    return decide(
      proposal,
      "ALLOW_AUTONOMOUS",
      "routine_bounded_provider_mutation",
      ["default_autonomous_authority_policy"],
      source,
    );
  }

  return decide(
    proposal,
    "REQUIRE_AUTHORIZATION",
    "mutation_class_requires_explicit_authority",
    ["no_default_autonomy"],
    source,
  );
}

export function publicLaunchIsSeparateFromPaymentActivation(): true {
  return true;
}

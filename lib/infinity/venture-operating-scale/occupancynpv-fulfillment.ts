import {
  applyRecurringPaymentPolicy,
  applyVerifiedPayment,
  consumeOneTimeEntitlement,
  createFulfillmentStore,
  detectOrphanedPaidCustomers,
  evaluateFulfillmentReadinessGate,
  evaluateOfferFulfillmentConsistencyGate,
  resolveCustomerIdentity,
  upsertCustomerIdentity,
  type CommercialOfferContract,
  type FulfillmentContract,
  type FulfillmentReadinessGateResult,
  type FulfillmentRecoveryPolicy,
  type FulfillmentStore,
  type OfferFulfillmentConsistencyGateResult,
} from "@/lib/infinity/fulfillment";
import {
  occupancynpvCustomerSurfacesAvoidUnlimited,
  OCCUPANCYNPV_CUSTOMER_POLICY_COPY,
  occupancynpvProductionPersistenceState,
  occupancynpvProductProductionVerificationState,
  OCCUPANCYNPV_REFUND_POLICY,
  PROFESSIONAL_CANCELLATION_POLICY,
  PROFESSIONAL_FAILED_PAYMENT_POLICY,
  PROFESSIONAL_USAGE_POLICY,
} from "@/lib/infinity/occupancynpv-product/policy";
import { occupancynpvTermsOfServicePageSource } from "@/lib/infinity/venture-website-architecture/occupancynpv-legal-surface-pages";
import { CRE_VENTURE_ID, OCCUPANCYNPV_STRIPE_ACCOUNT_ID, OCCUPANCYNPV_STRIPE_VENTURE } from "./constants";
import { evaluateOccupancynpvBackendReadiness } from "@/lib/infinity/venture-backend-architecture";
import { evaluatePaidOfferFulfillmentInvariant } from "./fulfillment";
import { occupancynpvPaymentActivationEnabled, OCCUPANCYNPV_FOUNDER_PAYMENT_REACTIVATION_AUTHORIZED } from "./occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched } from "./occupancynpv-public-launch-evidence";
import { evaluateOccupancynpvLaunchMessaging } from "./public-launch-messaging-consistency-gate";
import { OCCUPANCYNPV_CANONICAL_STRIPE_OFFERS } from "./occupancynpv-canonical-stripe-offers";
import { evaluatePaymentPathReadinessGate } from "@/lib/infinity/payment-path/readiness";
import { readOccupancynpvLivePaymentPathVerification } from "@/lib/infinity/payment-path/from-health";

const PROFESSIONAL_PRICE = {
  amount: OCCUPANCYNPV_CANONICAL_STRIPE_OFFERS[0].amount,
  productId: "prod_VDIjmRpY19C9HZ",
  priceId: "price_1UCs7hLdvXKx7R7GF2TPmwGL",
} as const;
const PER_DEAL_PRICE = {
  amount: OCCUPANCYNPV_CANONICAL_STRIPE_OFFERS[1].amount,
  productId: "prod_VDIju0S2lBO9i5",
  priceId: "price_1UCs7iLdvXKx7R7GmikBTGx4",
} as const;

export const OCCUPANCYNPV_SUPPORT_PATH = "infinitemediaresources@gmail.com" as const;

export const OCCUPANCYNPV_PRODUCT_TRUTH = {
  leaseProposalInputs: "BUILT",
  competingProposalSupport: "BUILT",
  rentSteps: "BUILT",
  freeRent: "BUILT",
  occupancyCostInputs: "BUILT",
  npv: "BUILT",
  comparableEconomics: "BUILT",
  sensitivity: "BUILT",
  scenarioComparison: "BUILT",
  dealWorkspacePersistence: "BUILT",
  customerDashboard: "BUILT",
  authenticatedCustomerApplication: "BUILT",
  clientFacingResult: "BUILT",
  shareableUrl: "MISSING",
  downloadExport: "MISSING",
  generatedReport: "MISSING",
  clientFacingDisplay: "BUILT",
  evidence: [
    "lib/infinity/occupancynpv-product/npv.ts",
    "lib/infinity/occupancynpv-product/workspaces.ts",
    "app/occupancynpv/app/page.tsx",
  ],
} as const;

export const OCCUPANCYNPV_PROMISE_INVENTORY = {
  professionalMarketing:
    "Authenticated annual access to the OccupancyNPV lease-comparison workspace while the Professional entitlement remains valid. One authenticated user. Does not include a CRM, lease admin, additional seats, export, or a public share link.",
  perDealMarketing:
    "One DealWorkspace for a single OccupancyNPV lease-comparison analysis. Does not include additional seats, export, or a public share link.",
  sitePositioning: "Paid comparison workspace exists. Live checkout is available for Professional and Per-Deal.",
  paymentCollectedOnSiteAtCopyTime: "Live checkout is available for Professional at $290/year and Per-Deal at $149/deal while payment activation remains YES.",
} as const;

export function occupancynpvProfessionalPromise(): string {
  return "Ongoing authenticated access to the OccupancyNPV lease-comparison workspace, including competing lease inputs, NPV comparison, and discount-rate sensitivity, while one Professional entitlement remains valid. One authenticated user. No additional-seat, export, or public share-link promise.";
}

export function occupancynpvPerDealPromise(): string {
  return "One paid entitlement to create exactly one OccupancyNPV DealWorkspace and run the supported lease-comparison / NPV workflow in that workspace.";
}

export function occupancynpvProfessionalOffer(): CommercialOfferContract {
  const price = PROFESSIONAL_PRICE;
  return {
    offer_id: "PROFESSIONAL",
    venture_id: OCCUPANCYNPV_STRIPE_VENTURE,
    canonical_name: "OccupancyNPV Professional",
    offer_version: "1",
    billing_model: "ANNUAL_RECURRING",
    price_binding: { amount: price.amount, currency: "usd", price_id: price.priceId, product_id: price.productId },
    customer_promise: occupancynpvProfessionalPromise(),
    fulfillment_contract_id: "ffc_occupancynpv_professional_v1",
    entitlement_definition: "Exactly one recurring PROFESSIONAL_ACCESS entitlement for one authenticated seat after verified payment. No numerical DealWorkspace cap while the entitlement remains ACTIVE.",
    fulfillment_trigger: "PAYMENT_CONFIRMED",
    delivery_type: "RECURRING_DIGITAL_ACCESS",
    completion_criteria: "Authenticated application access is granted and verified. Payment confirmation alone is insufficient.",
    customer_access_policy: "Server-side entitlement lookup after canonical identity resolution. Email is not authorization. Access continues while PROFESSIONAL_ACCESS is ACTIVE and through the provider-verified paid-through date.",
    failure_policy: "PAST_DUE_THEN_EXPIRE_AT_PAID_THROUGH",
    cancellation_policy: "Future renewal stops. Access continues through the provider-verified paid-through date. Entitlement expires at that paid-through date. Cancellation does not create a prorated refund.",
    refund_policy_reference: OCCUPANCYNPV_REFUND_POLICY.code,
    status: "BLOCKED",
    evidence: [...OCCUPANCYNPV_PRODUCT_TRUTH.evidence],
    traceability: "occupancynpv_fulfillment_v1",
  };
}

export function occupancynpvPerDealOffer(): CommercialOfferContract {
  const price = PER_DEAL_PRICE;
  return {
    offer_id: "PER_DEAL",
    venture_id: OCCUPANCYNPV_STRIPE_VENTURE,
    canonical_name: "OccupancyNPV Per-Deal",
    offer_version: "1",
    billing_model: "ONE_TIME",
    price_binding: { amount: price.amount, currency: "usd", price_id: price.priceId, product_id: price.productId },
    customer_promise: occupancynpvPerDealPromise(),
    fulfillment_contract_id: "ffc_occupancynpv_per_deal_v1",
    entitlement_definition: "Quantity 1 one-deal workspace entitlement. Viewing or logging in is not consumption. First canonical DealWorkspace allocation is consumption.",
    fulfillment_trigger: "PAYMENT_CONFIRMED",
    delivery_type: "ONE_TIME_WORKSPACE",
    completion_criteria: "One deal workspace is created and the core analysis is available. Payment confirmation alone is insufficient.",
    customer_access_policy: "Server-side entitlement lookup after canonical identity resolution. Email is not authorization. One purchasing customer identity. Quantity 1 ONE_DEAL_WORKSPACE. First successful DealWorkspace allocation consumes the entitlement.",
    failure_policy: "CUSTOMER_SUPPORT_REQUIRED",
    cancellation_policy: "Unused Per-Deal purchases may be refund-eligible within 7 calendar days if no DealWorkspace has been allocated. Allocation consumes the entitlement and ends refund eligibility.",
    refund_policy_reference: OCCUPANCYNPV_REFUND_POLICY.code,
    status: "BLOCKED",
    evidence: [...OCCUPANCYNPV_PRODUCT_TRUTH.evidence],
    traceability: "occupancynpv_fulfillment_v1",
  };
}

export function occupancynpvProfessionalContract(): FulfillmentContract {
  return {
    contract_id: "ffc_occupancynpv_professional_v1",
    venture_id: OCCUPANCYNPV_STRIPE_VENTURE,
    offer_id: "PROFESSIONAL",
    fulfillment_type: "RECURRING_DIGITAL_ACCESS",
    trigger: "PAYMENT_CONFIRMED",
    required_inputs: ["canonical_customer_identity", "verified_subscription_payment", "application_access_route"],
    entitlement_type: "PROFESSIONAL_ACCESS",
    quantity_or_scope: "one_authenticated_seat_no_workspace_numeric_cap",
    delivery_executor: "occupancynpv.product.professional_access",
    delivery_destination: "/occupancynpv/app",
    customer_access_method: "/occupancynpv/app",
    completion_condition: "Authenticated OccupancyNPV application access verified for the entitled customer.",
    verification_method: "ENTITLEMENT_AND_SESSION",
    retry_policy: "AUTOMATIC_RETRY then CUSTOMER_SUPPORT_REQUIRED",
    failure_policy: "PAST_DUE_THEN_EXPIRE_AT_PAID_THROUGH",
    revocation_policy: "Cancellation stops future renewal. Do not immediately revoke already-paid access. Expire at the provider-verified paid-through date.",
    expiration_policy: "Follow the provider-verified paid-through date. No invented grace period. Unreconciled PAST_DUE becomes EXPIRED at paid-through.",
    support_path: OCCUPANCYNPV_SUPPORT_PATH,
    version: "1",
    status: "BLOCKED",
    evidence: ["app/occupancynpv/app/page.tsx", PROFESSIONAL_FAILED_PAYMENT_POLICY.code, PROFESSIONAL_CANCELLATION_POLICY.code],
  };
}

export function occupancynpvPerDealContract(): FulfillmentContract {
  return {
    contract_id: "ffc_occupancynpv_per_deal_v1",
    venture_id: OCCUPANCYNPV_STRIPE_VENTURE,
    offer_id: "PER_DEAL",
    fulfillment_type: "ONE_TIME_WORKSPACE",
    trigger: "PAYMENT_CONFIRMED",
    required_inputs: ["canonical_customer_identity", "verified_one_time_payment", "deal_workspace_resource"],
    entitlement_type: "ONE_DEAL_WORKSPACE",
    quantity_or_scope: "1",
    delivery_executor: "occupancynpv.product.deal_workspace",
    delivery_destination: "/occupancynpv/app",
    customer_access_method: "/occupancynpv/app",
    completion_condition: "One DealWorkspace exists and is isolated to the entitled customer.",
    verification_method: "WORKSPACE_ALLOCATION",
    retry_policy: "DELIVERY_RETRY then CUSTOMER_SUPPORT_REQUIRED",
    failure_policy: "CUSTOMER_SUPPORT_REQUIRED",
    revocation_policy: "Consumed unit is not reusable. Refund eligibility ends on workspace allocation or 7-day window expiration, whichever occurs first.",
    expiration_policy: "Refund window is 7 calendar days while unused. The allocated workspace is not time-limited by this policy.",
    support_path: OCCUPANCYNPV_SUPPORT_PATH,
    version: "1",
    status: "BLOCKED",
    evidence: ["lib/infinity/occupancynpv-product/workspaces.ts", OCCUPANCYNPV_REFUND_POLICY.code],
  };
}

export function occupancynpvRecoveryPolicy(): FulfillmentRecoveryPolicy {
  return {
    policy_id: "frp_occupancynpv_v1",
    venture_id: OCCUPANCYNPV_STRIPE_VENTURE,
    automatic_refund: false,
    outcomes: [
      "AUTOMATIC_RETRY",
      "ENTITLEMENT_REPAIR",
      "DELIVERY_RETRY",
      "CUSTOMER_SUPPORT_REQUIRED",
      "REFUND_REVIEW_REQUIRED",
      "MANUAL_EXCEPTION",
    ],
    support_path: OCCUPANCYNPV_SUPPORT_PATH,
  };
}

export function occupancynpvTermsMatchCommercialPolicy(): {
  termsVsEntitlement: boolean;
  termsVsRefund: boolean;
  noUnlimitedClaim: boolean;
} {
  const terms = occupancynpvTermsOfServicePageSource();
  const surfaces = [
    terms,
    OCCUPANCYNPV_PROMISE_INVENTORY.professionalMarketing,
    OCCUPANCYNPV_PROMISE_INVENTORY.perDealMarketing,
    occupancynpvProfessionalPromise(),
    occupancynpvPerDealPromise(),
  ].join("\n");
  const copy = OCCUPANCYNPV_CUSTOMER_POLICY_COPY;
  return {
    termsVsEntitlement:
      terms.includes(copy.professionalSeat) &&
      terms.toLowerCase().includes(copy.professionalBilling) &&
      terms.includes(copy.perDealWorkspace),
    termsVsRefund:
      terms.includes(copy.professionalInitialRefund) &&
      terms.includes(copy.professionalRenewalRefund) &&
      terms.includes(copy.perDealUnusedRefund) &&
      terms.includes(copy.perDealConsume),
    noUnlimitedClaim: occupancynpvCustomerSurfacesAvoidUnlimited(surfaces),
  };
}

export function evaluateOccupancynpvCommercialPolicyGates() {
  return {
    professionalUsage: PROFESSIONAL_USAGE_POLICY.status,
    failedPayment: PROFESSIONAL_FAILED_PAYMENT_POLICY.status,
    cancellation: PROFESSIONAL_CANCELLATION_POLICY.status,
    refund: OCCUPANCYNPV_REFUND_POLICY.status,
    failureRecovery: "PASS" as const,
    cancellationRevocation: "PASS" as const,
    refundCancellationPolicyConfiguration: "CLEARED" as const,
  };
}

export function evaluateOccupancynpvFulfillmentReadiness(): FulfillmentReadinessGateResult {
  const policy = evaluateFulfillmentReadinessGate({
    canonical_offer_exists: true,
    customer_promise_defined: true,
    fulfillment_contract_exists: true,
    entitlement_semantics_defined: true,
    delivery_executor_exists: true,
    customer_access_path_exists: true,
    completion_criteria_defined: true,
    verification_method_exists: true,
    payment_to_fulfillment_mapping_verified: true,
    duplicate_protection_verified: true,
    failure_recovery_defined: true,
    cancellation_revocation_defined: true,
    support_path_available: true,
    traceability_available: true,
    offer_product_consistency: true,
    deterministic_simulation: true,
  });
  const persistence = occupancynpvProductionPersistenceState();
  const verification = occupancynpvProductProductionVerificationState();
  const backend = evaluateOccupancynpvBackendReadiness();
  const durability: string[] = [];
  if (!persistence.durable) {
    durability.push(persistence.blocker);
  }
  if (!verification.paid_application_deployed || !verification.browser_verified || !verification.tenant_isolation_production_verified) {
    durability.push(verification.blocker);
  }
  if (backend.result !== "PASS") {
    durability.push("VENTURE_BACKEND_READINESS");
  }
  if (durability.length > 0) {
    return {
      gate: "FulfillmentReadinessGate",
      result: "FAIL",
      reasons: [...policy.reasons, ...durability],
      missing: policy.missing,
    };
  }
  return policy;
}

export function evaluateOccupancynpvOfferConsistency(): OfferFulfillmentConsistencyGateResult {
  const terms = occupancynpvTermsMatchCommercialPolicy();
  const base = evaluateOfferFulfillmentConsistencyGate({
    marketingMatchesProduct: true,
    pricingMatchesStripe: true,
    pricingMatchesEntitlement: true,
    marketingMatchesFulfillment: true,
    identityLinkageDefined: true,
    productRouteAvailable: true,
    boundedResourceDefined: true,
  });
  const reasons = [...base.reasons];
  if (!terms.termsVsEntitlement) reasons.push("terms_entitlement_mismatch");
  if (!terms.termsVsRefund) reasons.push("terms_refund_cancellation_mismatch");
  if (!terms.noUnlimitedClaim) reasons.push("unlimited_marketing_claim");
  return {
    gate: "OfferFulfillmentConsistencyGate",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function occupancynpvClearedCommercializationBlockers(): string[] {
  const cleared = [
    "REFUND_CANCELLATION_POLICY_CONFIGURATION",
    "PROFESSIONAL_USAGE_POLICY_REQUIRED",
    "PROFESSIONAL_FAILED_PAYMENT_POLICY_REQUIRED",
  ];
  const persistence = occupancynpvProductionPersistenceState();
  const verification = occupancynpvProductProductionVerificationState();
  if (persistence.durable) cleared.push(persistence.blocker);
  if (verification.paid_application_deployed && verification.browser_verified && verification.tenant_isolation_production_verified) {
    cleared.push(verification.blocker);
  }
  if (evaluateOccupancynpvFulfillmentReadiness().result === "PASS") {
    cleared.push("FULFILLMENT_CONFIGURATION");
  }
  if (occupancynpvPaymentActivationEnabled()) cleared.push("PAYMENT_ACTIVATION");
  if (evaluateOccupancynpvLaunchMessaging().result === "PASS") cleared.push("STALE_VALIDATION_MESSAGING");
  if (occupancynpvPubliclyLaunched()) cleared.push("PUBLIC_LAUNCH");
  return cleared;
}

export function occupancynpvCommercializationBlockers(): string[] {
  const remaining: string[] = occupancynpvPubliclyLaunched() ? [] : ["PUBLIC_LAUNCH"];
  if (evaluateOccupancynpvLaunchMessaging().result === "FAIL") remaining.unshift("STALE_VALIDATION_MESSAGING");
  if (!occupancynpvPaymentActivationEnabled()) remaining.unshift("PAYMENT_ACTIVATION");
  const persistence = occupancynpvProductionPersistenceState();
  const verification = occupancynpvProductProductionVerificationState();
  if (!persistence.durable) remaining.unshift(persistence.blocker);
  if (!verification.paid_application_deployed || !verification.browser_verified) remaining.unshift(verification.blocker);
  if (evaluateOccupancynpvFulfillmentReadiness().result !== "PASS") remaining.unshift("FULFILLMENT_CONFIGURATION");
  return [...new Set(remaining)];
}

export function occupancynpvCheckoutAllowedByFulfillment(): boolean {
  return evaluateOccupancynpvFulfillmentReadiness().result === "PASS";
}

export function occupancynpvFailedPaymentPolicy(): "PAST_DUE_THEN_EXPIRE_AT_PAID_THROUGH" {
  return "PAST_DUE_THEN_EXPIRE_AT_PAID_THROUGH";
}

export function occupancynpvHistoricalActivationStatus(): "BLOCKED_PENDING_FULFILLMENT" {
  return "BLOCKED_PENDING_FULFILLMENT";
}

export function occupancynpvHistoricalActivationAuthorization(): "REAUTHORIZATION_REQUIRED" {
  return "REAUTHORIZATION_REQUIRED";
}

export function occupancynpvRefundCancellationPolicy(): "OCCUPANCYNPV_REFUND_POLICY_V1" {
  return OCCUPANCYNPV_REFUND_POLICY.code;
}

export function evaluateOccupancynpvServerSideCheckoutGate(): {
  consultedCanonicalGate: true;
  fulfillment: FulfillmentReadinessGateResult;
  checkout: "BLOCKED" | "ALLOWABLE";
} {
  const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
  return {
    consultedCanonicalGate: true,
    fulfillment,
    checkout: fulfillment.result === "PASS" ? "ALLOWABLE" : "BLOCKED",
  };
}

export function evaluateOccupancynpvPaymentReadinessReport() {
  const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
  const consistency = evaluateOccupancynpvOfferConsistency();
  const backend = evaluateOccupancynpvBackendReadiness();
  const paymentPath = evaluatePaymentPathReadinessGate(readOccupancynpvLivePaymentPathVerification());
  const blocked = fulfillment.result !== "PASS"
    || consistency.result !== "PASS"
    || backend.result !== "PASS"
    || paymentPath.result !== "PASS";
  return {
    Legal: "PASS" as const,
    Infrastructure: "PASS" as const,
    Stripe: "PASS" as const,
    Products: "PASS" as const,
    Prices: "PASS" as const,
    Checkout: paymentPath.result === "PASS" ? "PASS" as const : "FAIL" as const,
    Webhook: "PASS" as const,
    Analytics: "PASS" as const,
    Fulfillment: fulfillment.result === "PASS" ? "PASS" as const : "FAIL" as const,
    BackendReadinessGate: backend.result,
    OfferConsistency: consistency.result,
    CustomerAccess: "PASS" as const,
    FailureRecovery: "PASS" as const,
    CancellationRevocation: "PASS" as const,
    RefundPolicy: OCCUPANCYNPV_REFUND_POLICY.status,
    Traceability: "PASS" as const,
    FounderReauthorization: OCCUPANCYNPV_FOUNDER_PAYMENT_REACTIVATION_AUTHORIZED ? "PASS" as const : "FAIL" as const,
    PaymentPathReadinessGate: paymentPath.result,
    PaymentPathActivationState: paymentPath.activationState,
    PaymentReadinessGate: blocked ? "BLOCKED" as const : "READY_FOR_ACTIVATION_AUTHORIZATION" as const,
    blockingReasons: [
      ...fulfillment.reasons,
      ...consistency.reasons,
      ...backend.reasons,
      ...paymentPath.reasons,
    ],
    fulfillment,
    consistency,
    backend,
    paymentPath,
  };
}

export function occupancynpvPaymentFulfillmentGuard(input: {
  offerId?: string | null;
  ventureId?: string | null;
  providerAccountId?: string | null;
}): { ok: boolean; reason: string } {
  if (input.offerId !== "PROFESSIONAL" && input.offerId !== "PER_DEAL") {
    return { ok: false, reason: "UNKNOWN_OFFER" };
  }
  if (input.ventureId && input.ventureId !== OCCUPANCYNPV_STRIPE_VENTURE && input.ventureId !== CRE_VENTURE_ID) {
    return { ok: false, reason: "WRONG_VENTURE" };
  }
  if (input.providerAccountId && input.providerAccountId !== OCCUPANCYNPV_STRIPE_ACCOUNT_ID) {
    return { ok: false, reason: "PROVIDER_ACCOUNT_MISMATCH" };
  }
  return { ok: true, reason: "CANONICAL_OFFER" };
}

export const COMMERCIALIZATION_LIFECYCLE = [
  "opportunity",
  "validation",
  "monetization",
  "commercial_offer",
  "venture_specific_fulfillment_contract",
  "venture_backend_contract",
  "product_service_implementation",
  "backend_implementation",
  "payment_configuration",
  "checkout_webhook",
  "fulfillment_validation",
  "payment_activation",
  "public_launch",
  "performance_learning",
] as const;

export function paymentActivationMayPrecedeFulfillmentReadiness(): false {
  return false;
}

export function createOccupancynpvFulfillmentHarness(): FulfillmentStore {
  return createFulfillmentStore();
}

export function occupancynpvApplyVerifiedPaymentFixture(input: {
  store: FulfillmentStore;
  offerId: "PROFESSIONAL" | "PER_DEAL";
  customerIdentityId: string;
  paymentReference: string;
  eventId: string;
  subscriptionReference?: string | null;
  expiresAt?: string | null;
}) {
  upsertCustomerIdentity({
    store: input.store,
    ventureId: OCCUPANCYNPV_STRIPE_VENTURE,
    customerIdentityId: input.customerIdentityId,
    checkoutClientReferenceId: input.customerIdentityId,
  });
  const offer = input.offerId === "PROFESSIONAL" ? occupancynpvProfessionalOffer() : occupancynpvPerDealOffer();
  return applyVerifiedPayment({
    store: input.store,
    ventureId: OCCUPANCYNPV_STRIPE_VENTURE,
    offerId: input.offerId,
    contractId: offer.fulfillment_contract_id,
    paymentReference: input.paymentReference,
    eventId: input.eventId,
    customerIdentityId: input.customerIdentityId,
    subscriptionReference: input.subscriptionReference,
    entitlementType: input.offerId === "PROFESSIONAL" ? "PROFESSIONAL_ACCESS" : "ONE_DEAL_WORKSPACE",
    resourceScope: input.offerId === "PROFESSIONAL" ? "occupancynpv.application" : "occupancynpv.deal_workspace",
    quantity: 1,
    recurring: input.offerId === "PROFESSIONAL",
    expiresAt: input.expiresAt,
    deliveryExecutorReady: false,
  });
}

export {
  applyRecurringPaymentPolicy,
  consumeOneTimeEntitlement,
  detectOrphanedPaidCustomers,
  evaluatePaidOfferFulfillmentInvariant,
  resolveCustomerIdentity,
  CRE_VENTURE_ID,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
};

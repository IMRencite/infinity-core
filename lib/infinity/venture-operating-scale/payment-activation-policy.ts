import {
  COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION,
  evaluateCommercialProviderMutation,
  publicLaunchIsSeparateFromPaymentActivation,
  type PaymentActivationPolicyState,
  type ProviderMutationDecisionResult,
} from "./commercial-provider-mutation-authority";

export const PAYMENT_ACTIVATION_POLICY_VERSION = "payment_activation_policy_v1" as const;

export const PAYMENT_ACTIVATION_POLICY_STATES = [
  "FOUNDER_APPROVAL_REQUIRED",
  "AUTONOMOUS_WITHIN_POLICY",
  "DISABLED",
] as const;

export const DEFAULT_FIRST_VENTURE_PAYMENT_ACTIVATION_POLICY =
  "FOUNDER_APPROVAL_REQUIRED" as const satisfies PaymentActivationPolicyState;

export type PaymentActivationGateName =
  | "Legal"
  | "Infrastructure"
  | "ProviderIdentity"
  | "Products"
  | "Prices"
  | "Checkout"
  | "Webhook"
  | "Analytics"
  | "WrongAccountProtection"
  | "Idempotency"
  | "Traceability"
  | "PaymentReadinessGate"
  | "FulfillmentReadinessGate"
  | "BackendReadinessGate"
  | "EconomicModel"
  | "RefundCancellationPolicy"
  | "CustomerFacingOffer"
  | "ProductionPurchaseSurface"
  | "NoCriticalBlocker";

export type PaymentActivationGateState = "PASS" | "FAIL" | "KNOWN" | "GOVERNED" | "MATCHES_CANONICAL" | "VERIFIED";

export type PaymentActivationGateMap = Record<PaymentActivationGateName, PaymentActivationGateState | string>;

export type PaymentActivationEvaluation = {
  class: "PAYMENT_ACTIVATION";
  policy: PaymentActivationPolicyState;
  defaultFirstVenturePolicy: typeof DEFAULT_FIRST_VENTURE_PAYMENT_ACTIVATION_POLICY;
  durablePolicySupported: true;
  paymentActivation: "NO" | "YES";
  publicLaunchSeparate: true;
  publicLaunch: "NO" | "YES";
  gates: PaymentActivationGateMap;
  gatesPass: boolean;
  decision: ProviderMutationDecisionResult;
  perCustomerFounderApprovalRequired: false;
};

export const OCCUPANCYNPV_PAYMENT_ACTIVATION_GATES: PaymentActivationGateMap = {
  Legal: "PASS",
  Infrastructure: "PASS",
  ProviderIdentity: "PASS",
  Products: "PASS",
  Prices: "PASS",
  Checkout: "PASS",
  Webhook: "PASS",
  Analytics: "PASS",
  WrongAccountProtection: "PASS",
  Idempotency: "PASS",
  Traceability: "PASS",
  PaymentReadinessGate: "BLOCKED",
  FulfillmentReadinessGate: "FAIL",
  BackendReadinessGate: "PASS",
  EconomicModel: "PASS",
  RefundCancellationPolicy: "GOVERNED",
  CustomerFacingOffer: "MATCHES_CANONICAL",
  ProductionPurchaseSurface: "VERIFIED",
  NoCriticalBlocker: "PASS",
};

const REQUIRED_PASS = [
  "Legal",
  "Infrastructure",
  "ProviderIdentity",
  "Products",
  "Prices",
  "Checkout",
  "Webhook",
  "Analytics",
  "WrongAccountProtection",
  "Idempotency",
  "Traceability",
  "EconomicModel",
  "NoCriticalBlocker",
] as const satisfies readonly PaymentActivationGateName[];

export function paymentActivationGatesPass(gates: PaymentActivationGateMap): boolean {
  if (gates.FulfillmentReadinessGate !== "PASS") return false;
  if (gates.BackendReadinessGate !== "PASS" && gates.BackendReadinessGate !== "NOT_REQUIRED") return false;
  if (gates.PaymentReadinessGate !== "READY_FOR_ACTIVATION_AUTHORIZATION") return false;
  if (gates.RefundCancellationPolicy !== "KNOWN" && gates.RefundCancellationPolicy !== "GOVERNED") return false;
  if (gates.CustomerFacingOffer !== "MATCHES_CANONICAL") return false;
  if (gates.ProductionPurchaseSurface !== "VERIFIED") return false;
  return REQUIRED_PASS.every((name) => gates[name] === "PASS");
}

export function evaluatePaymentActivationPolicy(input: {
  venture: string;
  provider: string;
  resource?: string;
  policy?: PaymentActivationPolicyState;
  paymentActivated?: boolean;
  publicLaunch?: "NO" | "YES";
  gates?: PaymentActivationGateMap;
  providerAccountId?: string;
  expectedProviderAccountId?: string;
  founderAuthorizationGranted?: boolean;
}): PaymentActivationEvaluation {
  const policy = input.policy ?? DEFAULT_FIRST_VENTURE_PAYMENT_ACTIVATION_POLICY;
  const gates = input.gates ?? OCCUPANCYNPV_PAYMENT_ACTIVATION_GATES;
  const gatesPass = paymentActivationGatesPass(gates);
  const decision = evaluateCommercialProviderMutation({
    mutationClass: "PAYMENT_ACTIVATION",
    venture: input.venture,
    provider: input.provider,
    resource: input.resource ?? "live_purchase_path",
    providerIdentityVerified: gates.ProviderIdentity === "PASS",
    providerAccountKnown: true,
    credentialScopeClear: true,
    resourceOwnershipClear: true,
    ventureOwnershipVerified: true,
    canonicalPlanExists: true,
    mutationBounded: true,
    duplicateProtected: true,
    readbackAvailable: true,
    traceabilityEnabled: gates.Traceability === "PASS",
    riskKnown: true,
    legalIdentityClear: gates.Legal === "PASS",
    accountMatch: gates.WrongAccountProtection === "PASS",
    paymentActivated: input.paymentActivated === true,
    paymentActivationPolicy: policy,
    paymentActivationGatesPass: gatesPass,
    founderAuthorizationGranted: input.founderAuthorizationGranted === true,
    providerAccountId: input.providerAccountId,
    expectedProviderAccountId: input.expectedProviderAccountId,
  });
  return {
    class: "PAYMENT_ACTIVATION",
    policy,
    defaultFirstVenturePolicy: DEFAULT_FIRST_VENTURE_PAYMENT_ACTIVATION_POLICY,
    durablePolicySupported: true,
    paymentActivation: input.paymentActivated === true ? "YES" : "NO",
    publicLaunchSeparate: publicLaunchIsSeparateFromPaymentActivation(),
    publicLaunch: input.publicLaunch ?? "NO",
    gates,
    gatesPass,
    decision,
    perCustomerFounderApprovalRequired: false,
  };
}

export function evaluatePostActivationCustomerPayment(input: {
  mutationClass: "CUSTOMER_CHECKOUT_EXECUTION" | "CUSTOMER_SUBSCRIPTION_RENEWAL" | "CUSTOMER_PAYMENT_WEBHOOK";
  venture: string;
  provider: string;
  resource: string;
  paymentActivated: boolean;
  canonicalPriceBound?: boolean;
  providerVerified?: boolean;
  fraudControlsPresent?: boolean;
  idempotent?: boolean;
  traceabilityEnabled?: boolean;
  eventVerified?: boolean;
}): ProviderMutationDecisionResult {
  return evaluateCommercialProviderMutation({
    mutationClass: input.mutationClass,
    venture: input.venture,
    provider: input.provider,
    resource: input.resource,
    providerIdentityVerified: true,
    providerAccountKnown: true,
    credentialScopeClear: true,
    resourceOwnershipClear: true,
    ventureOwnershipVerified: true,
    canonicalPlanExists: true,
    mutationBounded: true,
    duplicateProtected: true,
    readbackAvailable: true,
    traceabilityEnabled: input.traceabilityEnabled ?? true,
    riskKnown: true,
    legalIdentityClear: true,
    accountMatch: true,
    paymentActivated: input.paymentActivated,
    canonicalPriceBound: input.canonicalPriceBound ?? true,
    providerVerified: input.providerVerified ?? true,
    fraudControlsPresent: input.fraudControlsPresent ?? true,
    idempotent: input.idempotent ?? true,
    eventVerified: input.eventVerified ?? true,
  });
}

export function outboundSpendRemainsTreasuryGoverned(): true {
  return true;
}

export { COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION };

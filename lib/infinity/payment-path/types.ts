export const COMMERCIAL_CREDENTIAL_CAPABILITY_CONTRACT = "CommercialCredentialCapabilityContract" as const;
export const PAYMENT_PATH_READINESS_GATE = "PaymentPathReadinessGate" as const;
export const PAYMENT_PATH_VERIFICATION_FRESHNESS_GATE = "PaymentPathVerificationFreshnessGate" as const;
export const END_TO_END_MONEY_PATH_CONTRACT = "EndToEndMoneyPathContract" as const;
export const COMMERCIAL_PRODUCTION_READINESS_GATE = "CommercialProductionReadinessGate" as const;
export const LIVE_PAYMENT_PATH_VERIFICATION = "LivePaymentPathVerification" as const;

export type PaymentProviderKind = "stripe" | "paddle" | "paypal" | "app_store" | "merchant" | "other";

export type PaymentActivationState =
  | "CONFIGURED_NOT_VERIFIED"
  | "VERIFICATION_FAILED"
  | "ACTIVE"
  | "DEGRADED"
  | "SUSPENDED"
  | "BLOCKED";

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type CredentialCapability = {
  id: string;
  required: boolean;
  proven: "PASS" | "FAIL" | "UNKNOWN";
};

export type CommercialCredentialCapabilityRecord = {
  contract: typeof COMMERCIAL_CREDENTIAL_CAPABILITY_CONTRACT;
  provider: PaymentProviderKind;
  credentialKind: "RESTRICTED" | "SECRET" | "UNKNOWN";
  preferRestrictedKey: true;
  doNotRequestUnrestrictedKey: true;
  capabilities: CredentialCapability[];
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type PaidOfferPathEvidence = {
  venture: string;
  offerId: string;
  provider: PaymentProviderKind;
  account: string;
  productId: string;
  priceId: string;
  amount: number;
  currency: string;
  billingMode: "subscription" | "payment" | string;
  providerAuth: "PASS" | "FAIL";
  accountPass: "PASS" | "FAIL";
  productPass: "PASS" | "FAIL";
  pricePass: "PASS" | "FAIL";
  amountPass: "PASS" | "FAIL";
  currencyPass: "PASS" | "FAIL";
  billingModePass: "PASS" | "FAIL";
  credentialPermissionPass: "PASS" | "FAIL";
  liveSessionCreate: "PASS" | "FAIL";
  successUrlPass: "PASS" | "FAIL";
  cancelUrlPass: "PASS" | "FAIL";
  customerAccessFlow: "PASS" | "FAIL";
  fulfillmentBinding: "PASS" | "FAIL";
  entitlementBinding: "PASS" | "FAIL";
  errorUx: "PASS" | "FAIL";
  webhookConfigured: "PASS" | "FAIL";
  paymentStatus?: string | null;
  synthetic?: boolean;
};

export type LivePaymentPathVerificationRecord = {
  verification: typeof LIVE_PAYMENT_PATH_VERIFICATION;
  verificationId: string;
  verifiedAt: string;
  qcVersion: "GLOBAL_PAYMENT_PATH_ASSURANCE_V1";
  venture: string;
  provider: PaymentProviderKind;
  account: string;
  fingerprint: string;
  offers: PaidOfferPathEvidence[];
  result: "PASS" | "FAIL";
  reasons: string[];
  realPaymentCompleted: false;
  sessionCreateHasProviderObjectCost: "UNPAID_CHECKOUT_SESSION_MAY_BE_CREATED" | "UNKNOWN";
};

export type EndToEndMoneyPathRecord = {
  contract: typeof END_TO_END_MONEY_PATH_CONTRACT;
  venture: string;
  offerId: string;
  cta: "PASS" | "FAIL";
  customerIdentity: "PASS" | "FAIL";
  serverCheckout: "PASS" | "FAIL";
  providerSessionCreate: "PASS" | "FAIL";
  providerCheckoutSurface: "PASS" | "FAIL";
  webhookArchitecture: "PASS" | "FAIL";
  entitlement: "PASS" | "FAIL";
  fulfillment: "PASS" | "FAIL";
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type CommercialProductionReadinessRecord = NamedGateResult & {
  offer: "PASS" | "FAIL";
  backend: "PASS" | "FAIL";
  security: "PASS" | "FAIL";
  paymentPath: "PASS" | "FAIL";
  webhook: "PASS" | "FAIL";
  fulfillment: "PASS" | "FAIL";
  customerFailureUx: "PASS" | "FAIL";
  legalCommercialTruth: "PASS" | "FAIL";
  improvementIntake?: "PASS" | "FAIL";
};

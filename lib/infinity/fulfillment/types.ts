export const FULFILLMENT_TYPES = [
  "SAAS_ENTITLEMENT",
  "RECURRING_DIGITAL_ACCESS",
  "ONE_TIME_WORKSPACE",
  "USAGE_CREDIT",
  "DIGITAL_DOWNLOAD",
  "GENERATED_REPORT",
  "SERVICE_DELIVERY",
  "APPOINTMENT_ACCESS",
  "LEAD_OR_INTRODUCTION",
  "PHYSICAL_GOOD",
  "EXTERNAL_PROVIDER_DELIVERY",
  "API_OR_DATA_ACCESS",
  "MARKETPLACE_DELIVERY",
  "CUSTOM",
] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const FULFILLMENT_LIFECYCLE_STATES = [
  "OFFER_SELECTED",
  "CHECKOUT_STARTED",
  "PAYMENT_CONFIRMED",
  "FULFILLMENT_ORDER_CREATED",
  "ENTITLEMENT_PENDING",
  "ENTITLEMENT_ACTIVE",
  "DELIVERY_EXECUTING",
  "DELIVERY_VERIFIED",
  "FULFILLMENT_COMPLETE",
  "FULFILLMENT_FAILED",
  "RECOVERY_PENDING",
  "ENTITLEMENT_SUSPENDED",
  "ENTITLEMENT_EXPIRED",
  "ENTITLEMENT_REVOKED",
  "ENTITLEMENT_CONSUMED",
] as const;
export type FulfillmentLifecycleState = (typeof FULFILLMENT_LIFECYCLE_STATES)[number];

export const ENTITLEMENT_STATUSES = [
  "PENDING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "EXPIRED",
  "REVOKED",
  "CONSUMED",
  "FAILED",
] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export const RECOVERY_OUTCOMES = [
  "AUTOMATIC_RETRY",
  "ENTITLEMENT_REPAIR",
  "DELIVERY_RETRY",
  "CUSTOMER_SUPPORT_REQUIRED",
  "REFUND_REVIEW_REQUIRED",
  "MANUAL_EXCEPTION",
] as const;
export type RecoveryOutcome = (typeof RECOVERY_OUTCOMES)[number];

export type CommercialOfferContract = {
  offer_id: string;
  venture_id: string;
  canonical_name: string;
  offer_version: string;
  billing_model: "ANNUAL_RECURRING" | "ONE_TIME" | "USAGE" | "CUSTOM";
  price_binding: { amount: number; currency: "usd"; price_id: string; product_id: string };
  customer_promise: string;
  fulfillment_contract_id: string;
  entitlement_definition: string;
  fulfillment_trigger: "PAYMENT_CONFIRMED";
  delivery_type: FulfillmentType;
  completion_criteria: string;
  customer_access_policy: string;
  failure_policy: string;
  cancellation_policy: string;
  refund_policy_reference: string;
  status: "DRAFT" | "READY" | "BLOCKED";
  evidence: string[];
  traceability: string;
};

export type FulfillmentContract = {
  contract_id: string;
  venture_id: string;
  offer_id: string;
  fulfillment_type: FulfillmentType;
  trigger: "PAYMENT_CONFIRMED";
  required_inputs: string[];
  entitlement_type: string;
  quantity_or_scope: string;
  delivery_executor: string | null;
  delivery_destination: string | null;
  customer_access_method: string | null;
  completion_condition: string;
  verification_method: string | null;
  retry_policy: string;
  failure_policy: string;
  revocation_policy: string;
  expiration_policy: string;
  support_path: string;
  version: string;
  status: "DRAFT" | "READY" | "BLOCKED";
  evidence: string[];
};

export type CustomerIdentityReference = {
  customer_identity_id: string;
  venture_id: string;
  provider_customer_ref: string | null;
  checkout_client_reference_id: string | null;
  account_id: string | null;
  email_is_not_authorization: true;
};

export type CustomerEntitlement = {
  entitlement_id: string;
  venture_id: string;
  customer_identity_id: string;
  offer_id: string;
  payment_reference: string;
  subscription_reference: string | null;
  entitlement_type: string;
  resource_scope: string;
  quantity: number;
  quantity_remaining: number | null;
  start_at: string;
  expires_at: string | null;
  status: EntitlementStatus;
  consumed_at: string | null;
  revoked_at: string | null;
  source: string;
  version: string;
  traceability: string;
};

export type FulfillmentOrder = {
  order_id: string;
  venture_id: string;
  offer_id: string;
  customer_identity_id: string;
  payment_reference: string;
  contract_id: string;
  state: FulfillmentLifecycleState;
  idempotency_key: string;
  created_at: string;
};

export type FulfillmentExecution = {
  execution_id: string;
  order_id: string;
  state: FulfillmentLifecycleState;
  started_at: string;
  completed_at: string | null;
};

export type FulfillmentArtifact = {
  artifact_id: string;
  order_id: string;
  kind: string;
  available: false;
  reason: string;
};

export type FulfillmentVerification = {
  verification_id: string;
  order_id: string;
  method: string;
  proven: boolean;
  reasons: string[];
};

export type FulfillmentFailure = {
  failure_id: string;
  order_id: string;
  reason: string;
  recovery: RecoveryOutcome;
};

export type FulfillmentRecoveryPolicy = {
  policy_id: string;
  venture_id: string;
  automatic_refund: false;
  outcomes: RecoveryOutcome[];
  support_path: string;
};

export type PaidTransactionRef = {
  payment_reference: string;
  venture_id: string;
  customer_identity_id: string | null;
  offer_id: string | null;
  succeeded: boolean;
  confirmed_at: string;
};

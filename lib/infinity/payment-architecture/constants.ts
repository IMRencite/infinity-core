export const PAYMENT_ARCHITECTURE_VERSION = "payment_architecture_v1";

export const PAYMENT_BUSINESS_MODELS = [
  "DIRECT_COMMERCE",
  "SAAS_SUBSCRIPTION",
  "MARKETPLACE",
  "SERVICE_PLATFORM",
  "DIGITAL_PRODUCT",
  "USAGE_BASED",
  "LEAD_GENERATION",
  "NO_DIRECT_PAYMENT",
] as const;

export type PaymentBusinessModel = (typeof PAYMENT_BUSINESS_MODELS)[number];

export const PAYMENT_REQUIREMENTS = [
  "ONE_TIME_PAYMENT",
  "RECURRING_SUBSCRIPTION",
  "BUYER_CHECKOUT",
  "SELLER_ONBOARDING",
  "MULTI_PARTY_PAYMENT",
  "PLATFORM_FEE",
  "SELLER_BALANCE",
  "SELLER_PAYOUT",
  "REFUND_SUPPORT",
  "DISPUTE_SUPPORT",
  "TAX_SUPPORT",
  "INVOICE_SUPPORT",
  "USAGE_METERING",
] as const;

export type PaymentRequirement = (typeof PAYMENT_REQUIREMENTS)[number];

export const PAYMENT_ARCHITECTURE_KINDS = [
  "MARKETPLACE_MULTI_PARTY",
  "DIRECT_PAYMENTS",
  "BILLING_SUBSCRIPTIONS",
  "USAGE_BASED_BILLING",
  "DIRECT_INVOICING",
  "NO_CUSTOMER_PAYMENT",
] as const;

export type PaymentArchitectureKind = (typeof PAYMENT_ARCHITECTURE_KINDS)[number];

export const PROVIDER_BACKED_ARCHITECTURES = [
  "STRIPE_CONNECT_MARKETPLACE",
  "DIRECT_STRIPE_PAYMENTS",
  "STRIPE_BILLING_SUBSCRIPTIONS",
  "STRIPE_USAGE_BASED_BILLING",
] as const;

export type ProviderBackedArchitecture = (typeof PROVIDER_BACKED_ARCHITECTURES)[number];

export type SelectedPaymentArchitecture = PaymentArchitectureKind | ProviderBackedArchitecture;

export const MARKETPLACE_PAYMENT_CAPABILITY = "MARKETPLACE_PAYMENTS" as const;
export type MarketplacePaymentCapabilityId = typeof MARKETPLACE_PAYMENT_CAPABILITY;

export const CONNECT_ACCOUNT_TYPES = ["EXPRESS", "STANDARD", "CUSTOM"] as const;
export type ConnectAccountType = (typeof CONNECT_ACCOUNT_TYPES)[number];

export const CONNECT_WRITE_READINESS = [
  "PROVIDER_READ_VERIFIED",
  "TEST_MODE_CAPABLE",
  "CONNECT_CONFIG_REQUIRED",
  "CONNECT_TEST_READY",
  "LIVE_WRITE_GATED",
  "LIVE_WRITE_AUTHORIZED",
] as const;

export type ConnectWriteReadiness = (typeof CONNECT_WRITE_READINESS)[number];

export const MARKETPLACE_READINESS = ["FOUNDATION", "TEST_READY", "LIVE_GATED"] as const;
export type MarketplacePaymentReadiness = (typeof MARKETPLACE_READINESS)[number];

export const PAYOUT_STATUSES = [
  "NOT_STARTED",
  "PENDING",
  "IN_TRANSIT",
  "PAID",
  "FAILED",
  "BLOCKED",
] as const;

export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const UNRESOLVED_POLICY_CODES = [
  "CONNECT_ACCOUNT_TYPE",
  "MERCHANT_OF_RECORD",
  "SELLER_KYC_RESPONSIBILITY",
  "REFUND_LIABILITY",
  "DISPUTE_LIABILITY",
  "NEGATIVE_SELLER_BALANCES",
  "PAYOUT_SCHEDULE",
  "CROSS_BORDER_SELLER_SUPPORT",
  "TAX_RESPONSIBILITY",
] as const;

export type UnresolvedPolicyCode = (typeof UNRESOLVED_POLICY_CODES)[number];

export const VALIDATION_GAP_CODES = [
  "SELLER_WITHOUT_PAYOUT_MODEL",
  "COMMISSION_WITHOUT_SELLER_ALLOCATION",
  "MARKETPLACE_WITHOUT_BUYER_SELLER_DISTINCTION",
  "PAYOUT_WITHOUT_MARKETPLACE_CAPABILITY",
  "PLATFORM_FEE_EXCEEDS_100",
  "NEGATIVE_TAKE_RATE",
  "UNKNOWN_CURRENCY",
  "UNRESOLVED_SELLER_COUNTRY_CONSTRAINTS",
  "MISSING_BUSINESS_MODEL",
] as const;

export type ValidationGapCode = (typeof VALIDATION_GAP_CODES)[number];

export const BLOCKED_CONNECT_WRITES = [
  "createConnectedAccount",
  "createAccountLink",
  "createPaymentIntent",
  "createCheckoutSession",
  "createTransfer",
  "createPayout",
  "createRefund",
  "mutatePlatformFee",
  "createWebhookEndpoint",
] as const;

export type BlockedConnectWrite = (typeof BLOCKED_CONNECT_WRITES)[number];

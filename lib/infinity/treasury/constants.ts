/** Treasury + Capital / Budget Engine V1 — canonical constants */

export const TREASURY_ENGINE_VERSION = "treasury_capital_budget_engine_v1";
export const TREASURY_POLICY_VERSION = "treasury_policy_v1";

export const DEFAULT_CURRENCY = "USD";

export const FINANCIAL_PROVIDER_KEYS = [
  "mock",
  "mercury",
  "ramp",
  "stripe_treasury",
  "stripe_issuing",
] as const;

export type FinancialProviderKey = (typeof FINANCIAL_PROVIDER_KEYS)[number];

export const FINANCIAL_CAPABILITIES = [
  "ACCOUNT_READ",
  "BALANCE_READ",
  "TRANSACTION_READ",
  "CARD_READ",
  "CARD_CREATE",
  "CARD_LIMIT_UPDATE",
  "CARD_FREEZE",
  "PAYMENT_READ",
  "PAYMENT_CREATE",
  "RECIPIENT_READ",
  "RECIPIENT_CREATE",
  "COMMITMENT_READ",
] as const;

export type FinancialCapability = (typeof FINANCIAL_CAPABILITIES)[number];

export const BUDGET_SCOPE_TYPES = [
  "GLOBAL",
  "CATEGORY",
  "VENTURE",
  "MISSION",
  "ACTION",
  "PROVIDER",
  "DAILY",
  "MONTHLY",
] as const;

export type BudgetScopeType = (typeof BUDGET_SCOPE_TYPES)[number];

export const TREASURY_BUDGET_CATEGORIES = [
  "AI_API",
  "HOSTING",
  "DOMAINS",
  "MARKETING",
  "CREATIVE_MEDIA",
  "SOFTWARE_TOOLS",
  "DATA",
  "VENDORS_CONTRACTORS",
  "CONTINGENCY",
  "PAYMENT_PROCESSING",
  "OTHER",
] as const;

export type TreasuryBudgetCategory = (typeof TREASURY_BUDGET_CATEGORIES)[number];

/** Map commercialization SpendCategory → Treasury category (no duplicate taxonomy). */
export const COMMERCIAL_SPEND_CATEGORY_MAP = {
  DOMAIN_REGISTRATION: "DOMAINS",
  DOMAIN_RENEWAL: "DOMAINS",
  HOSTING: "HOSTING",
  EMAIL: "SOFTWARE_TOOLS",
  SAAS_INFRASTRUCTURE: "SOFTWARE_TOOLS",
  PAYMENT_PROCESSING: "PAYMENT_PROCESSING",
  CREATIVE: "CREATIVE_MEDIA",
  MARKETING: "MARKETING",
  OTHER: "OTHER",
} as const;

export const FINANCIAL_ACTION_TYPES = [
  "PURCHASE",
  "SUBSCRIPTION",
  "PAYMENT",
  "CARD_CREATE",
  "CARD_LIMIT_CHANGE",
  "DOMAIN_PURCHASE",
  "HOSTING_PURCHASE",
  "MEDIA_GENERATION",
  "SOFTWARE_PURCHASE",
  "VENDOR_PAYMENT",
  "OTHER",
] as const;

export type FinancialActionType = (typeof FINANCIAL_ACTION_TYPES)[number];

export const FINANCIAL_POLICY_DECISIONS = [
  "AUTO_AUTHORIZE",
  "REQUIRE_POLICY_ESCALATION",
  "BLOCK",
] as const;

export type FinancialPolicyDecision = (typeof FINANCIAL_POLICY_DECISIONS)[number];

export const AUTHORIZATION_SOURCES = [
  "POLICY_ENGINE",
  "POLICY_ESCALATION",
  "OTHER_GOVERNED_SOURCE",
] as const;

export type AuthorizationSource = (typeof AUTHORIZATION_SOURCES)[number];

export const LEDGER_ENTRY_TYPES = [
  "EXPENSE",
  "REVENUE",
  "CAPITAL_CONTRIBUTION",
  "TRANSFER",
  "REFUND",
  "CHARGEBACK",
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const LEDGER_SUBTYPES = [
  "AI_API_SPEND",
  "HOSTING_SPEND",
  "DOMAIN_SPEND",
  "CREATIVE_MEDIA_SPEND",
  "SOFTWARE_SPEND",
  "MARKETING_SPEND",
  "VENDOR_SPEND",
  "PAYMENT_PROCESSING_FEE",
  "GROSS_REVENUE",
  "NET_REVENUE",
  "FOUNDER_CAPITAL",
  "INVESTOR_CAPITAL",
  "INTERNAL_TRANSFER",
] as const;

export type LedgerSubtype = (typeof LEDGER_SUBTYPES)[number];

export const PROVIDER_TRANSACTION_CLASSES = [
  "EXPENSE",
  "REVENUE",
  "TRANSFER",
  "CAPITAL_CONTRIBUTION",
  "REFUND",
  "CHARGEBACK",
  "UNKNOWN",
] as const;

export type ProviderTransactionClass = (typeof PROVIDER_TRANSACTION_CLASSES)[number];

export const PROVIDER_FRESHNESS_STATES = [
  "FRESH",
  "STALE",
  "UNAVAILABLE",
  "NOT_CONFIGURED",
] as const;

export type ProviderFreshness = (typeof PROVIDER_FRESHNESS_STATES)[number];

export const ACTUALITY_STATES = ["ACTUAL", "ESTIMATE", "UNKNOWN"] as const;
export type Actuality = (typeof ACTUALITY_STATES)[number];

export const FINANCIAL_ACTION_STATUSES = [
  "PROPOSED",
  "PENDING_POLICY",
  "AUTHORIZED",
  "RESERVED",
  "EXECUTING",
  "EXECUTED",
  "RELEASED",
  "BLOCKED",
  "ESCALATED",
  "FAILED",
  "CANCELLED",
] as const;

export type FinancialActionStatus = (typeof FINANCIAL_ACTION_STATUSES)[number];

export const RESERVATION_STATUSES = ["ACTIVE", "SPENT", "RELEASED", "EXPIRED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const COMMITMENT_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"] as const;
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const COMMITMENT_FREQUENCIES = ["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"] as const;
export type CommitmentFrequency = (typeof COMMITMENT_FREQUENCIES)[number];

export const FORBIDDEN_TREASURY_SERIALIZATION_FIELDS = [
  "apiSecret",
  "apiKey",
  "accessToken",
  "refreshToken",
  "authorization",
  "password",
  "bankLogin",
  "cardNumber",
  "cvv",
  "cvc",
  "pin",
  "routingNumber",
  "accountNumber",
  "ssn",
  "webhookSecret",
  "privateKey",
  "clientSecret",
] as const;

export const TREASURY_HQ_SECTIONS = [
  "TREASURY_AND_CAPITAL",
  "BUDGET_CONSTRAINTS",
  "VENTURE_ALLOCATIONS",
  "TRANSACTIONS",
  "COMMITMENTS",
] as const;

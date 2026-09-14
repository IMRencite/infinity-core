import type { FinancialSourceRecord, MercuryCashSnapshot, StripeCashSnapshot } from "./types";
import { FINANCIAL_SOURCE_REGISTRY, READ_ONLY_BANK_CAPABILITIES } from "./types";
import { freshnessFromAge, verificationFromConnection } from "./amounts";

export function buildFinancialSourceRegistry(input: {
  mercury: MercuryCashSnapshot;
  stripe: StripeCashSnapshot;
  ledgerVerifiedAt: string | null;
  nowMs?: number;
}): FinancialSourceRecord[] {
  const nowMs = input.nowMs ?? Date.now();
  return [
    {
      source_id: "src:stripe:occupancynpv",
      provider: "stripe",
      source_type: "PAYMENT_PROCESSOR",
      safe_account_reference: "acct_****7R7G",
      currency: input.stripe.currency,
      connection_status: input.stripe.connection === "LIVE" ? "LIVE" : "FAIL",
      verification_status: verificationFromConnection(input.stripe.connection === "LIVE"),
      last_sync_at: input.stripe.last_verified,
      freshness_status: freshnessFromAge(input.stripe.last_verified, nowMs),
      capabilities: ["BALANCE_READ", "PAYOUT_READ", "BALANCE_TRANSACTION_READ", "EVENT_READ"],
    },
    {
      source_id: "src:mercury:operating",
      provider: "mercury",
      source_type: "BANK_ACCOUNT",
      safe_account_reference: input.mercury.safe_account_reference,
      currency: input.mercury.currency,
      connection_status: input.mercury.connection,
      verification_status: verificationFromConnection(input.mercury.connection === "LIVE"),
      last_sync_at: input.mercury.last_verified,
      freshness_status: freshnessFromAge(input.mercury.last_verified, nowMs),
      capabilities: [...READ_ONLY_BANK_CAPABILITIES],
    },
    {
      source_id: "src:infinity:treasury-ledger",
      provider: "infinity",
      source_type: "TREASURY_LEDGER",
      safe_account_reference: "ledger:canonical",
      currency: "USD",
      connection_status: "LIVE",
      verification_status: input.ledgerVerifiedAt ? "VERIFIED" : "UNVERIFIED",
      last_sync_at: input.ledgerVerifiedAt,
      freshness_status: freshnessFromAge(input.ledgerVerifiedAt, nowMs),
      capabilities: ["LEDGER_READ"],
    },
    {
      source_id: "src:infinity:provider-cost-ledger",
      provider: "infinity",
      source_type: "PROVIDER_COST_LEDGER",
      safe_account_reference: "ledger:costs",
      currency: "USD",
      connection_status: "DISCONNECTED",
      verification_status: "UNVERIFIED",
      last_sync_at: null,
      freshness_status: "UNKNOWN",
      capabilities: ["COST_READ"],
    },
    {
      source_id: "src:infra:unknown",
      provider: "unknown",
      source_type: "INFRASTRUCTURE_PROVIDER",
      safe_account_reference: "infra:unconnected",
      currency: "USD",
      connection_status: "CREDENTIALS_REQUIRED",
      verification_status: "UNVERIFIED",
      last_sync_at: null,
      freshness_status: "UNKNOWN",
      capabilities: [],
    },
    {
      source_id: "src:domain:unknown",
      provider: "unknown",
      source_type: "DOMAIN_PROVIDER",
      safe_account_reference: "domain:unconnected",
      currency: "USD",
      connection_status: "CREDENTIALS_REQUIRED",
      verification_status: "UNVERIFIED",
      last_sync_at: null,
      freshness_status: "UNKNOWN",
      capabilities: [],
    },
    {
      source_id: "src:growth:unknown",
      provider: "unknown",
      source_type: "GROWTH_PROVIDER",
      safe_account_reference: "growth:unconnected",
      currency: "USD",
      connection_status: "CREDENTIALS_REQUIRED",
      verification_status: "UNVERIFIED",
      last_sync_at: null,
      freshness_status: "UNKNOWN",
      capabilities: [],
    },
    {
      source_id: "src:fulfillment:unknown",
      provider: "unknown",
      source_type: "FULFILLMENT_PROVIDER",
      safe_account_reference: "fulfillment:unconnected",
      currency: "USD",
      connection_status: "CREDENTIALS_REQUIRED",
      verification_status: "UNVERIFIED",
      last_sync_at: null,
      freshness_status: "UNKNOWN",
      capabilities: [],
    },
    {
      source_id: "src:modeled:occupancynpv",
      provider: "infinity",
      source_type: "MODELED",
      safe_account_reference: "modeled:occupancynpv",
      currency: "USD",
      connection_status: "MODELED",
      verification_status: "UNVERIFIED",
      last_sync_at: input.ledgerVerifiedAt,
      freshness_status: freshnessFromAge(input.ledgerVerifiedAt, nowMs),
      capabilities: ["MODELED_READ"],
    },
  ];
}

export function financialSourceRegistryName(): typeof FINANCIAL_SOURCE_REGISTRY {
  return FINANCIAL_SOURCE_REGISTRY;
}

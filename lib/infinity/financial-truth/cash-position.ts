import type {
  CashCompleteness,
  MercuryCashSnapshot,
  MercuryConnectionState,
  PortfolioCashPosition,
  StripeCashSnapshot,
} from "./types";
import { PORTFOLIO_CASH_POSITION_CONTRACT } from "./types";

export function cashCompleteness(input: {
  mercuryConnection: MercuryConnectionState;
  mercuryVerified: boolean;
  stripeVerified: boolean;
}): CashCompleteness {
  if (input.mercuryConnection !== "LIVE" || !input.mercuryVerified) {
    return input.stripeVerified ? "PARTIAL" : "UNKNOWN";
  }
  if (!input.stripeVerified) return "PARTIAL";
  return "COMPLETE";
}

export function computeVerifiedLiquidCash(input: {
  mercuryAvailable: number | null;
  mercuryVerified: boolean;
  stripeAvailable: number | null;
  stripeVerified: boolean;
}): number | null {
  // Portfolio cash includes Mercury. An unverified Mercury source cannot
  // become a numeric total — including Stripe $0 — without verified-zero evidence.
  if (!input.mercuryVerified) return null;
  const parts: number[] = [];
  if (input.mercuryAvailable != null) parts.push(input.mercuryAvailable);
  if (input.stripeVerified && input.stripeAvailable != null) parts.push(input.stripeAvailable);
  if (parts.length === 0) return null;
  return parts.reduce((sum, value) => sum + value, 0);
}

export function computePortfolioCashPosition(input: {
  mercury: Pick<
    MercuryCashSnapshot,
    "connection" | "operating_account_verified" | "current" | "available" | "last_verified"
  >;
  stripe: Pick<StripeCashSnapshot, "connection" | "available" | "pending" | "last_verified">;
  otherProcessorAvailable?: number | null;
  otherProcessorPending?: number | null;
  verifiedAt?: string | null;
}): PortfolioCashPosition {
  const mercuryVerified = input.mercury.connection === "LIVE" && input.mercury.operating_account_verified;
  const stripeVerified = input.stripe.connection === "LIVE" && input.stripe.available != null;
  const unverified = (mercuryVerified ? 0 : 1) + (stripeVerified ? 0 : 1);
  return {
    contract: PORTFOLIO_CASH_POSITION_CONTRACT,
    mercury_current: mercuryVerified ? input.mercury.current : null,
    mercury_available: mercuryVerified ? input.mercury.available : null,
    stripe_available: stripeVerified ? input.stripe.available : input.stripe.available,
    stripe_pending: input.stripe.pending,
    other_processor_available: input.otherProcessorAvailable ?? 0,
    other_processor_pending: input.otherProcessorPending ?? 0,
    verified_liquid_cash: computeVerifiedLiquidCash({
      mercuryAvailable: input.mercury.available,
      mercuryVerified,
      stripeAvailable: input.stripe.available,
      stripeVerified,
    }),
    cash_completeness: cashCompleteness({
      mercuryConnection: input.mercury.connection,
      mercuryVerified,
      stripeVerified,
    }),
    unverified_accounts: unverified,
    verified_at: input.verifiedAt ?? input.stripe.last_verified ?? input.mercury.last_verified ?? null,
  };
}

export function emptyMercurySnapshot(connection: MercuryConnectionState = "CREDENTIALS_REQUIRED"): MercuryCashSnapshot {
  return {
    connection,
    operating_account_verified: false,
    current: null,
    available: null,
    currency: "USD",
    last_verified: null,
    safe_account_reference: "mercury ****????",
    founder_estimate_treated_as_verified: false,
    transactions: [],
    freshness: "UNKNOWN",
    mutation_capability: false,
    money_movement_capability: false,
    read_only: true,
    failure_stage: connection === "LIVE" ? null : "auth/session/config",
    provider_error: connection === "LIVE" ? null : connection,
  };
}

export function emptyStripeSnapshot(connection: StripeCashSnapshot["connection"] = "FAIL"): StripeCashSnapshot {
  return {
    connection,
    account: "acct_18h5CjLdvXKx7R7G",
    available: null,
    pending: null,
    currency: "USD",
    recent_payout_amount: null,
    recent_payout_id: null,
    recent_payout_status: null,
    payout_destination: "UNKNOWN",
    settlement_destination_classification: "UNKNOWN",
    last_verified: null,
    processor_fees: null,
    net_settlement: null,
    balance_transactions: [],
    payouts: [],
    freshness: "UNKNOWN",
  };
}

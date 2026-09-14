import { displayMoney, freshnessFromAge } from "./amounts";
import {
  TREASURY_CASH_TRUTH_CONTRACT,
  TREASURY_CASH_TRUTH_GATE,
  TREASURY_COMPLETENESS_GATE,
  type CashCompleteness,
  type FreshnessState,
  type MercuryCashSnapshot,
  type MercuryConnectionState,
  type MercuryFailureStage,
  type NamedFinancialGate,
  type PortfolioCashPosition,
  type SourcedTreasuryAmount,
  type StripeCashSnapshot,
  type VerificationState,
} from "./types";

export const TREASURY_CASH_ACCOUNT_SCOPE = "PARENT_IMR_OPERATING" as const;
export const PORTFOLIO_CASH_INCLUDES_MERCURY = true as const;

export type TreasuryCashVerificationState =
  | "VERIFIED"
  | "VERIFIED_ZERO"
  | "UNKNOWN"
  | "PARTIAL"
  | "STALE"
  | "VERIFICATION_REQUIRED"
  | "PROVIDER_FAIL";

export type TreasuryCashFallbackState =
  | "NONE"
  | "STRIPE_ONLY_EXCLUDED"
  | "PROVIDER_FAIL_NOT_ZERO";

export type TreasuryCashTruthContract = {
  contract: typeof TREASURY_CASH_TRUTH_CONTRACT;
  verified_amount: number | null;
  currency: string;
  provider: "MERCURY";
  account_scope: typeof TREASURY_CASH_ACCOUNT_SCOPE;
  verification_state: TreasuryCashVerificationState;
  completeness: CashCompleteness;
  last_verified_at: string | null;
  freshness: FreshnessState;
  provider_error: string | null;
  fallback_state: TreasuryCashFallbackState;
  display: string;
  mercury_connection: MercuryConnectionState;
  mercury_verified: boolean;
  stripe_verified: boolean;
  failure_stage: MercuryFailureStage | null;
};

function mercuryVerified(mercury: Pick<MercuryCashSnapshot, "connection" | "operating_account_verified">): boolean {
  return mercury.connection === "LIVE" && mercury.operating_account_verified;
}

function stripeVerified(stripe: Pick<StripeCashSnapshot, "connection" | "available">): boolean {
  return stripe.connection === "LIVE" && stripe.available != null;
}

export function displayTreasuryCash(amount: number | null, verification: TreasuryCashVerificationState): string {
  if (verification === "VERIFIED" || verification === "VERIFIED_ZERO") {
    return displayMoney(amount);
  }
  if (verification === "PARTIAL") return "PARTIAL";
  if (verification === "STALE") return "STALE";
  if (verification === "VERIFICATION_REQUIRED") return "VERIFICATION_REQUIRED";
  if (verification === "PROVIDER_FAIL") return "UNKNOWN";
  return "UNKNOWN";
}

export function projectTreasuryCashTruth(input: {
  mercury: Pick<
    MercuryCashSnapshot,
    | "connection"
    | "operating_account_verified"
    | "current"
    | "available"
    | "currency"
    | "last_verified"
    | "freshness"
    | "failure_stage"
    | "provider_error"
  >;
  stripe: Pick<StripeCashSnapshot, "connection" | "available" | "last_verified">;
  cash?: Pick<PortfolioCashPosition, "verified_liquid_cash" | "cash_completeness">;
  nowMs?: number;
}): TreasuryCashTruthContract {
  const mercuryIsVerified = mercuryVerified(input.mercury);
  const stripeIsVerified = stripeVerified(input.stripe);
  const completeness =
    input.cash?.cash_completeness ??
    (mercuryIsVerified && stripeIsVerified ? "COMPLETE" : stripeIsVerified || mercuryIsVerified ? "PARTIAL" : "UNKNOWN");
  const amount = mercuryIsVerified
    ? (input.cash?.verified_liquid_cash ?? input.mercury.available ?? input.mercury.current)
    : null;
  const verification_state: TreasuryCashVerificationState = mercuryIsVerified
    ? amount === 0
      ? "VERIFIED_ZERO"
      : "VERIFIED"
    : input.mercury.connection === "FAIL"
      ? "PROVIDER_FAIL"
      : input.mercury.connection === "CREDENTIALS_REQUIRED"
        ? "VERIFICATION_REQUIRED"
        : completeness === "PARTIAL"
          ? "PARTIAL"
          : "UNKNOWN";
  const freshness = mercuryIsVerified
    ? freshnessFromAge(input.mercury.last_verified, input.nowMs)
    : input.mercury.freshness ?? "UNKNOWN";
  return {
    contract: TREASURY_CASH_TRUTH_CONTRACT,
    verified_amount: amount,
    currency: input.mercury.currency || "USD",
    provider: "MERCURY",
    account_scope: TREASURY_CASH_ACCOUNT_SCOPE,
    verification_state,
    completeness,
    last_verified_at: mercuryIsVerified ? input.mercury.last_verified : null,
    freshness,
    provider_error: input.mercury.provider_error ?? (mercuryIsVerified ? null : input.mercury.connection),
    fallback_state: mercuryIsVerified ? "NONE" : "PROVIDER_FAIL_NOT_ZERO",
    display: displayTreasuryCash(amount, verification_state),
    mercury_connection: input.mercury.connection,
    mercury_verified: mercuryIsVerified,
    stripe_verified: stripeIsVerified,
    failure_stage: mercuryIsVerified ? null : (input.mercury.failure_stage ?? "live provider request"),
  };
}

export function sourcedTreasuryCash(truth: TreasuryCashTruthContract): SourcedTreasuryAmount {
  return {
    value: truth.verified_amount,
    display: truth.display,
    source: "MERCURY",
    sync: truth.last_verified_at,
  };
}

export function displayedCashIsNumericZero(displayed: string | number | null | undefined): boolean {
  if (displayed === 0) return true;
  if (typeof displayed !== "string") return false;
  const normalized = displayed.replace(/[, ]/g, "").replace(/^US/, "");
  return /^\$?0(\.0+)?$/.test(normalized);
}

export function evaluateTreasuryCashTruthGate(input: {
  truth: TreasuryCashTruthContract;
  displayed: string | number | null | undefined;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.truth.contract !== TREASURY_CASH_TRUTH_CONTRACT) reasons.push("MISSING_CONTRACT");
  if (input.truth.verified_amount != null && input.truth.verification_state !== "VERIFIED" && input.truth.verification_state !== "VERIFIED_ZERO") {
    reasons.push("AMOUNT_WITHOUT_VERIFICATION");
  }
  if (!input.truth.mercury_verified && input.truth.verified_amount === 0) {
    reasons.push("UNKNOWN_COERCED_TO_ZERO");
  }
  const renderedZero = displayedCashIsNumericZero(input.displayed);
  const verifiedZero =
    input.truth.mercury_verified &&
    input.truth.verified_amount === 0 &&
    (input.truth.verification_state === "VERIFIED_ZERO" || input.truth.verification_state === "VERIFIED");
  if (renderedZero && !verifiedZero) {
    reasons.push("NUMERIC_ZERO_WITHOUT_ZERO_EVIDENCE");
  }
  if (input.truth.mercury_verified && input.truth.verified_amount === 50 && input.displayed !== "$50") {
    reasons.push("VERIFIED_FIFTY_NOT_DISPLAYED");
  }
  if (!input.truth.mercury_verified && renderedZero) {
    reasons.push("MERCURY_FAILURE_RENDERED_ZERO");
  }
  if (!input.truth.mercury_verified && typeof input.displayed === "string" && displayedCashIsNumericZero(input.displayed) === false) {
    const allowed = new Set(["UNKNOWN", "PARTIAL", "STALE", "VERIFICATION_REQUIRED"]);
    if (!allowed.has(input.displayed)) reasons.push("UNVERIFIED_DISPLAY_NOT_TRUTHFUL");
  }
  return reasons.length
    ? { gate: TREASURY_CASH_TRUTH_GATE, result: "FAIL", reasons }
    : { gate: TREASURY_CASH_TRUTH_GATE, result: "PASS", reasons: ["DISPLAY_MATCHES_CANONICAL_EVIDENCE"] };
}

export function evaluateTreasuryCompletenessGate(input: {
  mercuryConnection: MercuryConnectionState;
  mercuryVerified: boolean;
  stripeVerified: boolean;
  completeness: CashCompleteness;
  verification?: VerificationState | TreasuryCashVerificationState | null;
}): NamedFinancialGate {
  const reasons: string[] = [];
  const expected: CashCompleteness =
    input.mercuryConnection === "LIVE" && input.mercuryVerified
      ? input.stripeVerified
        ? "COMPLETE"
        : "PARTIAL"
      : input.stripeVerified
        ? "PARTIAL"
        : "UNKNOWN";
  if (input.completeness !== expected) reasons.push(`COMPLETENESS_MISMATCH:${input.completeness}:${expected}`);
  if (!input.mercuryVerified && input.completeness === "COMPLETE") reasons.push("COMPLETE_WITHOUT_MERCURY");
  return reasons.length
    ? { gate: TREASURY_COMPLETENESS_GATE, result: "FAIL", reasons }
    : { gate: TREASURY_COMPLETENESS_GATE, result: "PASS", reasons: [`${input.completeness} · MERCURY ${input.mercuryConnection}`] };
}

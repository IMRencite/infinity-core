import { displayMoney } from "./amounts";
import type { CanonicalTreasuryProjection } from "./types";

export const MERCURY_FOUNDER_PRESENTATION = "MercuryFounderPresentation" as const;

export type MercuryFounderErrorClass =
  | "AUTH_FAILED"
  | "TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "UNKNOWN";

export type MercuryFounderDetail = {
  label: string;
  value: string;
};

export type MercuryFounderPresentation = {
  contract: typeof MERCURY_FOUNDER_PRESENTATION;
  mercury_state: "LIVE" | "DEGRADED";
  headline: "MERCURY VERIFICATION DEGRADED" | null;
  badge: "DEGRADED" | "LIVE";
  message: string | null;
  last_verified_display: string | null;
  last_verified_raw: string | null;
  last_verified_balance_display: string | null;
  last_verified_balance_historical: boolean;
  cash_supporting_line: string | null;
  access: "READ ONLY";
  policy_status: "OPERATIONAL";
  error_class: MercuryFounderErrorClass | null;
  details: MercuryFounderDetail[];
};

const SECRET_PATTERN =
  /(sk_live_|sk_test_|whsec_|Bearer\s+\S+|authorization:\s*\S+|api[_-]?key|token=|secret=|-----BEGIN)/i;

export function classifyMercuryProviderError(error: string | null | undefined): MercuryFounderErrorClass {
  const raw = (error ?? "").trim().toUpperCase();
  if (!raw) return "UNKNOWN";
  if (
    raw === "AUTH_FAILED" ||
    raw.includes("AUTH_FAILED") ||
    raw.includes("CREDENTIALS_REQUIRED") ||
    raw.includes("MERCURY_DISABLED") ||
    raw.includes("TOKEN_NOT_CONFIGURED") ||
    raw.includes("VERIFICATION_REQUIRED")
  ) {
    return "AUTH_FAILED";
  }
  if (raw.includes("TIMEOUT") || raw.includes("ABORTED")) return "TIMEOUT";
  if (raw.includes("RATE_LIMIT")) return "RATE_LIMITED";
  if (raw.includes("PROVIDER_UNAVAILABLE") || raw.includes("UNAVAILABLE") || raw === "FAIL") {
    return "PROVIDER_UNAVAILABLE";
  }
  return "UNKNOWN";
}

export function founderMercuryDegradedMessage(error: string | null | undefined): string {
  const classified = classifyMercuryProviderError(error);
  if (classified === "AUTH_FAILED") return "Mercury authentication needs to be refreshed.";
  if (classified === "TIMEOUT") return "Mercury did not respond in time.";
  if (classified === "RATE_LIMITED") return "Mercury verification is temporarily rate-limited.";
  if (classified === "PROVIDER_UNAVAILABLE") return "Mercury is temporarily unavailable.";
  return "Live Mercury verification is temporarily unavailable.";
}

export function formatFounderVerifiedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  const stamp = new Date(parsed);
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(stamp);
  return formatted.replace(" GMT", " UTC").replace(" UTC UTC", " UTC");
}

export function sanitizeMercuryFounderValue(value: string | null | undefined): string {
  if (!value) return "NONE";
  if (SECRET_PATTERN.test(value)) return "REDACTED";
  if (value.length > 180) return `${value.slice(0, 80)}…`;
  return value;
}

export function projectMercuryFounderPresentation(input: {
  treasuryStatus: CanonicalTreasuryProjection["treasury_status"] | "LIVE" | "DEGRADED";
  verifiedCashDisplay: string;
  verifiedCashValue: number | null | undefined;
  providerError?: string | null;
  lastVerifiedAt?: string | null;
  lastVerifiedAvailable?: number | null;
  lastSyncAttempt?: string | null;
  cashCompleteness?: string | null;
  accountCount?: number | null;
  environment?: string | null;
  failureStage?: string | null;
  adapterStatus?: string | null;
}): MercuryFounderPresentation {
  const live = input.treasuryStatus === "LIVE";
  const errorClass = live ? null : classifyMercuryProviderError(input.providerError);
  const lastVerifiedDisplay = formatFounderVerifiedAt(input.lastVerifiedAt);
  const historicalBalance =
    !live &&
    input.lastVerifiedAvailable != null &&
    Number.isFinite(input.lastVerifiedAvailable) &&
    (input.verifiedCashValue == null || input.verifiedCashDisplay === "UNKNOWN" || input.verifiedCashDisplay === "VERIFICATION_REQUIRED");
  const details: MercuryFounderDetail[] = [
    { label: "Provider", value: "Mercury" },
    { label: "Provider state", value: live ? "LIVE" : "DEGRADED" },
    { label: "Error category", value: sanitizeMercuryFounderValue(errorClass ?? "NONE") },
    { label: "Last successful verification", value: sanitizeMercuryFounderValue(input.lastVerifiedAt) },
    { label: "Last verification attempt", value: sanitizeMercuryFounderValue(input.lastSyncAttempt) },
    { label: "Freshness", value: sanitizeMercuryFounderValue(input.cashCompleteness) },
    { label: "Source", value: "CanonicalTreasuryProjection" },
    { label: "Scope", value: "PARENT_IMR_OPERATING" },
    { label: "Adapter status", value: sanitizeMercuryFounderValue(input.adapterStatus ?? (live ? "READ_ONLY" : "READ_ONLY · DEGRADED")) },
    { label: "Account count", value: String(input.accountCount ?? 0) },
    { label: "Environment", value: sanitizeMercuryFounderValue(input.environment) },
    { label: "Failure stage", value: sanitizeMercuryFounderValue(input.failureStage) },
  ].filter((row) => !SECRET_PATTERN.test(row.value));

  return {
    contract: MERCURY_FOUNDER_PRESENTATION,
    mercury_state: live ? "LIVE" : "DEGRADED",
    headline: live ? null : "MERCURY VERIFICATION DEGRADED",
    badge: live ? "LIVE" : "DEGRADED",
    message: live ? null : founderMercuryDegradedMessage(input.providerError),
    last_verified_display: lastVerifiedDisplay,
    last_verified_raw: input.lastVerifiedAt ?? null,
    last_verified_balance_display: historicalBalance ? displayMoney(input.lastVerifiedAvailable) : null,
    last_verified_balance_historical: Boolean(historicalBalance),
    cash_supporting_line: live ? null : "Live Mercury balance unavailable",
    access: "READ ONLY",
    policy_status: "OPERATIONAL",
    error_class: errorClass,
    details,
  };
}

export function projectMercuryFounderPresentationFromTreasury(
  projection: Pick<
    CanonicalTreasuryProjection,
    | "treasury_status"
    | "verified_treasury_cash"
    | "last_financial_sync"
    | "cash_completeness"
    | "bank_connection"
  > & {
    mercury_provider_error?: string | null;
    mercury_last_verified_at?: string | null;
    mercury_last_verified_available?: number | null;
    mercury_failure_stage?: string | null;
  },
  extras?: { accountCount?: number; environment?: string | null },
): MercuryFounderPresentation {
  return projectMercuryFounderPresentation({
    treasuryStatus: projection.treasury_status,
    verifiedCashDisplay: projection.verified_treasury_cash.display,
    verifiedCashValue: typeof projection.verified_treasury_cash.value === "number" ? projection.verified_treasury_cash.value : null,
    providerError: projection.mercury_provider_error ?? null,
    lastVerifiedAt: projection.mercury_last_verified_at ?? null,
    lastVerifiedAvailable: projection.mercury_last_verified_available ?? null,
    lastSyncAttempt: projection.last_financial_sync,
    cashCompleteness: projection.cash_completeness,
    accountCount: extras?.accountCount,
    environment: extras?.environment,
    failureStage: projection.mercury_failure_stage ?? null,
    adapterStatus: projection.bank_connection,
  });
}

export function primaryMercuryWarningContainsDiagnostics(text: string): boolean {
  return (
    /last sync\s+\d{4}-\d{2}-\d{2}T/i.test(text) ||
    /accounts\s+\d+/i.test(text) ||
    /PRODUCTION\s*·/i.test(text) ||
    /auth\/session\/config/i.test(text) ||
    /PROVIDER UNAVAILABLE/i.test(text) ||
    /UNAVAILABLE · DEGRADED/i.test(text)
  );
}

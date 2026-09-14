import { actualAmount, unknownAmount, type EpistemicAmount } from "@/lib/infinity/treasury/types";
import type { FreshnessState, VerificationState } from "./types";

export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export function centsToUsd(cents: number | null | undefined): number | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  return roundUsd(Math.round(cents) / 100);
}

export function sumKnown(values: Array<number | null | undefined>): number | null {
  const known = values.filter((row): row is number => row != null && Number.isFinite(row));
  if (known.length !== values.length) return null;
  return known.reduce((sum, value) => sum + value, 0);
}

export function displayMoney(value: number | null | undefined, unknownLabel = "UNKNOWN"): string {
  if (value == null || !Number.isFinite(value)) return unknownLabel;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function displayNotSet(value: "NOT_SET" | number | null | undefined): string {
  if (value === "NOT_SET" || value == null) return "NOT_SET";
  return displayMoney(value);
}

export function epistemicFromNullable(value: number | null | undefined, currency = "USD"): EpistemicAmount {
  if (value == null || !Number.isFinite(value)) return unknownAmount(currency);
  return actualAmount(value, currency);
}

export function maskAccountRef(input: { last4?: string | null; id?: string | null; provider?: string }): string {
  const last4 = input.last4 && /^\d{4}$/.test(input.last4) ? input.last4 : null;
  if (last4) return `${input.provider ?? "acct"} ****${last4}`;
  const id = input.id ?? "";
  const suffix = id.length >= 4 ? id.slice(-4) : "????";
  return `${input.provider ?? "acct"} ****${suffix}`;
}

export function freshnessFromAge(verifiedAt: string | null | undefined, nowMs = Date.now()): FreshnessState {
  if (!verifiedAt) return "UNKNOWN";
  const ts = Date.parse(verifiedAt);
  if (!Number.isFinite(ts)) return "UNKNOWN";
  const age = nowMs - ts;
  if (age < 15 * 60 * 1000) return "FRESH";
  if (age < 60 * 60 * 1000) return "AGING";
  return "STALE";
}

export function verificationFromConnection(live: boolean): VerificationState {
  return live ? "VERIFIED" : "UNVERIFIED";
}

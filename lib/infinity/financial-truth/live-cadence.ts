import type { MercuryConnectionState } from "./types";
import { MERCURY_SYNC_INTERVAL_MS, STRIPE_STALE_REFRESH_MS } from "./types";

export function shouldRefreshMercury(input: {
  lastVerified: string | null;
  reason: "poll" | "catch-up" | "ssr" | "event";
  connection?: MercuryConnectionState | null;
  nowMs?: number;
}): boolean {
  if (input.reason === "poll") return false;
  if (input.reason === "event") return true;
  if (input.connection && input.connection !== "LIVE") return true;
  if (!input.lastVerified) return true;
  const age = (input.nowMs ?? Date.now()) - Date.parse(input.lastVerified);
  if (!Number.isFinite(age)) return true;
  return age >= MERCURY_SYNC_INTERVAL_MS;
}

export function shouldRefreshStripe(input: {
  lastVerified: string | null;
  reason: "poll" | "catch-up" | "ssr" | "event";
  eventType?: string;
  nowMs?: number;
}): boolean {
  if (input.reason === "poll") return false;
  if (input.reason === "event" && input.eventType) return true;
  if (!input.lastVerified) return true;
  const age = (input.nowMs ?? Date.now()) - Date.parse(input.lastVerified);
  return Number.isFinite(age) && age >= STRIPE_STALE_REFRESH_MS;
}

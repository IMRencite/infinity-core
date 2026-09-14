import type { HqDatumFreshnessState, LiveHQDatum } from "./types";

export const HQ_DATUM_FRESHNESS_RESOLVER = "HQDatumFreshnessResolver" as const;

export function resolveHqDatumFreshness(input: {
  lastVerifiedAt: string | null;
  thresholdMs: number;
  nowMs?: number;
  connectionStatus?: "LIVE" | "RECONNECTING" | "STALE" | "DISCONNECTED" | null;
  errorState?: string | null;
}): HqDatumFreshnessState {
  if (input.connectionStatus === "RECONNECTING") return "RECONNECTING";
  if (input.connectionStatus === "STALE" || input.connectionStatus === "DISCONNECTED") return "STALE";
  if (input.errorState) return "VERIFICATION_REQUIRED";
  if (!input.lastVerifiedAt) return "UNKNOWN";
  const at = Date.parse(input.lastVerifiedAt);
  if (!Number.isFinite(at)) return "UNKNOWN";
  const now = input.nowMs ?? Date.now();
  if (now - at > input.thresholdMs) return "STALE";
  return input.connectionStatus === "LIVE" ? "LIVE" : "CURRENT_CANONICAL";
}

export function applyConnectionFreshness(
  datums: LiveHQDatum[],
  connectionStatus: "LIVE" | "RECONNECTING" | "STALE" | "DISCONNECTED" | null,
): LiveHQDatum[] {
  if (!connectionStatus || connectionStatus === "LIVE") return datums;
  const next = resolveHqDatumFreshness({
    lastVerifiedAt: new Date().toISOString(),
    thresholdMs: 0,
    connectionStatus,
  });
  return datums.map((row) =>
    row.freshness_state === "UNKNOWN" || row.freshness_state === "VERIFICATION_REQUIRED"
      ? row
      : { ...row, freshness_state: next, verification_status: next === "STALE" ? "STALE" : row.verification_status },
  );
}

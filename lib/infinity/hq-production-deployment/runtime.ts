import { HQ_RUNTIME_CONNECTIVITY_GATE, INFINITY_RUNTIME_ORIGIN, type HqHealthState, type HqNamedGate } from "./contract";

export function evaluateHQRuntimeConnectivityGate(input: {
  runtimeTarget: string;
  reachable: boolean;
  responseValid: boolean;
  internalTrustOk: boolean;
  timeoutHandled: boolean;
  degradedDisplayedHonestly: boolean;
  localhostFallback: boolean;
  liveAuthenticatedRead?: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (input.runtimeTarget !== INFINITY_RUNTIME_ORIGIN && !input.runtimeTarget.startsWith(INFINITY_RUNTIME_ORIGIN)) {
    reasons.push("RUNTIME_TARGET_NOT_CANONICAL");
  }
  if (/localhost|127\.0\.0\.1/.test(input.runtimeTarget)) reasons.push("RUNTIME_TARGET_LOCALHOST");
  if (input.localhostFallback) reasons.push("LOCALHOST_PRODUCTION_FALLBACK");
  if (!input.reachable) reasons.push("RUNTIME_UNREACHABLE");
  if (input.reachable && !input.responseValid) reasons.push("RUNTIME_RESPONSE_INVALID");
  if (input.reachable && !input.internalTrustOk) reasons.push("RUNTIME_TRUST_FAILED");
  if (!input.timeoutHandled) reasons.push("TIMEOUT_UNHANDLED");
  if (!input.degradedDisplayedHonestly) reasons.push("DEGRADED_STATE_DISHONEST");
  return {
    gate: HQ_RUNTIME_CONNECTIVITY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : input.liveAuthenticatedRead ? ["LIVE_SESSION_PROVEN"] : ["PRODUCTION_RUNTIME_BOUND"],
    proof_level: reasons.length ? "NOT_PROVEN" : input.liveAuthenticatedRead ? "LIVE_SESSION_PROVEN" : "IMPLEMENTATION_PROVEN",
  };
}

export function runtimeHealthFromRead(input: { ok: boolean; freshness?: string | null }): HqHealthState {
  if (!input.ok) return "UNAVAILABLE";
  if (input.freshness === "STALE") return "DEGRADED";
  return "HEALTHY";
}

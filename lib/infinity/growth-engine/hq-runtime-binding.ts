import "server-only";

import {
  RUNTIME_UNREACHABLE,
  evaluateHqProductionRuntimeFallbackMaskingGate,
  evaluateHqProductionRuntimeFreshnessGate,
  evaluateHqProductionRuntimeSecretExposureGate,
  type HqProductionOperatingState,
  type HqRuntimeReadResult,
} from "./hq-runtime-projection";

export const HQ_PRODUCTION_RUNTIME_URL =
  process.env.INFINITY_RUNTIME_URL?.trim() || "https://infinity-runtime.vercel.app";

export async function fetchCanonicalProductionOperatingState(input?: {
  fetchImpl?: typeof fetch;
  runtimeUrl?: string;
  secret?: string;
  timeoutMs?: number;
}): Promise<HqRuntimeReadResult> {
  const secret = input?.secret ?? process.env.CRON_SECRET ?? process.env.INFINITY_RUNTIME_TICK_SECRET;
  const url = `${(input?.runtimeUrl ?? HQ_PRODUCTION_RUNTIME_URL).replace(/\/$/, "")}/api/runtime/operating-state`;
  if (!secret) {
    return { ok: false, status: RUNTIME_UNREACHABLE, freshness: "STALE", state: null, lastVerifiedAt: null };
  }
  try {
    const response = await (input?.fetchImpl ?? fetch)(url, {
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(input?.timeoutMs ?? 8000),
    });
    if (!response.ok) {
      return { ok: false, status: RUNTIME_UNREACHABLE, freshness: "STALE", state: null, lastVerifiedAt: null };
    }
    const body = await response.json() as {
      status?: string;
      freshness?: "FRESH" | "STALE";
      state?: HqProductionOperatingState | null;
      cloudRuntime?: unknown;
    };
    const secrets = evaluateHqProductionRuntimeSecretExposureGate(body);
    if (secrets.result !== "PASS" || !body.state || body.status !== "BOUND") {
      return { ok: false, status: RUNTIME_UNREACHABLE, freshness: "STALE", state: null, lastVerifiedAt: null };
    }
    return {
      ok: true,
      status: "BOUND",
      freshness: body.freshness === "STALE" ? "STALE" : "FRESH",
      state: body.state,
      cloudRuntime: body.cloudRuntime,
    };
  } catch {
    return { ok: false, status: RUNTIME_UNREACHABLE, freshness: "STALE", state: null, lastVerifiedAt: null };
  }
}

export function hqDisplayDecision(read: HqRuntimeReadResult, localQualified: number) {
  if (!read.ok) {
    return {
      display: RUNTIME_UNREACHABLE,
      masking: evaluateHqProductionRuntimeFallbackMaskingGate({
        runtimeReachable: false,
        displayedAs: RUNTIME_UNREACHABLE,
      }),
      freshness: evaluateHqProductionRuntimeFreshnessGate({
        productionQualified: 0,
        localWorkingTreeQualified: localQualified,
        lastVerifiedAt: null,
        usedLocalAsProduction: false,
      }),
    };
  }
  return {
    display: "production" as const,
    masking: evaluateHqProductionRuntimeFallbackMaskingGate({
      runtimeReachable: true,
      displayedAs: "production",
    }),
    freshness: evaluateHqProductionRuntimeFreshnessGate({
      productionQualified: read.state.funnel.qualified,
      localWorkingTreeQualified: localQualified,
      lastVerifiedAt: read.state.runtime.lastVerifiedAt,
      usedLocalAsProduction: false,
    }),
  };
}

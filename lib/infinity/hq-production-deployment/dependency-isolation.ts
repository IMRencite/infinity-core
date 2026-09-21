import {
  HQ_DEPENDENCY_ISOLATION_GATE,
  HQ_HEALTH_STATES,
  type HqHealthState,
  type HqNamedGate,
} from "./contract";

export const HQ_CRITICAL_DEPENDENCIES = ["auth_session", "authorization", "hq_core_persistence"] as const;
export const HQ_NONCRITICAL_DEPENDENCIES = [
  "treasury",
  "provider_health",
  "opportunity_universe",
  "organic_growth",
  "prospect_intelligence",
  "sales",
  "outbound",
  "runtime_subpanel",
  "daily_reports_panel",
  "occupancynpv_compose",
  "venture_system_qc",
  "offer_architecture",
  "operations_room",
  "portfolio",
] as const;

export type HqDependencyHealth = {
  name: string;
  classification: "CRITICAL" | "NONCRITICAL";
  state: HqHealthState;
  crashesDashboard: boolean;
};

export function classifyHqDependencyHealth(input: {
  name: string;
  available: boolean;
  optional?: boolean;
  threw?: boolean;
}): HqDependencyHealth {
  const critical = (HQ_CRITICAL_DEPENDENCIES as readonly string[]).includes(input.name);
  const state: HqHealthState = input.threw
    ? input.available
      ? "DEGRADED"
      : "UNAVAILABLE"
    : input.available
      ? "HEALTHY"
      : input.optional === false
        ? "UNAVAILABLE"
        : "UNKNOWN";
  return {
    name: input.name,
    classification: critical ? "CRITICAL" : "NONCRITICAL",
    state: (HQ_HEALTH_STATES as readonly string[]).includes(state) ? state : "UNKNOWN",
    crashesDashboard: Boolean(critical && (input.threw || !input.available)),
  };
}

export function evaluateTreasuryDependencyIsolationGate(input: {
  dashboardCrashed: boolean;
  inventedCash: boolean;
  cashDisplayed: string | null;
  mercuryVerified: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (input.dashboardCrashed) reasons.push("TREASURY_CRASHED_DASHBOARD");
  if (input.inventedCash) reasons.push("INVENTED_TREASURY_CASH");
  if (!input.mercuryVerified && input.cashDisplayed && input.cashDisplayed !== "UNKNOWN" && /\$\d/.test(input.cashDisplayed)) {
    reasons.push("UNVERIFIED_CASH_DISPLAYED");
  }
  return {
    gate: "TreasuryDependencyIsolationGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["TREASURY_FAILURE_ISOLATED"],
  };
}

export function evaluateHQDependencyIsolationGate(input: {
  noncriticalFailures: Array<{ name: string; crashedDashboard: boolean }>;
}): HqNamedGate {
  const leaked = input.noncriticalFailures.filter((row) => row.crashedDashboard).map((row) => row.name);
  return {
    gate: HQ_DEPENDENCY_ISOLATION_GATE,
    result: leaked.length ? "FAIL" : "PASS",
    reasons: leaked.length ? leaked.map((name) => `DEPENDENCY_ISOLATION_FAIL:${name}`) : ["NONCRITICAL_FAILURES_DEGRADE"],
  };
}

export function evaluateHQProductionServerRuntimeGate(input: {
  dashboardHttpOk: boolean;
  serverRenderCompleted: boolean;
  vercelException: boolean;
  criticalHealthy: boolean;
  noncriticalDegrades: boolean;
  errorBoundaryTriggered: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.dashboardHttpOk) reasons.push("DASHBOARD_HTTP_FAIL");
  if (!input.serverRenderCompleted) reasons.push("SERVER_RENDER_INCOMPLETE");
  if (input.vercelException) reasons.push("VERCEL_SERVER_EXCEPTION");
  if (!input.criticalHealthy) reasons.push("CRITICAL_DEPENDENCY_UNHEALTHY");
  if (!input.noncriticalDegrades) reasons.push("NONCRITICAL_NOT_ISOLATED");
  if (input.errorBoundaryTriggered) reasons.push("ERROR_BOUNDARY_TRIGGERED");
  return {
    gate: "HQProductionServerRuntimeGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["AUTHENTICATED_DASHBOARD_RENDER_OK"],
  };
}

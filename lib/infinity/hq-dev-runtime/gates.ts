import {
  HQ_DEV_RUNTIME_READINESS_GATE,
  type HqDevRuntimeProbe,
  type NamedGateResult,
} from "./contract";

export function evaluateHQDevRuntimeReadinessGate(probe: HqDevRuntimeProbe): NamedGateResult {
  const reasons: string[] = [];
  if (!probe.compileCompleted) reasons.push("COMPILE_INCOMPLETE");
  if (probe.recurringCompileLoop) reasons.push("RECURRING_COMPILE_LOOP");
  if (probe.routeCompileHang) reasons.push("ROUTE_COMPILE_HANG");
  if (probe.homepageStatus !== 200) reasons.push(`HOMEPAGE_STATUS:${probe.homepageStatus ?? "NONE"}`);
  if (probe.dashboardStatus !== 200 && probe.dashboardStatus !== 307 && probe.dashboardStatus !== 302) {
    reasons.push(`DASHBOARD_STATUS:${probe.dashboardStatus ?? "NONE"}`);
  }
  if (!probe.navigationResponds) reasons.push("NAVIGATION_UNRESPONSIVE");
  if (probe.fatalBrowserErrors > 0) reasons.push(`FATAL_BROWSER_ERRORS:${probe.fatalBrowserErrors}`);
  if (probe.fatalServerErrors > 0) reasons.push(`FATAL_SERVER_ERRORS:${probe.fatalServerErrors}`);
  if (probe.timeToFirstCompileMs != null && probe.timeToFirstCompileMs > 120_000) {
    reasons.push(`SLOW_FIRST_COMPILE:${probe.timeToFirstCompileMs}`);
  }
  return {
    gate: HQ_DEV_RUNTIME_READINESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

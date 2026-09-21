export const HQ_DASHBOARD_STAGES = [
  "session",
  "authorization",
  "venture_selection",
  "hq_canonical_projection",
  "runtime_state",
  "daily_reports",
  "organic_growth",
  "prospect_intelligence",
  "sales",
  "treasury",
  "portfolio",
  "system_health",
  "occupancynpv_compose",
  "operator_console_render",
] as const;

export type HqDashboardStage = (typeof HQ_DASHBOARD_STAGES)[number];
export type HqDashboardStageStatus = "PASS" | "FAIL" | "DEGRADED" | "SKIPPED";

export function logHqDashboardStage(input: {
  stage: HqDashboardStage | string;
  status: HqDashboardStageStatus;
  duration_ms: number;
  safe_error_class?: string | null;
  safe_digest?: string | null;
}): void {
  console.info("[hq-dashboard-stage]", {
    stage: input.stage,
    status: input.status,
    duration_ms: input.duration_ms,
    safe_error_class: input.safe_error_class ?? null,
    safe_digest: input.safe_digest ?? null,
  });
}

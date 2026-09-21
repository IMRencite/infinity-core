import { FOUNDER_FACING_PRODUCTION_QUALITY_GATE } from "./contract";

export const HQ_RSC_FAILED_FETCH_DEFECT = "HQ_RSC_FAILED_FETCH" as const;

export type HqRscFailureClass =
  | "CLIENT_SERVER_BOUNDARY_FAILURE"
  | "RSC_FETCH_FAILURE"
  | "DEV_SERVER_NOT_REACHABLE"
  | "SERVER_COMPILE_FAILURE"
  | "STALE_NEXT_BUILD"
  | "TURBOPACK_DEV_FAILURE"
  | "SERVER_EXCEPTION"
  | "NETWORK_FAILURE";

export type HqRscFetchObservation = {
  request_url: string;
  method: "GET";
  rsc_header: boolean;
  initiating_route: string;
  request_completed: boolean;
  http_status: number | null;
  timed_out: boolean;
  server_process_alive: boolean;
  playwright_in_client_graph: boolean;
  compile_error: string | null;
  html_contains_hq_shell?: boolean;
};

export function classifyHqRscFailedFetch(observation: HqRscFetchObservation): {
  defect: typeof HQ_RSC_FAILED_FETCH_DEFECT;
  classes: HqRscFailureClass[];
  same_as_playwright_tls_boundary: boolean;
  founder_failed_fetch: boolean;
} {
  const classes = new Set<HqRscFailureClass>();
  if (observation.timed_out || !observation.request_completed) {
    classes.add("RSC_FETCH_FAILURE");
    if (observation.server_process_alive) {
      classes.add("TURBOPACK_DEV_FAILURE");
      classes.add("STALE_NEXT_BUILD");
      classes.add("DEV_SERVER_NOT_REACHABLE");
    } else {
      classes.add("DEV_SERVER_NOT_REACHABLE");
      classes.add("NETWORK_FAILURE");
    }
  }
  if (observation.compile_error) classes.add("SERVER_COMPILE_FAILURE");
  if (observation.playwright_in_client_graph) classes.add("CLIENT_SERVER_BOUNDARY_FAILURE");
  if (observation.http_status != null && observation.http_status >= 500) classes.add("SERVER_EXCEPTION");
  const founder_failed_fetch =
    observation.timed_out ||
    !observation.request_completed ||
    Boolean(observation.compile_error) ||
    observation.playwright_in_client_graph ||
    observation.html_contains_hq_shell === false;
  return {
    defect: HQ_RSC_FAILED_FETCH_DEFECT,
    classes: [...classes],
    same_as_playwright_tls_boundary: observation.playwright_in_client_graph,
    founder_failed_fetch,
  };
}

export function evaluateFounderFacingProductionQualityGate(input: {
  dashboard_loads: boolean;
  hq_shell_renders: boolean;
  command_renders: boolean;
  operating_floor_renders: boolean;
  venture_navigation_renders: boolean;
  material_console_errors: number;
  failed_required_requests: number;
  broken_navigation_transitions: number;
  rsc_fetch_ok: boolean;
}): { gate: string; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.dashboard_loads) reasons.push("DASHBOARD_DOES_NOT_LOAD");
  if (!input.hq_shell_renders) reasons.push("HQ_SHELL_NOT_RENDERED");
  if (!input.command_renders) reasons.push("HQ_COMMAND_NOT_RENDERED");
  if (!input.operating_floor_renders) reasons.push("OPERATING_FLOOR_NOT_RENDERED");
  if (!input.venture_navigation_renders) reasons.push("VENTURE_NAVIGATION_NOT_RENDERED");
  if (!input.rsc_fetch_ok) reasons.push("REQUIRED_RSC_FETCH_FAILED");
  if (input.material_console_errors > 0) reasons.push("MATERIAL_CONSOLE_ERRORS");
  if (input.failed_required_requests > 0) reasons.push("FAILED_REQUIRED_REQUESTS");
  if (input.broken_navigation_transitions > 0) reasons.push("BROKEN_NAVIGATION_TRANSITIONS");
  return {
    gate: FOUNDER_FACING_PRODUCTION_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

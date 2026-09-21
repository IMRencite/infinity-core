import { evaluateFounderFacingProductionQualityGate } from "@/lib/infinity/customer-facing-browser-qc/hq-rsc-fetch";
import { evaluateBrowserConsoleQCGate } from "@/lib/infinity/customer-facing-browser-qc/console-gate";
import { evaluateCustomerFacingNetworkQCGate } from "@/lib/infinity/customer-facing-browser-qc/network-gate";
import { evaluateCustomerFacingNavigationQCGate } from "@/lib/infinity/customer-facing-browser-qc/navigation-gate";
import { evaluateDevServerProcessHealthGate, type DevServerProcessObservation } from "./dev-server";
import type { QcStatus } from "./contract";

export const HQ_FULL_QC_SURFACES = [
  "dashboard",
  "hq_command",
  "operating_floor",
  "operations",
  "venture_radar",
  "profit_lab",
  "research_grid",
  "systems_architect",
  "blueprint_lab",
  "growth_nexus",
  "creation_lab",
  "design_core",
  "validation_station",
  "deployment_depot",
  "signal_intelligence",
  "venture_selection",
  "venture_detail",
  "runtime_state",
  "console",
  "network",
  "navigation",
  "dev_server_process_health",
] as const;

export type HqFullQcSurface = (typeof HQ_FULL_QC_SURFACES)[number];

export type HqSurfaceEvidence = {
  surface: HqFullQcSurface;
  status: QcStatus;
  reason?: string;
};

export type HqFullQcReport = {
  surfaces: Record<HqFullQcSurface, QcStatus>;
  overall: "PASS" | "FAIL" | "PARTIAL";
  reasons: string[];
  founder_facing: ReturnType<typeof evaluateFounderFacingProductionQualityGate>;
  dev_server: ReturnType<typeof evaluateDevServerProcessHealthGate>;
};

export function evaluateHqFullSystemQc(input: {
  surfaces: readonly HqSurfaceEvidence[];
  dashboard_loads: boolean;
  hq_shell_renders: boolean;
  console_entries?: readonly string[];
  network_ok?: boolean;
  navigation_ok?: boolean;
  rsc_failed_fetch?: boolean;
  dev_server: DevServerProcessObservation;
}): HqFullQcReport {
  const surfaces = Object.fromEntries(
    HQ_FULL_QC_SURFACES.map((surface) => {
      const row = input.surfaces.find((item) => item.surface === surface);
      return [surface, row?.status ?? "UNKNOWN"];
    }),
  ) as Record<HqFullQcSurface, QcStatus>;
  const consoleGate = evaluateBrowserConsoleQCGate([...(input.console_entries ?? [])]);
  const networkGate = evaluateCustomerFacingNetworkQCGate([
    { name: "hq-dashboard", required: true, ok: input.network_ok !== false, status: input.network_ok === false ? null : 200, failure: input.network_ok === false ? "Failed to fetch" : null },
  ]);
  const navigationGate = evaluateCustomerFacingNavigationQCGate([
    { route: "/dashboard", reached: input.dashboard_loads && input.navigation_ok !== false, failed_fetch: Boolean(input.rsc_failed_fetch) },
  ]);
  const founder_facing = evaluateFounderFacingProductionQualityGate({
    dashboard_loads: input.dashboard_loads,
    hq_shell_renders: input.hq_shell_renders,
    command_renders: surfaces.hq_command === "PASS",
    operating_floor_renders: surfaces.operating_floor === "PASS",
    venture_navigation_renders: surfaces.venture_selection === "PASS" || surfaces.venture_detail === "PASS",
    material_console_errors: consoleGate.result === "FAIL" ? 1 : 0,
    failed_required_requests: networkGate.result === "FAIL" ? 1 : 0,
    broken_navigation_transitions: navigationGate.result === "FAIL" ? 1 : 0,
    rsc_fetch_ok: !input.rsc_failed_fetch && input.dashboard_loads,
  });
  const dev_server = evaluateDevServerProcessHealthGate(input.dev_server);
  surfaces.console = consoleGate.result === "FAIL" ? "FAIL" : surfaces.console;
  surfaces.network = networkGate.result === "FAIL" ? "FAIL" : surfaces.network;
  surfaces.navigation = navigationGate.result === "FAIL" ? "FAIL" : surfaces.navigation;
  surfaces.dev_server_process_health = dev_server.result === "FAIL" ? "FAIL" : surfaces.dev_server_process_health;
  const reasons: string[] = [];
  for (const surface of HQ_FULL_QC_SURFACES) {
    const status = surfaces[surface];
    if (status === "PASS" || status === "NOT_APPLICABLE") continue;
    reasons.push(`${surface}:${status}`);
  }
  if (founder_facing.result === "FAIL") reasons.push("FounderFacingProductionQualityGate:FAIL");
  if (dev_server.result === "FAIL") reasons.push("DevServerProcessHealthGate:FAIL");
  const hasFail = Object.values(surfaces).some((status) => status === "FAIL" || status === "STALE");
  const hasUnknown = Object.values(surfaces).some((status) => status === "UNKNOWN" || status === "PARTIAL");
  const overall: "PASS" | "FAIL" | "PARTIAL" = reasons.length === 0
    ? "PASS"
    : hasFail && hasUnknown
      ? "PARTIAL"
      : hasUnknown && !hasFail
        ? "PARTIAL"
        : "FAIL";
  return { surfaces, overall, reasons, founder_facing, dev_server };
}

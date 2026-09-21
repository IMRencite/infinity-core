import { DEV_SERVER_PROCESS_HEALTH_GATE, type NamedSystemGate } from "./contract";

export type DevServerProcessObservation = {
  processes: Array<{
    pid: number;
    command: string;
    started_at?: string;
    cpu_seconds?: number;
    hung?: boolean;
    serving_port?: number;
  }>;
  expected_port: number;
  port_listeners: number[];
  serving_runtime_started_at?: string;
  now?: string;
  hung_request_timeout?: boolean;
};

export function evaluateDevServerProcessHealthGate(observation: DevServerProcessObservation): NamedSystemGate {
  const reasons: string[] = [];
  const nextDev = observation.processes.filter((row) => /next\s+dev|start-server|turbopack/i.test(row.command));
  if (nextDev.filter((row) => row.hung).length > 0) reasons.push("HUNG_DEV_SERVER");
  if (observation.hung_request_timeout) reasons.push("HUNG_SERVER_PROCESS");
  const port3000 = nextDev.filter((row) => row.serving_port === observation.expected_port);
  if (port3000.length > 1) reasons.push("MULTIPLE_STALE_DEV_SERVERS");
  const uniquePorts = new Set(observation.port_listeners.filter((port) => port === observation.expected_port));
  if (observation.port_listeners.filter((port) => port === observation.expected_port).length > 1) {
    reasons.push("PORT_CONFLICT");
  }
  if (observation.serving_runtime_started_at) {
    const age = new Date(observation.now ?? new Date().toISOString()).getTime()
      - new Date(observation.serving_runtime_started_at).getTime();
    if (age > 20 * 60 * 60 * 1000) reasons.push("UNEXPECTED_OLD_RUNTIME_SERVING_REQUESTS");
  }
  if (uniquePorts.size === 0 && nextDev.length === 0 && observation.hung_request_timeout) {
    reasons.push("NO_HEALTHY_DEV_SERVER");
  }
  return {
    gate: DEV_SERVER_PROCESS_HEALTH_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export const STALE_DEV_SERVER_RSC_INCIDENT = {
  defect_id: "hq-dashboard-rsc-failed-fetch-stale-next-dev",
  lesson: "Hung/stale Next.js process caused /dashboard RSC Failed to fetch. Restart and clear generated .next/dev; do not treat Playwright/tls as the only class of this stack.",
  local_dev_only: true,
} as const;

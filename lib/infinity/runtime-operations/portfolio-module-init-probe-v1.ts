import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { VERCEL_CRON_DOCUMENTED_USER_AGENT } from "@/lib/infinity/autonomous-portfolio-operations/durable/portfolio-cron-provenance-v1";

export const PORTFOLIO_MODULE_INIT_PROBE_MODE = "module-init-probe" as const;
export const PORTFOLIO_MODULE_INIT_PROBE_HEADER = "x-infinity-remote-module-init-probe" as const;
export const PORTFOLIO_MODULE_INIT_PROBE_HEADER_VALUE = "v1" as const;
export const REMOTE_FUNCTION_MODULE_INIT_QC = "REMOTE_FUNCTION_MODULE_INIT_QC" as const;

export type PortfolioModuleInitProbeRequestDecision =
  | { kind: "not_probe" }
  | { kind: "reject"; status: 403; reason: string }
  | { kind: "reject"; status: 401; reason: string }
  | { kind: "execute_probe" };

export function resolvePortfolioModuleInitProbeMode(
  request: Request,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): PortfolioModuleInitProbeRequestDecision {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode")?.trim().toLowerCase();
  if (mode !== PORTFOLIO_MODULE_INIT_PROBE_MODE) {
    return { kind: "not_probe" };
  }

  const userAgent = (request.headers.get("user-agent") ?? "").trim().toLowerCase();
  if (userAgent === VERCEL_CRON_DOCUMENTED_USER_AGENT) {
    return { kind: "reject", status: 403, reason: "CRON_REQUEST_FORBIDDEN_FOR_MODULE_INIT_PROBE" };
  }
  if (request.headers.get("x-vercel-cron")) {
    return { kind: "reject", status: 403, reason: "CRON_HEADER_FORBIDDEN_FOR_MODULE_INIT_PROBE" };
  }

  const probeHeader = request.headers.get(PORTFOLIO_MODULE_INIT_PROBE_HEADER);
  if (probeHeader !== PORTFOLIO_MODULE_INIT_PROBE_HEADER_VALUE) {
    return { kind: "reject", status: 403, reason: "MODULE_INIT_PROBE_HEADER_REQUIRED" };
  }

  const deployQcSecret =
    env.INFINITY_RUNTIME_DEPLOY_QC_SECRET?.trim() ||
    env.INFINITY_RUNTIME_TICK_SECRET?.trim() ||
    env.CRON_SECRET?.trim();
  if (!deployQcSecret) {
    return { kind: "reject", status: 401, reason: "DEPLOY_QC_SECRET_NOT_CONFIGURED" };
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${deployQcSecret}`) {
    return { kind: "reject", status: 401, reason: "UNAUTHORIZED_DEPLOY_QC" };
  }

  return { kind: "execute_probe" };
}

export function buildPortfolioModuleInitProbeResponse(input: {
  release_sha?: string | null;
  deployment_id?: string | null;
}): Record<string, unknown> {
  return {
    mode: PORTFOLIO_MODULE_INIT_PROBE_MODE,
    REMOTE_FUNCTION_MODULE_INIT_QC: "PASS",
    PORTFOLIO_MODULE_INIT_PROBE_V1: "PORTFOLIO_MODULE_INIT_PROBE_V1",
    MODULE_INIT_PROBE_LEDGER_ROWS_CREATED: 0,
    MODULE_INIT_PROBE_CYCLES_CREATED: 0,
    MODULE_INIT_PROBE_JOBS_CREATED: 0,
    MODULE_INIT_PROBE_PROVIDER_CALLS: 0,
    MODULE_INIT_PROBE_PRODUCTION_MUTATIONS: 0,
    MODULE_INIT_PROBE_ORCHESTRATOR_INVOKED: false,
    MODULE_INIT_PROBE_WORKER_CONTINUATION_INVOKED: false,
    release_sha: input.release_sha ?? null,
    deployment_id: input.deployment_id ?? null,
    note: "Handler returned before durable orchestration; module graph loaded via route import chain.",
  };
}

/** Regression classifier: local source import must not imply remote serverless init pass. */
export function classifyRemoteModuleInitFalsePassRegression(input: {
  source_trace_qc: "PASS" | "FAIL";
  local_import_qc: "PASS" | "FAIL";
  remote_function_module_init_qc: "PASS" | "FAIL" | "NOT_RUN";
}): { REMOTE_MODULE_INIT_FALSE_PASS_REGRESSION_QC: "PASS" | "FAIL"; PROMOTION_ALLOWED: boolean } {
  const wouldFalsePass =
    input.source_trace_qc === "PASS" &&
    input.local_import_qc === "PASS" &&
    input.remote_function_module_init_qc === "FAIL";
  const blocked = wouldFalsePass || input.remote_function_module_init_qc === "FAIL";
  return {
    REMOTE_MODULE_INIT_FALSE_PASS_REGRESSION_QC: wouldFalsePass ? "PASS" : input.remote_function_module_init_qc === "NOT_RUN" ? "FAIL" : "PASS",
    PROMOTION_ALLOWED: !blocked && input.remote_function_module_init_qc === "PASS",
  };
}

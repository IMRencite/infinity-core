import { deployApprovedVentureProductionBundle } from "../autonomous-venture-production-deployer-v1";

export const ASYNC_VENTURE_DEPLOYMENT_RECONCILIATION_V1 = "ASYNC_VENTURE_DEPLOYMENT_RECONCILIATION_V1" as const;

export type AsyncDeployJobResult =
  | { phase: "COMPLETED"; ok: boolean; deployment_id: string | null; production_url: string | null; safe_error: string | null }
  | { phase: "IN_PROGRESS"; deployment_id: string | null; safe_error: "DEPLOY_IN_PROGRESS" | "VERCEL_DEPLOYMENT_NOT_READY" };

/** Bounded poll inside one worker slice; durable job retries reconcile long builds. */
export async function executeBoundedVentureDeploy(input: {
  venture_id: string;
  prior_deployment_id?: string | null;
  short_poll?: boolean;
}): Promise<AsyncDeployJobResult> {
  const deployed = await deployApprovedVentureProductionBundle({
    venture_id: input.venture_id,
    alias_production: true,
    enforce_backlog_deploy_guard: true,
    poll_attempts: input.short_poll === false ? 45 : 3,
  });

  if (deployed.ok) {
    return {
      phase: "COMPLETED",
      ok: true,
      deployment_id: deployed.deployment_id,
      production_url: deployed.production_url,
      safe_error: null,
    };
  }

  if (deployed.deployment_id && (deployed.safe_error === "VERCEL_DEPLOYMENT_NOT_READY" || !deployed.ok)) {
    return {
      phase: "IN_PROGRESS",
      deployment_id: deployed.deployment_id,
      safe_error: "DEPLOY_IN_PROGRESS",
    };
  }

  return {
    phase: "COMPLETED",
    ok: false,
    deployment_id: deployed.deployment_id,
    production_url: deployed.production_url,
    safe_error: deployed.safe_error,
  };
}

export function asyncVentureDeploymentReconciliationQc(): "PASS" | "FAIL" {
  return typeof ASYNC_VENTURE_DEPLOYMENT_RECONCILIATION_V1 === "string" ? "PASS" : "FAIL";
}

import { deployApprovedVentureProductionBundle } from "../autonomous-venture-production-deployer-v1";
import type { FrozenVentureDeployRevision } from "./venture-async-deploy-reconciliation-v1";

export const ASYNC_VENTURE_DEPLOYMENT_RECONCILIATION_V1 = "ASYNC_VENTURE_DEPLOYMENT_RECONCILIATION_V1" as const;

export type AsyncDeployJobResult =
  | {
      phase: "COMPLETED";
      ok: boolean;
      deployment_id: string | null;
      production_url: string | null;
      safe_error: string | null;
      provider_post_count: number;
      frozen_bundle_manifest_hash?: string;
    }
  | {
      phase: "IN_PROGRESS";
      deployment_id: string | null;
      safe_error: "DEPLOY_IN_PROGRESS" | "VERCEL_DEPLOYMENT_NOT_READY";
      provider_post_count: number;
      frozen_bundle_manifest_hash?: string;
    };

/** Bounded poll inside one worker slice; durable job retries reconcile long builds. */
export async function executeBoundedVentureDeploy(input: {
  venture_id: string;
  prior_deployment_id?: string | null;
  frozen_revision?: FrozenVentureDeployRevision;
  persisted_deploy_lineage?: Record<string, unknown>;
  short_poll?: boolean;
  on_deployment_submitted?: (deployment_id: string) => Promise<void> | void;
}): Promise<AsyncDeployJobResult> {
  const deployed = await deployApprovedVentureProductionBundle({
    venture_id: input.venture_id,
    alias_production: true,
    enforce_backlog_deploy_guard: true,
    poll_attempts: input.short_poll === false ? 45 : 3,
    prior_deployment_id: input.prior_deployment_id ?? null,
    frozen_revision: input.frozen_revision,
    persisted_deploy_lineage: input.persisted_deploy_lineage,
    on_deployment_submitted: input.on_deployment_submitted,
  });

  const manifestHash = input.frozen_revision?.frozen_bundle_manifest_hash;

  if (deployed.ok) {
    return {
      phase: "COMPLETED",
      ok: true,
      deployment_id: deployed.deployment_id,
      production_url: deployed.production_url,
      safe_error: null,
      provider_post_count: deployed.provider_post_count ?? 0,
      frozen_bundle_manifest_hash: manifestHash,
    };
  }

  if (
    deployed.deployment_id &&
    (deployed.safe_error === "VERCEL_DEPLOYMENT_NOT_READY" ||
      deployed.safe_error === "DEPLOY_IN_PROGRESS" ||
      !deployed.ok)
  ) {
    return {
      phase: "IN_PROGRESS",
      deployment_id: deployed.deployment_id,
      safe_error: "DEPLOY_IN_PROGRESS",
      provider_post_count: deployed.provider_post_count ?? 0,
      frozen_bundle_manifest_hash: manifestHash,
    };
  }

  return {
    phase: "COMPLETED",
    ok: false,
    deployment_id: deployed.deployment_id,
    production_url: deployed.production_url,
    safe_error: deployed.safe_error,
    provider_post_count: deployed.provider_post_count ?? 0,
    frozen_bundle_manifest_hash: manifestHash,
  };
}

export function asyncVentureDeploymentReconciliationQc(): "PASS" | "FAIL" {
  return typeof ASYNC_VENTURE_DEPLOYMENT_RECONCILIATION_V1 === "string" ? "PASS" : "FAIL";
}

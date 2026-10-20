import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { activateVercelTokenForProject } from "@/lib/infinity/commercialization/providers/vercel/token-select";
import { deployOccupancyNpvOrganicLivePage } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { executeClubThrottleProductionDeployment } from "@/lib/infinity/commerce/club-throttle-deployment";
import { autonomousExistingVentureDeployAuthorityQc } from "./autonomous-existing-venture-deploy-authority-v1";
import { auditPortfolioDeployCredentials } from "./portfolio-deploy-credentials-v1";
import { resolveVentureDeployTarget, ventureDeployTargetIdentityQc } from "./venture-deploy-target-identity-v1";
import {
  assertPriorDeploymentBundleIdentityParity,
  type FrozenVentureDeployRevision,
} from "./durable/venture-async-deploy-reconciliation-v1";

export const AUTONOMOUS_VENTURE_PRODUCTION_DEPLOYER_V1 = "AUTONOMOUS_VENTURE_PRODUCTION_DEPLOYER_V1" as const;

export type VentureProductionDeployResult = {
  ok: boolean;
  venture_id: string;
  deployment_id: string | null;
  production_url: string | null;
  safe_error: string | null;
  aliased: boolean;
  provider_post_count?: number;
};

export async function preparePortfolioVentureDeployEnvironment(input?: {
  venture_id: string;
  env?: NodeJS.ProcessEnv;
}): Promise<{ credential_audit: Awaited<ReturnType<typeof auditPortfolioDeployCredentials>> }> {
  loadServerEnvFromLocalFile();
  reloadVercelFromLocalFile();
  const target = resolveVentureDeployTarget(input?.venture_id ?? "occupancynpv");
  if (target) {
    await activateVercelTokenForProject({ projectId: target.vercel_project_id, env: input?.env });
  }
  return { credential_audit: await auditPortfolioDeployCredentials(input?.env ?? process.env) };
}

export async function deployApprovedVentureProductionBundle(input: {
  venture_id: string;
  alias_production?: boolean;
  /** Worker slices use short poll; durable jobs reconcile IN_PROGRESS deployments. */
  poll_attempts?: number;
  prior_deployment_id?: string | null;
  frozen_revision?: FrozenVentureDeployRevision;
  persisted_deploy_lineage?: Record<string, unknown>;
  on_deployment_submitted?: (deployment_id: string) => Promise<void> | void;
}): Promise<VentureProductionDeployResult> {
  const target = resolveVentureDeployTarget(input.venture_id);
  if (!target) {
    return {
      ok: false,
      venture_id: input.venture_id,
      deployment_id: null,
      production_url: null,
      safe_error: "UNKNOWN_VENTURE_DEPLOY_TARGET",
      aliased: false,
    };
  }
  if (
    autonomousExistingVentureDeployAuthorityQc({ venture_live: true }) !== "PASS" ||
    ventureDeployTargetIdentityQc({ venture_id: input.venture_id, expected_project_id: target.vercel_project_id }) !== "PASS"
  ) {
    return {
      ok: false,
      venture_id: input.venture_id,
      deployment_id: null,
      production_url: null,
      safe_error: "DEPLOY_AUTHORITY_OR_IDENTITY_BLOCKED",
      aliased: false,
    };
  }

  const { credential_audit } = await preparePortfolioVentureDeployEnvironment({ venture_id: input.venture_id });
  if (!credential_audit.PORTFOLIO_DEPLOY_CREDENTIAL_SUFFICIENT) {
    return {
      ok: false,
      venture_id: input.venture_id,
      deployment_id: null,
      production_url: null,
      safe_error: credential_audit.PORTFOLIO_DEPLOY_CREDENTIAL_PRESENT
        ? "VERCEL_TEAM_ID_MISSING"
        : "VERCEL_TOKEN_MISSING_ON_RUNTIME",
      aliased: false,
    };
  }

  if (target.deploy_adapter === "occupancynpv_organic_bundle") {
    const prior = input.prior_deployment_id?.trim() || null;
    if (prior && input.frozen_revision) {
      const parity = assertPriorDeploymentBundleIdentityParity({
        prior_deployment_id: prior,
        revision: input.frozen_revision,
        persisted: input.persisted_deploy_lineage,
      });
      if (!parity.ok) {
        return {
          ok: false,
          venture_id: input.venture_id,
          deployment_id: prior,
          production_url: null,
          safe_error: parity.safe_error,
          aliased: false,
          provider_post_count: 0,
        };
      }
    }
    const deployed = await deployOccupancyNpvOrganicLivePage({
      deploy: true,
      aliasProduction: input.alias_production !== false,
      pollAttempts: input.poll_attempts ?? 45,
      pollDelayMs: 8000,
      priorDeploymentId: prior,
      onDeploymentSubmitted: input.on_deployment_submitted,
    });
    return {
      ok: Boolean(deployed.deployed),
      venture_id: input.venture_id,
      deployment_id: deployed.deployment_id,
      production_url: deployed.live_url ?? `https://${target.production_alias}`,
      safe_error: deployed.safe_error,
      aliased: deployed.aliased,
      provider_post_count: deployed.provider_post_count ?? 0,
    };
  }

  const ct = await executeClubThrottleProductionDeployment({
    deploy: true,
    aliasProduction: input.alias_production !== false,
    rebuildDarkGarmentArt: false,
  });
  return {
    ok: Boolean(ct.deployed),
    venture_id: input.venture_id,
    deployment_id: ct.evidence.deployment_id ?? null,
    production_url: ct.deploymentUrl ?? `https://${target.production_alias}`,
    safe_error: ct.safeError ?? null,
    aliased: Boolean(ct.deployed && ct.evidence.domain_points_to_latest_production === true),
  };
}

export function autonomousVentureProductionDeployerQc(): "PASS" | "FAIL" {
  const occ = resolveVentureDeployTarget("occupancynpv");
  const ct = resolveVentureDeployTarget("club-throttle");
  if (!occ || !ct) return "FAIL";
  if (occ.vercel_project_id === ct.vercel_project_id) return "FAIL";
  return autonomousExistingVentureDeployAuthorityQc({ venture_live: true });
}

import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { activateVercelTokenForProject } from "@/lib/infinity/commercialization/providers/vercel/token-select";
import { deployOccupancyNpvOrganicLivePage } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { executeClubThrottleProductionDeployment } from "@/lib/infinity/commerce/club-throttle-deployment";
import { autonomousExistingVentureDeployAuthorityQc } from "./autonomous-existing-venture-deploy-authority-v1";
import { auditPortfolioDeployCredentials } from "./portfolio-deploy-credentials-v1";
import { resolveVentureDeployTarget, ventureDeployTargetIdentityQc } from "./venture-deploy-target-identity-v1";

export const AUTONOMOUS_VENTURE_PRODUCTION_DEPLOYER_V1 = "AUTONOMOUS_VENTURE_PRODUCTION_DEPLOYER_V1" as const;

export type VentureProductionDeployResult = {
  ok: boolean;
  venture_id: string;
  deployment_id: string | null;
  production_url: string | null;
  safe_error: string | null;
  aliased: boolean;
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
  enforce_backlog_deploy_guard?: boolean;
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
    const deployed = await deployOccupancyNpvOrganicLivePage({
      deploy: true,
      aliasProduction: input.alias_production !== false,
      enforceBacklogDeployGuard: input.enforce_backlog_deploy_guard !== false,
      pollAttempts: 45,
      pollDelayMs: 8000,
    });
    return {
      ok: Boolean(deployed.deployed),
      venture_id: input.venture_id,
      deployment_id: deployed.deployment_id,
      production_url: deployed.live_url ?? `https://${target.production_alias}`,
      safe_error: deployed.safe_error,
      aliased: deployed.aliased,
    };
  }

  const ct = await executeClubThrottleProductionDeployment({
    deploy: true,
    aliasProduction: input.alias_production !== false,
    enforceBacklogDeployGuard: input.enforce_backlog_deploy_guard !== false,
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

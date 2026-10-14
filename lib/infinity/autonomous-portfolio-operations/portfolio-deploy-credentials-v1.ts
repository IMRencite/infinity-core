import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "@/lib/infinity/launch-gateway/provider-config";
import { fetchVercelProjectEnvKeyPresence } from "@/lib/infinity/commerce/club-throttle-vercel-production-env-audit";
import { INFINITY_RUNTIME_VERCEL_PROJECT_ID } from "@/lib/infinity/commerce/club-throttle-vercel-production-env-audit";

export const PORTFOLIO_DEPLOY_CREDENTIAL_AUDIT_V1 = "PORTFOLIO_DEPLOY_CREDENTIAL_AUDIT_V1" as const;

export type PortfolioDeployCredentialAudit = {
  PORTFOLIO_DEPLOY_CREDENTIAL_PRESENT: boolean;
  PORTFOLIO_DEPLOY_CREDENTIAL_SCOPE: string;
  PORTFOLIO_DEPLOY_CREDENTIAL_SUFFICIENT: boolean;
  runtime_vercel_token_configured: "PRESENT" | "MISSING" | "UNKNOWN";
  local_process_env_token: boolean;
  team_id_present: boolean;
};

export async function auditPortfolioDeployCredentials(
  env: NodeJS.ProcessEnv = process.env,
): Promise<PortfolioDeployCredentialAudit> {
  const localToken = Boolean((env[VERCEL_TOKEN_ENV] ?? "").trim().length >= 8);
  const teamId = Boolean((env[VERCEL_TEAM_ID_ENV] ?? "").trim().length > 0);
  let runtimeConfigured: "PRESENT" | "MISSING" | "UNKNOWN" = "UNKNOWN";
  if (localToken) {
    try {
      const presence = await fetchVercelProjectEnvKeyPresence(
        INFINITY_RUNTIME_VERCEL_PROJECT_ID,
        [VERCEL_TOKEN_ENV, VERCEL_TEAM_ID_ENV],
        env,
      );
      runtimeConfigured =
        presence[VERCEL_TOKEN_ENV] === "PRESENT" ? "PRESENT" : presence[VERCEL_TOKEN_ENV] === "MISSING" ? "MISSING" : "UNKNOWN";
    } catch {
      runtimeConfigured = "UNKNOWN";
    }
  }
  const present = localToken;
  const sufficient = present && teamId;
  return {
    PORTFOLIO_DEPLOY_CREDENTIAL_PRESENT: present,
    PORTFOLIO_DEPLOY_CREDENTIAL_SCOPE: sufficient
      ? "VERCEL_CROSS_PROJECT_DEPLOY_EXISTING_VENTURE_PROJECTS"
      : present
        ? "VERCEL_TOKEN_WITHOUT_TEAM_ID"
        : "NONE",
    PORTFOLIO_DEPLOY_CREDENTIAL_SUFFICIENT: sufficient,
    runtime_vercel_token_configured: runtimeConfigured,
    local_process_env_token: localToken,
    team_id_present: teamId,
  };
}

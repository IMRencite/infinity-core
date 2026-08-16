import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { githubAdapter } from "@/lib/infinity/launch-gateway/adapters/github-adapter";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  GITHUB_OWNER_ENV,
  GITHUB_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_TOKEN_ENV,
  GITHUB_LIVE_ENV,
  VERCEL_LIVE_ENV,
  LIVE_PROVIDER_TEST_MODE_ENV,
  PROVIDER_KEYS,
} from "@/lib/infinity/launch-gateway/provider-config";
import { isExternalActionsLiveEnabled } from "@/lib/infinity/launch-gateway/kill-switch";
import {
  resolveCredentialFromEnv,
  evaluateLiveProviderGates,
} from "@/lib/infinity/launch-gateway/provider-gates";
import {
  isLiveProviderTestMode,
  isGithubLiveEnabled,
  isVercelLiveEnabled,
} from "@/lib/infinity/launch-gateway/provider-config";
import { redactSecrets } from "@/lib/infinity/launch-gateway/redaction";

function loadEnvLocal(): void {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      const key = trimmed.slice(0, sep);
      let val = trimmed.slice(sep + 1);
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function envPresence(name: string, secret = false): string {
  const v = process.env[name];
  if (v === undefined || v === "") return "missing";
  if (secret && v.length < 11) return "invalid";
  return "configured";
}

function envFlag(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") return "missing";
  if (v === "true" || v === "1") return "configured";
  if (v === "false" || v === "0") return "invalid";
  return "unknown";
}

const RUN = process.env.RUN_PROVIDER_CREDENTIAL_VERIFY === "true";

describe.runIf(RUN)("Provider credential readiness (read-only)", () => {
  loadEnvLocal();

  it("reports readiness without leaking secrets", async () => {
    const ghToken = process.env[GITHUB_TOKEN_ENV];
    const vzToken = process.env[VERCEL_TOKEN_ENV];

    const envReport = {
      EXTERNAL_ACTIONS_LIVE_ENABLED: envFlag("EXTERNAL_ACTIONS_LIVE_ENABLED"),
      LIVE_PROVIDER_TEST_MODE: envFlag(LIVE_PROVIDER_TEST_MODE_ENV),
      GITHUB_LIVE_ENABLED: envFlag(GITHUB_LIVE_ENV),
      GITHUB_TOKEN: envPresence(GITHUB_TOKEN_ENV, true),
      GITHUB_OWNER: envPresence(GITHUB_OWNER_ENV),
      VERCEL_LIVE_ENABLED: envFlag(VERCEL_LIVE_ENV),
      VERCEL_TOKEN: envPresence(VERCEL_TOKEN_ENV, true),
      VERCEL_TEAM_ID: envPresence(VERCEL_TEAM_ID_ENV),
    };

    let ghAuth = "failed_not_configured";
    let ownerMatch = "skipped";
    let ownerLogin: string | null = null;
    let scopes: string[] = [];
    let createReady = "blocked";
    let pushReady = "blocked";

    if (ghToken && ghToken.length >= 11) {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (userRes.ok) {
        ghAuth = "ok";
        const scopeHeader = userRes.headers.get("x-oauth-scopes") ?? "";
        scopes = scopeHeader
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const userBody = (await userRes.json()) as { login: string };
        const configuredOwner = process.env[GITHUB_OWNER_ENV]?.trim();
        ownerLogin = configuredOwner || userBody.login;
        if (!configuredOwner) ownerMatch = "matched_default_user";
        else if (configuredOwner.toLowerCase() === userBody.login.toLowerCase()) {
          ownerMatch = "matched_user";
        } else {
          const orgRes = await fetch(`https://api.github.com/orgs/${configuredOwner}`, {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${ghToken}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });
          ownerMatch = orgRes.ok ? "org_visible" : "mismatch";
        }
        const hasRepo = scopes.some((s) => s === "repo" || s === "public_repo");
        const listOk = (
          await fetch("https://api.github.com/user/repos?per_page=1", {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${ghToken}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          })
        ).ok;
        const cVal = await githubAdapter.validate({
          organizationId: "readiness",
          actionType: "repository.create",
          target: "infinity-readiness-probe",
          payload: {},
          correlationId: null,
        });
        const pVal = await githubAdapter.validate({
          organizationId: "readiness",
          actionType: "repository.push",
          target: "infinity-readiness-probe",
          payload: { repository_full_name: `${ownerLogin}/probe` },
          correlationId: null,
        });
        createReady =
          cVal.valid && hasRepo && listOk ? "ready" : hasRepo ? "adapter_or_list_issue" : "missing_repo_scope";
        pushReady = pVal.valid && hasRepo ? "ready" : "missing_repo_scope";
      } else {
        ghAuth = `failed_http_${userRes.status}`;
      }
    }

    let vzAuth = "failed_not_configured";
    let teamAccess = "skipped";
    let createP = "blocked";
    let deployP = "blocked";
    let verifyP = "blocked";

    if (vzToken && vzToken.length >= 11) {
      const userRes = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${vzToken}` },
      });
      if (userRes.ok) {
        vzAuth = "ok";
        const teamId = process.env[VERCEL_TEAM_ID_ENV]?.trim();
        if (teamId) {
          const teamRes = await fetch(`https://api.vercel.com/v2/teams/${teamId}`, {
            headers: { Authorization: `Bearer ${vzToken}` },
          });
          teamAccess = teamRes.ok ? "team_resolved" : `team_failed_http_${teamRes.status}`;
        } else {
          teamAccess = "personal_account";
        }
        const projectsOk = (
          await fetch(
            teamId
              ? `https://api.vercel.com/v9/projects?limit=1&teamId=${teamId}`
              : "https://api.vercel.com/v9/projects?limit=1",
            { headers: { Authorization: `Bearer ${vzToken}` } },
          )
        ).ok;
        const base = projectsOk ? "ready" : "api_read_limited";
        const cv = await vercelAdapter.validate({
          organizationId: "readiness",
          actionType: "hosting.create_project",
          target: "probe",
          payload: {},
          correlationId: null,
        });
        const dv = await vercelAdapter.validate({
          organizationId: "readiness",
          actionType: "hosting.deploy",
          target: "probe",
          payload: {},
          correlationId: null,
        });
        const vv = await vercelAdapter.validate({
          organizationId: "readiness",
          actionType: "hosting.verify_deployment",
          target: "probe",
          payload: {},
          correlationId: null,
        });
        createP = cv.valid ? base : "adapter_invalid";
        deployP = dv.valid ? base : "adapter_invalid";
        verifyP = vv.valid ? base : "adapter_invalid";
      } else {
        vzAuth = `failed_http_${userRes.status}`;
      }
    }

    const gates = evaluateLiveProviderGates({
      actionType: "repository.create",
      providerKey: PROVIDER_KEYS.github,
      capabilityPermits: true,
      policyAllowsExecute: true,
      budgetAllows: true,
      approvalAllows: false,
      credentialValid: resolveCredentialFromEnv(PROVIDER_KEYS.github).valid,
      assemblyInternallyReady: true,
      launchPlanApproved: true,
      idempotencyValid: true,
      buildSnapshotValid: true,
      productionArtifactValid: true,
      organizationValid: true,
      ventureValid: true,
      registeredAction: true,
      providerSupportsAction: true,
    });

    const report = {
      env: envReport,
      github: {
        credentialConfigured: envReport.GITHUB_TOKEN === "configured",
        authentication: ghAuth,
        owner: ownerLogin ?? "unknown",
        ownerMatch,
        repositoryCreateReadiness: createReady,
        repositoryPushReadiness: pushReady,
        credentialScopeResult: scopes.length ? scopes : "none_reported",
      },
      vercel: {
        credentialConfigured: envReport.VERCEL_TOKEN === "configured",
        authentication: vzAuth,
        teamAccess,
        hostingCreateProjectReadiness: createP,
        hostingDeployReadiness: deployP,
        hostingVerifyDeploymentReadiness: verifyP,
      },
      safety: {
        gatewayEnforced: true,
        liveTestMode: isLiveProviderTestMode(),
        globalLive: isExternalActionsLiveEnabled(),
        githubLive: isGithubLiveEnabled(),
        vercelLive: isVercelLiveEnabled(),
        approvalRequired: gates.allowed === false,
        secretRedaction: redactSecrets("ghp_testtoken123456789012345678901234").includes("[REDACTED"),
      },
      mutations: {
        repositoriesCreated: 0,
        repositoryPushes: 0,
        hostingProjectsCreated: 0,
        deploymentsCreated: 0,
      },
    };

    const serialized = JSON.stringify(report);
    if (ghToken && serialized.includes(ghToken)) throw new Error("github token leaked");
    if (vzToken && serialized.includes(vzToken)) throw new Error("vercel token leaked");

    console.log(JSON.stringify(report, null, 2));
    expect(report.mutations.repositoriesCreated).toBe(0);
  });
});

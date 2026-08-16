import {
  PROVIDER_KEYS,
  GITHUB_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_TOKEN_ENV,
} from "../provider-config";
import { redactUnknown } from "../redaction";
import type { AdapterContext, AdapterSimulationResult, ExternalActionAdapter } from "./contract";
import { mockInfinityAdapter } from "./mock-provider";
import { resolveApprovedRepositoryName } from "@/lib/infinity/production-artifact/repository-naming";
import {
  normalizeVercelReadyState,
  pollWithBackoff,
  DEFAULT_DEPLOYMENT_POLL,
} from "@/lib/infinity/production-artifact/deployment-lifecycle";
import { VERCEL_V1_DEPLOYMENT_MODE } from "@/lib/infinity/production-artifact/constants";
import {
  buildVercelGitDeploymentBody,
  translateDeploymentManifestToVercel,
} from "@/lib/infinity/production-artifact/vercel-translation";
import type { DeploymentManifestV1 } from "@/lib/infinity/production-artifact/deployment-manifest";
import {
  classifyVercelDeploymentFailure,
  sanitizeVercelError,
} from "@/lib/infinity/production-artifact/failure-classification";

async function resolveGithubRepositoryId(repositoryFullName: string): Promise<number> {
  const token = process.env[GITHUB_TOKEN_ENV];
  if (!token) throw new Error("GITHUB_TOKEN not configured for git deployment");
  const res = await fetch(`https://api.github.com/repos/${repositoryFullName}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub repo lookup failed: ${res.status}`);
  }
  const body = (await res.json()) as { id?: number };
  if (!body.id) throw new Error("GitHub repo id missing");
  return body.id;
}

async function vercelFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env[VERCEL_TOKEN_ENV];
  if (!token) throw new Error("VERCEL_TOKEN not configured");
  const teamId = process.env[VERCEL_TEAM_ID_ENV];
  const url = teamId
    ? `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${teamId}`
    : `https://api.vercel.com${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function deploymentManifestFromPayload(payload: Record<string, unknown>): DeploymentManifestV1 | null {
  const raw = payload.deployment_manifest;
  if (!raw || typeof raw !== "object") return null;
  return raw as DeploymentManifestV1;
}

export class VercelProviderAdapter implements ExternalActionAdapter {
  capabilities = {
    provider: PROVIDER_KEYS.vercel,
    adapterKey: PROVIDER_KEYS.vercel,
    supportedActions: ["hosting.create_project", "hosting.deploy", "hosting.verify_deployment"],
    supportsSimulation: true,
    supportsVerification: true,
    supportsRollback: false,
    networkRequired: true,
    financialSideEffectPossible: false,
    liveExecutionEnabled: true,
  };

  async validate(ctx: AdapterContext) {
    if (!this.capabilities.supportedActions.includes(ctx.actionType)) {
      return { valid: false, issues: ["unsupported_action"] };
    }
    if (ctx.actionType === "hosting.deploy") {
      if (!ctx.payload.production_artifact_id) {
        return { valid: false, issues: ["missing_production_artifact_id"] };
      }
      if (!ctx.payload.commit_sha) {
        return { valid: false, issues: ["missing_commit_sha"] };
      }
      if (!ctx.payload.repository_full_name) {
        return { valid: false, issues: ["missing_repository_full_name"] };
      }
      const mode = String(ctx.payload.deployment_mode ?? VERCEL_V1_DEPLOYMENT_MODE);
      if (mode !== VERCEL_V1_DEPLOYMENT_MODE) {
        return { valid: false, issues: ["unsupported_deployment_mode"] };
      }
    }
    if (ctx.actionType === "hosting.create_project") {
      if (!ctx.payload.repository_full_name) {
        return { valid: false, issues: ["missing_repository_full_name"] };
      }
    }
    return { valid: true, issues: [] };
  }

  async estimate() {
    return { estimatedCostUsd: 0, currency: "USD" };
  }

  async simulate(ctx: AdapterContext): Promise<AdapterSimulationResult> {
    return mockInfinityAdapter.simulate(ctx);
  }

  async execute(ctx: AdapterContext): Promise<AdapterSimulationResult> {
    const { repoName: projectName } = resolveApprovedRepositoryName(ctx.target);

    if (ctx.actionType === "hosting.create_project") {
      const artifactId = String(ctx.payload.production_artifact_id ?? "");
      const artifactHash = String(ctx.payload.artifact_hash ?? "");
      const repositoryFullName = String(ctx.payload.repository_full_name ?? "");
      const linkExistingId = String(ctx.payload.link_existing_project_id ?? "");
      const manifest = deploymentManifestFromPayload(ctx.payload);
      const translation = manifest
        ? translateDeploymentManifestToVercel(manifest)
        : { valid: true, translation: null, issues: [] as string[] };
      const framework =
        translation.translation?.projectSettings.framework ??
        (manifest?.framework === "nextjs" ? "nextjs" : null);

      if (linkExistingId && ctx.payload.configure_git_link === true) {
        const res = await vercelFetch(`/v9/projects/${encodeURIComponent(linkExistingId)}/link`, {
          method: "POST",
          body: JSON.stringify({
            type: "github",
            repo: repositoryFullName,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Vercel link project git failed: ${res.status} ${errText.slice(0, 200)}`);
        }
        const body = (await res.json()) as { id?: string; name?: string; projectId?: string };
        return {
          simulated: false,
          externalIds: {
            project_id: linkExistingId,
            project_name: body.name ?? projectName,
          },
          manifest: redactUnknown({
            provider: PROVIDER_KEYS.vercel,
            action_type: ctx.actionType,
            execution_mode: "live",
            deployment_mode: VERCEL_V1_DEPLOYMENT_MODE,
            configure_git_link: true,
            production_artifact_id: artifactId,
            artifact_hash: artifactHash,
            repository_full_name: repositoryFullName,
          }) as Record<string, unknown>,
        };
      }

      const res = await vercelFetch("/v10/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName,
          framework,
          gitRepository: repositoryFullName
            ? { type: "github", repo: repositoryFullName }
            : undefined,
          ...(translation.translation?.projectSettings ?? {}),
        }),
      });
      if (!res.ok) throw new Error(`Vercel create project failed: ${res.status}`);
      const body = (await res.json()) as { id: string; name: string };
      return {
        simulated: false,
        externalIds: { project_id: body.id, project_name: body.name },
        manifest: redactUnknown({
          provider: PROVIDER_KEYS.vercel,
          action_type: ctx.actionType,
          execution_mode: "live",
          deployment_mode: VERCEL_V1_DEPLOYMENT_MODE,
          production_artifact_id: artifactId,
          artifact_hash: artifactHash,
          repository_full_name: repositoryFullName,
        }) as Record<string, unknown>,
      };
    }

    if (ctx.actionType === "hosting.deploy") {
      const projectId = String(ctx.payload.project_id ?? "");
      const artifactHash = String(ctx.payload.content_hash ?? ctx.payload.artifact_hash ?? "");
      const commitSha = String(ctx.payload.commit_sha ?? "");
      const repositoryFullName = String(ctx.payload.repository_full_name ?? "");
      const branch = String(ctx.payload.branch ?? "main");

      const repositoryId =
        typeof ctx.payload.github_repository_id === "number"
          ? ctx.payload.github_repository_id
          : await resolveGithubRepositoryId(repositoryFullName);

      const deployBody = buildVercelGitDeploymentBody({
        projectName,
        projectId,
        repositoryFullName,
        repositoryId,
        commitSha,
        branch,
        target: String(ctx.payload.target ?? "production"),
      });

      const res = await vercelFetch("/v13/deployments", {
        method: "POST",
        body: JSON.stringify(deployBody),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Vercel deploy failed: ${res.status} ${errText.slice(0, 200)}`);
      }
      const body = (await res.json()) as {
        id: string;
        url?: string;
        readyState?: string;
        errorCode?: string;
        errorMessage?: string;
      };

      const poll = await pollWithBackoff(async () => {
        const statusRes = await vercelFetch(`/v13/deployments/${body.id}`);
        if (!statusRes.ok) {
          return { done: false, state: "building" as const };
        }
        const status = (await statusRes.json()) as {
          id: string;
          url?: string;
          readyState?: string;
          errorCode?: string;
          errorMessage?: string;
        };
        const state = normalizeVercelReadyState(status.readyState);
        if (state === "ready") {
          return { done: true, value: status, state };
        }
        if (state === "failed" || state === "cancelled") {
          return { done: false, state, value: status };
        }
        return { done: false, state: "building" as const };
      }, DEFAULT_DEPLOYMENT_POLL);

      const failedStatus = poll.value as
        | { errorCode?: string; errorMessage?: string; readyState?: string }
        | undefined;

      if (poll.state !== "ready" || !poll.value) {
        const diagnostics = sanitizeVercelError({
          errorCode: failedStatus?.errorCode ?? body.errorCode,
          errorMessage: failedStatus?.errorMessage ?? body.errorMessage,
          readyState: failedStatus?.readyState ?? body.readyState,
        });
        const failureReason = classifyVercelDeploymentFailure({
          readyState: diagnostics.readyState,
          errorCode: diagnostics.errorCode,
          errorMessage: diagnostics.errorMessage,
          pollState: poll.state,
        });
        return {
          simulated: false,
          externalIds: {
            deployment_id: body.id,
            url: body.url ?? "",
          },
          manifest: redactUnknown({
            provider: PROVIDER_KEYS.vercel,
            action_type: ctx.actionType,
            execution_mode: "live",
            deployment_mode: VERCEL_V1_DEPLOYMENT_MODE,
            provider_lifecycle_state: poll.state,
            ready: false,
            artifact_hash: artifactHash,
            commit_sha: commitSha,
            repository_full_name: repositoryFullName,
            provider_error:
              poll.state === "timed_out" ? "deployment_timed_out" : "deployment_not_ready",
            failure_reason: failureReason,
            provider_diagnostics: diagnostics,
          }) as Record<string, unknown>,
        };
      }

      const ready = poll.value;
      return {
        simulated: false,
        externalIds: {
          deployment_id: ready.id ?? body.id,
          url: ready.url ?? body.url ?? "",
        },
        manifest: redactUnknown({
          provider: PROVIDER_KEYS.vercel,
          action_type: ctx.actionType,
          execution_mode: "live",
          deployment_mode: VERCEL_V1_DEPLOYMENT_MODE,
          provider_lifecycle_state: "ready",
          ready_state: "READY",
          ready: true,
          artifact_hash: artifactHash,
          commit_sha: commitSha,
          repository_full_name: repositoryFullName,
          poll_attempts: poll.attempts,
        }) as Record<string, unknown>,
      };
    }

    if (ctx.actionType === "hosting.verify_deployment") {
      const deploymentId = String(ctx.payload.deployment_id ?? "");
      const res = await vercelFetch(`/v13/deployments/${deploymentId}`);
      if (!res.ok) throw new Error(`Vercel verify deployment failed: ${res.status}`);
      const body = (await res.json()) as { id: string; url?: string; readyState?: string };
      const ready = body.readyState === "READY";
      return {
        simulated: false,
        externalIds: { deployment_id: body.id, url: body.url ?? "" },
        manifest: redactUnknown({
          provider: PROVIDER_KEYS.vercel,
          action_type: ctx.actionType,
          execution_mode: "live",
          ready_state: body.readyState,
          verified: ready,
        }) as Record<string, unknown>,
      };
    }

    throw new Error(`Vercel live action not implemented: ${ctx.actionType}`);
  }

  async verify(ctx: AdapterContext, result: AdapterSimulationResult) {
    if (result.manifest.execution_mode !== "live") {
      return mockInfinityAdapter.verify(ctx, result);
    }
    if (ctx.actionType === "hosting.deploy") {
      if (result.manifest.ready !== true) {
        return {
          verified: false,
          details: [String(result.manifest.provider_error ?? "deployment_not_ready")],
        };
      }
      const deploymentId = result.externalIds.deployment_id;
      if (!deploymentId) {
        return { verified: false, details: ["missing_deployment_id"] };
      }
      const res = await vercelFetch(`/v13/deployments/${deploymentId}`);
      if (!res.ok) {
        return { verified: false, details: ["deployment_not_found"] };
      }
      const body = (await res.json()) as { readyState?: string };
      const ok = body.readyState === "READY";
      return { verified: ok, details: ok ? [] : ["provider_not_ready"] };
    }
    const deploymentId = result.externalIds.deployment_id;
    if (ctx.actionType === "hosting.verify_deployment" && deploymentId) {
      const res = await vercelFetch(`/v13/deployments/${deploymentId}`);
      return { verified: res.ok, details: res.ok ? [] : ["deployment_not_found"] };
    }
    return {
      verified: Boolean(result.externalIds.project_id || result.externalIds.deployment_id),
      details: [],
    };
  }
}

export const vercelAdapter = new VercelProviderAdapter();

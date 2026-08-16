import {
  GITHUB_OWNER_ENV,
  GITHUB_TOKEN_ENV,
  PROVIDER_KEYS,
} from "../provider-config";
import { redactUnknown } from "../redaction";
import type {
  AdapterContext,
  AdapterSimulationResult,
  ExternalActionAdapter,
} from "./contract";
import { mockInfinityAdapter } from "./mock-provider";
import { resolveApprovedRepositoryName, assertRepositoryNameMatchesApproval } from "@/lib/infinity/production-artifact/repository-naming";
import {
  pushProductionArtifactToGithub,
  verifyGithubTreeAgainstManifest,
  type GithubFetch,
} from "@/lib/infinity/production-artifact/github-artifact-push";
import type { ProductionArtifactFile } from "@/lib/infinity/production-artifact/types";

async function githubFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env[GITHUB_TOKEN_ENV];
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
}

function parseArtifactFiles(payload: Record<string, unknown>): ProductionArtifactFile[] {
  const raw = payload._artifact_files;
  if (!Array.isArray(raw)) {
    throw new Error("production_artifact_files_missing");
  }
  return raw.map((f) => {
    const row = f as Record<string, unknown>;
    return {
      relativePath: String(row.relativePath),
      contentHash: String(row.contentHash),
      byteSize: Number(row.byteSize),
      fileMode: String(row.fileMode ?? "100644"),
      contentText: String(row.contentText ?? ""),
    };
  });
}

export class GithubProviderAdapter implements ExternalActionAdapter {
  capabilities = {
    provider: PROVIDER_KEYS.github,
    adapterKey: PROVIDER_KEYS.github,
    supportedActions: ["repository.create", "repository.push"],
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
    if (!ctx.target) return { valid: false, issues: ["missing_target"] };
    if (ctx.actionType === "repository.push") {
      if (!ctx.payload.production_artifact_id) {
        return { valid: false, issues: ["missing_production_artifact_id"] };
      }
      if (!ctx.payload.content_hash && !ctx.payload.artifact_hash) {
        return { valid: false, issues: ["missing_artifact_hash"] };
      }
    }
    return { valid: true, issues: [] };
  }

  async estimate() {
    return { estimatedCostUsd: 0, currency: "USD" };
  }

  async simulate(ctx: AdapterContext): Promise<AdapterSimulationResult> {
    return mockInfinityAdapter.simulate({
      ...ctx,
      actionType: ctx.actionType,
    });
  }

  async execute(ctx: AdapterContext): Promise<AdapterSimulationResult> {
    return this.executeLive(ctx);
  }

  async executeLive(ctx: AdapterContext): Promise<AdapterSimulationResult> {
    const owner = process.env[GITHUB_OWNER_ENV] ?? "me";
    const { repoName } = resolveApprovedRepositoryName(ctx.target);
    assertRepositoryNameMatchesApproval({ approvedTarget: ctx.target, resolvedName: repoName });

    if (ctx.actionType === "repository.create") {
      const res = await githubFetch("/user/repos", {
        method: "POST",
        body: JSON.stringify({
          name: repoName,
          private: true,
          auto_init: true,
          description: "Infinity production repository",
        }),
      });
      if (res.status === 422) {
        const existing = await githubFetch(`/repos/${owner}/${repoName}`);
        if (!existing.ok) {
          throw new Error(`GitHub repository create failed: ${res.status}`);
        }
        const body = (await existing.json()) as { id: number; html_url: string; full_name: string };
        return {
          simulated: false,
          externalIds: {
            simulation_id: String(body.id),
            repository_id: String(body.id),
            repository_full_name: body.full_name,
          },
          manifest: redactUnknown({
            provider: PROVIDER_KEYS.github,
            action_type: ctx.actionType,
            execution_mode: "live",
            html_url: body.html_url,
            repository_name: repoName,
          }) as Record<string, unknown>,
        };
      }
      if (!res.ok) {
        throw new Error(`GitHub repository create failed: ${res.status}`);
      }
      const body = (await res.json()) as { id: number; html_url: string; full_name: string };
      return {
        simulated: false,
        externalIds: {
          simulation_id: String(body.id),
          repository_id: String(body.id),
          repository_full_name: body.full_name,
        },
        manifest: redactUnknown({
          provider: PROVIDER_KEYS.github,
          action_type: ctx.actionType,
          execution_mode: "live",
          html_url: body.html_url,
          repository_name: repoName,
        }) as Record<string, unknown>,
      };
    }

    if (ctx.actionType === "repository.push") {
      const repo = String(ctx.payload.repository_full_name ?? `${owner}/${repoName}`);
      const artifactId = String(ctx.payload.production_artifact_id);
      const artifactHash = String(
        ctx.payload.content_hash ?? ctx.payload.artifact_hash ?? "",
      );
      const branch = String(ctx.payload.branch ?? "main");
      const files = parseArtifactFiles(ctx.payload);

      const pushResult = await pushProductionArtifactToGithub(githubFetch as GithubFetch, {
        repositoryFullName: repo,
        branch,
        artifactId,
        artifactHash,
        files,
      });

      return {
        simulated: false,
        externalIds: {
          simulation_id: pushResult.commitSha,
          commit_sha: pushResult.commitSha,
          artifact_id: artifactId,
        },
        manifest: redactUnknown({
          provider: PROVIDER_KEYS.github,
          action_type: ctx.actionType,
          execution_mode: "live",
          repository: repo,
          branch: pushResult.branch,
          file_count: pushResult.fileCount,
          artifact_hash: artifactHash,
          verification_pending: true,
        }) as Record<string, unknown>,
      };
    }

    throw new Error(`GitHub live action not implemented: ${ctx.actionType}`);
  }

  async verify(ctx: AdapterContext, result: AdapterSimulationResult) {
    if (result.manifest.execution_mode === "live") {
      if (ctx.actionType === "repository.push") {
        const repo = String(ctx.payload.repository_full_name ?? "");
        if (!repo) {
          return { verified: false, details: ["missing_repository_full_name"] };
        }
        const commitSha = result.externalIds.commit_sha;
        if (!commitSha) {
          return { verified: false, details: ["missing_commit_sha"] };
        }
        const fileCount = Number(result.manifest.file_count ?? 0);
        const treeCheck = await verifyGithubTreeAgainstManifest(githubFetch as GithubFetch, {
          repositoryFullName: repo,
          commitSha,
          expectedFileCount: fileCount,
          criticalPaths: ["INFINITY_ARTIFACT_IDENTITY.json"],
          prohibitedPaths: [".env", ".env.local"],
        });
        return treeCheck;
      }
      const repo = result.externalIds.repository_full_name;
      if (!repo) {
        return { verified: false, details: ["missing_repository_full_name"] };
      }
      const res = await githubFetch(`/repos/${repo}`);
      return { verified: res.ok, details: res.ok ? [] : ["repository_not_found"] };
    }
    return mockInfinityAdapter.verify(ctx, result);
  }
}

export const githubAdapter = new GithubProviderAdapter();

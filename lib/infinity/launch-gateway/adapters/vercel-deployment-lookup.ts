import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "../provider-config";
import { normalizeVercelGitRepository } from "./vercel-project-lookup";

export const VERCEL_DEPLOYMENT_LOOKUP_SUPPORTED = true;

export type VercelDeploymentLookupResult = {
  supported: true;
  found: boolean;
  id: string | null;
  projectId: string | null;
  url: string | null;
  readyState: string | null;
  commitSha: string | null;
  gitRepository: string | null;
  matchesProject: boolean;
  matchesSha: boolean;
  matchesRepository: boolean;
  inProgress: boolean;
  reusable: boolean;
  httpStatus: number | null;
};

function commitShaFromDeployment(item: {
  meta?: { githubCommitSha?: string };
  gitSource?: { sha?: string };
}): string | null {
  return item.meta?.githubCommitSha ?? item.gitSource?.sha ?? null;
}

function repositoryFromDeployment(item: {
  meta?: { githubOrg?: string; githubRepo?: string };
  gitSource?: { repo?: string; org?: string };
}): string | null {
  if (item.meta?.githubOrg && item.meta?.githubRepo) {
    return `${item.meta.githubOrg}/${item.meta.githubRepo}`;
  }
  if (item.gitSource?.org && item.gitSource?.repo) {
    return `${item.gitSource.org}/${item.gitSource.repo}`;
  }
  return item.gitSource?.repo ?? null;
}

/**
 * Read-only Vercel deployment lookup by project + SHA.
 * Uses GET /v6/deployments?projectId=&sha= when the provider accepts sha,
 * then filters the returned list. Never mutates provider state.
 */
export async function lookupVercelDeploymentBySha(input: {
  projectId: string;
  commitSha: string;
  repositoryFullName?: string | null;
  teamId?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<VercelDeploymentLookupResult> {
  const projectId = input.projectId.trim();
  const commitSha = input.commitSha.trim().toLowerCase();
  const teamId = input.teamId ?? process.env[VERCEL_TEAM_ID_ENV] ?? null;
  const empty: VercelDeploymentLookupResult = {
    supported: true,
    found: false,
    id: null,
    projectId,
    url: null,
    readyState: null,
    commitSha: null,
    gitRepository: null,
    matchesProject: false,
    matchesSha: false,
    matchesRepository: false,
    inProgress: false,
    reusable: false,
    httpStatus: null,
  };
  if (!projectId || !commitSha) return empty;

  const token = process.env[VERCEL_TOKEN_ENV];
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!input.fetchImpl && (!token || token.trim().length < 11)) {
    throw new Error("VERCEL_TOKEN not configured");
  }

  const query = new URLSearchParams({
    projectId,
    sha: commitSha,
    limit: "20",
  });
  if (teamId) query.set("teamId", teamId);
  const url = `https://api.vercel.com/v6/deployments?${query.toString()}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchImpl(url, { method: "GET", headers });
  if (res.status === 404) return { ...empty, httpStatus: 404 };
  if (!res.ok) {
    throw new Error(`Vercel deployment lookup failed: ${res.status}`);
  }
  const body = (await res.json()) as {
    deployments?: Array<{
      uid?: string;
      id?: string;
      url?: string;
      projectId?: string;
      readyState?: string;
      state?: string;
      meta?: { githubCommitSha?: string; githubOrg?: string; githubRepo?: string };
      gitSource?: { sha?: string; repo?: string; org?: string };
    }>;
  };
  const expectedRepo = normalizeVercelGitRepository(input.repositoryFullName);
  const match = (body.deployments ?? []).find((item) => {
    const sha = (commitShaFromDeployment(item) ?? "").toLowerCase();
    const repo = normalizeVercelGitRepository(repositoryFromDeployment(item));
    const projectOk = !item.projectId || item.projectId === projectId;
    const shaOk = sha === commitSha;
    const repoOk = !expectedRepo || !repo || repo === expectedRepo;
    return projectOk && shaOk && repoOk;
  });
  if (!match) return { ...empty, httpStatus: 200 };

  const readyState = (match.readyState ?? match.state ?? "").toUpperCase();
  const inProgress = ["BUILDING", "INITIALIZING", "QUEUED", "PENDING"].includes(readyState);
  const reusable = readyState === "READY" || inProgress;
  const gitRepository = repositoryFromDeployment(match);
  const sha = commitShaFromDeployment(match);
  return {
    supported: true,
    found: true,
    id: match.uid ?? match.id ?? null,
    projectId: match.projectId ?? projectId,
    url: match.url ? `https://${match.url.replace(/^https?:\/\//, "")}` : null,
    readyState,
    commitSha: sha,
    gitRepository,
    matchesProject: !match.projectId || match.projectId === projectId,
    matchesSha: (sha ?? "").toLowerCase() === commitSha,
    matchesRepository: !expectedRepo || normalizeVercelGitRepository(gitRepository) === expectedRepo,
    inProgress,
    reusable,
    httpStatus: 200,
  };
}

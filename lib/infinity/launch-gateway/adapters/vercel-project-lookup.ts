import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "../provider-config";

export const VERCEL_PROJECT_LOOKUP_SUPPORTED = true;

export type VercelProjectLookupResult = {
  supported: true;
  found: boolean;
  id: string | null;
  name: string | null;
  teamId: string | null;
  accountId?: string | null;
  gitRepository?: string | null;
  sourceIdentityAvailable?: boolean;
  matchesVerificationTarget: boolean;
  matchesExpectedTeam?: boolean | null;
  matchesExpectedRepository?: boolean | null;
  httpStatus: number | null;
};

export function normalizeVercelGitRepository(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
}

export function gitRepositoryFromVercelProject(body: {
  link?: { type?: string; repo?: string; org?: string } | null;
}): string | null {
  const link = body.link;
  if (!link) return null;
  if (link.org && link.repo) return `${link.org}/${link.repo}`;
  if (link.repo && link.repo.includes("/")) return link.repo;
  return link.repo ?? null;
}

function isDisposableVerificationProjectName(name: string): boolean {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed.startsWith("infinity-test-")) return false;
  if (/(\bprod\b|production|customer|payments|stripe|live-venture)/.test(trimmed)) return false;
  return trimmed.length >= "infinity-test-x".length;
}

export function projectNameMatchesVerificationTarget(input: {
  requestedName: string;
  providerName: string | null | undefined;
}): boolean {
  const requested = input.requestedName.trim();
  const provider = input.providerName?.trim() ?? "";
  return Boolean(
    requested &&
      provider &&
      requested === provider &&
      isDisposableVerificationProjectName(requested) &&
      isDisposableVerificationProjectName(provider),
  );
}

/**
 * Read-only Vercel project existence check. Never mutates provider state.
 * GET /v9/projects/:name is supported; a 404 means the name is unused.
 */
function emptyLookup(
  teamId: string | null,
  extras: Partial<VercelProjectLookupResult> = {},
): VercelProjectLookupResult {
  return {
    supported: true,
    found: false,
    id: null,
    name: null,
    teamId,
    accountId: null,
    gitRepository: null,
    sourceIdentityAvailable: false,
    matchesVerificationTarget: false,
    matchesExpectedTeam: null,
    matchesExpectedRepository: null,
    httpStatus: null,
    ...extras,
  };
}

export async function lookupVercelProjectByName(input: {
  name: string;
  teamId?: string | null;
  expectedRepository?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<VercelProjectLookupResult> {
  const name = input.name.trim();
  const teamId = input.teamId ?? process.env[VERCEL_TEAM_ID_ENV] ?? null;
  if (!name) {
    return emptyLookup(teamId);
  }

  const token = process.env[VERCEL_TOKEN_ENV];
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!input.fetchImpl && (!token || token.trim().length < 11)) {
    throw new Error("VERCEL_TOKEN not configured");
  }

  const path = `/v9/projects/${encodeURIComponent(name)}`;
  const url = teamId
    ? `https://api.vercel.com${path}?teamId=${encodeURIComponent(teamId)}`
    : `https://api.vercel.com${path}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchImpl(url, { method: "GET", headers });
  if (res.status === 404) {
    return emptyLookup(teamId, { httpStatus: 404 });
  }
  if (!res.ok) {
    throw new Error(`Vercel project lookup failed: ${res.status}`);
  }
  const body = (await res.json()) as {
    id?: string;
    name?: string;
    accountId?: string;
    link?: { type?: string; repo?: string; org?: string } | null;
  };
  const providerName = body.name ?? null;
  const gitRepository = gitRepositoryFromVercelProject(body);
  const expectedRepo = normalizeVercelGitRepository(input.expectedRepository);
  const linkedRepo = normalizeVercelGitRepository(gitRepository);
  const accountId = body.accountId ?? null;
  return {
    supported: true,
    found: Boolean(body.id),
    id: body.id ?? null,
    name: providerName,
    teamId,
    accountId,
    gitRepository,
    sourceIdentityAvailable: Boolean(linkedRepo),
    matchesVerificationTarget: projectNameMatchesVerificationTarget({
      requestedName: name,
      providerName,
    }),
    matchesExpectedTeam: teamId && accountId ? accountId === teamId : teamId ? true : null,
    matchesExpectedRepository: expectedRepo && linkedRepo ? expectedRepo === linkedRepo : expectedRepo ? false : null,
    httpStatus: 200,
  };
}

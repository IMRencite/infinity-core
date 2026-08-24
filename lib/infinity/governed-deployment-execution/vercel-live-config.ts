import {
  GITHUB_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_TOKEN_ENV,
} from "@/lib/infinity/launch-gateway/provider-config";
import {
  INFINITY_VERCEL_LEFTOVER_ACCEPTED_ENV,
  INFINITY_VERCEL_TEST_ARTIFACT_ENV,
  INFINITY_VERCEL_TEST_REPO_ENV,
  INFINITY_VERCEL_TEST_RESOURCE_ENV,
  INFINITY_VERCEL_TEST_SHA_ENV,
  INFINITY_VERCEL_TEST_TEAM_CONFIRMED_ENV,
  VERCEL_LIVE_ALLOWED_ACTIONS,
  VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH,
  VERCEL_LIVE_VERIFICATION_RESOURCE,
  VERCEL_TOKEN_SCOPE_ENV,
  VERCEL_TOKEN_SCOPE_KIND_ENV,
} from "./vercel-live";

export const VERCEL_LIVE_SCOPE_KIND_REQUIRED = "INFINITY_INTENDED" as const;
export const VERCEL_LIVE_MAX_PROJECTS = 1;
export const VERCEL_LIVE_MAX_DEPLOYMENTS = 1;

export type VercelLiveScopeKind = "INFINITY_INTENDED" | "PROVIDER_ENFORCED" | "MISSING" | "UNKNOWN";

export type VercelLiveVerificationConfig = {
  credentialPresent: boolean;
  tokenEnvName: typeof VERCEL_TOKEN_ENV;
  intendedActions: string[];
  scopeNormalized: string;
  scopeKind: VercelLiveScopeKind;
  intendedScopeExact: boolean;
  intendedScopeAttested: boolean;
  providerEnforcedClaimed: boolean;
  teamConfigured: boolean;
  teamLooksProduction: boolean;
  testTeamConfirmed: boolean;
  testResource: string | null;
  testResourceDisposable: boolean;
  repository: string | null;
  repositoryValid: boolean;
  repositoryDisposable: boolean;
  sha: string | null;
  shaValid: boolean;
  artifactId: string | null;
  artifactMatched: boolean;
  artifactPath: typeof VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH;
  leftoverAccepted: boolean;
  githubLookupPresent: boolean;
  requiresGitHubReadForDeploy: true;
  scopeAloneGrantsLive: false;
};

function envText(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function envFlag(name: string): boolean {
  const value = process.env[name];
  return value === "true" || value === "1";
}

export function normalizeVercelIntendedScope(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const unique = new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  return [...unique].sort((a, b) => a.localeCompare(b));
}

export function expectedVercelIntendedScope(): string[] {
  return [...VERCEL_LIVE_ALLOWED_ACTIONS].sort((a, b) => a.localeCompare(b));
}

export function isValidVercelTestRepositoryName(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.trim());
}

export function isDisposableVercelTestRepositoryName(value: string | null | undefined): boolean {
  if (!isValidVercelTestRepositoryName(value)) return false;
  const repo = value!.trim().split("/")[1] ?? "";
  return repo.startsWith("infinity-test-");
}

export function isValidGitSha(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{7,40}$/i.test(value.trim());
}

export function teamIdLooksProduction(value: string | null | undefined): boolean {
  if (!value) return false;
  return /(\bprod\b|production|customer|live-venture)/i.test(value);
}

export function isDisposableVercelTestResourceName(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.startsWith("infinity-test-")) return false;
  if (/(\bprod\b|production|customer|payments|stripe|live-venture)/.test(trimmed)) return false;
  return trimmed.length >= "infinity-test-x".length;
}

export function loadVercelLiveVerificationConfig(): VercelLiveVerificationConfig {
  const token = envText(VERCEL_TOKEN_ENV);
  const credentialPresent = Boolean(token && token.length >= 11);
  const intendedActions = normalizeVercelIntendedScope(envText(VERCEL_TOKEN_SCOPE_ENV));
  const expected = expectedVercelIntendedScope();
  const intendedScopeExact =
    intendedActions.length === expected.length && expected.every((action, index) => intendedActions[index] === action);
  const kindRaw = envText(VERCEL_TOKEN_SCOPE_KIND_ENV)?.toUpperCase() ?? "";
  const scopeKind: VercelLiveScopeKind =
    kindRaw === "INFINITY_INTENDED"
      ? "INFINITY_INTENDED"
      : kindRaw === "PROVIDER_ENFORCED"
        ? "PROVIDER_ENFORCED"
        : kindRaw
          ? "UNKNOWN"
          : "MISSING";
  const providerEnforcedClaimed = scopeKind === "PROVIDER_ENFORCED";
  const intendedScopeAttested = intendedScopeExact && scopeKind === "INFINITY_INTENDED";
  const teamId = envText(VERCEL_TEAM_ID_ENV);
  const repository = envText(INFINITY_VERCEL_TEST_REPO_ENV);
  const sha = envText(INFINITY_VERCEL_TEST_SHA_ENV);
  const artifactId = envText(INFINITY_VERCEL_TEST_ARTIFACT_ENV);
  const testResource = envText(INFINITY_VERCEL_TEST_RESOURCE_ENV) ?? VERCEL_LIVE_VERIFICATION_RESOURCE;

  return {
    credentialPresent,
    tokenEnvName: VERCEL_TOKEN_ENV,
    intendedActions,
    scopeNormalized: intendedActions.join(","),
    scopeKind,
    intendedScopeExact,
    intendedScopeAttested,
    providerEnforcedClaimed,
    teamConfigured: Boolean(teamId),
    teamLooksProduction: teamIdLooksProduction(teamId),
    testTeamConfirmed: envFlag(INFINITY_VERCEL_TEST_TEAM_CONFIRMED_ENV),
    testResource,
    testResourceDisposable: isDisposableVercelTestResourceName(testResource),
    repository,
    repositoryValid: isValidVercelTestRepositoryName(repository),
    repositoryDisposable: isDisposableVercelTestRepositoryName(repository),
    sha,
    shaValid: isValidGitSha(sha),
    artifactId,
    artifactMatched: artifactId === VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
    artifactPath: VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH,
    leftoverAccepted: envFlag(INFINITY_VERCEL_LEFTOVER_ACCEPTED_ENV),
    githubLookupPresent: Boolean(envText(GITHUB_TOKEN_ENV) && (envText(GITHUB_TOKEN_ENV)?.length ?? 0) >= 11),
    requiresGitHubReadForDeploy: true,
    scopeAloneGrantsLive: false,
  };
}

export function classifyVercelLiveCost(): "KNOWN_ZERO" | "KNOWN_COST" | "POTENTIALLY_BILLABLE" | "UNKNOWN" {
  return "UNKNOWN";
}

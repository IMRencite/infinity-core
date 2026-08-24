import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import type {
  ActionAuthorityGrant,
  GovernedDeploymentExecutionRequest,
  ProviderWriteEvidence,
  TreasuryActionGrant,
} from "./types";
import { isLiveProviderTestMode } from "@/lib/infinity/launch-gateway/provider-config";
import {
  loadVercelLiveVerificationConfig,
  type VercelLiveScopeKind,
  type VercelLiveVerificationConfig,
} from "./vercel-live-config";
import { classifyVercelLiveCost } from "./vercel-live-config";

const REQUIRED_EAG_ACTIONS = ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"] as const;
const REQUIRED_TREASURY_ACTIONS = ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"] as const;

export type VercelLiveVerificationPreflight = {
  credentialPresent: boolean;
  scopeAttested: boolean;
  scopeKind: VercelLiveScopeKind;
  teamConfigured: boolean;
  testTeamConfirmed: boolean;
  repositoryConfigured: boolean;
  shaConfigured: boolean;
  artifactMatched: boolean;
  leftoverAccepted: boolean;
  readinessSatisfied: boolean;
  deploymentAuthoritySatisfied: boolean;
  eagSatisfied: boolean;
  treasurySatisfied: boolean;
  costPolicySatisfied: boolean;
  idempotencySatisfied: boolean;
  publicLaunchDisabled: boolean;
  safeToExecuteLive: boolean;
  blockers: string[];
  config: VercelLiveVerificationConfig;
};

export function preflightVercelLiveTreasury(input: {
  grants: TreasuryActionGrant[];
  expectedVentureId?: string | null;
  now?: string;
}): { satisfied: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const now = input.now ? Date.parse(input.now) : Date.now();
  for (const action of REQUIRED_TREASURY_ACTIONS) {
    const grant = input.grants.find((row) => row.actionType === action);
    if (!grant) {
      blockers.push(`treasury authorization missing for ${action}`);
      continue;
    }
    if (grant.decision !== "AUTO_AUTHORIZE") blockers.push(`treasury decision is not AUTO_AUTHORIZE for ${action}`);
    if (grant.costActuality === "UNKNOWN") blockers.push(`treasury costActuality is UNKNOWN for ${action}`);
    if (grant.costActuality !== "ESTIMATE" && grant.costActuality !== "KNOWN") {
      blockers.push(`treasury costActuality must be ESTIMATE or KNOWN for ${action}`);
    }
    if (grant.authorizedAmountUsd == null || grant.authorizedAmountUsd <= 0) {
      blockers.push(`treasury hard ceiling must be a positive amount for ${action}`);
    }
    if (grant.invalidated) blockers.push(`treasury authorization is invalidated for ${action}`);
    if (grant.expiresAt && Number.isFinite(Date.parse(grant.expiresAt)) && Date.parse(grant.expiresAt) <= now) {
      blockers.push(`treasury authorization is expired for ${action}`);
    }
    if (input.expectedVentureId && grant.ventureId && grant.ventureId !== input.expectedVentureId) {
      blockers.push(`treasury venture does not match for ${action}`);
    }
  }
  return { satisfied: blockers.length === 0, blockers };
}

export function preflightVercelLiveEag(input: { grants: ActionAuthorityGrant[] }): {
  satisfied: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  for (const action of REQUIRED_EAG_ACTIONS) {
    const matches = input.grants.filter((row) => row.actionType === action && row.decision === "AUTO_AUTHORIZE");
    if (matches.length === 0) blockers.push(`EAG AUTO_AUTHORIZE missing for ${action}`);
  }
  const reused = input.grants.some((row) => {
    if (row.decision !== "AUTO_AUTHORIZE") return false;
    return !REQUIRED_EAG_ACTIONS.includes(row.actionType as (typeof REQUIRED_EAG_ACTIONS)[number]) &&
      (row.actionType === "UPSERT_DNS_RECORD" || row.actionType === "BIND_DOMAIN" || row.actionType === "PURCHASE_DOMAIN");
  });
  void reused;
  return { satisfied: blockers.length === 0, blockers };
}

export function evaluateVercelLiveVerificationPreflight(input?: {
  request?: GovernedDeploymentExecutionRequest | null;
  readiness?: GovernedDeploymentReadiness | null;
  eagAuthorizations?: ActionAuthorityGrant[];
  treasuryAuthorizations?: TreasuryActionGrant[];
  providerWrites?: ProviderWriteEvidence[];
  now?: string;
}): VercelLiveVerificationPreflight {
  const config = loadVercelLiveVerificationConfig();
  const request = input?.request ?? null;
  const readiness = input?.readiness ?? null;
  const blockers: string[] = [];

  if (!config.credentialPresent) blockers.push("VERCEL_TOKEN is missing");
  if (!config.intendedScopeExact) blockers.push("VERCEL_TOKEN_SCOPE is missing or is not the exact Infinity-intended action set");
  if (config.providerEnforcedClaimed) blockers.push("VERCEL_TOKEN_SCOPE_KIND=PROVIDER_ENFORCED is not allowed");
  if (config.scopeKind !== "INFINITY_INTENDED") blockers.push("VERCEL_TOKEN_SCOPE_KIND must be INFINITY_INTENDED");
  if (!config.teamConfigured) blockers.push("VERCEL_TEAM_ID is missing");
  if (config.teamLooksProduction) blockers.push("VERCEL_TEAM_ID looks like a production team");
  if (!config.testTeamConfirmed) blockers.push("INFINITY_VERCEL_TEST_TEAM_CONFIRMED is not true");
  if (!config.testResourceDisposable) blockers.push("INFINITY_VERCEL_TEST_RESOURCE is not a disposable infinity-test resource");
  if (!config.repository) blockers.push("INFINITY_VERCEL_TEST_REPO is missing");
  else if (!config.repositoryValid) blockers.push("INFINITY_VERCEL_TEST_REPO is not owner/repo");
  else if (!config.repositoryDisposable) blockers.push("INFINITY_VERCEL_TEST_REPO is not a disposable infinity-test repository");
  if (!config.sha) blockers.push("INFINITY_VERCEL_TEST_SHA is missing");
  else if (!config.shaValid) blockers.push("INFINITY_VERCEL_TEST_SHA is not a valid Git SHA");
  if (!config.artifactId) blockers.push("INFINITY_VERCEL_TEST_ARTIFACT_ID is missing");
  else if (!config.artifactMatched) blockers.push("INFINITY_VERCEL_TEST_ARTIFACT_ID does not match the canonical verification artifact");
  if (!config.leftoverAccepted) blockers.push("INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED is not true");
  if (!config.githubLookupPresent) {
    blockers.push("GITHUB_TOKEN is required for the existing Vercel git-deploy adapter repository lookup (read-only)");
  }
  if (!isLiveProviderTestMode()) blockers.push("LIVE_PROVIDER_TEST_MODE is not enabled");

  const readinessSatisfied = Boolean(readiness?.readyForDeploymentExecution && request?.executable);
  const deploymentAuthoritySatisfied = Boolean(request?.deploymentAuthorizationId);
  const publicLaunchDisabled = !request?.publicLaunchAuthorizationId;
  const idempotencySatisfied = Boolean(request?.idempotencyKey && request.idempotencyKey === request.executionRequestId);
  const hostingWrite = input?.providerWrites?.find((row) => row.capability === "HOSTING");
  const writeAuthorized =
    hostingWrite?.verificationState === "WRITE_AUTHORIZED" && hostingWrite.writeAuthorityGranted === true;
  if (request && request.mode !== "LIVE") blockers.push("mode is not LIVE");
  if (request && readiness) {
    if (request.ventureId !== readiness.ventureId || request.readinessId !== readiness.readinessId) {
      blockers.push("venture/readiness lineage does not match");
    }
    if (request.productionArtifactHandoffId !== readiness.productionArtifactHandoffId) {
      blockers.push("handoff lineage does not match");
    }
  }
  if (request && request.publicLaunchAuthorizationId) blockers.push("public launch authority must be false");
  if (!readinessSatisfied) blockers.push("governed readiness is not satisfied");
  if (!deploymentAuthoritySatisfied) blockers.push("canonical deployment authority is missing");
  if (!writeAuthorized) blockers.push("HOSTING write is not WRITE_AUTHORIZED");

  const eag = preflightVercelLiveEag({ grants: input?.eagAuthorizations ?? [] });
  if (!eag.satisfied) blockers.push(...eag.blockers);
  const treasury = preflightVercelLiveTreasury({
    grants: input?.treasuryAuthorizations ?? [],
    expectedVentureId: request?.ventureId ?? readiness?.ventureId ?? null,
    now: input?.now,
  });
  if (!treasury.satisfied) blockers.push(...treasury.blockers);
  const costUnknown = classifyVercelLiveCost() !== "KNOWN_ZERO" && classifyVercelLiveCost() !== "KNOWN_COST";
  const costPolicySatisfied = !costUnknown || treasury.satisfied;
  if (!costPolicySatisfied) blockers.push("unknown Vercel cost lacks a bounded Treasury ceiling");
  if (!idempotencySatisfied) blockers.push("idempotency key is missing or unstable");

  const unique = [...new Set(blockers)];
  return {
    credentialPresent: config.credentialPresent,
    scopeAttested: config.intendedScopeAttested,
    scopeKind: config.scopeKind,
    teamConfigured: config.teamConfigured,
    testTeamConfirmed: config.testTeamConfirmed,
    repositoryConfigured: Boolean(config.repository && config.repositoryValid && config.repositoryDisposable),
    shaConfigured: Boolean(config.sha && config.shaValid),
    artifactMatched: config.artifactMatched,
    leftoverAccepted: config.leftoverAccepted,
    readinessSatisfied,
    deploymentAuthoritySatisfied,
    eagSatisfied: eag.satisfied,
    treasurySatisfied: treasury.satisfied,
    costPolicySatisfied,
    idempotencySatisfied,
    publicLaunchDisabled,
    safeToExecuteLive: unique.length === 0,
    blockers: unique,
    config,
  };
}

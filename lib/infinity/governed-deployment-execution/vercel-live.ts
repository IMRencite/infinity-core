import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import type { ExternalActionAdapter } from "@/lib/infinity/launch-gateway/adapters/contract";
import {
  lookupVercelProjectByName,
  VERCEL_PROJECT_LOOKUP_SUPPORTED,
  type VercelProjectLookupResult,
} from "@/lib/infinity/launch-gateway/adapters/vercel-project-lookup";
import {
  lookupVercelDeploymentBySha,
  type VercelDeploymentLookupResult,
} from "@/lib/infinity/launch-gateway/adapters/vercel-deployment-lookup";
import type { GdeLiveActionLedger } from "./vercel-live-ledger";
import { isExternalActionsLiveEnabled } from "@/lib/infinity/launch-gateway/kill-switch";
import {
  isLiveProviderTestMode,
  isVercelLiveEnabled,
  PROVIDER_KEYS,
  VERCEL_TOKEN_ENV,
  GITHUB_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
} from "@/lib/infinity/launch-gateway/provider-config";
import { VERCEL_V1_DEPLOYMENT_MODE } from "@/lib/infinity/production-artifact/constants";
import { evaluateVercelLiveVerificationPreflight } from "./vercel-live-preflight";
import { loadVercelLiveVerificationConfig } from "./vercel-live-config";
import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import type {
  ActionAuthorityGrant,
  GovernedDeploymentExecutionRequest,
  LiveGatewayPort,
  ProviderWriteEvidence,
  TreasuryActionGrant,
  VercelLivePayload,
} from "./types";

export const VERCEL_LIVE_PROVIDER = PROVIDER_KEYS.vercel;
export const VERCEL_LIVE_ALLOWED_ACTIONS = [
  "hosting.create_project",
  "hosting.deploy",
  "hosting.verify_deployment",
] as const;

export const VERCEL_TOKEN_SCOPE_ENV = "VERCEL_TOKEN_SCOPE";
export const VERCEL_TOKEN_SCOPE_KIND_ENV = "VERCEL_TOKEN_SCOPE_KIND";
export const INFINITY_VERCEL_TEST_RESOURCE_ENV = "INFINITY_VERCEL_TEST_RESOURCE";
export const INFINITY_VERCEL_TEST_REPO_ENV = "INFINITY_VERCEL_TEST_REPO";
export const INFINITY_VERCEL_TEST_SHA_ENV = "INFINITY_VERCEL_TEST_SHA";
export const INFINITY_VERCEL_TEST_ARTIFACT_ENV = "INFINITY_VERCEL_TEST_ARTIFACT_ID";
export const INFINITY_VERCEL_LEFTOVER_ACCEPTED_ENV = "INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED";
export const INFINITY_VERCEL_TEST_TEAM_CONFIRMED_ENV = "INFINITY_VERCEL_TEST_TEAM_CONFIRMED";
export const VERCEL_LIVE_VERIFICATION_ARTIFACT_ID = "infinity-vercel-live-verification-artifact-v1";

export const DEFAULT_VERCEL_LIVE_TEST_RESOURCE = "infinity-test-gde-live-verify";
export const VERCEL_LIVE_VERIFICATION_RESOURCE = "infinity-test-live-verification-gde";
export const VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH =
  "lib/infinity/governed-deployment-execution/verification-artifact/index.html";

export const VERCEL_LIVE_SCOPE_CONTRACT = {
  tokenEnv: VERCEL_TOKEN_ENV,
  intendedScopeEnv: VERCEL_TOKEN_SCOPE_ENV,
  scopeKindEnv: VERCEL_TOKEN_SCOPE_KIND_ENV,
  teamEnv: VERCEL_TEAM_ID_ENV,
  testResourceEnv: INFINITY_VERCEL_TEST_RESOURCE_ENV,
  testRepoEnv: INFINITY_VERCEL_TEST_REPO_ENV,
  testShaEnv: INFINITY_VERCEL_TEST_SHA_ENV,
  testArtifactEnv: INFINITY_VERCEL_TEST_ARTIFACT_ENV,
  leftoverAcceptedEnv: INFINITY_VERCEL_LEFTOVER_ACCEPTED_ENV,
  testTeamConfirmedEnv: INFINITY_VERCEL_TEST_TEAM_CONFIRMED_ENV,
  canonicalArtifactId: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  allowedIntendedActions: VERCEL_LIVE_ALLOWED_ACTIONS,
  providerEnforcedActionScopeSupported: false,
  providerLimitation:
    "Vercel tokens are account- or team-scoped. They cannot be limited to hosting.create_project, hosting.deploy, and hosting.verify_deployment. Team tokens can still perform other Vercel writes on that team.",
} as const;

export type VercelLiveErrorClassification =
  | "credential_failure"
  | "resource_mismatch"
  | "conflict"
  | "rate_limit"
  | "provider_failure"
  | "timeout"
  | "deployment_build_failure"
  | "healthcheck_failure"
  | "unsupported_action"
  | "unsafe_target"
  | "missing_credential"
  | "scope_blocked"
  | "reconciliation_required"
  | "persistence_failure";

export type VercelLiveAccounting = {
  provider: "vercel.com_v1";
  projectCreations: number;
  deployments: number;
  verificationReads: number;
  cleanupWrites: number;
};

export type VercelLiveTelemetry = {
  provider: "vercel.com_v1";
  action: string;
  requestId: string;
  status: string;
  latencyMs: number;
  providerResponseId: string | null;
  costState: "UNKNOWN";
  errorClassification: VercelLiveErrorClassification | null;
};

export type VercelCredentialClassification = "MISSING" | "UNATTESTED" | "BROAD" | "SCOPED" | "UNKNOWN";
export type VercelLiveCostClassification = "KNOWN_ZERO" | "KNOWN_COST" | "POTENTIALLY_BILLABLE" | "UNKNOWN";
export type VercelScopeLayer = "PROVIDER_ENFORCED" | "INFINITY_INTENDED" | "EAG_ACTION" | "REQUEST";

export type VercelCredentialSafety = {
  credentialPresent: boolean;
  serverOnly: boolean;
  writeScopeAdequate: boolean;
  broadUnrestricted: boolean;
  secretPrinted: false;
  secretPersisted: false;
};

export type VercelCredentialAttestation = VercelCredentialSafety & {
  classification: VercelCredentialClassification;
  intendedScopePresent: boolean;
  intendedScopeExact: boolean;
  providerEnforcedActionScope: boolean;
  oneMetadataStringGrantsLive: false;
  actionLevelGovernanceStillRequired: true;
};

export type VercelLivePreconditionsReport = {
  testResourceConfirmed: "YES" | "NO";
  vercelCredentialPresent: "YES" | "NO";
  serverOnly: "YES" | "NO";
  writeScopeAdequate: "YES" | "NO";
  scope: "PASS" | "FAIL";
  testResource: "PASS" | "FAIL";
  disposableProviderTarget: "PASS" | "FAIL";
  readiness: "PASS" | "FAIL";
  deploymentAuthority: "PASS" | "FAIL";
  eag: "PASS" | "FAIL";
  treasury: "PASS" | "FAIL" | "NOT_REQUIRED";
  costPolicy: "PASS" | "FAIL";
  idempotency: "PASS" | "FAIL";
  publicLaunchDisabled: "PASS" | "FAIL";
  publicLaunchAuthority: "NO";
  canExecuteLive: boolean;
  skipReason: string | null;
};

function envPresent(name: string, minLength = 1): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length >= minLength;
}

function envFlag(name: string): boolean {
  const value = process.env[name];
  return value === "true" || value === "1";
}

function attestedScopes(): string[] {
  const raw = process.env[VERCEL_TOKEN_SCOPE_ENV];
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isWildcardScope(scope: string): boolean {
  const normalized = scope.toLowerCase();
  return scope === "*" || normalized === "full" || normalized === "unrestricted" || normalized === "all";
}

export function inspectVercelLiveCredentialSafety(): VercelCredentialSafety {
  const attestation = inspectVercelLiveCredentialAttestation();
  return {
    credentialPresent: attestation.credentialPresent,
    serverOnly: attestation.serverOnly,
    writeScopeAdequate: attestation.writeScopeAdequate,
    broadUnrestricted: attestation.broadUnrestricted,
    secretPrinted: false,
    secretPersisted: false,
  };
}

export function inspectVercelLiveCredentialAttestation(): VercelCredentialAttestation {
  const credentialPresent = envPresent(VERCEL_TOKEN_ENV, 11);
  const scopes = attestedScopes();
  const intendedScopePresent = scopes.length > 0;
  const wildcard = scopes.some(isWildcardScope);
  const extras = scopes.some(
    (scope) => !isWildcardScope(scope) && !(VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(scope),
  );
  const config = loadVercelLiveVerificationConfig();
  const intendedScopeExact = config.intendedScopeExact;
  const claimedProviderEnforced = config.providerEnforcedClaimed;
  const providerEnforcedActionScope = false;
  let classification: VercelCredentialClassification = "MISSING";
  if (!credentialPresent) {
    classification = "MISSING";
  } else if (wildcard || extras || claimedProviderEnforced) {
    classification = "BROAD";
  } else if (!intendedScopeExact) {
    classification = "UNATTESTED";
  } else {
    classification = "UNATTESTED";
  }
  const writeScopeAdequate = false;
  const broadUnrestricted = !config.intendedScopeAttested;
  return {
    credentialPresent,
    serverOnly: true,
    writeScopeAdequate,
    broadUnrestricted,
    secretPrinted: false,
    secretPersisted: false,
    classification,
    intendedScopePresent,
    intendedScopeExact,
    providerEnforcedActionScope,
    oneMetadataStringGrantsLive: false,
    actionLevelGovernanceStillRequired: true,
  };
}

export { classifyVercelLiveCost } from "./vercel-live-config";

export function vercelScopeLayers(): Record<VercelScopeLayer, string> {
  return {
    PROVIDER_ENFORCED: "not supported for the three hosting actions",
    INFINITY_INTENDED: VERCEL_TOKEN_SCOPE_ENV,
    EAG_ACTION: "action-specific AUTO_AUTHORIZE",
    REQUEST: "GovernedDeploymentExecutionRequest requiredActions",
  };
}

export function isDisposableVercelTestResource(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim().toLowerCase();
  if (!trimmed.startsWith("infinity-test-")) return false;
  if (/(\bprod\b|production|customer|payments|stripe|live-venture)/.test(trimmed)) return false;
  return trimmed.length >= "infinity-test-x".length;
}

export function isVercelLiveGatewayAction(actionType: string | null | undefined): boolean {
  return Boolean(actionType && (VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(actionType));
}

export function emptyVercelLiveAccounting(): VercelLiveAccounting {
  return {
    provider: VERCEL_LIVE_PROVIDER,
    projectCreations: 0,
    deployments: 0,
    verificationReads: 0,
    cleanupWrites: 0,
  };
}

export function vercelCleanupSupported(): boolean {
  return vercelAdapter.capabilities.supportsRollback === true;
}

function sanitizeLiveErrorText(text: string): string {
  return text
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/Authorization:\s*\S+/gi, "Authorization: [REDACTED]")
    .replace(/ghp_[a-zA-Z0-9]{20,}/g, "[REDACTED]")
    .replace(/vercel_[A-Za-z0-9]{12,}/gi, "[REDACTED]")
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED]")
    .slice(0, 300);
}

export function classifyVercelLiveError(message: string): {
  classification: VercelLiveErrorClassification;
  httpStatus: number | null;
} {
  const sanitized = sanitizeLiveErrorText(message);
  const statusMatch = sanitized.match(/\b(401|403|404|409|429|5\d\d)\b/);
  const httpStatus = statusMatch ? Number(statusMatch[1]) : null;
  if (/VERCEL_TOKEN not configured|GITHUB_TOKEN not configured/i.test(sanitized) || httpStatus === 401 || httpStatus === 403) {
    return { classification: "credential_failure", httpStatus: httpStatus ?? 401 };
  }
  if (httpStatus === 404) return { classification: "resource_mismatch", httpStatus: 404 };
  if (httpStatus === 409) return { classification: "conflict", httpStatus: 409 };
  if (httpStatus === 429) return { classification: "rate_limit", httpStatus: 429 };
  if (/timed[_ ]?out|timeout/i.test(sanitized)) return { classification: "timeout", httpStatus };
  if (/health|verif/i.test(sanitized) && /fail/i.test(sanitized)) {
    return { classification: "healthcheck_failure", httpStatus };
  }
  if (/build|deployment_not_ready|not_ready/i.test(sanitized)) {
    return { classification: "deployment_build_failure", httpStatus };
  }
  if (httpStatus != null && httpStatus >= 500) return { classification: "provider_failure", httpStatus };
  return { classification: "provider_failure", httpStatus };
}

export class VercelLiveExecutionError extends Error {
  readonly classification: VercelLiveErrorClassification;
  readonly httpStatus: number | null;
  readonly gatewayActionType: string;
  readonly externalActionId: string | null;
  readonly durableState: string | null;

  constructor(input: {
    message: string;
    classification: VercelLiveErrorClassification;
    httpStatus?: number | null;
    gatewayActionType: string;
    externalActionId?: string | null;
    durableState?: string | null;
  }) {
    super(sanitizeLiveErrorText(input.message));
    this.name = "VercelLiveExecutionError";
    this.classification = input.classification;
    this.httpStatus = input.httpStatus ?? null;
    this.gatewayActionType = input.gatewayActionType;
    this.externalActionId = input.externalActionId ?? null;
    this.durableState = input.durableState ?? null;
  }
}

export function mapInfinityDeployToVercelLivePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    target: "preview",
    deployment_mode: VERCEL_V1_DEPLOYMENT_MODE,
  };
}

export function inspectVercelLivePreconditions(input: {
  request: GovernedDeploymentExecutionRequest;
  readiness: GovernedDeploymentReadiness;
  eagAuthorizations?: ActionAuthorityGrant[];
  treasuryAuthorizations?: TreasuryActionGrant[];
  providerWrites?: ProviderWriteEvidence[];
  payload?: VercelLivePayload | null;
  now?: string;
}): VercelLivePreconditionsReport {
  const preflight = evaluateVercelLiveVerificationPreflight({
    request: input.request,
    readiness: input.readiness,
    eagAuthorizations: input.eagAuthorizations,
    treasuryAuthorizations: input.treasuryAuthorizations,
    providerWrites: input.providerWrites,
    now: input.now,
  });
  const payload = input.payload ?? null;
  const testName = payload?.testResourceName ?? preflight.config.testResource ?? "";
  return {
    testResourceConfirmed: preflight.config.testResourceDisposable ? "YES" : "NO",
    vercelCredentialPresent: preflight.credentialPresent ? "YES" : "NO",
    serverOnly: "YES",
    writeScopeAdequate: "NO",
    scope: preflight.scopeAttested ? "PASS" : "FAIL",
    testResource: isDisposableVercelTestResource(testName) ? "PASS" : "FAIL",
    disposableProviderTarget: preflight.repositoryConfigured && preflight.shaConfigured ? "PASS" : "FAIL",
    readiness: preflight.readinessSatisfied ? "PASS" : "FAIL",
    deploymentAuthority: preflight.deploymentAuthoritySatisfied ? "PASS" : "FAIL",
    eag: preflight.eagSatisfied ? "PASS" : "FAIL",
    treasury: preflight.treasurySatisfied ? "PASS" : "FAIL",
    costPolicy: preflight.costPolicySatisfied ? "PASS" : "FAIL",
    idempotency: preflight.idempotencySatisfied ? "PASS" : "FAIL",
    publicLaunchDisabled: preflight.publicLaunchDisabled ? "PASS" : "FAIL",
    publicLaunchAuthority: "NO",
    canExecuteLive: preflight.safeToExecuteLive,
    skipReason: preflight.blockers[0] ?? null,
  };
}

export function resolveVercelLiveTestPayload(explicit?: VercelLivePayload | null): VercelLivePayload {
  return {
    testResourceName:
      explicit?.testResourceName ||
      process.env[INFINITY_VERCEL_TEST_RESOURCE_ENV] ||
      DEFAULT_VERCEL_LIVE_TEST_RESOURCE,
    production_artifact_id: explicit?.production_artifact_id || process.env[INFINITY_VERCEL_TEST_ARTIFACT_ENV],
    artifact_hash: explicit?.artifact_hash,
    repository_full_name: explicit?.repository_full_name || process.env[INFINITY_VERCEL_TEST_REPO_ENV],
    commit_sha: explicit?.commit_sha || process.env[INFINITY_VERCEL_TEST_SHA_ENV],
    project_id: explicit?.project_id,
    deployment_id: explicit?.deployment_id,
    github_repository_id: explicit?.github_repository_id,
  };
}

function incrementAccounting(accounting: VercelLiveAccounting, actionType: string): void {
  if (actionType === "hosting.create_project") accounting.projectCreations += 1;
  else if (actionType === "hosting.deploy") accounting.deployments += 1;
  else if (actionType === "hosting.verify_deployment") accounting.verificationReads += 1;
}

function evaluateExistingProject(existing: VercelProjectLookupResult): "reuse" | "block" | "create" {
  if (!existing.found) return "create";
  if (existing.matchesExpectedTeam === false) return "block";
  if (existing.matchesExpectedRepository === false) return "block";
  if (!existing.matchesVerificationTarget) return "block";
  if (existing.matchesExpectedRepository === true && existing.id) return "reuse";
  if (existing.sourceIdentityAvailable === false || existing.matchesExpectedRepository == null) return "block";
  return existing.id ? "reuse" : "block";
}

export function createVercelLiveGatewayPort(input: {
  adapter?: ExternalActionAdapter;
  testResourceName: string;
  organizationId?: string;
  sessionId?: string;
  ventureId?: string;
  missionId?: string;
  eagAuthorizationId?: string | null;
  treasuryAuthorizationId?: string | null;
  maxAuthorizedUsd?: number | null;
  expectedRepository?: string | null;
  expectedSha?: string | null;
  expectedTeamId?: string | null;
  accounting?: VercelLiveAccounting;
  telemetry?: VercelLiveTelemetry[];
  ledger?: GdeLiveActionLedger | null;
  lookupProject?: (name: string) => Promise<VercelProjectLookupResult>;
  lookupDeployment?: (input: {
    projectId: string;
    commitSha: string;
  }) => Promise<VercelDeploymentLookupResult>;
  projectLookupSupported?: boolean;
}): LiveGatewayPort {
  const adapter = input.adapter ?? vercelAdapter;
  const accounting = input.accounting ?? emptyVercelLiveAccounting();
  const telemetry = input.telemetry ?? [];
  const lookupSupported = input.projectLookupSupported ?? VERCEL_PROJECT_LOOKUP_SUPPORTED;

  return {
    async execute(request) {
      const started = Date.now();
      if (!isVercelLiveGatewayAction(request.gatewayActionType)) {
        throw new VercelLiveExecutionError({
          message: `Vercel live port rejects ${request.gatewayActionType}.`,
          classification: "unsupported_action",
          gatewayActionType: request.gatewayActionType,
        });
      }
      if (!isDisposableVercelTestResource(input.testResourceName) || request.target !== input.testResourceName) {
        throw new VercelLiveExecutionError({
          message: "Vercel live port rejects a non-disposable or mismatched test target.",
          classification: "unsafe_target",
          gatewayActionType: request.gatewayActionType,
        });
      }
      const usingRealAdapter = input.adapter == null || input.adapter === vercelAdapter;
      if (usingRealAdapter && !loadVercelLiveVerificationConfig().intendedScopeAttested) {
        throw new VercelLiveExecutionError({
          message: "Vercel live write scope is unknown or unrestricted.",
          classification: "scope_blocked",
          gatewayActionType: request.gatewayActionType,
        });
      }
      if (usingRealAdapter && !envPresent(VERCEL_TOKEN_ENV, 11)) {
        throw new VercelLiveExecutionError({
          message: "VERCEL_TOKEN not configured",
          classification: "missing_credential",
          gatewayActionType: request.gatewayActionType,
        });
      }
      if (request.gatewayActionType === "hosting.create_project" && accounting.projectCreations >= 1) {
        throw new VercelLiveExecutionError({
          message: "Vercel live verification already created the maximum of 1 project in this run.",
          classification: "conflict",
          gatewayActionType: request.gatewayActionType,
        });
      }
      if (request.gatewayActionType === "hosting.deploy" && accounting.deployments >= 1) {
        throw new VercelLiveExecutionError({
          message: "Vercel live verification already created the maximum of 1 deployment in this run.",
          classification: "conflict",
          gatewayActionType: request.gatewayActionType,
        });
      }
      const ledger = input.ledger ?? null;
      if (!ledger) {
        throw new VercelLiveExecutionError({
          message: "durable external action ledger is required before a Vercel write",
          classification: "persistence_failure",
          gatewayActionType: request.gatewayActionType,
        });
      }
      const claim = await ledger.claim({
        organizationId: input.organizationId ?? "org-gde-vercel-live",
        missionId: input.missionId ?? "mission-gde-vercel-live",
        ventureId: input.ventureId ?? input.testResourceName,
        sessionId: input.sessionId ?? request.executionRequestId,
        executionRequestId: request.executionRequestId,
        actionId: request.actionId,
        gatewayActionType: request.gatewayActionType,
        target: input.testResourceName,
        idempotencyKey: request.idempotencyKey,
        eagAuthorizationId: input.eagAuthorizationId,
        treasuryAuthorizationId: input.treasuryAuthorizationId,
        maxAuthorizedUsd: input.maxAuthorizedUsd,
        publicLaunchAuthority: false,
      });
      const succeedFromRefs = async (
        refs: Record<string, string>,
        extras: { reused?: boolean; ready?: boolean; verified?: boolean; httpStatus?: number | null },
      ) => {
        try {
          await ledger.complete({
            organizationId: claim.record.organizationId,
            externalActionId: claim.record.externalActionId,
            providerReferences: refs,
            result: {
              action_type: request.gatewayActionType,
              reused: extras.reused === true,
              public_launch_authority: false,
              cost_state: "UNKNOWN",
            },
            verifiedUrl: refs.url ?? null,
            verificationStatus: extras.verified === false ? "failed" : "verified",
          });
        } catch (error) {
          throw new VercelLiveExecutionError({
            message: error instanceof Error ? error.message : "durable external action persist failed after provider response",
            classification: "persistence_failure",
            gatewayActionType: request.gatewayActionType,
          });
        }
        const providerResponseId = refs.deployment_id ?? refs.project_id ?? request.actionId;
        telemetry.push({
          provider: VERCEL_LIVE_PROVIDER,
          action: request.gatewayActionType,
          requestId: request.executionRequestId,
          status: "SUCCEEDED",
          latencyMs: Date.now() - started,
          providerResponseId,
          costState: "UNKNOWN",
          errorClassification: null,
        });
        return {
          providerCallId: providerResponseId,
          externalIds: refs,
          actualCostUsd: null,
          ready: extras.ready ?? true,
          verified: extras.verified ?? true,
          reused: extras.reused === true,
          httpStatus: extras.httpStatus ?? 200,
          errorClassification: null,
          externalActionId: claim.record.externalActionId,
          durableState: "SUCCEEDED" as const,
        };
      };

      if (claim.decision === "reuse") {
        return succeedFromRefs(claim.record.providerReferences, { reused: true });
      }
      if (claim.decision === "blocked") {
        throw new VercelLiveExecutionError({
          message: claim.record.error ?? "durable external action is blocked",
          classification: "unsafe_target",
          gatewayActionType: request.gatewayActionType,
        });
      }

      const lookupProject =
        input.lookupProject ??
        (usingRealAdapter
          ? (name: string) =>
              lookupVercelProjectByName({
                name,
                teamId: input.expectedTeamId,
                expectedRepository: input.expectedRepository,
              })
          : null);
      const lookupDeployment =
        input.lookupDeployment ??
        (usingRealAdapter
          ? ({ projectId, commitSha }: { projectId: string; commitSha: string }) =>
              lookupVercelDeploymentBySha({
                projectId,
                commitSha,
                repositoryFullName: input.expectedRepository,
                teamId: input.expectedTeamId,
              })
          : null);

      const lookupOrBlock = async <T>(op: () => Promise<T>): Promise<T> => {
        try {
          return await op();
        } catch (error) {
          if (error instanceof VercelLiveExecutionError) throw error;
          const message = error instanceof Error ? error.message : "provider lookup failed";
          const classified = classifyVercelLiveError(message);
          throw new VercelLiveExecutionError({
            message,
            classification: classified.classification,
            httpStatus: classified.httpStatus,
            gatewayActionType: request.gatewayActionType,
          });
        }
      };

      const reconcileCreate = async () => {
        if (!lookupProject) return null;
        if (!lookupSupported) {
          throw new VercelLiveExecutionError({
            message: "provider project existence lookup is not supported; LIVE is blocked",
            classification: "unsafe_target",
            gatewayActionType: request.gatewayActionType,
          });
        }
        const existing = await lookupOrBlock(() => lookupProject(input.testResourceName));
        const verdict = evaluateExistingProject(existing);
        if (verdict === "reuse" && existing.id) {
          return succeedFromRefs(
            { project_id: existing.id, project_name: existing.name ?? input.testResourceName },
            { reused: true, httpStatus: existing.httpStatus },
          );
        }
        if (verdict === "block") {
          await ledger.block({
            organizationId: claim.record.organizationId,
            externalActionId: claim.record.externalActionId,
            error: "existing Vercel project does not match verification identity",
          });
          throw new VercelLiveExecutionError({
            message: "existing Vercel project does not match the disposable verification target",
            classification: "resource_mismatch",
            gatewayActionType: request.gatewayActionType,
          });
        }
        return null;
      };

      const reconcileDeploy = async (projectId: string) => {
        const sha = input.expectedSha ?? String(request.payload.commit_sha ?? "");
        if (!lookupDeployment || !sha || !projectId) return null;
        const existing = await lookupOrBlock(() => lookupDeployment({ projectId, commitSha: sha }));
        if (existing.found && existing.reusable && existing.matchesSha && existing.id) {
          if (input.expectedRepository && existing.matchesRepository === false) {
            throw new VercelLiveExecutionError({
              message: "existing Vercel deployment repository does not match",
              classification: "resource_mismatch",
              gatewayActionType: request.gatewayActionType,
            });
          }
          return succeedFromRefs(
            {
              deployment_id: existing.id,
              project_id: existing.projectId ?? projectId,
              ...(existing.url ? { url: existing.url } : {}),
            },
            { reused: true, httpStatus: existing.httpStatus },
          );
        }
        return null;
      };

      if (claim.decision === "reconcile") {
        if (request.gatewayActionType === "hosting.create_project") {
          return succeedFromRefs(claim.record.providerReferences, { reused: true });
        }
        if (request.gatewayActionType === "hosting.deploy") {
          return succeedFromRefs(claim.record.providerReferences, { reused: true });
        }
      }
      if (claim.decision === "reconciliation_required") {
        if (request.gatewayActionType === "hosting.create_project") {
          const reused = await reconcileCreate();
          if (reused) return reused;
        }
        if (request.gatewayActionType === "hosting.deploy") {
          const projectId = String(request.payload.project_id ?? claim.record.providerReferences.project_id ?? "");
          try {
            const reused = await reconcileDeploy(projectId);
            if (reused) return reused;
          } catch (error) {
            if (error instanceof VercelLiveExecutionError) throw error;
          }
        }
        throw new VercelLiveExecutionError({
          message: "RECONCILIATION_REQUIRED: in-progress live action has no persisted provider reference; a blind retry is blocked",
          classification: "reconciliation_required",
          gatewayActionType: request.gatewayActionType,
        });
      }

      if (request.gatewayActionType === "hosting.create_project") {
        if (usingRealAdapter && !lookupSupported) {
          throw new VercelLiveExecutionError({
            message: "provider project existence lookup is not supported; LIVE is blocked",
            classification: "unsafe_target",
            gatewayActionType: request.gatewayActionType,
          });
        }
        const reused = await reconcileCreate();
        if (reused) return reused;
      }
      if (request.gatewayActionType === "hosting.deploy") {
        const projectId = String(request.payload.project_id ?? "");
        const reused = await reconcileDeploy(projectId);
        if (reused) return reused;
      }

      const ctx = {
        organizationId: input.organizationId ?? "org-gde-vercel-live",
        actionType: request.gatewayActionType,
        target: input.testResourceName,
        payload: mapInfinityDeployToVercelLivePayload(request.payload),
        correlationId: request.executionRequestId,
      };

      try {
        const validation = await adapter.validate(ctx);
        if (!validation.valid) {
          throw new VercelLiveExecutionError({
            message: `Vercel live validate failed: ${validation.issues.join(",")}`,
            classification: "provider_failure",
            gatewayActionType: request.gatewayActionType,
          });
        }
        const result = await adapter.execute(ctx);
        const reused = result.manifest.reused === true;
        const verified =
          request.gatewayActionType !== "hosting.verify_deployment" || result.manifest.verified === true;
        const ready =
          request.gatewayActionType === "hosting.verify_deployment"
            ? verified
            : result.manifest.ready === true || request.gatewayActionType === "hosting.create_project";
        if (request.gatewayActionType === "hosting.deploy" && result.manifest.ready !== true) {
          await ledger.fail({
            organizationId: claim.record.organizationId,
            externalActionId: claim.record.externalActionId,
            error: String(result.manifest.provider_error ?? "deployment_not_ready"),
            providerReferences: result.externalIds,
          });
          throw new VercelLiveExecutionError({
            message: String(result.manifest.provider_error ?? "deployment_not_ready"),
            classification: "deployment_build_failure",
            gatewayActionType: request.gatewayActionType,
          });
        }
        if (request.gatewayActionType === "hosting.verify_deployment" && result.manifest.verified !== true) {
          await ledger.fail({
            organizationId: claim.record.organizationId,
            externalActionId: claim.record.externalActionId,
            error: "Vercel health verification failed",
            providerReferences: result.externalIds,
          });
          throw new VercelLiveExecutionError({
            message: "Vercel health verification failed",
            classification: "healthcheck_failure",
            gatewayActionType: request.gatewayActionType,
          });
        }
        if (!reused) incrementAccounting(accounting, request.gatewayActionType);
        return succeedFromRefs(result.externalIds, { reused, ready, verified, httpStatus: 200 });
      } catch (error) {
        if (error instanceof VercelLiveExecutionError) {
          if (error.classification !== "persistence_failure" && error.classification !== "reconciliation_required") {
            try {
              await ledger.fail({
                organizationId: claim.record.organizationId,
                externalActionId: claim.record.externalActionId,
                error: error.message,
              });
            } catch {
              /* claim already recorded the in-progress row */
            }
          }
          telemetry.push({
            provider: VERCEL_LIVE_PROVIDER,
            action: request.gatewayActionType,
            requestId: request.executionRequestId,
            status: "FAILED",
            latencyMs: Date.now() - started,
            providerResponseId: null,
            costState: "UNKNOWN",
            errorClassification: error.classification,
          });
          throw new VercelLiveExecutionError({
            message: error.message,
            classification: error.classification,
            httpStatus: error.httpStatus,
            gatewayActionType: error.gatewayActionType,
            externalActionId: error.externalActionId ?? claim.record.externalActionId,
            durableState: error.durableState ?? "FAILED",
          });
        }
        const message = error instanceof Error ? error.message : "Vercel live provider failure";
        const classified = classifyVercelLiveError(message);
        try {
          await ledger.fail({
            organizationId: claim.record.organizationId,
            externalActionId: claim.record.externalActionId,
            error: message,
          });
        } catch {
          /* keep the claimed executing row for reconciliation */
        }
        telemetry.push({
          provider: VERCEL_LIVE_PROVIDER,
          action: request.gatewayActionType,
          requestId: request.executionRequestId,
          status: "FAILED",
          latencyMs: Date.now() - started,
          providerResponseId: null,
          costState: "UNKNOWN",
          errorClassification: classified.classification,
        });
        throw new VercelLiveExecutionError({
          message,
          classification: classified.classification,
          httpStatus: classified.httpStatus,
          gatewayActionType: request.gatewayActionType,
          externalActionId: claim.record.externalActionId,
          durableState: "FAILED",
        });
      }
    },
  };
}

export function vercelLiveFlagsEnabled(): boolean {
  return isExternalActionsLiveEnabled() && isVercelLiveEnabled() && isLiveProviderTestMode();
}

export function vercelLiveFlagMetadata(): {
  vercelLiveEnabled: boolean;
  testMode: boolean;
  globalLiveEnabled: boolean;
  githubLookupPresent: boolean;
} {
  return {
    vercelLiveEnabled: isVercelLiveEnabled(),
    testMode: isLiveProviderTestMode(),
    globalLiveEnabled: isExternalActionsLiveEnabled(),
    githubLookupPresent: envPresent(GITHUB_TOKEN_ENV, 11),
  };
}

export function envFlagConfigured(name: string): boolean {
  return envFlag(name);
}

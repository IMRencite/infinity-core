import type { ExternalActionAdapter } from "@/lib/infinity/launch-gateway/adapters/contract";
import {
  VERCEL_PROJECT_LOOKUP_SUPPORTED,
  type VercelProjectLookupResult,
} from "@/lib/infinity/launch-gateway/adapters/vercel-project-lookup";
import { executeGovernedDeployment } from "./execute";
import {
  loadVercelLiveVerificationConfig,
  VERCEL_LIVE_MAX_DEPLOYMENTS,
  VERCEL_LIVE_MAX_PROJECTS,
} from "./vercel-live-config";
import { resolveVercelLiveTestPayload } from "./vercel-live";
import {
  buildVercelGovernedVerificationSession,
  parseMaxUsd,
} from "./vercel-live-session";
import type {
  GovernedDeploymentExecutionResult,
  LiveGatewayPort,
} from "./types";
import type { GovernedExecutionActionType } from "./constants";
import type { GdeLiveActionLedger } from "./vercel-live-ledger";

const ALLOWED_LIVE_ACTIONS: readonly GovernedExecutionActionType[] = [
  "CREATE_HOSTING_PROJECT",
  "DEPLOY_APPLICATION",
  "VERIFY_HEALTH",
];

export type VercelLiveVerificationOperatorState =
  | "BLOCKED"
  | "SUCCEEDED"
  | "PARTIALLY_SUCCEEDED"
  | "FAILED_VERIFICATION"
  | "FAILED";

export type VercelLiveActionStatus = "CREATED" | "REUSED" | "SUCCEEDED" | "FAILED" | "BLOCKED" | "NOT_RUN";

export type VercelLiveVerificationOperatorResult = {
  sessionId: string | null;
  executionRequestId: string | null;
  state: VercelLiveVerificationOperatorState;
  projectCreationStatus: VercelLiveActionStatus;
  deploymentStatus: VercelLiveActionStatus;
  verificationStatus: VercelLiveActionStatus;
  providerProjectReference: string | null;
  providerDeploymentReference: string | null;
  safeTestUrl: string | null;
  estimatedCost: number | null;
  authorizedCeiling: number | null;
  actualCost: number | "UNKNOWN";
  publicLaunchAuthority: false;
  publicLaunchState: "NOT_AUTHORIZED";
  sideEffects: {
    projectCreations: number;
    deployments: number;
    verificationReads: number;
    dnsWrites: number;
    domainPurchases: number;
    paymentWrites: number;
    productionMigrations: number;
    publicLaunches: number;
    repositoryWrites: number;
    treasuryMovements: number;
    treasuryReservations: number;
    eagExternalActions: number;
  };
  blockers: string[];
  errors: Array<{ code: string; message: string }>;
  executorEntered: boolean;
  durableReplayProtection: boolean;
  providerProjectLookupSupported: boolean;
  externalActionIds: {
    create: string | null;
    deploy: string | null;
    verify: string | null;
  };
  durableActionStates: {
    create: string | null;
    deploy: string | null;
    verify: string | null;
  };
  secretPrinted: false;
  secretPersisted: false;
};

export type RunVercelGovernedLiveVerificationInput = {
  maxAuthorizedUsd?: number | null;
  argv?: string[];
  env?: NodeJS.ProcessEnv;
  now?: string | Date;
  liveGateway?: LiveGatewayPort | null;
  adapter?: ExternalActionAdapter;
  liveLedger?: GdeLiveActionLedger | null;
  lookupProject?: (name: string) => Promise<VercelProjectLookupResult>;
  lookupDeployment?: (input: { projectId: string; commitSha: string }) => Promise<import("@/lib/infinity/launch-gateway/adapters/vercel-deployment-lookup").VercelDeploymentLookupResult>;
  projectLookupSupported?: boolean;
};

function emptyResult(
  extras: Partial<VercelLiveVerificationOperatorResult> & {
    state: VercelLiveVerificationOperatorState;
    blockers: string[];
  },
): VercelLiveVerificationOperatorResult {
  return {
    sessionId: extras.sessionId ?? null,
    executionRequestId: extras.executionRequestId ?? null,
    state: extras.state,
    projectCreationStatus: extras.projectCreationStatus ?? "NOT_RUN",
    deploymentStatus: extras.deploymentStatus ?? "NOT_RUN",
    verificationStatus: extras.verificationStatus ?? "NOT_RUN",
    providerProjectReference: extras.providerProjectReference ?? null,
    providerDeploymentReference: extras.providerDeploymentReference ?? null,
    safeTestUrl: extras.safeTestUrl ?? null,
    estimatedCost: extras.estimatedCost ?? null,
    authorizedCeiling: extras.authorizedCeiling ?? null,
    actualCost: extras.actualCost ?? "UNKNOWN",
    publicLaunchAuthority: false,
    publicLaunchState: "NOT_AUTHORIZED",
    sideEffects: extras.sideEffects ?? {
      projectCreations: 0,
      deployments: 0,
      verificationReads: 0,
      dnsWrites: 0,
      domainPurchases: 0,
      paymentWrites: 0,
      productionMigrations: 0,
      publicLaunches: 0,
      repositoryWrites: 0,
      treasuryMovements: 0,
      treasuryReservations: 0,
      eagExternalActions: 0,
    },
    blockers: extras.blockers,
    errors: extras.errors ?? extras.blockers.map((message) => ({ code: "BLOCKED", message })),
    executorEntered: extras.executorEntered ?? false,
    durableReplayProtection: extras.durableReplayProtection ?? false,
    providerProjectLookupSupported: extras.providerProjectLookupSupported ?? VERCEL_PROJECT_LOOKUP_SUPPORTED,
    externalActionIds: extras.externalActionIds ?? { create: null, deploy: null, verify: null },
    durableActionStates: extras.durableActionStates ?? { create: null, deploy: null, verify: null },
    secretPrinted: false,
    secretPersisted: false,
  };
}

function actionStatus(
  execution: GovernedDeploymentExecutionResult | null,
  actionType: GovernedExecutionActionType,
): VercelLiveActionStatus {
  const record = execution?.actionsAttempted.find((item) => item.actionType === actionType);
  if (!record) return "NOT_RUN";
  if (record.state === "BLOCKED") return "BLOCKED";
  if (record.state === "FAILED") return "FAILED";
  if (actionType === "CREATE_HOSTING_PROJECT") return record.reused ? "REUSED" : "CREATED";
  if (record.reused) return "REUSED";
  return "SUCCEEDED";
}

function operatorState(input: {
  execution: GovernedDeploymentExecutionResult;
  projectStatus: VercelLiveActionStatus;
  deploymentStatus: VercelLiveActionStatus;
  verificationStatus: VercelLiveActionStatus;
}): VercelLiveVerificationOperatorState {
  const projectOk = input.projectStatus === "CREATED" || input.projectStatus === "REUSED";
  const deployOk = input.deploymentStatus === "SUCCEEDED";
  const verifyOk = input.verificationStatus === "SUCCEEDED";
  if (projectOk && deployOk && verifyOk) return "SUCCEEDED";
  if (deployOk && !verifyOk && input.verificationStatus === "FAILED") return "FAILED_VERIFICATION";
  if (input.execution.state === "PARTIALLY_SUCCEEDED") return "PARTIALLY_SUCCEEDED";
  if (input.execution.state === "BLOCKED") return "BLOCKED";
  return "FAILED";
}

function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^https:\/\/[A-Za-z0-9._:-]+/.test(value)) return null;
  return value;
}

export async function runVercelGovernedLiveVerification(
  input: RunVercelGovernedLiveVerificationInput = {},
): Promise<VercelLiveVerificationOperatorResult> {
  const lookupSupported = input.projectLookupSupported ?? VERCEL_PROJECT_LOOKUP_SUPPORTED;
  const maxAuthorizedUsd =
    input.maxAuthorizedUsd !== undefined
      ? input.maxAuthorizedUsd
      : parseMaxUsd(input.argv ?? process.argv, input.env ?? process.env);
  const now = input.now ?? new Date().toISOString();
  const first = buildVercelGovernedVerificationSession({ maxAuthorizedUsd, now });
  const second = buildVercelGovernedVerificationSession({ maxAuthorizedUsd, now });

  const identityBlockers: string[] = [];
  if (first.ventureId !== second.ventureId) identityBlockers.push("recomputed ventureId did not match");
  if ((first.handoff?.handoffId ?? null) !== (second.handoff?.handoffId ?? null)) {
    identityBlockers.push("recomputed handoffId did not match");
  }
  if ((first.readiness?.readinessId ?? null) !== (second.readiness?.readinessId ?? null)) {
    identityBlockers.push("recomputed readinessId did not match");
  }
  if ((first.executionRequest?.executionRequestId ?? null) !== (second.executionRequest?.executionRequestId ?? null)) {
    identityBlockers.push("recomputed executionRequestId did not match");
  }
  if ((first.executionRequest?.idempotencyKey ?? null) !== (second.executionRequest?.idempotencyKey ?? null)) {
    identityBlockers.push("recomputed idempotencyKey did not match");
  }
  if (JSON.stringify(first.actionIds) !== JSON.stringify(second.actionIds)) {
    identityBlockers.push("recomputed action IDs did not match");
  }
  if (first.maxAuthorizedUsd !== second.maxAuthorizedUsd) {
    identityBlockers.push("recomputed max ceiling did not match");
  }

  const session = second;
  const blockers = [...identityBlockers, ...session.blockers, ...session.preflight.blockers];
  if (maxAuthorizedUsd == null) blockers.push("operator max ceiling is missing");
  else if (maxAuthorizedUsd <= 0) blockers.push("operator max ceiling must be a positive amount");
  if (!lookupSupported) {
    blockers.push("provider project existence lookup is not supported; LIVE is blocked");
  }

  const extraActions =
    session.executionRequest?.requiredActions.filter((action) => !ALLOWED_LIVE_ACTIONS.includes(action)) ?? [];
  if (extraActions.length > 0) {
    blockers.push(`extra live actions are blocked: ${extraActions.join(",")}`);
  }
  if (!input.liveGateway && !input.liveLedger) {
    blockers.push("durable external action ledger is required before a Vercel write");
  }

  const uniqueBlockers = [...new Set(blockers)];
  if (uniqueBlockers.length > 0 || !session.preflight.safeToExecuteLive || !session.executionRequest || !session.readiness) {
    return emptyResult({
      sessionId: session.sessionId,
      executionRequestId: session.executionRequest?.executionRequestId ?? null,
      state: "BLOCKED",
      authorizedCeiling: session.maxAuthorizedUsd,
      blockers: uniqueBlockers.length > 0 ? uniqueBlockers : session.preflight.blockers,
      executorEntered: false,
      providerProjectLookupSupported: lookupSupported,
    });
  }

  const config = loadVercelLiveVerificationConfig();
  const payload = resolveVercelLiveTestPayload({
    testResourceName: config.testResource ?? session.ventureId,
    production_artifact_id: config.artifactId ?? undefined,
    repository_full_name: config.repository ?? undefined,
    commit_sha: config.sha ?? undefined,
  });

  const execution = await executeGovernedDeployment({
    request: session.executionRequest,
    readiness: session.readiness,
    eagAuthorizations: session.eagAuthorizations,
    treasuryAuthorizations: session.treasuryAuthorizations,
    providerWrites: session.providerWrites,
    liveGateway: input.liveGateway,
    liveAdapter: input.adapter,
    liveLedger: input.liveLedger,
    lookupProject: input.lookupProject,
    lookupDeployment: input.lookupDeployment,
    organizationId: session.organizationId,
    missionId: session.handoff?.missionId ?? "mission-infinity-test-vercel-live-verification",
    sessionId: session.sessionId,
    projectLookupSupported: lookupSupported,
    allowVercelLive: true,
    vercelLivePayload: payload,
    now: session.createdAt,
    startedAt: session.createdAt,
  });

  const projectCreationStatus = actionStatus(execution, "CREATE_HOSTING_PROJECT");
  const deploymentStatus = actionStatus(execution, "DEPLOY_APPLICATION");
  const verificationStatus = actionStatus(execution, "VERIFY_HEALTH");
  const state = operatorState({
    execution,
    projectStatus: projectCreationStatus,
    deploymentStatus,
    verificationStatus,
  });
  const projectCreations = Math.min(
    execution.liveProviderAccounting?.projectCreations ?? execution.liveSideEffects.providerAccountCreation,
    VERCEL_LIVE_MAX_PROJECTS,
  );
  const deployments = Math.min(
    execution.liveProviderAccounting?.deployments ?? execution.liveSideEffects.deployments,
    VERCEL_LIVE_MAX_DEPLOYMENTS,
  );

  return {
    sessionId: session.sessionId,
    executionRequestId: execution.requestId,
    state,
    projectCreationStatus,
    deploymentStatus,
    verificationStatus,
    providerProjectReference: execution.providerReferences.project_id ?? null,
    providerDeploymentReference: execution.providerReferences.deployment_id ?? null,
    safeTestUrl: safeUrl(execution.providerReferences.url),
    estimatedCost: execution.costsIncurred.estimatedUsd,
    authorizedCeiling: session.maxAuthorizedUsd,
    actualCost: execution.costsIncurred.unknown || execution.costsIncurred.actualUsd == null
      ? "UNKNOWN"
      : execution.costsIncurred.actualUsd,
    publicLaunchAuthority: false,
    publicLaunchState: "NOT_AUTHORIZED",
    sideEffects: {
      projectCreations,
      deployments,
      verificationReads: execution.liveProviderAccounting?.verificationReads ?? 0,
      dnsWrites: execution.liveSideEffects.dnsWrites,
      domainPurchases: execution.liveSideEffects.domainPurchases,
      paymentWrites: execution.liveSideEffects.paymentWrites,
      productionMigrations: execution.liveSideEffects.productionMigrations,
      publicLaunches: execution.liveSideEffects.publicLaunches,
      repositoryWrites: 0,
      treasuryMovements: execution.liveSideEffects.treasuryMovements,
      treasuryReservations: 0,
      eagExternalActions: execution.liveSideEffects.eagActions,
    },
    blockers: execution.blockers.map((item) => item.message),
    errors: execution.blockers.map((item) => ({ code: item.code, message: item.message })),
    executorEntered: true,
    durableReplayProtection: Boolean(input.liveLedger),
    providerProjectLookupSupported: lookupSupported,
    externalActionIds: {
      create: recordId(execution, "CREATE_HOSTING_PROJECT"),
      deploy: recordId(execution, "DEPLOY_APPLICATION"),
      verify: recordId(execution, "VERIFY_HEALTH"),
    },
    durableActionStates: {
      create: recordDurableState(execution, "CREATE_HOSTING_PROJECT"),
      deploy: recordDurableState(execution, "DEPLOY_APPLICATION"),
      verify: recordDurableState(execution, "VERIFY_HEALTH"),
    },
    secretPrinted: false,
    secretPersisted: false,
  };
}

function recordId(
  execution: GovernedDeploymentExecutionResult,
  actionType: GovernedExecutionActionType,
): string | null {
  return execution.actionsAttempted.find((item) => item.actionType === actionType)?.externalActionId ?? null;
}

function recordDurableState(
  execution: GovernedDeploymentExecutionResult,
  actionType: GovernedExecutionActionType,
): string | null {
  const record = execution.actionsAttempted.find((item) => item.actionType === actionType);
  return record?.durableState ?? record?.state ?? null;
}

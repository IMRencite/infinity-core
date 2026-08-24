import type { PolicyDecision } from "@/lib/infinity/launch-gateway/autonomous-authorization/constants";
import type { DeploymentProviderCapability } from "@/lib/infinity/governed-deployment-readiness/constants";
import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import type {
  ExecutionSideEffectCounts,
  GovernedExecutionActionType,
  GovernedExecutionFailureCode,
  GovernedExecutionMode,
  GovernedExecutionState,
} from "./constants";

export type ExecutionFailure = {
  code: GovernedExecutionFailureCode;
  message: string;
  actionType?: GovernedExecutionActionType | null;
  actionId?: string | null;
};

export type ActionAuthorityGrant = {
  actionType: GovernedExecutionActionType;
  authorizationId: string;
  decision: PolicyDecision;
};

export type TreasuryActionGrant = {
  actionType: GovernedExecutionActionType;
  authorizationId: string;
  decision: "AUTO_AUTHORIZE" | "REQUIRE_POLICY_ESCALATION" | "BLOCK";
  authorizedAmountUsd: number | null;
  costActuality: "KNOWN" | "ESTIMATE" | "UNKNOWN";
  reservationId: string | null;
  ventureId?: string | null;
  expiresAt?: string | null;
  invalidated?: boolean;
};

export type ProviderWriteEvidence = {
  capability: DeploymentProviderCapability;
  verificationState: "NONE" | "READ_ONLY_VERIFIED" | "WRITE_CAPABLE_NOT_AUTHORIZED" | "WRITE_AUTHORIZED" | "FAILED";
  credentialAvailable: boolean;
  credentialWriteCapable: boolean;
  writeAuthorityGranted: boolean;
};

export type CostTelemetry = {
  estimatedUsd: number | null;
  authorizedUsd: number | null;
  actualUsd: number | null;
  unknown: boolean;
};

export type GatewayActionBinding = {
  executionActionType: GovernedExecutionActionType;
  gatewayActionType: string | null;
  capability: DeploymentProviderCapability;
  adapterKey: "mock.infinity_v1" | "vercel.com_v1" | null;
  liveAdapterExists: boolean;
  simulationSupported: boolean;
};

export type GovernedDeploymentExecutionRequest = {
  schemaVersion: "governed_deployment_execution_v1";
  executionRequestId: string;
  ventureId: string;
  companyId: string | null;
  readinessId: string;
  productionArtifactHandoffId: string | null;
  buildContractId: string | null;
  ventureSystemsBuildContractId: string | null;
  mode: GovernedExecutionMode;
  executable: boolean;
  requiredActions: GovernedExecutionActionType[];
  providerBindings: GatewayActionBinding[];
  treasuryAuthorizationRefs: Array<{ actionType: GovernedExecutionActionType; authorizationId: string }>;
  eagAuthorizationRefs: Array<{ actionType: GovernedExecutionActionType; authorizationId: string }>;
  deploymentAuthorizationId: string | null;
  publicLaunchAuthorizationId: string | null;
  rollbackRequirements: { required: boolean; strategyKnown: boolean; authorized: boolean };
  healthCheckRequirements: { required: boolean; path: string | null };
  idempotencyKey: string;
  createdAt: string;
  blockers: ExecutionFailure[];
  traceability: {
    ventureId: string;
    readinessId: string;
    handoffId: string | null;
    executionRequestId: string;
  };
};

export type ActionExecutionRecord = {
  actionId: string;
  actionType: GovernedExecutionActionType;
  gatewayActionType: string | null;
  capability: DeploymentProviderCapability;
  state: GovernedExecutionState;
  requiresTreasury: boolean;
  requiresEag: boolean;
  requiresWriteCredential: boolean;
  requiresProcurement: boolean;
  writeAuthority: boolean;
  costKnown: boolean;
  budgetAuthorized: boolean;
  specificActionAuthorized: boolean;
  cost: CostTelemetry;
  providerReferences: Record<string, string>;
  providerCallId: string | null;
  idempotencyKey: string;
  reused: boolean;
  simulated: boolean;
  live: boolean;
  failure: ExecutionFailure | null;
};

export type GovernedDeploymentExecutionResult = {
  schemaVersion: "governed_deployment_execution_v1";
  executionId: string;
  requestId: string;
  ventureId: string;
  mode: GovernedExecutionMode;
  state: GovernedExecutionState;
  actionsAttempted: ActionExecutionRecord[];
  actionsSucceeded: string[];
  actionsFailed: string[];
  actionsBlocked: string[];
  providerReferences: Record<string, string>;
  costsIncurred: CostTelemetry;
  treasuryReferences: string[];
  eagReferences: string[];
  rollbackState: "NOT_REQUIRED" | "REQUIRED_NOT_AUTHORIZED" | "AUTHORIZED_NOT_EXECUTED" | "SIMULATED" | "LIVE";
  healthCheckState: "NOT_REQUIRED" | "PASS" | "FAIL" | "NOT_RUN";
  publicLaunchState: "NOT_AUTHORIZED" | "AUTHORIZED_NOT_EXECUTED";
  startedAt: string;
  completedAt: string;
  blockers: ExecutionFailure[];
  traceability: {
    ventureId: string;
    handoffId: string | null;
    readinessId: string;
    executionRequestId: string;
    actionIds: string[];
    providerCallIds: string[];
  };
  simulatedSideEffects: ExecutionSideEffectCounts;
  liveSideEffects: ExecutionSideEffectCounts;
  liveProviderAccounting?: {
    provider: "vercel.com_v1";
    projectCreations: number;
    deployments: number;
    verificationReads: number;
    cleanupWrites: number;
  };
};

export type LiveGatewayPort = {
  execute: (input: {
    gatewayActionType: string;
    target: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    executionRequestId: string;
    actionId: string;
  }) => Promise<{
    providerCallId: string;
    externalIds: Record<string, string>;
    actualCostUsd: number | null;
    ready?: boolean;
    verified?: boolean;
    httpStatus?: number | null;
    errorClassification?: string | null;
  }>;
};

export type VercelLivePayload = {
  testResourceName: string;
  production_artifact_id?: string;
  artifact_hash?: string;
  repository_full_name?: string;
  commit_sha?: string;
  project_id?: string;
  deployment_id?: string;
  github_repository_id?: number;
};

export type BuildExecutionRequestInput = {
  readiness: GovernedDeploymentReadiness;
  mode?: GovernedExecutionMode;
  expectedVentureId?: string | null;
  expectedReadinessId?: string | null;
  expectedHandoffId?: string | null;
  deploymentAuthority: { granted: boolean; authorizationId: string | null; source: string | null };
  publicLaunchAuthority?: { granted: boolean; authorizationId: string | null; source: string | null };
  eagAuthorizations?: ActionAuthorityGrant[];
  treasuryAuthorizations?: TreasuryActionGrant[];
  providerWrites?: ProviderWriteEvidence[];
  createdAt?: string;
  requestedActions?: GovernedExecutionActionType[];
};

export type ExecuteGovernedDeploymentInput = {
  request: GovernedDeploymentExecutionRequest;
  readiness: GovernedDeploymentReadiness;
  eagAuthorizations?: ActionAuthorityGrant[];
  treasuryAuthorizations?: TreasuryActionGrant[];
  providerWrites?: ProviderWriteEvidence[];
  liveGateway?: LiveGatewayPort | null;
  allowVercelLive?: boolean;
  vercelLivePayload?: VercelLivePayload;
  simulateFailures?: GovernedExecutionActionType[];
  environmentVariableNames?: string[];
  secretValuesForbidden?: string[];
  startedAt?: string;
};

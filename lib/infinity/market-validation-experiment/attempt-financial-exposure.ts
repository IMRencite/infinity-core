import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";
import {
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
  FOUNDER_APPROVED_RUNTIME_CEILING_USD,
  FOUNDER_AUTHORIZATION_PROVIDER,
  currentCreFounderScope,
  evaluateFounderAuthorization,
  getFounderAuthorization,
  lastConsumedSuccessorFounderAuthorization,
  type FounderAuthorizationScope,
} from "./founder-authorization";
import { MARKET_VALIDATION_PURPOSE } from "./constants";

export const EXTERNAL_ACTION_AUTHORIZATION = "EXTERNAL_ACTION_AUTHORIZATION" as const;
export const FINANCIAL_EXPOSURE_AUTHORIZATION = "FINANCIAL_EXPOSURE_AUTHORIZATION" as const;
export const PROVIDER_COST_OBSERVATION = "PROVIDER_COST_OBSERVATION" as const;
export const RUNTIME_EXPOSURE_AUTHORIZATION = "RUNTIME_EXPOSURE_AUTHORIZATION" as const;

export type ExternalActionAuthorization = {
  kind: typeof EXTERNAL_ACTION_AUTHORIZATION;
  attemptId: string;
  scope: FounderAuthorizationScope;
  maximumExecutions: 1;
  executionsConsumed: number;
  state: "AVAILABLE" | "CONSUMED" | "MISSING";
  reason: string;
};

export type FinancialExposureAuthorization = {
  kind: typeof FINANCIAL_EXPOSURE_AUTHORIZATION;
  currency: "USD";
  maximumExposure: number;
  scope: FounderAuthorizationScope;
  duration: "DEPLOYMENT_ATTEMPT";
  activationState: "NOT_ACTIVATED" | "ACTIVE" | "EXPIRED";
  prepaidBalance: false;
  assumedSpend: false;
  reason: string;
};

export type RuntimeExposureAuthorization = {
  kind: typeof RUNTIME_EXPOSURE_AUTHORIZATION;
  currency: "USD";
  maximumExposure: number;
  scope: FounderAuthorizationScope;
  duration: "RUNTIME_14_DAYS";
  activationState: "NOT_ACTIVATED" | "ACTIVE" | "EXPIRED";
  prepaidBalance: false;
  assumedSpend: false;
  reason: string;
};

export type ProviderCostObservation = {
  kind: typeof PROVIDER_COST_OBSERVATION;
  observedAmount: number | null;
  attributable: false;
  source: string | null;
  confidence: "NONE";
  timestamp: string | null;
  classification: "UNKNOWN";
  successDoesNotProveZeroCost: true;
  successDoesNotConsumeCeiling: true;
};

export type FinancialUtilization = {
  authorizationCeiling: number;
  observedSpend: "UNKNOWN";
  utilization: "UNKNOWN";
  ceilingRecordedAsActualSpend: false;
};

export type LastSuccessorAttemptGovernance = {
  externalAttemptExecuted: true;
  providerDeploymentCreated: boolean;
  attempt: ExternalActionAuthorization;
  deploymentExposure: FinancialExposureAuthorization;
  runtimeExposure: RuntimeExposureAuthorization;
  costObservation: ProviderCostObservation;
  utilization: FinancialUtilization;
  fiveDollarsRecordedAsActualSpend: false;
  runtimeActivated: false;
  providerCost: "UNKNOWN";
  sourceBundleTransport: "PROVEN";
  endToEndVerified: false;
};

const LAST_SUCCESSOR_ATTEMPT_ID = CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID;

const lastSuccessorScope: FounderAuthorizationScope = {
  candidateId: CRE_CANDIDATE_ID,
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
  artifactDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
  provider: FOUNDER_AUTHORIZATION_PROVIDER,
  capability: SOURCE_BUNDLE_CAPABILITY,
  deploymentPurpose: MARKET_VALIDATION_PURPOSE,
};

let lastAttempt: LastSuccessorAttemptGovernance = lastSuccessorFailedStagingAttempt();

function unknownCostObservation(source: string | null, timestamp: string | null): ProviderCostObservation {
  return {
    kind: PROVIDER_COST_OBSERVATION,
    observedAmount: null,
    attributable: false,
    source,
    confidence: "NONE",
    timestamp,
    classification: "UNKNOWN",
    successDoesNotProveZeroCost: true,
    successDoesNotConsumeCeiling: true,
  };
}

function lastSuccessorFailedStagingAttempt(): LastSuccessorAttemptGovernance {
  return {
    externalAttemptExecuted: true,
    providerDeploymentCreated: false,
    attempt: {
      kind: EXTERNAL_ACTION_AUTHORIZATION,
      attemptId: LAST_SUCCESSOR_ATTEMPT_ID,
      scope: lastSuccessorScope,
      maximumExecutions: 1,
      executionsConsumed: 1,
      state: "CONSUMED",
      reason:
        "One real provider write workflow executed. POST /v2/files reached. POST /v13/deployments was rejected. The single-use attempt is consumed.",
    },
    deploymentExposure: {
      kind: FINANCIAL_EXPOSURE_AUTHORIZATION,
      currency: "USD",
      maximumExposure: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
      scope: lastSuccessorScope,
      duration: "DEPLOYMENT_ATTEMPT",
      activationState: "NOT_ACTIVATED",
      prepaidBalance: false,
      assumedSpend: false,
      reason: "The $5.00 ceiling is maximum authorized exposure, not prepaid spend and not observed cost.",
    },
    runtimeExposure: {
      kind: RUNTIME_EXPOSURE_AUTHORIZATION,
      currency: "USD",
      maximumExposure: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
      scope: lastSuccessorScope,
      duration: "RUNTIME_14_DAYS",
      activationState: "NOT_ACTIVATED",
      prepaidBalance: false,
      assumedSpend: false,
      reason: "Runtime exposure does not activate without a READY deployment. It is not runtime spend.",
    },
    costObservation: unknownCostObservation(
      "vercel.com_v1 POST /v13/deployments 400 bad_request target=preview",
      "2026-08-29T06:10:23.022Z",
    ),
    utilization: {
      authorizationCeiling: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
      observedSpend: "UNKNOWN",
      utilization: "UNKNOWN",
      ceilingRecordedAsActualSpend: false,
    },
    fiveDollarsRecordedAsActualSpend: false,
    runtimeActivated: false,
    providerCost: "UNKNOWN",
    sourceBundleTransport: "PROVEN",
    endToEndVerified: false,
  };
}

export function resetAttemptFinancialExposureGovernance(): void {
  lastAttempt = lastSuccessorFailedStagingAttempt();
}

export function getLastSuccessorAttemptGovernance(): LastSuccessorAttemptGovernance {
  return lastAttempt;
}

export function recordExternalActionAttemptConsumed(input: {
  attemptId: string;
  scope: FounderAuthorizationScope;
  timestamp?: string;
  source?: string;
  providerDeploymentCreated?: boolean;
}): LastSuccessorAttemptGovernance {
  lastAttempt = {
    ...lastSuccessorFailedStagingAttempt(),
    externalAttemptExecuted: true,
    providerDeploymentCreated: Boolean(input.providerDeploymentCreated),
    attempt: {
      kind: EXTERNAL_ACTION_AUTHORIZATION,
      attemptId: input.attemptId,
      scope: input.scope,
      maximumExecutions: 1,
      executionsConsumed: 1,
      state: "CONSUMED",
      reason: "One real provider write workflow executed. Attempt authorization is consumed. Financial ceiling spend remains unobserved.",
    },
    costObservation: unknownCostObservation(input.source ?? null, input.timestamp ?? new Date().toISOString()),
  };
  return lastAttempt;
}

export function inspectExternalActionAuthorization(
  authorization = getFounderAuthorization(),
): ExternalActionAuthorization {
  if (!authorization) {
    return {
      kind: EXTERNAL_ACTION_AUTHORIZATION,
      attemptId: LAST_SUCCESSOR_ATTEMPT_ID,
      scope: currentCreFounderScope(),
      maximumExecutions: 1,
      executionsConsumed: lastAttempt.attempt.executionsConsumed,
      state: lastAttempt.attempt.state,
      reason: lastAttempt.attempt.reason,
    };
  }
  const consumed = authorization.executionsConsumed >= authorization.maximumExecutions;
  return {
    kind: EXTERNAL_ACTION_AUTHORIZATION,
    attemptId: authorization.authorizationId,
    scope: authorization.scope,
    maximumExecutions: 1,
    executionsConsumed: authorization.executionsConsumed,
    state: consumed ? "CONSUMED" : "AVAILABLE",
    reason: consumed
      ? "Single-use external action attempt is consumed. A new attempt authorization is required."
      : "External action attempt is available. This is not proof of financial spend.",
  };
}

export function inspectDeploymentFinancialExposure(
  authorization = getFounderAuthorization(),
): FinancialExposureAuthorization {
  return {
    kind: FINANCIAL_EXPOSURE_AUTHORIZATION,
    currency: "USD",
    maximumExposure: authorization?.deploymentCeilingUsd ?? FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
    scope: authorization?.scope ?? lastSuccessorScope,
    duration: "DEPLOYMENT_ATTEMPT",
    activationState: "NOT_ACTIVATED",
    prepaidBalance: false,
    assumedSpend: false,
    reason: "Financial ceilings are maximum authorized exposure, not prepaid balances and not assumed spend.",
  };
}

export function inspectRuntimeFinancialExposure(
  authorization = getFounderAuthorization(),
): RuntimeExposureAuthorization {
  return {
    kind: RUNTIME_EXPOSURE_AUTHORIZATION,
    currency: "USD",
    maximumExposure: authorization?.runtimeCeilingUsd ?? FOUNDER_APPROVED_RUNTIME_CEILING_USD,
    scope: authorization?.scope ?? lastSuccessorScope,
    duration: "RUNTIME_14_DAYS",
    activationState: "NOT_ACTIVATED",
    prepaidBalance: false,
    assumedSpend: false,
    reason: "Runtime exposure stays NOT_ACTIVATED until a READY deployment exists. Failed create does not activate it.",
  };
}

export function inspectProviderCostObservation(): ProviderCostObservation {
  return lastAttempt.costObservation;
}

export function inspectFinancialUtilization(): FinancialUtilization {
  return lastAttempt.utilization;
}

export function successfulActionDoesNotProveSpend(input: {
  deploymentReady: boolean;
  observedAmount: number | null;
}): ProviderCostObservation {
  void input.deploymentReady;
  return unknownCostObservation(
    input.observedAmount == null
      ? "Successful or failed action is not a cost proof."
      : "Observed amount was supplied without attributable provider evidence.",
    new Date().toISOString(),
  );
}

export function evaluateNewAttemptAuthorizationRequired(): {
  newAttemptAuthorizationRequired: true;
  newFinancialExposureAuthorizationRequired: true;
  previousAttemptReusable: false;
  previousFinancialApprovalInferred: false;
  reason: typeof NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED;
  founderRecognized: false;
} {
  const founder = evaluateFounderAuthorization({
    authorization: lastConsumedSuccessorFounderAuthorization(),
    requestedScope: currentCreFounderScope(),
  });
  if (founder.recognized) {
    throw new Error("Consumed successor authorization must not be treated as a new founder approval.");
  }
  return {
    newAttemptAuthorizationRequired: true,
    newFinancialExposureAuthorizationRequired: true,
    previousAttemptReusable: false,
    previousFinancialApprovalInferred: false,
    reason: NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED,
    founderRecognized: false,
  };
}

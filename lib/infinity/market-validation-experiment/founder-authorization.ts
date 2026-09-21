import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  LOCKED_SUCCESS_CRITERIA,
  MARKET_VALIDATION_PURPOSE,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { LOCKED_CRE_SOURCE_DIGEST, SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";
import type { CostClassification, DeploymentPurpose } from "./types";

export const FOUNDER_AUTHORIZATION_ACTOR = "FOUNDER" as const;
export const FOUNDER_AUTHORIZATION_SOURCE = "EXPLICIT_HUMAN" as const;
export const FOUNDER_ECONOMIC_AUTHORIZATION = "BOUNDED_BY_FOUNDER_AUTHORIZATION" as const;
export const FOUNDER_AUTHORIZATION_PROVIDER = "vercel.com_v1" as const;
export const PLACEHOLDER_CEILING_TOKEN = "[INSERT_EXPLICIT_FOUNDER_AMOUNT]" as const;

export const CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID = "founder_ceiling_cre_val_5_10_v1" as const;
export const CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_val_5_10_successor_v1" as const;
export const FOUNDER_AUTHORIZATION_ID = "founder_ceiling_cre_val_5_10_successor_staging_v1" as const;
export const FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD = 5 as const;
export const FOUNDER_APPROVED_RUNTIME_CEILING_USD = 10 as const;

/**
 * Values explicitly approved by the founder for this one validation experiment.
 * Placeholders remain rejected by parseFounderCeilingAmount.
 */
export const THIS_REQUEST_FOUNDER_CEILINGS = {
  deploymentCeilingUsd: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
  runtimeCeilingUsd: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
} as const;

export type FounderCeilingParseFailure =
  | "PLACEHOLDER_CEILING_FORBIDDEN"
  | "ZERO_OR_NEGATIVE_CEILING_FORBIDDEN"
  | "MISSING_EXPLICIT_CEILING"
  | "NON_NUMERIC_CEILING";

export type FounderCeilingParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: FounderCeilingParseFailure };

export type FounderAuthorizationScope = {
  candidateId: string;
  experimentId: string;
  artifactId: string;
  artifactDigest: string;
  provider: typeof FOUNDER_AUTHORIZATION_PROVIDER;
  capability: typeof SOURCE_BUNDLE_CAPABILITY;
  deploymentPurpose: typeof MARKET_VALIDATION_PURPOSE;
};

export type FounderExternalCostAuthorization = {
  authorizationId: string;
  actor: typeof FOUNDER_AUTHORIZATION_ACTOR;
  source: typeof FOUNDER_AUTHORIZATION_SOURCE;
  scope: FounderAuthorizationScope;
  providerCostState: "UNKNOWN";
  deploymentCeilingUsd: number;
  runtimeCeilingUsd: number;
  currency: "USD";
  effectiveAt: string;
  expiresAt: string;
  singleUse: true;
  maximumExecutions: 1;
  executionsConsumed: number;
  cancelled: boolean;
  reason: string;
  traceability: {
    candidateId: string;
    experimentId: string;
    artifactId: string;
    authorizationId: string;
  };
  economicAuthorization: typeof FOUNDER_ECONOMIC_AUTHORIZATION;
  treasuryMovement: 0;
  globalHostingAuthority: false;
};

export type FounderAuthorizationEvaluation = {
  present: boolean;
  recognized: boolean;
  economicAuthorization: typeof FOUNDER_ECONOMIC_AUTHORIZATION | "NONE";
  providerCostClassification: CostClassification;
  founderCeilingTreatedAsProviderCost: false;
  treasuryMovement: 0;
  globalHostingAuthority: false;
  singleUse: boolean;
  expired: boolean;
  consumed: boolean;
  scopeMatches: boolean;
  reason: string;
  authorization: FounderExternalCostAuthorization | null;
};

const PLACEHOLDER_PATTERN = /INSERT_EXPLICIT|REPLACE_WITH_EXPLICIT|PLACEHOLDER|^\[.*\]$/i;

let stored: FounderExternalCostAuthorization | null = null;

export function resetFounderAuthorization(): void {
  stored = null;
}

export function getFounderAuthorization(): FounderExternalCostAuthorization | null {
  return stored;
}

export function persistFounderAuthorization(
  authorization: FounderExternalCostAuthorization,
): FounderExternalCostAuthorization {
  stored = authorization;
  return stored;
}

export function lastConsumedSuccessorFounderAuthorization(): FounderExternalCostAuthorization {
  const built = buildFounderExternalCostAuthorization({
    authorizationId: CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
    scope: currentCreFounderScope(),
    reason:
      "Previous successor $5/$10 authorization remains a financial-exposure ceiling. The associated single-use external attempt was consumed by the rejected staging-predecessor request.",
    now: new Date("2026-08-29T06:10:23.022Z"),
  });
  if (!built.ok) {
    throw new Error(built.reason);
  }
  return { ...built.authorization, executionsConsumed: 1 };
}

export function consumeFounderAuthorizationDeployment(): FounderExternalCostAuthorization | null {
  if (!stored) return null;
  if (stored.executionsConsumed >= stored.maximumExecutions) return stored;
  stored = { ...stored, executionsConsumed: stored.executionsConsumed + 1 };
  return stored;
}

export function parseFounderCeilingAmount(raw: unknown): FounderCeilingParseResult {
  if (raw == null || raw === "") {
    return { ok: false, reason: "MISSING_EXPLICIT_CEILING" };
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, reason: "MISSING_EXPLICIT_CEILING" };
    if (PLACEHOLDER_PATTERN.test(trimmed)) {
      return { ok: false, reason: "PLACEHOLDER_CEILING_FORBIDDEN" };
    }
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { ok: false, reason: "NON_NUMERIC_CEILING" };
    }
    return parseFounderCeilingAmount(Number(trimmed));
  }
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return { ok: false, reason: "NON_NUMERIC_CEILING" };
  }
  if (raw <= 0) return { ok: false, reason: "ZERO_OR_NEGATIVE_CEILING_FORBIDDEN" };
  return { ok: true, value: raw };
}

export function parseFounderCeilings(
  deploymentCeiling: unknown,
  runtimeCeiling: unknown,
):
  | { ok: true; deploymentCeilingUsd: number; runtimeCeilingUsd: number }
  | { ok: false; reason: FounderCeilingParseFailure } {
  const deployment = parseFounderCeilingAmount(deploymentCeiling);
  if (!deployment.ok) return deployment;
  const runtime = parseFounderCeilingAmount(runtimeCeiling);
  if (!runtime.ok) return runtime;
  return {
    ok: true,
    deploymentCeilingUsd: deployment.value,
    runtimeCeilingUsd: runtime.value,
  };
}

export function lockedCreFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: LOCKED_CRE_ARTIFACT_ID,
    artifactDigest: LOCKED_CRE_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function currentCreFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    artifactDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function predecessorConsumedFounderAuthorization(now = new Date()): FounderExternalCostAuthorization {
  const effectiveAt = new Date(now.getTime() - 60 * 60 * 1000);
  return {
    authorizationId: CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
    actor: FOUNDER_AUTHORIZATION_ACTOR,
    source: FOUNDER_AUTHORIZATION_SOURCE,
    scope: lockedCreFounderScope(),
    providerCostState: "UNKNOWN",
    deploymentCeilingUsd: FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
    runtimeCeilingUsd: FOUNDER_APPROVED_RUNTIME_CEILING_USD,
    currency: "USD",
    effectiveAt: effectiveAt.toISOString(),
    expiresAt: founderAuthorizationExpiresAt(effectiveAt),
    singleUse: true,
    maximumExecutions: 1,
    executionsConsumed: 1,
    cancelled: false,
    reason: "Previous $5 single-use deployment authorization was consumed by the failed predecessor source-bundle write.",
    traceability: {
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      authorizationId: CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
    },
    economicAuthorization: FOUNDER_ECONOMIC_AUTHORIZATION,
    treasuryMovement: 0,
    globalHostingAuthority: false,
  };
}

export function founderAuthorizationExpiresAt(effectiveAt: Date): string {
  return new Date(
    effectiveAt.getTime() + LOCKED_SUCCESS_CRITERIA.maxDurationDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function scopesMatch(left: FounderAuthorizationScope, right: FounderAuthorizationScope): boolean {
  return (
    left.candidateId === right.candidateId &&
    left.experimentId === right.experimentId &&
    left.artifactId === right.artifactId &&
    left.artifactDigest === right.artifactDigest &&
    left.provider === right.provider &&
    left.capability === right.capability &&
    left.deploymentPurpose === right.deploymentPurpose
  );
}

export function buildFounderExternalCostAuthorization(input: {
  authorizationId: string;
  deploymentCeiling: unknown;
  runtimeCeiling: unknown;
  scope: FounderAuthorizationScope;
  reason: string;
  now?: Date;
}):
  | { ok: true; authorization: FounderExternalCostAuthorization }
  | { ok: false; reason: FounderCeilingParseFailure } {
  const parsed = parseFounderCeilings(input.deploymentCeiling, input.runtimeCeiling);
  if (!parsed.ok) return parsed;
  const now = input.now ?? new Date();
  const authorizationId = input.authorizationId;
  return {
    ok: true,
    authorization: {
      authorizationId,
      actor: FOUNDER_AUTHORIZATION_ACTOR,
      source: FOUNDER_AUTHORIZATION_SOURCE,
      scope: input.scope,
      providerCostState: "UNKNOWN",
      deploymentCeilingUsd: parsed.deploymentCeilingUsd,
      runtimeCeilingUsd: parsed.runtimeCeilingUsd,
      currency: "USD",
      effectiveAt: now.toISOString(),
      expiresAt: founderAuthorizationExpiresAt(now),
      singleUse: true,
      maximumExecutions: 1,
      executionsConsumed: 0,
      cancelled: false,
      reason: input.reason,
      traceability: {
        candidateId: input.scope.candidateId,
        experimentId: input.scope.experimentId,
        artifactId: input.scope.artifactId,
        authorizationId,
      },
      economicAuthorization: FOUNDER_ECONOMIC_AUTHORIZATION,
      treasuryMovement: 0,
      globalHostingAuthority: false,
    },
  };
}

export function evaluateFounderAuthorization(input: {
  authorization: FounderExternalCostAuthorization | null;
  requestedScope: FounderAuthorizationScope;
  now?: Date;
}): FounderAuthorizationEvaluation {
  const denied = (
    reason: string,
    extras: Partial<FounderAuthorizationEvaluation> = {},
  ): FounderAuthorizationEvaluation => ({
    present: Boolean(input.authorization),
    recognized: false,
    economicAuthorization: "NONE",
    providerCostClassification: "UNKNOWN",
    founderCeilingTreatedAsProviderCost: false,
    treasuryMovement: 0,
    globalHostingAuthority: false,
    singleUse: input.authorization?.singleUse ?? true,
    expired: extras.expired ?? false,
    consumed: extras.consumed ?? false,
    scopeMatches: extras.scopeMatches ?? false,
    reason,
    authorization: input.authorization,
    ...extras,
  });

  const authorization = input.authorization;
  if (!authorization) {
    return denied("Explicit founder ceiling is missing. Do not infer an amount.");
  }
  if (authorization.actor !== FOUNDER_AUTHORIZATION_ACTOR || authorization.source !== FOUNDER_AUTHORIZATION_SOURCE) {
    return denied("Founder authorization must be an explicit human source.");
  }
  if (authorization.providerCostState !== "UNKNOWN") {
    return denied("Founder authorization must not reclassify provider cost as known.");
  }
  if (authorization.globalHostingAuthority) {
    return denied("Founder authorization must not grant global hosting authority.");
  }
  if (authorization.treasuryMovement !== 0) {
    return denied("Founder authorization must not move Treasury funds.");
  }
  if (!authorization.singleUse || authorization.maximumExecutions !== 1) {
    return denied("Deployment-action founder authorization must be single-use with maximumExecutions=1.");
  }
  if (authorization.cancelled) {
    return denied("Founder authorization was cancelled.");
  }
  const now = input.now ?? new Date();
  const expired = new Date(authorization.expiresAt).getTime() <= now.getTime();
  if (expired) {
    return denied("Founder authorization expired.", { expired: true });
  }
  const consumed = authorization.executionsConsumed >= authorization.maximumExecutions;
  const scopeMatches = scopesMatch(authorization.scope, input.requestedScope);
  const identityChanged =
    authorization.scope.artifactId !== input.requestedScope.artifactId ||
    authorization.scope.artifactDigest !== input.requestedScope.artifactDigest;
  if (consumed) {
    return denied("NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED", { consumed: true, scopeMatches });
  }
  if (!scopeMatches) {
    return denied(
      identityChanged
        ? "NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED"
        : "Founder authorization scope does not match the requested experiment, artifact, provider, and capability.",
      {
        scopeMatches: false,
      },
    );
  }
  if (authorization.scope.deploymentPurpose !== MARKET_VALIDATION_PURPOSE) {
    return denied("Founder authorization purpose is outside MARKET_VALIDATION_EXPERIMENT.");
  }
  return {
    present: true,
    recognized: true,
    economicAuthorization: FOUNDER_ECONOMIC_AUTHORIZATION,
    providerCostClassification: "UNKNOWN",
    founderCeilingTreatedAsProviderCost: false,
    treasuryMovement: 0,
    globalHostingAuthority: false,
    singleUse: true,
    expired: false,
    consumed: false,
    scopeMatches: true,
    reason: "BOUNDED_BY_FOUNDER_AUTHORIZATION. Provider cost remains UNKNOWN. Ceiling is an authorization boundary, not a cost proof.",
    authorization,
  };
}

export function evaluateThisRequestFounderAuthorization(
  requestedScope: FounderAuthorizationScope = currentCreFounderScope(),
  now?: Date,
): FounderAuthorizationEvaluation {
  const built = buildFounderExternalCostAuthorization({
    authorizationId: FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: THIS_REQUEST_FOUNDER_CEILINGS.deploymentCeilingUsd,
    runtimeCeiling: THIS_REQUEST_FOUNDER_CEILINGS.runtimeCeilingUsd,
    scope: requestedScope,
    reason:
      "Founder explicit NEW $5 deployment / $10 14-day runtime ceiling for one corrected staging MARKET_VALIDATION_EXPERIMENT source-bundle write.",
    now,
  });
  if (!built.ok) {
    return {
      present: false,
      recognized: false,
      economicAuthorization: "NONE",
      providerCostClassification: "UNKNOWN",
      founderCeilingTreatedAsProviderCost: false,
      treasuryMovement: 0,
      globalHostingAuthority: false,
      singleUse: true,
      expired: false,
      consumed: false,
      scopeMatches: false,
      reason: built.reason,
      authorization: null,
    };
  }
  return evaluateFounderAuthorization({
    authorization: built.authorization,
    requestedScope,
    now,
  });
}

export function founderAuthorizationCoversPurpose(purpose: DeploymentPurpose): boolean {
  return purpose === MARKET_VALIDATION_PURPOSE || purpose === "PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR";
}

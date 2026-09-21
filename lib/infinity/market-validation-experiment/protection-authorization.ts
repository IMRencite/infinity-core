import {
  FOUNDER_AUTHORIZATION_ACTOR,
  FOUNDER_AUTHORIZATION_PROVIDER,
  FOUNDER_AUTHORIZATION_SOURCE,
  FOUNDER_ECONOMIC_AUTHORIZATION,
  founderAuthorizationExpiresAt,
  parseFounderCeilings,
} from "./founder-authorization";
import {
  CRE_CANDIDATE_ID,
  FAILED_CRE_VALIDATION_PROJECT,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "./constants";
import { HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE } from "./live-validation-failure";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";
import { LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID } from "./live-validation-failure";

export const PROTECTION_FOUNDER_AUTHORIZATION_ID = "founder_ceiling_cre_val_protection_5_10_v1" as const;
export const FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD = 5 as const;
export const FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD = 10 as const;

export type ProtectionFounderScope = {
  candidateId: typeof CRE_CANDIDATE_ID;
  experimentId: typeof LOCKED_CRE_EXPERIMENT_ID;
  artifactId: typeof SUCCESSOR_CRE_ARTIFACT_ID;
  artifactDigest: typeof SUCCESSOR_CRE_SOURCE_DIGEST;
  provider: typeof FOUNDER_AUTHORIZATION_PROVIDER;
  project: typeof FAILED_CRE_VALIDATION_PROJECT;
  capability: typeof HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE;
  deploymentPurpose: typeof MARKET_VALIDATION_PURPOSE;
  existingDeploymentId: typeof LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID;
};

export type ProtectionFounderAuthorization = {
  authorizationId: typeof PROTECTION_FOUNDER_AUTHORIZATION_ID;
  actor: typeof FOUNDER_AUTHORIZATION_ACTOR;
  source: typeof FOUNDER_AUTHORIZATION_SOURCE;
  scope: ProtectionFounderScope;
  providerCostState: "UNKNOWN";
  protectionCeilingUsd: typeof FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD;
  runtimeCeilingUsd: typeof FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD;
  currency: "USD";
  effectiveAt: string;
  expiresAt: string;
  singleUse: true;
  maximumExecutions: 1;
  executionsConsumed: number;
  cancelled: boolean;
  reason: string;
  economicAuthorization: typeof FOUNDER_ECONOMIC_AUTHORIZATION;
  treasuryMovement: 0;
  fiveDollarsRecordedAsSpend: false;
  globalHostingAuthority: false;
};

export function currentProtectionFounderScope(): ProtectionFounderScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    artifactDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    project: FAILED_CRE_VALIDATION_PROJECT,
    capability: HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
    existingDeploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
  };
}

let stored: ProtectionFounderAuthorization | null = null;
let runtimeActivation: { activated: boolean; activationTime: string | null } = {
  activated: false,
  activationTime: null,
};

export function resetProtectionAuthorization(): void {
  stored = null;
  runtimeActivation = { activated: false, activationTime: null };
}

export function getProtectionFounderAuthorization(): ProtectionFounderAuthorization | null {
  return stored;
}

export function persistProtectionFounderAuthorization(
  authorization: ProtectionFounderAuthorization,
): ProtectionFounderAuthorization {
  stored = authorization;
  return stored;
}

export function consumeProtectionFounderAuthorization(): ProtectionFounderAuthorization | null {
  if (!stored) return null;
  if (stored.executionsConsumed >= stored.maximumExecutions) return stored;
  stored = { ...stored, executionsConsumed: stored.executionsConsumed + 1 };
  return stored;
}

export function evaluateThisRequestProtectionCeilings():
  | {
      ok: true;
      protectionCeilingUsd: number;
      runtimeCeilingUsd: number;
      recognized: true;
      reason: "BOUNDED_BY_FOUNDER_AUTHORIZATION";
    }
  | {
      ok: false;
      reason:
        | "PLACEHOLDER_CEILING_FORBIDDEN"
        | "ZERO_OR_NEGATIVE_CEILING_FORBIDDEN"
        | "MISSING_EXPLICIT_CEILING"
        | "NON_NUMERIC_CEILING";
      protectionCeilingUsd: number | string;
      runtimeCeilingUsd: number | string;
      recognized: false;
    } {
  const parsed = parseFounderCeilings(
    FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
    FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
  );
  if (parsed.ok) {
    return {
      ok: true,
      protectionCeilingUsd: parsed.deploymentCeilingUsd,
      runtimeCeilingUsd: parsed.runtimeCeilingUsd,
      recognized: true,
      reason: "BOUNDED_BY_FOUNDER_AUTHORIZATION",
    };
  }
  return {
    ok: false,
    reason: parsed.reason,
    protectionCeilingUsd: FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
    runtimeCeilingUsd: FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
    recognized: false,
  };
}

export function buildThisRequestProtectionAuthorization(now = new Date()): ProtectionFounderAuthorization | null {
  const parsed = parseFounderCeilings(
    FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
    FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
  );
  if (!parsed.ok) return null;
  return {
    authorizationId: PROTECTION_FOUNDER_AUTHORIZATION_ID,
    actor: FOUNDER_AUTHORIZATION_ACTOR,
    source: FOUNDER_AUTHORIZATION_SOURCE,
    scope: currentProtectionFounderScope(),
    providerCostState: "UNKNOWN",
    protectionCeilingUsd: FOUNDER_APPROVED_PROTECTION_CONFIGURATION_CEILING_USD,
    runtimeCeilingUsd: FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
    currency: "USD",
    effectiveAt: now.toISOString(),
    expiresAt: founderAuthorizationExpiresAt(now),
    singleUse: true,
    maximumExecutions: 1,
    executionsConsumed: 0,
    cancelled: false,
    reason:
      "Founder explicit NEW $5 protection-configuration / $10 14-day runtime ceiling for one project-scoped hosting.deployment_protection.configure mutation on the isolated CRE validation project.",
    economicAuthorization: FOUNDER_ECONOMIC_AUTHORIZATION,
    treasuryMovement: 0,
    fiveDollarsRecordedAsSpend: false,
    globalHostingAuthority: false,
  };
}

export function persistThisRequestProtectionAuthorization(): ProtectionFounderAuthorization | null {
  const existing = stored;
  if (
    existing &&
    existing.authorizationId === PROTECTION_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions
  ) {
    return existing;
  }
  if (existing && existing.executionsConsumed >= existing.maximumExecutions) {
    return existing;
  }
  const built = buildThisRequestProtectionAuthorization();
  if (!built) return null;
  return persistProtectionFounderAuthorization(built);
}

export function evaluateThisRequestProtectionAuthorization(now = new Date()): {
  present: boolean;
  recognized: boolean;
  singleUse: true;
  consumed: boolean;
  expired: boolean;
  authorization: ProtectionFounderAuthorization | null;
  reason: string;
  fiveDollarsRecordedAsSpend: false;
  providerCostState: "UNKNOWN";
} {
  const authorization = persistThisRequestProtectionAuthorization();
  if (!authorization) {
    return {
      present: false,
      recognized: false,
      singleUse: true,
      consumed: false,
      expired: false,
      authorization: null,
      reason: "PLACEHOLDER_CEILING_FORBIDDEN",
      fiveDollarsRecordedAsSpend: false,
      providerCostState: "UNKNOWN",
    };
  }
  const expired = new Date(authorization.expiresAt).getTime() <= now.getTime();
  const consumed = authorization.executionsConsumed >= authorization.maximumExecutions;
  const recognized = !expired && !consumed && !authorization.cancelled;
  return {
    present: true,
    recognized,
    singleUse: true,
    consumed,
    expired,
    authorization,
    reason: recognized
      ? "BOUNDED_BY_FOUNDER_AUTHORIZATION. Provider cost remains UNKNOWN. Ceiling is an authorization boundary, not a cost proof."
      : consumed
        ? "NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED"
        : "Founder protection authorization is not usable.",
    fiveDollarsRecordedAsSpend: false,
    providerCostState: "UNKNOWN",
  };
}

export function activateProtectionRuntimeAuthorization(at: string): {
  activated: true;
  activationTime: string;
  runtimeCeilingUsd: typeof FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD;
} {
  runtimeActivation = { activated: true, activationTime: at };
  return {
    activated: true,
    activationTime: at,
    runtimeCeilingUsd: FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
  };
}

export function evaluateProtectionRuntimeAuthorization(): {
  activated: boolean;
  activationTime: string | null;
  runtimeCeilingUsd: typeof FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD;
  maximumDurationDays: 14;
} {
  return {
    activated: runtimeActivation.activated,
    activationTime: runtimeActivation.activationTime,
    runtimeCeilingUsd: FOUNDER_APPROVED_14_DAY_RUNTIME_CEILING_USD,
    maximumDurationDays: 14,
  };
}

export function protectionCeilingTokensArePlaceholders(): boolean {
  return false;
}

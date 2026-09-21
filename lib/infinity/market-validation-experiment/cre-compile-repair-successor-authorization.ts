import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { EXPECTED_DR_PUBLIC_ROUTES } from "./cre-dr-successor-authorization";
import { FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./cre-final-repair-successor-authorization";
import { DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./cre-dr-successor-authorization";
import {
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_PROVIDER,
  buildFounderExternalCostAuthorization,
  evaluateFounderAuthorization,
  getFounderAuthorization,
  persistFounderAuthorization,
  scopesMatch,
  type FounderAuthorizationEvaluation,
  type FounderAuthorizationScope,
  type FounderExternalCostAuthorization,
} from "./founder-authorization";
import { PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./premium-authority-successor-authorization";
import { VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./validation-grade-successor-authorization";

export const COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_compile_repair_successor_staging_v1" as const;

export const COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD = 5 as const;
export const COMPILE_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD = 5 as const;

export const EXPECTED_COMPILE_REPAIR_PUBLIC_ROUTES = EXPECTED_DR_PUBLIC_ROUTES;

const CONSUMED_AUTHORIZATION_IDS = [
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  "founder_ceiling_cre_val_protection_5_10_v1",
] as const;

export function compileRepairSuccessorFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function buildCompileRepairSuccessorFounderAuthorization(
  now?: Date,
):
  | { ok: true; authorization: FounderExternalCostAuthorization }
  | { ok: false; reason: string } {
  return buildFounderExternalCostAuthorization({
    authorizationId: COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: COMPILE_REPAIR_SUCCESSOR_RUNTIME_CEILING_USD,
    scope: compileRepairSuccessorFounderScope(),
    reason:
      "Founder explicit single-use $5 deployment ceiling for art_c62f12bc59759bdbf3d1 digest 8cb29c1804b158825202c04d5ab4a187246fcb4d8e32f1ca1e9e0c2ff5073da9. One staging source-bundle workflow. Not a retry of art_3f619b664ab7740751a0. Provider cost remains UNKNOWN. Ceiling is not spend.",
    now,
  });
}

export function persistCompileRepairSuccessorFounderAuthorization(now?: Date) {
  const scope = compileRepairSuccessorFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildCompileRepairSuccessorFounderAuthorization(now);
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateCompileRepairSuccessorFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  const scope = compileRepairSuccessorFounderScope();
  const built = buildCompileRepairSuccessorFounderAuthorization(now);
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
  return evaluateFounderAuthorization({ authorization: built.authorization, requestedScope: scope, now });
}

export function priorCompileRepairDeploymentAuthorizationsAreNotReusable(): {
  newAuthorizationId: typeof COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID;
  reusedPriorId: false;
  priorIds: readonly string[];
} {
  return {
    newAuthorizationId: COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    reusedPriorId: false,
    priorIds: CONSUMED_AUTHORIZATION_IDS,
  };
}

void PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE;
void PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID;
void PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST;

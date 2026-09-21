import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import {
  FOUNDER_AUTHORIZATION_PROVIDER,
  buildFounderExternalCostAuthorization,
  evaluateFounderAuthorization,
  getFounderAuthorization,
  persistFounderAuthorization,
  scopesMatch,
  type FounderAuthorizationEvaluation,
  type FounderAuthorizationScope,
} from "./founder-authorization";

export const AUTHORITY_WIDTH_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_authority_width_and_nav_staging_v1" as const;
export const AUTHORITY_WIDTH_DEPLOYMENT_CEILING_USD = 5 as const;
export const AUTHORITY_WIDTH_RUNTIME_CEILING_USD = 5 as const;

export function authorityWidthFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistAuthorityWidthFounderAuthorization(now?: Date) {
  const scope = authorityWidthFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === AUTHORITY_WIDTH_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: AUTHORITY_WIDTH_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: AUTHORITY_WIDTH_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: AUTHORITY_WIDTH_RUNTIME_CEILING_USD,
    scope,
    reason:
      "Founder explicit single-use $5 deployment ceiling for authority-width art_b0b778956b7d29327dab. One staging source-bundle workflow. Provider cost remains UNKNOWN.",
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateAuthorityWidthFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  const scope = authorityWidthFounderScope();
  const built = buildFounderExternalCostAuthorization({
    authorizationId: AUTHORITY_WIDTH_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: AUTHORITY_WIDTH_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: AUTHORITY_WIDTH_RUNTIME_CEILING_USD,
    scope,
    reason: "Authority width and nav deploy authorization.",
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
  return evaluateFounderAuthorization({ authorization: built.authorization, requestedScope: scope, now });
}

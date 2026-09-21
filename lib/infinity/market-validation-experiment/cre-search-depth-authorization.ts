import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
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

export const SEARCH_DEPTH_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_search_depth_and_section_rhythm_staging_v1" as const;
export const SEARCH_DEPTH_DEPLOYMENT_CEILING_USD = 5 as const;
export const SEARCH_DEPTH_RUNTIME_CEILING_USD = 5 as const;

export function searchDepthFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistSearchDepthFounderAuthorization(now?: Date) {
  const scope = searchDepthFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === SEARCH_DEPTH_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: SEARCH_DEPTH_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: SEARCH_DEPTH_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: SEARCH_DEPTH_RUNTIME_CEILING_USD,
    scope,
    reason:
      "Founder explicit single-use $5 deployment ceiling for search-depth art_e6d2a3a1f46d117d61c9. One staging source-bundle workflow. Provider cost remains UNKNOWN.",
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateSearchDepthFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  const scope = searchDepthFounderScope();
  const built = buildFounderExternalCostAuthorization({
    authorizationId: SEARCH_DEPTH_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: SEARCH_DEPTH_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: SEARCH_DEPTH_RUNTIME_CEILING_USD,
    scope,
    reason: "Search-depth and section-rhythm deploy authorization.",
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

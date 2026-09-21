import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { seoGeoPageRouteManifest } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import { COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./cre-compile-repair-successor-authorization";
import { DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./cre-dr-successor-authorization";
import { FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./cre-final-repair-successor-authorization";
import { PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./premium-authority-successor-authorization";
import { VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./validation-grade-successor-authorization";
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

export const SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_seo_geo_authority_surface_staging_v1" as const;
export const SEO_GEO_SUCCESSOR_DEPLOYMENT_CEILING_USD = 5 as const;
export const SEO_GEO_SUCCESSOR_RUNTIME_CEILING_USD = 5 as const;

export const EXPECTED_SEO_GEO_PAGE_ROUTES = seoGeoPageRouteManifest().pageRoutes;

const CONSUMED_AUTHORIZATION_IDS = [
  CONSUMED_PREDECESSOR_FOUNDER_AUTHORIZATION_ID,
  CONSUMED_SUCCESSOR_PREVIEW_FOUNDER_AUTHORIZATION_ID,
  FOUNDER_AUTHORIZATION_ID,
  VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  PREMIUM_AUTHORITY_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  DIRECT_RESPONSE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  FINAL_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  COMPILE_REPAIR_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  "founder_ceiling_cre_val_protection_5_10_v1",
] as const;

export function seoGeoSuccessorFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function buildSeoGeoSuccessorFounderAuthorization(
  now?: Date,
):
  | { ok: true; authorization: FounderExternalCostAuthorization }
  | { ok: false; reason: string } {
  return buildFounderExternalCostAuthorization({
    authorizationId: SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: SEO_GEO_SUCCESSOR_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: SEO_GEO_SUCCESSOR_RUNTIME_CEILING_USD,
    scope: seoGeoSuccessorFounderScope(),
    reason:
      "Founder explicit single-use $5 deployment ceiling for art_ba6e91dc5e569f6c13a9 digest 92fd5d2db09ae15acec22e9f9a9f3353b756b5ee85cc0dcba845a69442f9927d. One staging source-bundle workflow. Provider cost remains UNKNOWN. Ceiling is not spend.",
    now,
  });
}

export function persistSeoGeoSuccessorFounderAuthorization(now?: Date) {
  const scope = seoGeoSuccessorFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildSeoGeoSuccessorFounderAuthorization(now);
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateSeoGeoSuccessorFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  const scope = seoGeoSuccessorFounderScope();
  const built = buildSeoGeoSuccessorFounderAuthorization(now);
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

export function priorSeoGeoDeploymentAuthorizationsAreNotReusable() {
  return {
    newAuthorizationId: SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
    reusedPriorId: false as const,
    priorIds: CONSUMED_AUTHORIZATION_IDS,
  };
}

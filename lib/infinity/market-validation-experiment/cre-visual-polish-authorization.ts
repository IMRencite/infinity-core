import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import { VISUAL_SUCCESSOR_FOUNDER_AUTHORIZATION_ID } from "./cre-visual-successor-authorization";
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

export const VISUAL_POLISH_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_visual_polish_homepage_footer_hero_staging_v1" as const;
export const VISUAL_POLISH_DEPLOYMENT_CEILING_USD = 5 as const;
export const VISUAL_POLISH_RUNTIME_CEILING_USD = 5 as const;

export function visualPolishFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistVisualPolishFounderAuthorization(now?: Date) {
  const scope = visualPolishFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === VISUAL_POLISH_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: VISUAL_POLISH_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: VISUAL_POLISH_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: VISUAL_POLISH_RUNTIME_CEILING_USD,
    scope,
    reason:
      "Founder explicit single-use $5 deployment ceiling for homepage footer spacing and compact hero polish art_1b4074bc79b101555008. One staging source-bundle workflow. Provider cost remains UNKNOWN.",
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateVisualPolishFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  const scope = visualPolishFounderScope();
  const built = buildFounderExternalCostAuthorization({
    authorizationId: VISUAL_POLISH_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: VISUAL_POLISH_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: VISUAL_POLISH_RUNTIME_CEILING_USD,
    scope,
    reason: "Founder polish deploy authorization.",
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

void VISUAL_SUCCESSOR_FOUNDER_AUTHORIZATION_ID;

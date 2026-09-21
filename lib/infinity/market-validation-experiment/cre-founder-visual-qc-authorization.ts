import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
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

export const FOUNDER_VISUAL_QC_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_founder_visual_qc_staging_v1" as const;
export const FOUNDER_VISUAL_QC_DEPLOYMENT_CEILING_USD = 5 as const;
export const FOUNDER_VISUAL_QC_RUNTIME_CEILING_USD = 5 as const;

export function founderVisualQcFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistFounderVisualQcFounderAuthorization(now?: Date) {
  const scope = founderVisualQcFounderScope();
  const existing = getFounderAuthorization();
  if (
    existing &&
    existing.authorizationId === FOUNDER_VISUAL_QC_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed < existing.maximumExecutions &&
    scopesMatch(existing.scope, scope)
  ) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: FOUNDER_VISUAL_QC_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: FOUNDER_VISUAL_QC_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: FOUNDER_VISUAL_QC_RUNTIME_CEILING_USD,
    scope,
    reason:
      "Founder explicit single-use $5 deployment ceiling for founder visual QC art_89ea8156769a0286a700. One staging source-bundle workflow. Provider cost remains UNKNOWN.",
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateFounderVisualQcFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  const scope = founderVisualQcFounderScope();
  const built = buildFounderExternalCostAuthorization({
    authorizationId: FOUNDER_VISUAL_QC_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: FOUNDER_VISUAL_QC_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: FOUNDER_VISUAL_QC_RUNTIME_CEILING_USD,
    scope,
    reason: "Founder visual QC deploy authorization.",
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

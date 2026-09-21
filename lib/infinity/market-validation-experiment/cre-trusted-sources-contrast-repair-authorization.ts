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
  type FounderAuthorizationEvaluation,
  type FounderAuthorizationScope,
} from "./founder-authorization";

export const TRUSTED_SOURCES_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_trusted_sources_rendered_contrast_repair_v1" as const;
export const TRUSTED_SOURCES_CONTRAST_REPAIR_DEPLOYMENT_CEILING_USD = 5 as const;
export const TRUSTED_SOURCES_CONTRAST_REPAIR_RUNTIME_CEILING_USD = 5 as const;

export function trustedSourcesContrastRepairFounderScope(): FounderAuthorizationScope {
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

export function persistTrustedSourcesContrastRepairFounderAuthorization(now?: Date) {
  const scope = trustedSourcesContrastRepairFounderScope();
  const existing = getFounderAuthorization();
  if (existing && existing.authorizationId === TRUSTED_SOURCES_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: TRUSTED_SOURCES_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: TRUSTED_SOURCES_CONTRAST_REPAIR_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: TRUSTED_SOURCES_CONTRAST_REPAIR_RUNTIME_CEILING_USD,
    scope,
    reason:
      `Founder explicit single-use $5 deployment ceiling for Trusted Sources rendered-contrast repair of art_e6d2a3a1f46d117d61c9 digest ${SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST}. One staging source-bundle workflow. Provider cost remains UNKNOWN.`,
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateTrustedSourcesContrastRepairFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  persistTrustedSourcesContrastRepairFounderAuthorization(now);
  return evaluateFounderAuthorization({
    authorization: getFounderAuthorization(),
    requestedScope: trustedSourcesContrastRepairFounderScope(),
    now,
  });
}

export function trustedSourcesContrastRepairAuthorizationAlreadyConsumed(): boolean {
  const existing = getFounderAuthorization();
  return (
    existing?.authorizationId === TRUSTED_SOURCES_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed >= existing.maximumExecutions
  );
}

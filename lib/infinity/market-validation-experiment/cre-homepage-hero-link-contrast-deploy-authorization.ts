import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
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

export const HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_homepage_hero_link_contrast_deployment_v1" as const;
export const HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_CEILING_USD = 5 as const;
export const HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_RUNTIME_CEILING_USD = 5 as const;

export function homepageHeroLinkContrastDeployFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistHomepageHeroLinkContrastDeployFounderAuthorization(now?: Date) {
  const scope = homepageHeroLinkContrastDeployFounderScope();
  const existing = getFounderAuthorization();
  if (existing && existing.authorizationId === HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID) {
    return existing;
  }
  if (existing && existing.executionsConsumed >= existing.maximumExecutions) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_CEILING_USD,
    runtimeCeiling: HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_RUNTIME_CEILING_USD,
    scope,
    reason: `Founder explicit single-use $5 deployment ceiling for homepage hero-link contrast successor ${CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID} digest ${CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST}. One staging source-bundle workflow. Provider cost remains UNKNOWN.`,
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateHomepageHeroLinkContrastDeployFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  persistHomepageHeroLinkContrastDeployFounderAuthorization(now);
  return evaluateFounderAuthorization({
    authorization: getFounderAuthorization(),
    requestedScope: homepageHeroLinkContrastDeployFounderScope(),
    now,
  });
}

export function homepageHeroLinkContrastDeployAuthorizationAlreadyConsumed(): boolean {
  const existing = getFounderAuthorization();
  return (
    existing?.authorizationId === HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed >= existing.maximumExecutions
  );
}

import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
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

export const SITE_CHROME_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_site_chrome_link_contrast_deployment_v1" as const;
export const SITE_CHROME_LINK_CONTRAST_DEPLOY_CEILING_USD = 5 as const;
export const SITE_CHROME_LINK_CONTRAST_DEPLOY_RUNTIME_CEILING_USD = 5 as const;

export function siteChromeLinkContrastDeployFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistSiteChromeLinkContrastDeployFounderAuthorization(now?: Date) {
  const scope = siteChromeLinkContrastDeployFounderScope();
  const existing = getFounderAuthorization();
  if (existing && existing.authorizationId === SITE_CHROME_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: SITE_CHROME_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: SITE_CHROME_LINK_CONTRAST_DEPLOY_CEILING_USD,
    runtimeCeiling: SITE_CHROME_LINK_CONTRAST_DEPLOY_RUNTIME_CEILING_USD,
    scope,
    reason: `Founder explicit single-use $5 deployment ceiling for site-chrome link-contrast successor ${CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID} digest ${CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST}. One staging source-bundle workflow. Provider cost remains UNKNOWN.`,
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateSiteChromeLinkContrastDeployFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  persistSiteChromeLinkContrastDeployFounderAuthorization(now);
  return evaluateFounderAuthorization({
    authorization: getFounderAuthorization(),
    requestedScope: siteChromeLinkContrastDeployFounderScope(),
    now,
  });
}

export function siteChromeLinkContrastDeployAuthorizationAlreadyConsumed(): boolean {
  const existing = getFounderAuthorization();
  return (
    existing?.authorizationId === SITE_CHROME_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed >= existing.maximumExecutions
  );
}

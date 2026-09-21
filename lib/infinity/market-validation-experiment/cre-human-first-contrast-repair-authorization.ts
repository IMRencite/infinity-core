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

export const HUMAN_FIRST_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_human_first_rendered_contrast_repair_v1" as const;
export const HUMAN_FIRST_CONTRAST_REPAIR_DEPLOYMENT_CEILING_USD = 5 as const;
export const HUMAN_FIRST_CONTRAST_REPAIR_RUNTIME_CEILING_USD = 5 as const;

export function humanFirstContrastRepairFounderScope(): FounderAuthorizationScope {
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

export function persistHumanFirstContrastRepairFounderAuthorization(now?: Date) {
  const scope = humanFirstContrastRepairFounderScope();
  const existing = getFounderAuthorization();
  if (existing && existing.authorizationId === HUMAN_FIRST_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: HUMAN_FIRST_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: HUMAN_FIRST_CONTRAST_REPAIR_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: HUMAN_FIRST_CONTRAST_REPAIR_RUNTIME_CEILING_USD,
    scope,
    reason:
      "Founder explicit single-use $5 deployment ceiling for repaired search-depth art_e6d2a3a1f46d117d61c9 digest b85121c84c943604da54bcef3a88aaa9f1115524115bc08a81beade72375b00f. One staging source-bundle workflow. Provider cost remains UNKNOWN.",
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateHumanFirstContrastRepairFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  persistHumanFirstContrastRepairFounderAuthorization(now);
  return evaluateFounderAuthorization({
    authorization: getFounderAuthorization(),
    requestedScope: humanFirstContrastRepairFounderScope(),
    now,
  });
}

export function humanFirstContrastRepairAuthorizationAlreadyConsumed(): boolean {
  const existing = getFounderAuthorization();
  return (
    existing?.authorizationId === HUMAN_FIRST_CONTRAST_REPAIR_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed >= existing.maximumExecutions
  );
}

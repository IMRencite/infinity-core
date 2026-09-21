import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
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

export const FULL_PAGE_AUTOREPAIR_V2_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_full_page_autorepair_deployment_v2" as const;
export const FULL_PAGE_AUTOREPAIR_V2_DEPLOYMENT_CEILING_USD = 5 as const;
export const FULL_PAGE_AUTOREPAIR_V2_RUNTIME_CEILING_USD = 5 as const;

export function fullPageAutorepairV2FounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistFullPageAutorepairV2FounderAuthorization(now?: Date) {
  const scope = fullPageAutorepairV2FounderScope();
  const existing = getFounderAuthorization();
  if (existing && existing.authorizationId === FULL_PAGE_AUTOREPAIR_V2_FOUNDER_AUTHORIZATION_ID) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: FULL_PAGE_AUTOREPAIR_V2_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: FULL_PAGE_AUTOREPAIR_V2_DEPLOYMENT_CEILING_USD,
    runtimeCeiling: FULL_PAGE_AUTOREPAIR_V2_RUNTIME_CEILING_USD,
    scope,
    reason: `Founder explicit single-use $5 deployment ceiling for pricing-prerender repair successor ${CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID} digest ${CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST}. One staging source-bundle workflow. Provider cost remains UNKNOWN.`,
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateFullPageAutorepairV2FounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  persistFullPageAutorepairV2FounderAuthorization(now);
  return evaluateFounderAuthorization({
    authorization: getFounderAuthorization(),
    requestedScope: fullPageAutorepairV2FounderScope(),
    now,
  });
}

export function fullPageAutorepairV2AuthorizationAlreadyConsumed(): boolean {
  const existing = getFounderAuthorization();
  return (
    existing?.authorizationId === FULL_PAGE_AUTOREPAIR_V2_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed >= existing.maximumExecutions
  );
}

import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
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

export const SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_semantic_nav_width_muted_text_deployment_v1" as const;
export const SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_CEILING_USD = 5 as const;
export const SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_RUNTIME_CEILING_USD = 5 as const;

export function semanticNavWidthMutedTextDeployFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistSemanticNavWidthMutedTextDeployFounderAuthorization(now?: Date) {
  const scope = semanticNavWidthMutedTextDeployFounderScope();
  const existing = getFounderAuthorization();
  if (existing && existing.authorizationId === SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_FOUNDER_AUTHORIZATION_ID) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_CEILING_USD,
    runtimeCeiling: SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_RUNTIME_CEILING_USD,
    scope,
    reason: `Founder explicit single-use $5 deployment ceiling for semantic-nav width + muted-text successor ${CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID} digest ${CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST}. One staging source-bundle workflow. Provider cost remains UNKNOWN.`,
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateSemanticNavWidthMutedTextDeployFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  persistSemanticNavWidthMutedTextDeployFounderAuthorization(now);
  return evaluateFounderAuthorization({
    authorization: getFounderAuthorization(),
    requestedScope: semanticNavWidthMutedTextDeployFounderScope(),
    now,
  });
}

export function semanticNavWidthMutedTextDeployAuthorizationAlreadyConsumed(): boolean {
  const existing = getFounderAuthorization();
  return (
    existing?.authorizationId === SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed >= existing.maximumExecutions
  );
}

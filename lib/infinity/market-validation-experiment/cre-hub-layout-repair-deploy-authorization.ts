import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  CRE_CANDIDATE_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
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

export const HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID =
  "founder_ceiling_cre_hub_layout_repair_deployment_v1" as const;
export const HUB_LAYOUT_REPAIR_DEPLOY_CEILING_USD = 5 as const;
export const HUB_LAYOUT_REPAIR_DEPLOY_RUNTIME_CEILING_USD = 5 as const;

export function hubLayoutRepairDeployFounderScope(): FounderAuthorizationScope {
  return {
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
    artifactDigest: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
    provider: FOUNDER_AUTHORIZATION_PROVIDER,
    capability: SOURCE_BUNDLE_CAPABILITY,
    deploymentPurpose: MARKET_VALIDATION_PURPOSE,
  };
}

export function persistHubLayoutRepairDeployFounderAuthorization(now?: Date) {
  const scope = hubLayoutRepairDeployFounderScope();
  const existing = getFounderAuthorization();
  if (existing && existing.authorizationId === HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID) {
    return existing;
  }
  const built = buildFounderExternalCostAuthorization({
    authorizationId: HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID,
    deploymentCeiling: HUB_LAYOUT_REPAIR_DEPLOY_CEILING_USD,
    runtimeCeiling: HUB_LAYOUT_REPAIR_DEPLOY_RUNTIME_CEILING_USD,
    scope,
    reason: `Founder explicit single-use $5 deployment ceiling for hub-layout repair successor ${CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID} digest ${CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST}. One staging source-bundle workflow. Provider cost remains UNKNOWN.`,
    now,
  });
  if (!built.ok) return null;
  return persistFounderAuthorization(built.authorization);
}

export function evaluateHubLayoutRepairDeployFounderAuthorization(now?: Date): FounderAuthorizationEvaluation {
  persistHubLayoutRepairDeployFounderAuthorization(now);
  return evaluateFounderAuthorization({
    authorization: getFounderAuthorization(),
    requestedScope: hubLayoutRepairDeployFounderScope(),
    now,
  });
}

export function hubLayoutRepairDeployAuthorizationAlreadyConsumed(): boolean {
  const existing = getFounderAuthorization();
  return (
    existing?.authorizationId === HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID &&
    existing.executionsConsumed >= existing.maximumExecutions
  );
}

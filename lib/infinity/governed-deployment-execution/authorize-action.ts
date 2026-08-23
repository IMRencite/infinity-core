import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import type { DeploymentActionType } from "@/lib/infinity/governed-deployment-readiness/constants";
import { actionRequiresEag, actionRequiresTreasury, capabilityForExecutionAction } from "./map-actions";
import type { GovernedExecutionActionType } from "./constants";
import type {
  ActionAuthorityGrant,
  ExecutionFailure,
  ProviderWriteEvidence,
  TreasuryActionGrant,
} from "./types";

export type ActionAuthorization = {
  requiresTreasury: boolean;
  requiresEag: boolean;
  requiresWriteCredential: boolean;
  requiresProcurement: boolean;
  writeAuthority: boolean;
  costKnown: boolean;
  budgetAuthorized: boolean;
  specificActionAuthorized: boolean;
  estimatedUsd: number | null;
  authorizedUsd: number | null;
  unknownCost: boolean;
  failure: ExecutionFailure | null;
};

function providerFor(
  capability: ReturnType<typeof capabilityForExecutionAction>,
  rows: ProviderWriteEvidence[],
  readiness: GovernedDeploymentReadiness,
): ProviderWriteEvidence | null {
  const explicit = rows.find((row) => row.capability === capability);
  if (explicit) return explicit;
  const readinessRow = readiness.providerRows.find((row) => row.capability === capability);
  if (!readinessRow) return null;
  return {
    capability,
    verificationState: readinessRow.verificationState === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" : "NONE",
    credentialAvailable: readinessRow.credentialAvailable,
    credentialWriteCapable: readinessRow.credentialWriteCapable,
    writeAuthorityGranted: readinessRow.writeAuthorityGranted,
  };
}

export function authorizeExecutionAction(input: {
  actionType: GovernedExecutionActionType;
  readiness: GovernedDeploymentReadiness;
  eagAuthorizations: ActionAuthorityGrant[];
  treasuryAuthorizations: TreasuryActionGrant[];
  providerWrites: ProviderWriteEvidence[];
}): ActionAuthorization {
  const actionType = input.actionType;
  const capability = capabilityForExecutionAction(actionType);
  const matrix = input.readiness.requiredAuthorizations.find((row) => row.actionType === (actionType as DeploymentActionType));
  const provider = providerFor(capability, input.providerWrites, input.readiness);
  const eag = input.eagAuthorizations.find((item) => item.actionType === actionType);
  const treasury = input.treasuryAuthorizations.find((item) => item.actionType === actionType);
  const estimatedUsd = actionType === "PURCHASE_DOMAIN" ? 12 : matrix?.costKnown === false ? null : 0;
  const unknownCost = treasury?.costActuality === "UNKNOWN";
  const requiresTreasury = actionRequiresTreasury(actionType, estimatedUsd, Boolean(unknownCost));
  const requiresEag = actionRequiresEag(actionType);
  const requiresWrite = actionType !== "VERIFY_HEALTH" && actionType !== "CONFIGURE_ENVIRONMENT";
  const requiresProcurement = actionType === "PURCHASE_DOMAIN" || Boolean(matrix?.requiresProcurement);
  const specificActionAuthorized = eag?.decision === "AUTO_AUTHORIZE";
  const budgetAuthorized = !requiresTreasury || (treasury?.decision === "AUTO_AUTHORIZE" && treasury.costActuality !== "UNKNOWN");
  const writeAuthority = Boolean(provider?.writeAuthorityGranted && provider.verificationState === "WRITE_AUTHORIZED");

  let failure: ExecutionFailure | null = null;
  if (actionType === "ROLLBACK_DEPLOYMENT" && input.readiness.executionDraft.rollbackRequirements.required && eag?.decision !== "AUTO_AUTHORIZE") {
    failure = { code: "DEPLOYMENT_EXECUTION_ROLLBACK_REQUIRED", message: "Rollback is required and is not independently authorized.", actionType };
  } else if (requiresWrite && provider?.verificationState === "READ_ONLY_VERIFIED") {
    failure = { code: "DEPLOYMENT_EXECUTION_PROVIDER_READ_ONLY", message: `READ_ONLY_VERIFIED ${capability} cannot execute writes.`, actionType };
  } else if (requiresWrite && provider?.verificationState === "WRITE_CAPABLE_NOT_AUTHORIZED") {
    failure = { code: "DEPLOYMENT_EXECUTION_AUTHORITY_MISSING", message: `WRITE_CAPABLE_NOT_AUTHORIZED ${capability} cannot execute.`, actionType };
  } else if (requiresWrite && provider && !provider.credentialWriteCapable) {
    failure = { code: "DEPLOYMENT_EXECUTION_WRITE_CREDENTIAL_MISSING", message: `Write credential for ${capability} is missing.`, actionType };
  } else if (requiresWrite && !writeAuthority && actionType !== "ROLLBACK_DEPLOYMENT") {
    failure = { code: "DEPLOYMENT_EXECUTION_AUTHORITY_MISSING", message: `Write authority for ${actionType} is not granted.`, actionType };
  } else if (requiresEag && eag?.decision === "BLOCK") {
    failure = { code: "DEPLOYMENT_EXECUTION_EAG_DENIED", message: `EAG denied ${actionType}.`, actionType };
  } else if (requiresEag && !specificActionAuthorized) {
    failure = { code: "DEPLOYMENT_EXECUTION_EAG_DENIED", message: `EAG authorization missing for ${actionType}.`, actionType };
  } else if (requiresTreasury && unknownCost) {
    failure = { code: "DEPLOYMENT_EXECUTION_UNKNOWN_COST", message: `Unknown paid cost for ${actionType} cannot be treated as zero.`, actionType };
  } else if (requiresTreasury && (treasury?.decision === "BLOCK" || !budgetAuthorized)) {
    failure = { code: "DEPLOYMENT_EXECUTION_TREASURY_DENIED", message: `Treasury authorization missing for ${actionType}.`, actionType };
  }

  return {
    requiresTreasury,
    requiresEag,
    requiresWriteCredential: requiresWrite,
    requiresProcurement,
    writeAuthority,
    costKnown: !unknownCost && estimatedUsd != null,
    budgetAuthorized,
    specificActionAuthorized,
    estimatedUsd,
    authorizedUsd: treasury?.authorizedAmountUsd ?? null,
    unknownCost: Boolean(unknownCost),
    failure,
  };
}

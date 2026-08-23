import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import { DEFAULT_GOVERNED_EXECUTION_MODE, GOVERNED_DEPLOYMENT_EXECUTION_SCHEMA } from "./constants";
import type { GovernedExecutionActionType } from "./constants";
import { bindGatewayAction } from "./map-actions";
import type { BuildExecutionRequestInput, ExecutionFailure, GovernedDeploymentExecutionRequest } from "./types";

function stableId(parts: string[]): string {
  return `gde:${parts.join(":")}`;
}

function collectActions(input: BuildExecutionRequestInput): GovernedExecutionActionType[] {
  if (input.requestedActions?.length) return [...input.requestedActions];
  const actions: GovernedExecutionActionType[] = input.readiness.requiredAuthorizations.map((row) => row.actionType);
  if (input.readiness.healthCheckReadiness === "SATISFIED" || input.readiness.executionDraft.healthCheckRequirements.required) {
    if (!actions.includes("VERIFY_HEALTH")) actions.push("VERIFY_HEALTH");
  }
  if (input.readiness.executionDraft.rollbackRequirements.required && !actions.includes("ROLLBACK_DEPLOYMENT")) {
    actions.push("ROLLBACK_DEPLOYMENT");
  }
  return actions;
}

export function buildGovernedDeploymentExecutionRequest(
  input: BuildExecutionRequestInput,
): GovernedDeploymentExecutionRequest {
  const readiness = input.readiness;
  const mode = input.mode ?? DEFAULT_GOVERNED_EXECUTION_MODE;
  const blockers: ExecutionFailure[] = [];
  const ventureId = readiness.ventureId;
  const readinessId = readiness.readinessId;
  const handoffId = readiness.productionArtifactHandoffId;
  const executionRequestId = stableId([ventureId, readinessId, handoffId ?? "none", mode]);

  if (input.expectedVentureId && input.expectedVentureId !== ventureId) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH", message: "Execution ventureId does not match the expected venture." });
  }
  if (input.expectedReadinessId && input.expectedReadinessId !== readinessId) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH", message: "Execution readinessId does not match the expected readiness." });
  }
  if (input.expectedHandoffId && handoffId && input.expectedHandoffId !== handoffId) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH", message: "Execution handoffId does not match the expected handoff." });
  }
  if (!readiness.readyForDeploymentExecution) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_NOT_READY", message: "GovernedDeploymentReadiness is not ready for deployment execution." });
  }
  if (!input.deploymentAuthority.granted || !input.deploymentAuthority.authorizationId) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_AUTHORITY_MISSING", message: "Canonical deployment authority is missing." });
  }

  const actions = collectActions(input);
  const bindings = actions.map(bindGatewayAction);
  const eagRefs = (input.eagAuthorizations ?? [])
    .filter((item) => item.decision === "AUTO_AUTHORIZE")
    .map((item) => ({ actionType: item.actionType, authorizationId: item.authorizationId }));
  const treasuryRefs = (input.treasuryAuthorizations ?? [])
    .filter((item) => item.decision === "AUTO_AUTHORIZE")
    .map((item) => ({ actionType: item.actionType, authorizationId: item.authorizationId }));

  return {
    schemaVersion: GOVERNED_DEPLOYMENT_EXECUTION_SCHEMA,
    executionRequestId,
    ventureId,
    companyId: readiness.companyId,
    readinessId,
    productionArtifactHandoffId: handoffId,
    buildContractId: readiness.buildContractId,
    ventureSystemsBuildContractId: readiness.ventureSystemsBuildContractId,
    mode,
    executable: blockers.length === 0,
    requiredActions: actions,
    providerBindings: bindings,
    treasuryAuthorizationRefs: treasuryRefs,
    eagAuthorizationRefs: eagRefs,
    deploymentAuthorizationId: input.deploymentAuthority.authorizationId,
    publicLaunchAuthorizationId: input.publicLaunchAuthority?.granted ? input.publicLaunchAuthority.authorizationId : null,
    rollbackRequirements: {
      required: readiness.executionDraft.rollbackRequirements.required,
      strategyKnown: readiness.executionDraft.rollbackRequirements.strategyKnown,
      authorized: Boolean(
        input.eagAuthorizations?.some((item) => item.actionType === "ROLLBACK_DEPLOYMENT" && item.decision === "AUTO_AUTHORIZE"),
      ),
    },
    healthCheckRequirements: readiness.executionDraft.healthCheckRequirements,
    idempotencyKey: executionRequestId,
    createdAt: input.createdAt ?? "1970-01-01T00:00:00.000Z",
    blockers,
    traceability: {
      ventureId,
      readinessId,
      handoffId,
      executionRequestId,
    },
  };
}

export function collectExecutionActions(readiness: GovernedDeploymentReadiness): GovernedExecutionActionType[] {
  return collectActions({
    readiness,
    deploymentAuthority: { granted: false, authorizationId: null, source: null },
  });
}

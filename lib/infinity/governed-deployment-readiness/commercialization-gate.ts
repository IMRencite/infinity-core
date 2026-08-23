import { GOVERNED_DEPLOYMENT_WRITE_BOUNDARY } from "./constants";
import type { GovernedDeploymentReadiness } from "./types";

export type CommercializationDeploymentReadinessGate = {
  source: "GOVERNED_DEPLOYMENT_READINESS";
  readyToEnterGovernedDeploymentExecution: boolean;
  technicallyReady: boolean;
  deploymentAuthorityGranted: boolean;
  publicLaunchAuthorityGranted: boolean;
  blockers: GovernedDeploymentReadiness["blockers"];
  deploymentTriggered: false;
  purchaseTriggered: false;
  publicLaunchTriggered: false;
  writeBoundary: typeof GOVERNED_DEPLOYMENT_WRITE_BOUNDARY;
};

export function askIfReadyForGovernedDeploymentExecution(
  readiness: GovernedDeploymentReadiness,
): CommercializationDeploymentReadinessGate {
  return {
    source: "GOVERNED_DEPLOYMENT_READINESS",
    readyToEnterGovernedDeploymentExecution: readiness.readyForDeploymentExecution,
    technicallyReady: readiness.technicalReadiness === "SATISFIED",
    deploymentAuthorityGranted: readiness.deploymentAuthorityGranted,
    publicLaunchAuthorityGranted: readiness.publicLaunchAuthorityGranted,
    blockers: readiness.blockers,
    deploymentTriggered: false,
    purchaseTriggered: false,
    publicLaunchTriggered: false,
    writeBoundary: GOVERNED_DEPLOYMENT_WRITE_BOUNDARY,
  };
}

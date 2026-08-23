import { DEPLOYMENT_AUTHORITY } from "./constants";
import type { ProductionArtifactHandoff } from "./types";

export type DeploymentHandoffIntake = {
  source: "PRODUCTION_ARTIFACT_HANDOFF";
  compatible: true;
  handoffId: string;
  requirements: ProductionArtifactHandoff["deploymentRequirements"];
  runtimeRequirements: ProductionArtifactHandoff["runtimeRequirements"];
  environmentRequirements: ProductionArtifactHandoff["environmentRequirements"];
  databaseRequirements: ProductionArtifactHandoff["databaseRequirements"];
  providerBindings: string[];
  deploymentAuthority: typeof DEPLOYMENT_AUTHORITY;
  writeAuthorized: false;
  readOnlyVerificationInterpretedAsWrite: false;
};

export function toDeploymentHandoffIntake(handoff: ProductionArtifactHandoff): DeploymentHandoffIntake {
  return {
    source: "PRODUCTION_ARTIFACT_HANDOFF",
    compatible: true,
    handoffId: handoff.handoffId,
    requirements: handoff.deploymentRequirements,
    runtimeRequirements: handoff.runtimeRequirements,
    environmentRequirements: handoff.environmentRequirements,
    databaseRequirements: handoff.databaseRequirements,
    providerBindings: handoff.deploymentRequirements.providerBindings,
    deploymentAuthority: DEPLOYMENT_AUTHORITY,
    writeAuthorized: false,
    readOnlyVerificationInterpretedAsWrite: false,
  };
}

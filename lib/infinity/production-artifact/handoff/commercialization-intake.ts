import type { ProductionArtifactHandoff } from "./types";
import { PRODUCTION_HANDOFF_WRITE_BOUNDARY } from "./constants";

export type CommercializationHandoffIntake = {
  source: "PRODUCTION_ARTIFACT_HANDOFF";
  accepted: true;
  handoffId: string;
  ventureId: string;
  companyId: string | null;
  missionId: string | null;
  readiness: ProductionArtifactHandoff["readiness"];
  artifactPackage: ProductionArtifactHandoff["artifactInventory"];
  blockers: ProductionArtifactHandoff["knownBlockers"];
  unresolvedItems: ProductionArtifactHandoff["knownUnresolvedItems"];
  runtimeRequirements: ProductionArtifactHandoff["runtimeRequirements"];
  deploymentRequirements: ProductionArtifactHandoff["deploymentRequirements"];
  externalDependencies: ProductionArtifactHandoff["externalDependencies"];
  environmentRequirements: ProductionArtifactHandoff["environmentRequirements"];
  architectureCoverage: ProductionArtifactHandoff["architectureCoverage"];
  deploymentTriggered: false;
  purchaseTriggered: false;
  publicLaunchTriggered: false;
  writeBoundary: typeof PRODUCTION_HANDOFF_WRITE_BOUNDARY;
};

export function acceptProductionArtifactHandoffForCommercialization(
  handoff: ProductionArtifactHandoff,
): CommercializationHandoffIntake {
  return {
    source: "PRODUCTION_ARTIFACT_HANDOFF",
    accepted: true,
    handoffId: handoff.handoffId,
    ventureId: handoff.ventureId,
    companyId: handoff.companyId,
    missionId: handoff.missionId,
    readiness: handoff.readiness,
    artifactPackage: handoff.artifactInventory,
    blockers: handoff.knownBlockers,
    unresolvedItems: handoff.knownUnresolvedItems,
    runtimeRequirements: handoff.runtimeRequirements,
    deploymentRequirements: handoff.deploymentRequirements,
    externalDependencies: handoff.externalDependencies,
    environmentRequirements: handoff.environmentRequirements,
    architectureCoverage: handoff.architectureCoverage,
    deploymentTriggered: false,
    purchaseTriggered: false,
    publicLaunchTriggered: false,
    writeBoundary: PRODUCTION_HANDOFF_WRITE_BOUNDARY,
  };
}

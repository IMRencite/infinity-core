import { DEPLOYMENT_AUTHORITY } from "./constants";
import type { ProductionArtifactHandoff, ProductionHandoffHqView } from "./types";

export function toProductionHandoffHqView(handoff: ProductionArtifactHandoff): ProductionHandoffHqView {
  return {
    productionReadiness: handoff.readiness,
    artifacts: handoff.artifactInventory.filter((item) => item.status === "PRESENT").length,
    build: handoff.buildVerification.status,
    tests: handoff.testVerification.status,
    externalDependencies: handoff.externalDependencies.length,
    blocked: handoff.knownBlockers.length,
    deploymentAuthority: DEPLOYMENT_AUTHORITY,
  };
}

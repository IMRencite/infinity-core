export {
  PRODUCTION_HANDOFF_SCHEMA_VERSION,
  PRODUCTION_HANDOFF_WRITE_BOUNDARY,
  PRODUCTION_HANDOFF_READINESS,
  PRODUCTION_HANDOFF_ARTIFACT_KINDS,
  PRODUCTION_HANDOFF_FAILURE_CODES,
  ENVIRONMENT_REQUIREMENT_STATUSES,
  DEPLOYMENT_AUTHORITY,
} from "./constants";
export type {
  ProductionHandoffReadiness,
  ProductionHandoffArtifactKind,
  ProductionHandoffFailureCode,
  EnvironmentRequirementStatus,
} from "./constants";
export type {
  ProductionArtifactHandoff,
  ProductionHandoffCollectInput,
  ProductionHandoffValidation,
  ProductionHandoffFailure,
  ProductionHandoffArtifact,
  CodeChangeSetHandoffRef,
  RuntimeRequirement,
  EnvironmentRequirement,
  DatabaseRequirement,
  ExternalDependency,
  DeploymentRequirement,
  ArchitectureCoverageHandoff,
  CompletenessAccounting,
  ProductionHandoffHqView,
  VerificationEvidence,
  CollectedCodeChangeSet,
} from "./types";
export { collectProductionArtifactHandoff } from "./collect";
export { validateProductionArtifactHandoff } from "./validate";
export { toProductionHandoffHqView } from "./hq-view";
export {
  acceptProductionArtifactHandoffForCommercialization,
} from "./commercialization-intake";
export type { CommercializationHandoffIntake } from "./commercialization-intake";
export { toDeploymentHandoffIntake } from "./deployment-intake";
export type { DeploymentHandoffIntake } from "./deployment-intake";

import { collectProductionArtifactHandoff } from "./collect";
import { validateProductionArtifactHandoff } from "./validate";
import type { ProductionHandoffCollectInput, ProductionHandoffValidation } from "./types";

export function buildProductionArtifactHandoff(input: ProductionHandoffCollectInput): ProductionHandoffValidation {
  return validateProductionArtifactHandoff(collectProductionArtifactHandoff(input));
}

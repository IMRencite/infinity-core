import type { ArchitectureCost } from "@/lib/infinity/venture-systems-architecture/types";
import type { SystemCapability, SystemFamily, TenancyStrategy } from "@/lib/infinity/venture-systems-architecture/constants";
import type { CodeChangeSet } from "@/lib/infinity/product-asset-builder/v2.1/types";
import type {
  VentureSystemsBuildCoverageHqView,
  VentureSystemsBuildCoveragePlan,
  VentureSystemsBuildCoverageValidation,
  VentureSystemsExternalDependency,
} from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/types";
import type {
  DEPLOYMENT_AUTHORITY,
  EnvironmentRequirementStatus,
  ProductionHandoffArtifactKind,
  ProductionHandoffFailureCode,
  ProductionHandoffReadiness,
  PRODUCTION_HANDOFF_WRITE_BOUNDARY,
} from "./constants";

export type ProductionHandoffFailure = {
  code: ProductionHandoffFailureCode;
  message: string;
  artifactKind?: ProductionHandoffArtifactKind | null;
  systemFamily?: SystemFamily | null;
  path?: string | null;
  identifier?: string | null;
};

export type VerificationEvidence = {
  status: "PASS" | "FAIL" | "UNKNOWN" | "NOT_RUN";
  timestamp: string | null;
  source: string;
  summary: string;
  counts: {
    passed: number | null;
    failed: number | null;
    total: number | null;
  };
};

export type ProductionHandoffArtifact = {
  artifactId: string;
  kind: ProductionHandoffArtifactKind;
  status: "PRESENT" | "MISSING" | "UNVERIFIED" | "BLOCKED";
  path: string | null;
  sourceRef: string;
  ventureId: string;
  buildContractId: string | null;
  ventureSystemsBuildContractId: string | null;
  codingTaskId: string | null;
  codeChangeSetId: string | null;
  missionId: string | null;
  providerCallId: string | null;
  assetId: string | null;
};

export type CodeChangeSetHandoffRef = {
  codeChangeSetId: string;
  codingTaskId: string;
  ventureId: string;
  companyId: string | null;
  missionId: string | null;
  buildContractId: string | null;
  ventureSystemsBuildContractId: string | null;
  provider: string;
  model: string;
  affectedFiles: string[];
  validationState: "UNVALIDATED" | "VALID" | "INVALID";
  reviewState: "UNREVIEWED" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | null;
  productionReady: false;
};

export type RuntimeRequirement = {
  key:
    | "runtimeVersion"
    | "framework"
    | "buildCommand"
    | "startCommand"
    | "database"
    | "storage"
    | "queue"
    | "scheduledJobs"
    | "objectStorage"
    | "email"
    | "payments"
    | "environmentVariables"
    | "secrets"
    | "providerAdapters";
  required: boolean;
  value: string | null;
  status: "DECLARED" | "MISSING" | "DEFERRED" | "NOT_REQUIRED";
  sourceCapability: SystemCapability | SystemFamily | null;
};

export type EnvironmentRequirement = {
  key: string;
  required: boolean;
  secret: boolean;
  sourceCapability: SystemCapability | SystemFamily | null;
  provider: string | null;
  scope: "BUILD" | "RUNTIME" | "DEPLOY";
  status: EnvironmentRequirementStatus;
};

export type DatabaseRequirement = {
  schemaRequired: boolean;
  migrations: Array<{
    migrationId: string;
    path: string;
    order: number | null;
    verificationStatus: "VERIFIED" | "UNVERIFIED" | "MISSING" | "FAILED";
  }>;
  requiredCapabilities: string[];
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "MISSING" | "NOT_REQUIRED";
};

export type ExternalDependency = {
  capability: SystemFamily;
  requiredCapabilities: SystemCapability[];
  providerSelectionState: VentureSystemsExternalDependency["providerStatus"];
  tenancy: TenancyStrategy;
  credentialState: "NOT_REQUIRED" | "REQUIRED_MISSING" | "REQUIRES_EXTERNAL_AUTHORIZATION";
  procurementRequired: boolean;
  writeAuthorityRequired: false;
  cost: ArchitectureCost;
  costKnown: boolean;
  blockingStatus: VentureSystemsExternalDependency["blockingStatus"];
  providerVerificationState: "NONE" | "READ_ONLY_VERIFIED" | "FAILED";
  writeAuthorized: false;
};

export type DeploymentRequirement = {
  targetRuntimeCapability: string | null;
  hostingCapability: string | null;
  domainRequired: boolean;
  dnsRequired: boolean;
  tlsRequired: boolean;
  databaseRequired: boolean;
  providerBindings: string[];
  environmentVariableKeys: string[];
  buildArtifactRef: string | null;
  healthCheckPath: string | null;
  rollbackRequired: boolean;
  providerChosen: boolean;
  deploymentAuthority: typeof DEPLOYMENT_AUTHORITY;
};

export type ArchitectureCoverageHandoff = {
  present: boolean;
  requiredSystemsAccounted: boolean;
  coverage: VentureSystemsBuildCoverageHqView | null;
  blockedFamilies: SystemFamily[];
  deferredFamilies: SystemFamily[];
  externalFamilies: SystemFamily[];
  validationOk: boolean;
};

export type CompletenessAccounting = {
  required: number;
  satisfied: number;
  externalDependency: number;
  deferred: number;
  blockedUnresolved: number;
  accounted: number;
};

export type ProductionHandoffHqView = {
  productionReadiness: ProductionHandoffReadiness;
  artifacts: number;
  build: VerificationEvidence["status"];
  tests: VerificationEvidence["status"];
  externalDependencies: number;
  blocked: number;
  deploymentAuthority: typeof DEPLOYMENT_AUTHORITY;
};

export type ProductionArtifactHandoff = {
  schemaVersion: "production_artifact_handoff_v1";
  handoffId: string;
  ventureId: string;
  companyId: string | null;
  missionId: string | null;
  buildContractId: string | null;
  ventureSystemsBuildContractId: string | null;
  pabBuildRunId: string;
  pabArtifactId: string | null;
  codeChangeSetIds: string[];
  artifactInventory: ProductionHandoffArtifact[];
  codeChangeSets: CodeChangeSetHandoffRef[];
  runtimeRequirements: RuntimeRequirement[];
  environmentRequirements: EnvironmentRequirement[];
  databaseRequirements: DatabaseRequirement;
  externalDependencies: ExternalDependency[];
  providerRequirements: ExternalDependency[];
  deploymentRequirements: DeploymentRequirement;
  architectureCoverage: ArchitectureCoverageHandoff;
  buildVerification: VerificationEvidence;
  testVerification: VerificationEvidence;
  typecheckVerification: VerificationEvidence;
  architectureVerification: VerificationEvidence;
  knownBlockers: ProductionHandoffFailure[];
  knownUnresolvedItems: ProductionHandoffFailure[];
  readiness: ProductionHandoffReadiness;
  completeness: CompletenessAccounting;
  createdAt: string;
  traceability: {
    ventureId: string;
    companyId: string | null;
    missionId: string | null;
    buildContractId: string | null;
    ventureSystemsBuildContractId: string | null;
    pabBuildRunId: string;
    codingTaskIds: string[];
    codeChangeSetIds: string[];
    providerCallIds: string[];
    assetIds: string[];
  };
  deploymentAuthority: typeof DEPLOYMENT_AUTHORITY;
  writeBoundary: typeof PRODUCTION_HANDOFF_WRITE_BOUNDARY;
};

export type CollectedCodeChangeSet = {
  codeChangeSetId: string;
  ventureId: string;
  companyId?: string | null;
  missionId?: string | null;
  buildContractId?: string | null;
  ventureSystemsBuildContractId?: string | null;
  validationState?: CodeChangeSetHandoffRef["validationState"];
  reviewState?: CodeChangeSetHandoffRef["reviewState"];
  changeSet: CodeChangeSet;
};

export type ProductionHandoffCollectInput = {
  ventureId: string;
  companyId?: string | null;
  missionId?: string | null;
  buildContractId?: string | null;
  ventureSystemsBuildContractId?: string | null;
  pabBuildRunId: string;
  pabArtifactId?: string | null;
  createdAt?: string;
  architecturePlan?: VentureSystemsBuildCoveragePlan | null;
  architectureValidation?: VentureSystemsBuildCoverageValidation | null;
  codingTaskIds?: string[];
  codeChangeSets?: CollectedCodeChangeSet[];
  artifacts?: Array<Partial<ProductionHandoffArtifact> & { kind: ProductionHandoffArtifactKind; artifactId: string }>;
  runtimeRequirements?: RuntimeRequirement[];
  environmentRequirements?: EnvironmentRequirement[];
  databaseRequirements?: Partial<DatabaseRequirement>;
  providerVerifications?: Array<{
    capability: SystemFamily;
    state: ExternalDependency["providerVerificationState"];
  }>;
  buildVerification?: Partial<VerificationEvidence>;
  testVerification?: Partial<VerificationEvidence>;
  typecheckVerification?: Partial<VerificationEvidence>;
};

export type ProductionHandoffValidation = {
  ok: boolean;
  readiness: ProductionHandoffReadiness;
  failures: ProductionHandoffFailure[];
  handoff: ProductionArtifactHandoff;
};

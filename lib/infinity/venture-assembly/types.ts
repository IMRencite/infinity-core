import type {
  VentureAssemblyReadinessStatus,
  VentureAssemblyStatus,
} from "./constants";

export type ClaimClassification = "approved_fact" | "derived_decision" | "assumption" | "unknown";

export type VentureAssemblyManifestV1 = {
  schemaVersion: "venture_assembly_manifest_v1";
  ventureIdentity: {
    workingName: string;
    displayName?: string;
    ventureType: string;
    businessModel: string;
    targetCustomer: string;
    problem: string;
    valueProposition: string;
    offer: string;
  };
  opportunityCandidateId?: string | null;
  companyBuilderBlueprintId?: string | null;
  origin?: string;
  rank?: number | null;
  traceability: {
    organizationId: string;
    missionId: string;
    opportunityId: string;
    executiveDecisionId: string;
    planId: string;
    planVersion: number;
    planExecutionId: string;
    buildId: string | null;
    buildJobId: string | null;
    buildSnapshotId: string | null;
    ventureBlueprintId: string | null;
    workerResultIds: string[];
    qaResultIds: string[];
  };
  artifactInventory: Array<{
    kind: string;
    referenceId: string;
    referenceType: string;
    description: string;
  }>;
  readinessState: VentureAssemblyReadinessStatus | null;
  unresolvedDecisions: string[];
  riskRegister: Array<{ risk: string; classification: ClaimClassification }>;
  launchRequirements: string[];
  externalDependencySummary: string[];
};

export type VentureAssemblyRecord = {
  id: string;
  organizationId: string;
  missionId: string;
  opportunityId: string;
  executiveDecisionId: string;
  planId: string;
  planVersion: number;
  planExecutionId: string;
  ventureBlueprintId: string | null;
  buildId: string | null;
  buildJobId: string | null;
  buildSnapshotId: string | null;
  productionArtifactId: string | null;
  launchStage: string | null;
  companyId: string | null;
  assemblyVersion: number;
  manifestSchemaVersion: string;
  status: VentureAssemblyStatus;
  readinessStatus: VentureAssemblyReadinessStatus | null;
  manifest: VentureAssemblyManifestV1;
  identityPackage: Record<string, unknown>;
  businessModelPackage: Record<string, unknown>;
  brandPackage: Record<string, unknown>;
  digitalPropertyPackage: Record<string, unknown>;
  monetizationPackage: Record<string, unknown>;
  marketingPackage: Record<string, unknown>;
  operationsPackage: Record<string, unknown>;
  legalCompliancePackage: Record<string, unknown>;
  readinessEvaluation: Record<string, unknown>;
  idempotencyKey: string;
  correlationId: string | null;
  blockingReason: string | null;
  supersededBy: string | null;
  immutableAt: string | null;
};

export type ExternalDependencyRecord = {
  id: string;
  organizationId: string;
  ventureAssemblyId: string;
  dependencyType: string;
  reason: string;
  requiredFor: string;
  blockingStage: string;
  estimatedCost: number | null;
  approvalRequirement: string;
  capabilityRequirement: string | null;
  status: string;
};

export type ReadinessEvaluationResult = {
  readinessStatus: VentureAssemblyReadinessStatus;
  dimensions: Record<string, boolean>;
  blockers: string[];
  notes: string[];
};

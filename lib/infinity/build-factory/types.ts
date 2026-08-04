import type { BuildProjectType, BuildStatus } from "./constants";
import type { WebsiteBuildExtension } from "@/lib/infinity/website-builder/types";

export type BuildSpecification = {
  id: string;
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  opportunityId: string;
  ventureBlueprintId: string;
  planId: string | null;
  allocationProposalId: string | null;
  projectType: BuildProjectType;
  templateKey: string;
  templateVersion: string;
  buildVersion: string;
  name: string;
  slug: string;
  description: string;
  businessModel: string;
  targetAudience: string;
  valueProposition: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  requiredPages: string[];
  requiredFeatures: string[];
  dataRequirements: string[];
  contentRequirements: string[];
  designRequirements: string[];
  SEORequirements: string[];
  accessibilityRequirements: string[];
  securityRequirements: string[];
  performanceRequirements: string[];
  integrationRequirements: string[];
  prohibitedActions: string[];
  approvedCapabilities: string[];
  requiredReviews: string[];
  estimatedTasks: number;
  estimatedCost: number;
  maximumCost: number;
  maximumRuntime: number;
  outputTypes: string[];
  status: BuildStatus | "unsupported_for_build_v1";
  specificationHash: string;
  createdAt: string;
  website?: WebsiteBuildExtension;
  aiWebsiteGeneration?: { enabled: boolean; mode: string };
};

export type BuildManifest = {
  specificationId: string;
  specificationVersion: string;
  workspaceId: string;
  projectType: BuildProjectType;
  templateKey: string;
  templateVersion: string;
  fileManifest: { path: string; hash: string; bytes: number }[];
  directoryManifest: string[];
  dependencyManifest: Record<string, string>;
  environmentManifest: Record<string, string>;
  taskGraph: BuildTaskNode[];
  requiredWorkerCapabilities: string[];
  requiredReviewCapabilities: string[];
  outputContracts: Record<string, unknown>;
  validationCommands: string[];
  prohibitedCommands: string[];
  allowedPaths: string[];
  deniedPaths: string[];
  maximumFileCount: number;
  maximumTotalOutputSize: number;
  maximumIndividualFileSize: number;
  snapshotPolicy: string;
  rollbackPolicy: string;
  manifestHash: string;
  createdAt: string;
};

export type BuildTaskNode = {
  id: string;
  buildId: string;
  capabilityKey: string;
  dependencies: string[];
  inputManifest: Record<string, unknown>;
  outputContract: Record<string, unknown>;
  reviewRequirement: string;
  timeoutSeconds: number;
  maxAttempts: number;
  sideEffectClass: string;
  status: string;
  idempotencyKey: string;
};

export type PersistedBuild = {
  id: string;
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  opportunityId: string;
  ventureBlueprintId: string;
  planId: string | null;
  allocationProposalId: string | null;
  projectType: BuildProjectType;
  templateKey: string;
  templateVersion: string;
  buildVersion: string;
  specificationVersion: string;
  status: BuildStatus;
  specification: BuildSpecification;
  specificationHash: string;
  manifest: BuildManifest;
  manifestHash: string;
  workspaceReference: string;
  currentSnapshotId: string | null;
  reviewStatus: string;
  idempotencyKey: string;
  correlationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BuildFactoryRequestInput = {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  opportunityId: string;
  ventureBlueprintId: string;
  planId: string;
  allocationProposalId: string | null;
  correlationId: string;
};

export type BuildFactoryRequestResult =
  | { status: "created"; build: PersistedBuild; tasks: BuildTaskNode[] }
  | { status: "reused"; build: PersistedBuild; tasks: BuildTaskNode[] }
  | { status: "blocked"; reason: string; classification: string; buildId?: string };

export type ReproducibilityReport = {
  status: "reproducible" | "mismatched" | "incomplete" | "unsupported";
  details: string[];
};

export type WorkspaceAdapter = {
  createDirectory(relativePath: string): Promise<void>;
  writeTextFile(relativePath: string, content: string): Promise<void>;
  readTextFile(relativePath: string): Promise<string>;
  listWorkspaceFiles(): Promise<{ path: string; bytes: number; hash: string }[]>;
  calculateHash(relativePath: string): Promise<string>;
  validateWorkspace(): Promise<{ valid: boolean; issues: string[] }>;
};

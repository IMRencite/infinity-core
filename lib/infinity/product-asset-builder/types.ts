import type { BuildGraph, BuildPackageDraft, BuildTask, VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { ArtifactStatus, FileOperation, PabRunStatus, TaskRunStatus } from "./constants";

export type LoadedBuildPackage = {
  packageId: string | null;
  blueprintId: string | null;
  organizationId: string;
  buildPackage: BuildPackageDraft;
  blueprint: VentureBlueprintDraft;
  buildGraph: BuildGraph;
  simulationOnly: boolean;
};

export type VentureWorkspaceIds = {
  ventureId: string;
  buildPackageId: string | null;
  workspaceId: string;
  buildRunId: string;
  artifactId: string | null;
};

export type FileOpRecord = {
  operation: FileOperation;
  relativePath: string;
  contentHash?: string;
  byteSize?: number;
};

export type TaskRunRecord = {
  taskId: string;
  taskName: string;
  category: string;
  status: TaskRunStatus;
  dependencies: string[];
  outputHash?: string;
  errorMessage?: string;
};

export type ValidationRunRecord = {
  validatorName: string;
  status: "pass" | "fail" | "skip";
  details: Record<string, unknown>;
};

export type RepairAttemptRecord = {
  attemptNumber: number;
  failureClassification: string;
  repairAction: Record<string, unknown>;
  success: boolean;
};

export type ProductionArtifactDraft = {
  artifactId: string;
  ventureId: string;
  buildPackageId: string | null;
  workspaceId: string;
  buildRunId: string;
  status: ArtifactStatus;
  artifactManifest: Record<string, unknown>;
  sourceManifest: Record<string, unknown>;
  technologyManifest: Record<string, unknown>;
  databaseManifest: Record<string, unknown>;
  routeManifest: Record<string, unknown>;
  monetizationManifest: Record<string, unknown>;
  validationManifest: Record<string, unknown>;
  dependencyManifest: Record<string, unknown>;
  buildHash: string;
  fileCount: number;
  totalBytes: number;
  createdAt: string;
};

export type CostLedgerEntry = {
  provider: string | null;
  modelId: string | null;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

export type ProductAssetBuilderReport = {
  engineVersion: string;
  simulationOnly: boolean;
  buildRunId: string;
  workspaceReference: string;
  tasksCompleted: number;
  tasksFailed: number;
  validationPassed: boolean;
  repairAttempts: number;
  artifactStatus: ArtifactStatus | null;
  artifactId: string | null;
  buildHash: string | null;
  cumulativeCostUsd: number;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  completedAt: string;
};

export type RunProductAssetBuilderInput = {
  organizationId: string;
  idempotencyKey: string;
  buildPackageId?: string;
  loadedPackage?: LoadedBuildPackage;
  simulationOnly?: boolean;
  correlationId?: string;
  induceValidationFailure?: boolean;
  resumeRunId?: string;
  limits?: Partial<typeof import("./constants").DEFAULT_PAB_LIMITS>;
};

export type BuildTaskContext = {
  task: BuildTask;
  blueprint: VentureBlueprintDraft;
  workspaceRoot: string;
  allowedPaths: string[];
};

export type CodingTaskResult = {
  filesWritten: string[];
  structured: Record<string, unknown>;
  orchestrationSessionId?: string;
};

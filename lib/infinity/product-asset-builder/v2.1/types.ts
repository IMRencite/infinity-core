import type { ChangeOperation, CodingTaskType } from "./constants";
import type { FeatureContract } from "../v2/types";

export type RepositoryContext = {
  fileTree: string[];
  packageSummary: Record<string, unknown>;
  frameworkHints: string[];
  relevantFiles: Array<{ path: string; excerpt: string; reason: string }>;
  existingRoutes: string[];
  existingEntities: string[];
  featureContracts: Array<{ featureId: string; featureName: string; requirements: string[] }>;
  priorFailures: string[];
  reviewerFindings: string[];
  tokenEstimate: number;
};

export type CodingTask = {
  id: string;
  buildRunId: string;
  ventureId: string;
  featureContractIds: string[];
  objective: string;
  taskType: CodingTaskType;
  complexity: "low" | "medium" | "high" | "critical";
  repositoryContext: RepositoryContext;
  relevantFiles: string[];
  allowedPaths: string[];
  forbiddenPaths: string[];
  requirements: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  preferredCapabilities: string[];
  maxFilesChanged: number;
  maxTokens?: number;
  maxCostUsd?: number;
  retryLimit: number;
  status: "pending" | "running" | "completed" | "failed" | "blocked" | "cancelled";
  parentTaskId?: string;
};

export type CodeChange = {
  operation: ChangeOperation;
  path: string;
  content?: string;
  patch?: string;
  justification: string;
};

export type CodeChangeSet = {
  taskId: string;
  provider: string;
  model: string;
  reasoningSummary: string;
  changes: CodeChange[];
  dependencyChanges: string[];
  migrationChanges: string[];
  testsAdded: string[];
  expectedBehavior: string[];
  assumptions: string[];
};

export type WorkspaceMutationRecord = {
  id: string;
  codingTaskId: string;
  codeChangeSetId: string;
  featureContractIds: string[];
  provider: string;
  model: string;
  relativePath: string;
  operation: string;
  contentHashBefore?: string;
  contentHashAfter?: string;
  byteSizeBefore?: number;
  byteSizeAfter?: number;
  rolledBack: boolean;
};

export type ProviderUsageRecord = {
  provider: string;
  modelId: string;
  role: string;
  taskType: string;
  codingTaskId?: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  usageSource: "provider" | "estimated";
  success: boolean;
  error?: string;
};

export type ReviewFinding = {
  defectType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  description: string;
  filePath?: string;
  featureId?: string;
  provider: string;
  model: string;
  resolved: boolean;
};

export type RepairContext = {
  failedGate: string;
  failureOutput: string;
  affectedFiles: string[];
  relatedFeatureIds: string[];
  attemptNumber: number;
};

export type AiCodingReport = {
  engineVersion: string;
  codingTasksCreated: number;
  codingTasksCompleted: number;
  codeChangeSets: number;
  filesCreated: number;
  filesModified: number;
  filesDeleted: number;
  mutationsApplied: number;
  rollbacks: number;
  repairLoops: number;
  featureContractsSatisfied: number;
  providers: Record<string, { tasks: number; inputTokens: number; outputTokens: number; costUsd: number }>;
  architectProvider: string | null;
  implementerProvider: string | null;
  reviewerProvider: string | null;
  independentReviews: number;
  disagreements: number;
  fallbacks: number;
  repairs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  usageSourceByProvider: Record<string, "provider" | "estimated">;
  routingLog: Array<{ task: string; provider: string; model: string; role: string }>;
  appliedDiffSummary: Array<{ path: string; operation: string; provider: string }>;
};

export type RunPabV21Input = {
  organizationId: string;
  idempotencyKey: string;
  correlationId?: string;
  liveMode?: boolean;
  simulatedProviderOutage?: string;
  skipCollectionsFeature?: boolean;
};

export type RunPabV21Output = {
  ok: boolean;
  buildRunId: string;
  artifactStatus: "ready" | "blocked" | "failed";
  artifactId: string | null;
  aiCodingReport: AiCodingReport;
  blockedReasons: string[];
  workspaceReference: string;
};

export type CollectionsFeatureInput = {
  contract: FeatureContract;
  codingTasks: Omit<CodingTask, "id" | "buildRunId" | "status" | "repositoryContext">[];
};

import type { CodeChange, CodeChangeSet, WorkspaceMutationRecord } from "@/lib/infinity/product-asset-builder/v2.1/types";
import type {
  CanonicalCodingTaskStatus,
  CanonicalCodingTaskType,
  CodingAgentProviderId,
  CodingCapability,
  CodingFailureCode,
  CodingRouterOutcome,
  CodingSecurityLevel,
  CursorExecutionMode,
  NetworkPolicy,
  ProviderAvailability,
} from "./constants";

export type EpistemicCost = {
  value: number | null;
  actuality: "ACTUAL" | "ESTIMATE" | "UNKNOWN";
  currency: "USD";
};

export type RepositoryDescriptor = {
  root: string;
  sizeClass: "small" | "medium" | "large";
  fileCount: number;
};

export type WorkspaceDescriptor = {
  root: string;
  isolated: true;
  ventureId?: string | null;
};

export type CanonicalCodingTask = {
  taskId: string;
  organizationId: string;
  ventureId: string | null;
  companyId?: string | null;
  missionId: string | null;
  buildRunId: string | null;
  buildContractId?: string | null;
  ventureSystemsBuildContractId?: string | null;
  architectureFamily?: string | null;
  founderIdeaSubmissionId: string | null;
  taskType: CanonicalCodingTaskType;
  objective: string;
  repository: RepositoryDescriptor;
  workspace: WorkspaceDescriptor;
  scope: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
  acceptanceCriteria: string[];
  requiredCommands: string[];
  requiredTests: string[];
  estimatedComplexity: "low" | "medium" | "high" | "critical";
  estimatedCost: EpistemicCost;
  securityLevel: CodingSecurityLevel;
  status: CanonicalCodingTaskStatus;
  requiredCapabilities: CodingCapability[];
  filesAffectedEstimate: number;
  terminalNeeded: boolean;
  repositoryExplorationNeeded: boolean;
  debuggingDepth: "shallow" | "deep";
  expectedDurationMs: number;
  asyncPreferred: boolean;
};

export type CodingAgentExecutionRequest = {
  task: CanonicalCodingTask;
  workspace: WorkspaceDescriptor;
  branch: string | null;
  allowedPaths: string[];
  forbiddenPaths: string[];
  commandsAllowed: string[];
  networkPolicy: NetworkPolicy;
  externalActionRestrictions: "EAG_ONLY";
  secretPolicy: "SANITIZED_NO_CREDENTIALS";
  timeoutMs: number;
  costCeiling: EpistemicCost;
  expectedArtifacts: string[];
  executionMode?: CursorExecutionMode | "NATIVE";
  simulation?: CodingSimulation;
  allowCommit?: boolean;
  allowProtectedMerge?: false;
  allowForcePush?: false;
  allowProductionDeploy?: false;
};

export type CodingSimulation =
  | "success"
  | "compile_failure"
  | "timeout"
  | "forbidden_path"
  | "external_action"
  | "qa_failure"
  | "unavailable";

export type ExternalActionRequirement = {
  actionType: "DEPLOYMENT" | "DNS" | "PURCHASE" | "PAYMENT" | "OTHER";
  description: string;
  estimatedCost: EpistemicCost;
  requiresTreasury: true;
  requiresEag: true;
};

export type ProviderFileTouch = {
  path: string;
  operation: "read" | "create" | "modify" | "delete";
};

export type ProviderCommandResult = {
  command: string;
  exitStatus: number;
  durationMs: number;
  blocked?: boolean;
  reason?: CodingFailureCode;
};

export type CodingAgentProviderResult = {
  provider: CodingAgentProviderId;
  executionMode: CursorExecutionMode | "NATIVE";
  status: "COMPLETED" | "FAILED" | "TIMEOUT";
  failureCode: CodingFailureCode | null;
  files: ProviderFileTouch[];
  commandsRun: ProviderCommandResult[];
  testsRun: Array<{ name: string; passed: boolean }>;
  diff: string;
  branch: string | null;
  commitSha: string | null;
  durationMs: number;
  cost: EpistemicCost;
  directoriesExplored: string[];
  filesRead: string[];
  changeSet: CodeChangeSet | null;
  externalActionRequirements: ExternalActionRequirement[];
};

export type CodingAgentProvider = {
  id: CodingAgentProviderId;
  displayName: string;
  capabilities: CodingCapability[];
  availability(): ProviderAvailability;
  supports(capability: CodingCapability): boolean;
  configuredModes(): Array<CursorExecutionMode | "NATIVE">;
  execute(request: CodingAgentExecutionRequest): Promise<CodingAgentProviderResult> | CodingAgentProviderResult;
};

export type CodingRouterSignals = {
  complexity: CanonicalCodingTask["estimatedComplexity"];
  repositorySize: RepositoryDescriptor["sizeClass"];
  filesAffected: number;
  terminalNeed: boolean;
  repositoryExplorationNeed: boolean;
  debuggingDepth: CanonicalCodingTask["debuggingDepth"];
  expectedDurationMs: number;
  testRequirements: number;
  historicalSuccess?: number | null;
  cost: EpistemicCost;
  latencyMs?: number | null;
  asyncExecutionValue: boolean;
  cursorAvailable: boolean;
  nativeAvailable: boolean;
  cursorCostAuthorized: boolean;
};

export type CodingRouterDecision = {
  outcome: CodingRouterOutcome;
  providerId: CodingAgentProviderId | null;
  executionMode: CursorExecutionMode | "NATIVE" | null;
  rationale: string[];
  independentReview: boolean;
};

export type InfinityQaResult = {
  typecheck: boolean;
  tests: boolean;
  build: boolean;
  security: boolean;
  featureContract: boolean;
  secretScan: boolean;
  placeholderScan: boolean;
  workspaceIsolation: boolean;
  passed: boolean;
  failures: string[];
};

export type CodingAgentRun = {
  codingAgentRunId: string;
  organizationId: string;
  ventureId: string | null;
  missionId: string | null;
  taskId: string;
  buildRunId: string | null;
  founderIdeaSubmissionId: string | null;
  provider: CodingAgentProviderId;
  executionMode: CursorExecutionMode | "NATIVE";
  routerOutcome: CodingRouterOutcome;
  providerStatus: "COMPLETED" | "FAILED" | "TIMEOUT";
  infinityAccepted: boolean;
  status: CanonicalCodingTaskStatus;
  durationMs: number;
  cost: EpistemicCost;
  filesRead: string[];
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  commandsRun: ProviderCommandResult[];
  testsRun: Array<{ name: string; passed: boolean }>;
  branch: string | null;
  commitSha: string | null;
  failureCode: CodingFailureCode | null;
  failureReason: string | null;
  repairAttempts: number;
  reviewDefects: number;
  qa: InfinityQaResult | null;
  changeSet: CodeChangeSet | null;
  mutations: WorkspaceMutationRecord[];
  productionArtifactId: string | null;
  buildGatePassed: boolean | null;
  externalActionRequirements: ExternalActionRequirement[];
  createdAt: string;
  completedAt: string | null;
};

export type CodingProductionArtifact = {
  id: string;
  organizationId: string;
  codingAgentRunId: string;
  taskId: string;
  provider: CodingAgentProviderId;
  accepted: true;
  publiclyDeployed: false;
};

export type CodingTelemetryRecord = {
  provider: CodingAgentProviderId;
  mode: CursorExecutionMode | "NATIVE";
  taskType: CanonicalCodingTaskType;
  repoSize: RepositoryDescriptor["sizeClass"];
  filesChanged: number;
  commandsRun: number;
  durationMs: number;
  cost: EpistemicCost;
  testsPassed: boolean;
  buildSuccess: boolean;
  repairCount: number;
  reviewDefects: number;
  finalAcceptance: boolean;
};

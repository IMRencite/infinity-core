import type { HealthStatus, OpportunityPipelineStageId } from "./constants";

export type HqMetricLink = {
  label: string;
  value: string;
  href: string | null;
  hint?: string | null;
};

export type HqExecutiveOverview = {
  metrics: HqMetricLink[];
};

export type HqSystemHealth = {
  supabase: HealthStatus;
  missionRuntime: HealthStatus;
  aiProviderMode: string;
  aiProviderConfigured: HealthStatus;
  aiModel: string;
  queueHealth: HealthStatus;
  failedJobCount: number | null;
  retryingJobCount: number | null;
  blockedRuntimeCount: number | null;
  lockedRuntimeCount: number | null;
  lastSuccessfulTickAt: string | null;
  lastFailedTickAt: string | null;
};

export type HqPipelineStage = {
  id: OpportunityPipelineStageId;
  label: string;
  count: number | null;
  blockedCount: number | null;
  oldestItemAge: string | null;
  latestItemAt: string | null;
  href: string;
};

export type HqMissionRow = {
  missionId: string;
  title: string;
  organizationId: string;
  runtimeInstanceId: string;
  runtimeStatus: string;
  currentStage: string;
  lifecycleVersion: string;
  lastAdvancedAt: string | null;
  wakeAt: string | null;
  blockingReason: string | null;
  stateVersion: number;
  latestTransition: string | null;
  latestCheckpoint: string | null;
  inspectorHref: string;
};

export type HqExecutiveQueueItem = {
  id: string;
  opportunityId: string;
  opportunityName: string;
  decision: string;
  queueStatus: string;
  priority: number | null;
  rationale: string | null;
  planningEligible: boolean | null;
  validationStatus: string | null;
  reasoningRecommendation: string | null;
  createdAt: string;
};

export type HqBlueprintRow = {
  id: string;
  name: string;
  ventureType: string;
  businessModel: string;
  opportunityId: string;
  status: string;
  estimatedTimeline: string | null;
  estimatedBudget: string | null;
  expectedRoi: string | null;
  requiredAssetsCount: number;
  requiredWorkersCount: number;
  createdAt: string;
};

export type HqWorkerHealth = {
  queuedJobs: number | null;
  runningJobs: number | null;
  completedJobs: number | null;
  failedJobs: number | null;
  retryingJobs: number | null;
  deadLetterJobs: number | null;
  activeWorkerRuns: number | null;
  idleRegisteredCapabilities: number | null;
  unavailableCapabilities: number | null;
  latestWorkerFailure: string | null;
  averageRecentDurationMs: number | null;
};

export type HqReasoningStatus = {
  mode: string;
  provider: string;
  model: string;
  latestSessionId: string | null;
  sessionStatus: string | null;
  recommendation: string | null;
  confidence: number | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
  executiveReviewStatus: string;
  failureReason: string | null;
};

export type HqActivityItem = {
  id: string;
  occurredAt: string;
  eventType: string;
  severity: string;
  message: string;
  missionId: string | null;
  opportunityId: string | null;
  runtimeInstanceId: string | null;
  engineJobId: string | null;
};

export type HqAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  source: string;
  relatedLabel: string;
  relatedHref: string | null;
  reason: string;
  occurredAt: string;
  recommendedAction: string;
};

export type HqPortfolioSummary = {
  reservedCapital: string;
  approvedAllocation: string;
  estimatedBlueprintBudgetTotal: string;
  estimatedOpportunityRoi: string;
  activeAllocationProposals: number | null;
  revenueTracking: string;
};

export type HqDashboardSnapshot = {
  organizationId: string;
  organizationName: string;
  activeMissionTitle: string | null;
  executiveOverview: HqExecutiveOverview;
  systemHealth: HqSystemHealth;
  opportunityPipeline: HqPipelineStage[];
  missions: HqMissionRow[];
  executiveQueue: HqExecutiveQueueItem[];
  blueprints: HqBlueprintRow[];
  workerHealth: HqWorkerHealth;
  reasoningStatus: HqReasoningStatus;
  activity: HqActivityItem[];
  alerts: HqAlert[];
  portfolio: HqPortfolioSummary;
  generatedAt: string;
};

export type HqDashboardFilters = {
  eventSeverity?: string | null;
  missionStage?: string | null;
};

export type MissionInspectorData = {
  mission: Record<string, unknown> | null;
  runtime: Record<string, unknown> | null;
  transitions: Record<string, unknown>[];
  checkpoints: Record<string, unknown>[];
  opportunities: Record<string, unknown>[];
  validationRuns: Record<string, unknown>[];
  reasoningSessions: Record<string, unknown>[];
  executiveDecisions: Record<string, unknown>[];
  executiveSelectionDecisions: Record<string, unknown>[];
  executivePlannerHandoff: Record<string, unknown> | null;
  planExecution: Record<string, unknown> | null;
  ventureAssembly: Record<string, unknown> | null;
  allocationProposals: Record<string, unknown>[];
  engineJobs: Record<string, unknown>[];
  workerRuns: Record<string, unknown>[];
  blueprint: Record<string, unknown> | null;
  events: Record<string, unknown>[];
};

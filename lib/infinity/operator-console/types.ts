export type DepartmentId =
  | "opportunity_lab"
  | "research_department"
  | "strategy_finance"
  | "company_operations"
  | "growth_department"
  | "creative_studio"
  | "product_lab"
  | "quality_control"
  | "launch_operations"
  | "intelligence_center"
  | "executive_office";

export type DepartmentUiState =
  | "COMPLETE"
  | "RUNNING"
  | "WAITING"
  | "BLOCKED"
  | "FAILED"
  | "SKIPPED"
  | "NOT_STARTED"
  | "UNKNOWN"
  | "PAUSED"
  | "SHUTDOWN";

export type EngineId =
  | "opportunity_discovery"
  | "opportunity_scanner"
  | "ai_brain"
  | "grounded_research"
  | "multi_model_router"
  | "monetization_engine"
  | "venture_selection"
  | "company_builder"
  | "organic_growth"
  | "creative_media"
  | "product_asset_builder"
  | "quality_control"
  | "external_action_gateway"
  | "performance_intelligence"
  | "executive_decision";

export type OperatorActivityEvent = {
  id: string;
  timestamp: string;
  departmentId: DepartmentId;
  departmentLabel: string;
  engine: EngineId | string;
  eventType: string;
  summary: string;
  status: string | null;
  relatedIds: Record<string, string | null>;
  provider: string | null;
  model: string | null;
  costUsd: number | null;
  costKnown: boolean;
};

export type OperatorProviderSession = {
  sessionId: string;
  departmentId: DepartmentId;
  engine: string;
  role: "IMPLEMENTER" | "REVIEWER" | "RESEARCH_PROVIDER" | "MEDIA_PROVIDER" | "ROUTED_MODEL" | "AI_SESSION";
  provider: string | null;
  model: string | null;
  status: string;
  task: string | null;
  costUsd: number | null;
  costKnown: boolean;
  startedAt: string | null;
  filesChanged: string[];
};

export type OperatorDepartmentSnapshot = {
  id: DepartmentId;
  label: string;
  state: DepartmentUiState;
  engines: EngineId[];
  summary: string | null;
  currentTask: string | null;
  provider: string | null;
  model: string | null;
  costUsd: number | null;
  costKnown: boolean;
  startedAt: string | null;
  lastActivityAt: string | null;
  recordCount: number;
  detail: Record<string, unknown>;
  isActive: boolean;
  isNextMissionTarget: boolean;
};

export type OperatorCostSummary = {
  knownSpendUsd: number;
  unpricedProviderCalls: number;
  breakdown: Array<{ label: string; amountUsd: number | null; known: boolean }>;
};

export type OperatorCurrentActivity = {
  active: boolean;
  departmentId: DepartmentId | null;
  departmentLabel: string | null;
  engine: string | null;
  task: string | null;
  provider: string | null;
  model: string | null;
  status: string | null;
  startedAt: string | null;
  elapsedSeconds: number | null;
  attempt: number | null;
  costUsd: number | null;
  costKnown: boolean;
  artifactStatus: string | null;
  latestActivitySummary: string | null;
  latestActivityAt: string | null;
};

export type OperatorLineageNode = {
  id: string;
  type: string;
  label: string;
  status: string | null;
  timestamp: string | null;
  children: OperatorLineageNode[];
};

export type OperatorVentureContext = {
  ventureAssemblyId: string;
  organizationId: string;
  missionId: string;
  opportunityId: string | null;
  companyId: string | null;
  ventureBlueprintId: string | null;
  buildId: string | null;
  productionArtifactId: string | null;
  ventureName: string;
  ventureType: string | null;
  assemblyStatus: string;
  readinessStatus: string | null;
  launchStage: string | null;
  correlationIds: string[];
};

export type OperatorVentureSnapshot = {
  generatedAt: string;
  venture: OperatorVentureContext;
  overallStatus: DepartmentUiState;
  currentDepartments: DepartmentId[];
  currentActivity: OperatorCurrentActivity;
  departments: OperatorDepartmentSnapshot[];
  pipeline: {
    stagesCompleted: number;
    stagesTotal: number;
    stageLabels: string[];
  };
  activityFeed: OperatorActivityEvent[];
  providers: OperatorProviderSession[];
  costs: OperatorCostSummary;
  lineage: OperatorLineageNode[];
  closedLoopRoute: {
    active: boolean;
    fromDepartmentId: DepartmentId | null;
    viaDepartmentId: DepartmentId | null;
    toDepartmentId: DepartmentId | null;
    decisionType: string | null;
    missionId: string | null;
    missionStatus: string | null;
  };
  system: {
    engineRuns: Record<string, unknown[]>;
    artifacts: Record<string, unknown[]>;
    performance: Record<string, unknown>;
    learning: Record<string, unknown>;
  };
};

export type OperatorVentureListItem = {
  ventureAssemblyId: string;
  ventureName: string;
  status: string;
  activeDepartment: string | null;
  latestActivity: string | null;
  latestActivityAt: string | null;
  launchState: string | null;
  knownSpendUsd: number | null;
  latestDecision: string | null;
  missionId: string;
};

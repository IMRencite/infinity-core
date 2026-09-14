import type { DepartmentId } from "@/lib/infinity/operator-console/types";

export const CANONICAL_WORK_EXECUTION_CONTRACT = "CanonicalWorkExecutionContract" as const;

export const CANONICAL_WORK_TYPES = [
  "RESEARCH",
  "VALIDATION",
  "ECONOMICS",
  "OFFER_ARCHITECTURE",
  "SYSTEM_ARCHITECTURE",
  "BUILD",
  "DESIGN",
  "QC",
  "DEPLOYMENT",
  "GROWTH",
  "COMMERCIALIZATION",
  "FULFILLMENT",
  "LEARNING",
  "PRODUCT_IMPROVEMENT",
  "INCIDENT_REPAIR",
  "OPERATING",
  "OPPORTUNITY_DISCOVERY",
  "OTHER",
] as const;
export type CanonicalWorkType = (typeof CANONICAL_WORK_TYPES)[number];

export const CANONICAL_WORK_STATUSES = [
  "QUEUED",
  "ACTIVE",
  "WAITING",
  "BLOCKED",
  "AUTHORIZATION_REQUIRED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "SUPERSEDED",
  "STALE",
] as const;
export type CanonicalWorkStatus = (typeof CANONICAL_WORK_STATUSES)[number];

export const CANONICAL_WORK_SOURCES = [
  "INFINITY_RUNTIME",
  "MISSION_ACTIVITY",
  "EXTERNAL_IMPLEMENTATION_AGENT",
  "FOUNDER",
  "SCHEDULED_RUNTIME",
] as const;
export type CanonicalWorkSource = (typeof CANONICAL_WORK_SOURCES)[number];

export const ACTIVE_WORK_HQ_VISIBILITY_GATE = "ActiveWorkHQVisibilityGate" as const;
export const ACTIVE_WORKER_PROJECTION_GATE = "ActiveWorkerProjectionGate" as const;
export const VENTURE_ACTIVE_WORK_PROJECTION_GATE = "VentureActiveWorkProjectionGate" as const;
export const HQ_COMMAND_ACTIVE_WORK_CONSISTENCY_GATE = "HQCommandActiveWorkConsistencyGate" as const;
export const ACTIVE_WORK_FRESHNESS_GATE = "ActiveWorkFreshnessGate" as const;
export const ACTIVE_WORK_STALENESS_GATE = "ActiveWorkStalenessGate" as const;
export const OPERATING_FLOOR_CURRENT_MISSION_GATE = "OperatingFloorCurrentMissionGate" as const;
export const HQ_LIVE_WORK_SURFACE_CONSISTENCY_GATE = "HQLiveWorkSurfaceConsistencyGate" as const;
export const SELECTED_VENTURE_LATEST_WORK_GATE = "SelectedVentureLatestWorkGate" as const;
export const CANONICAL_MISSION_COMPLETION_GATE = "CanonicalMissionCompletionGate" as const;
export const ACTIVE_WORK_TERMINAL_STATE_GATE = "ActiveWorkTerminalStateGate" as const;
export const CURRENT_CANONICAL_WORK_RESOLVER_GATE = "CurrentCanonicalWorkResolverGate" as const;
export const EXTERNAL_IMPLEMENTATION_AGENT_EXECUTION_GATE = "ExternalImplementationAgentExecutionGate" as const;
export const ACTIVE_RUN_COUNT_TRUTH_GATE = "ActiveRunCountTruthGate" as const;
export const HQ_NO_REFRESH_COMPLETION_PROPAGATION_GATE = "HQNoRefreshCompletionPropagationGate" as const;

export const CANONICAL_WORK_CLASSIFICATIONS = [
  "VENTURE_DELIVERY",
  "VENTURE_PRODUCT",
  "VENTURE_DESIGN",
  "VENTURE_QC",
  "VENTURE_DEPLOYMENT",
  "VENTURE_GROWTH",
  "VENTURE_FINANCIAL",
  "SYSTEM_QC",
  "SYSTEM_DIAGNOSTIC",
  "SYSTEM_MAINTENANCE",
  "SYSTEM_INFRASTRUCTURE",
  "OTHER",
] as const;
export type CanonicalWorkClassificationKind = (typeof CANONICAL_WORK_CLASSIFICATIONS)[number];

export const SUBSTANTIVE_VENTURE_CLASSIFICATIONS: CanonicalWorkClassificationKind[] = [
  "VENTURE_DELIVERY",
  "VENTURE_PRODUCT",
  "VENTURE_DESIGN",
  "VENTURE_QC",
  "VENTURE_DEPLOYMENT",
  "VENTURE_GROWTH",
  "VENTURE_FINANCIAL",
];

export const SYSTEM_ONLY_CLASSIFICATIONS: CanonicalWorkClassificationKind[] = [
  "SYSTEM_QC",
  "SYSTEM_DIAGNOSTIC",
  "SYSTEM_MAINTENANCE",
  "SYSTEM_INFRASTRUCTURE",
];

export const HQ_LIVE_FLOOR_LOCKED_PRINCIPLES = [
  "HQ MUST NEVER DISPLAY COMPLETED OR SUPERSEDED WORK AS CURRENT ACTIVE WORK.",
  "HQ COMMAND AND OPERATING FLOOR MUST PROJECT THE SAME CANONICAL WORK ITEM.",
  "LIVE HQ MEANS CURRENT WORK CHANGES WITHOUT MANUAL REFRESH.",
  "A SUCCESSFUL SSE CONNECTION DOES NOT PROVE CURRENT STATE IS CORRECT.",
  "A 200 SNAPSHOT ENDPOINT DOES NOT PROVE THE UI IS CURRENT.",
  "REALTIME TRANSPORT PASS != LIVE STATE CORRECTNESS.",
  "ACTIVE WORK FRESHNESS MUST BE PROVEN AGAINST CANONICAL EXECUTION STATE.",
  "CURRENT ACTIVE WORK != LATEST COMPLETED SYSTEM ACTIVITY.",
  "LATEST SYSTEM ACTIVITY != LATEST MEANINGFUL VENTURE WORK.",
  "A DIAGNOSTIC TASK MUST NOT ERASE THE FOUNDER'S VIEW OF WHAT WAS MOST RECENTLY ACCOMPLISHED FOR THE VENTURE.",
  "IMPLEMENTATION WORK MUST APPEAR ON HQ WHILE ACTIVE AND RETURN TO IDLE WHEN NONE REMAINS.",
] as const;

export const DEFAULT_ACTIVE_WORK_STALE_MS = 4 * 60 * 60 * 1000;

export type CanonicalWorkExecutionContract = {
  contract: typeof CANONICAL_WORK_EXECUTION_CONTRACT;
  work_id: string;
  mission_id: string;
  venture_id: string | null;
  work_type: CanonicalWorkType;
  title: string;
  description: string;
  stage: string;
  status: CanonicalWorkStatus;
  assigned_rooms: DepartmentId[];
  assigned_workers: string[];
  source: CanonicalWorkSource;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  blocked_reason: string | null;
  authorization_state: string | null;
  progress: string;
  latest_output: string;
  artifact_refs: string[];
  evidence_refs: string[];
  parent_work_id: string | null;
  traceability_links: string[];
  requires_infinity_worker_execution: boolean;
  next_expected_transition: string | null;
  classification?: CanonicalWorkClassificationKind;
};

export type CanonicalWorkHqProjection = {
  work: CanonicalWorkExecutionContract | null;
  all_open: CanonicalWorkExecutionContract[];
  history: CanonicalWorkExecutionContract[];
  command_visible: boolean;
  operations_visible: boolean;
  assigned_rooms_visible: DepartmentId[];
  infinity_active: boolean;
  source_label: string;
};

export type CanonicalActiveWorkProjection = {
  work_id: string | null;
  venture_id: string | null;
  venture_name: string | null;
  mission_title: string | null;
  mission_type: string | null;
  stage: string | null;
  status: CanonicalWorkStatus | "IDLE";
  current_task: string | null;
  active_rooms: DepartmentId[];
  active_workers: string[];
  source: CanonicalWorkSource | "NONE";
  started_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  latest_output: string | null;
  execution_source: string;
  freshness: "CURRENT" | "IDLE" | "STALE" | "SUPERSEDED";
  canonical_version: string;
  work: CanonicalWorkExecutionContract | null;
  latest_completed_work_id: string | null;
  latest_completed_title: string | null;
  latest_completed_at: string | null;
  latest_completed_output: string | null;
};

export const PUBLIC_OPERATIONS_PROJECTION = "PublicOperationsProjection" as const;
export const PUBLIC_OPERATIONS_PROJECTION_VERSION = "public-operations-projection-v1" as const;

export const PUBLIC_DATA_CLASSIFICATIONS = [
  "PUBLIC_SAFE",
  "PUBLIC_AGGREGATED",
  "PRIVATE",
  "SENSITIVE",
  "SECRET",
  "PII",
  "FINANCIAL_PRIVATE",
  "PROVIDER_PRIVATE",
  "INTERNAL_ONLY",
] as const;
export type PublicDataClassification = (typeof PUBLIC_DATA_CLASSIFICATIONS)[number];

export const PUBLIC_ALLOWED_CLASSIFICATIONS = ["PUBLIC_SAFE", "PUBLIC_AGGREGATED"] as const;
export type PublicAllowedClassification = (typeof PUBLIC_ALLOWED_CLASSIFICATIONS)[number];

export const PUBLIC_ACTIVITY_LEVELS = [
  "ACTIVE",
  "MONITORING",
  "REVIEWING",
  "BUILDING",
  "VALIDATING",
  "RESEARCHING",
  "WAITING",
  "IDLE",
  "DEGRADED",
  "UPDATING",
] as const;
export type PublicActivityLevel = (typeof PUBLIC_ACTIVITY_LEVELS)[number];

export const PUBLIC_SYSTEM_STATUSES = [
  "OPERATIONAL",
  "DEGRADED",
  "TEMPORARILY_UNAVAILABLE",
] as const;
export type PublicSystemStatus = (typeof PUBLIC_SYSTEM_STATUSES)[number];

export const PUBLIC_AUTONOMOUS_MODES = ["ENABLED", "PAUSED", "OBSERVING"] as const;
export type PublicAutonomousMode = (typeof PUBLIC_AUTONOMOUS_MODES)[number];

export const PUBLIC_DEPARTMENT_IDS = [
  "OPERATIONS",
  "RESEARCH",
  "GROWTH",
  "VALIDATION",
  "SYSTEMS",
  "FINANCE",
  "PRODUCT",
  "CREATIVE",
] as const;
export type PublicDepartmentId = (typeof PUBLIC_DEPARTMENT_IDS)[number];

export const PUBLIC_VENTURE_VISIBILITY = [
  "HIDDEN",
  "PUBLIC_NAME_ONLY",
  "PUBLIC_SUMMARY",
  "PUBLIC_STATS",
] as const;
export type PublicVentureVisibility = (typeof PUBLIC_VENTURE_VISIBILITY)[number];

export const PUBLIC_COUNT_UNKNOWN = "UNKNOWN" as const;
export type PublicCount = number | typeof PUBLIC_COUNT_UNKNOWN;

export type PublicDepartmentProjection = {
  public_name: PublicDepartmentId;
  public_status: PublicActivityLevel;
  active_agent_count: number;
  generic_activity_label: string;
  last_activity_at: string | null;
};

export type PublicAgentProjection = {
  public_agent_id: string;
  role: string;
  department: PublicDepartmentId;
  public_status: "ACTIVE" | "IDLE";
  generic_activity: string;
  last_activity_at: string | null;
};

export type PublicVentureProjection = {
  public_name: string;
  public_url?: string;
  status_label: string;
  category?: string;
  sanitized_description?: string;
  approved_stats?: {
    live: boolean;
  };
};

export type PublicStatProjection = {
  key: string;
  label: string;
  value: PublicCount;
  unit?: string;
};

export type PublicOperationsProjection = {
  contract: typeof PUBLIC_OPERATIONS_PROJECTION;
  projection_version: typeof PUBLIC_OPERATIONS_PROJECTION_VERSION;
  generated_at: string;
  system_status: PublicSystemStatus;
  autonomous_mode: PublicAutonomousMode;
  public_activity_summary: PublicActivityLevel;
  public_activity_reason: string;
  active_public_agents: number;
  idle_public_agents: number;
  public_departments: PublicDepartmentProjection[];
  public_agents: PublicAgentProjection[];
  ventures_started_count: PublicCount;
  ventures_operating_count: PublicCount;
  public_ventures_count: PublicCount;
  missions_completed_count: PublicCount;
  autonomous_operating_hours: PublicCount;
  autonomous_operating_hours_label: string;
  deployments_completed_count: PublicCount;
  public_assets_created_count: PublicCount;
  research_cycles_completed_count: PublicCount;
  last_public_activity_at: string | null;
  public_ventures: PublicVentureProjection[];
  stats: PublicStatProjection[];
};

export type PublicProjectionFieldSpec = {
  field: keyof PublicOperationsProjection | `department.${string}` | `agent.${string}` | `venture.${string}` | `stat.${string}`;
  source_class: string;
  sanitization_rule: string;
  aggregation_rule: string;
  public_sensitivity: PublicAllowedClassification;
  fallback: string;
};

export type NamedPublicGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type InternalVentureObservation = {
  private_venture_id: string;
  private_name: string;
  venture_status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  operating_stage: string;
  public_launch_state: "YES" | "NO";
  is_operating: boolean;
  is_started: boolean;
  is_fixture: boolean;
  has_active_artifact: boolean;
};

export type InternalWorkObservation = {
  work_id: string;
  work_type: string;
  status: string;
  title: string;
  classification?: string;
  completed_at: string | null;
  started_at?: string | null;
};

export type InternalLoopObservation = {
  portfolio_state: string;
  last_outcome: string | null;
  last_reason: string | null;
  last_completed_mission_id: string | null;
  updated_at: string | null;
  autonomous_enabled_at: string | null;
};

export type InternalPublicObservation = {
  now: string;
  ventures: InternalVentureObservation[];
  work: InternalWorkObservation[];
  loop: InternalLoopObservation | null;
};

import type {
  InternalLoopObservation,
  PublicActivityLevel,
  PublicAgentProjection,
  PublicAutonomousMode,
  PublicDepartmentId,
  PublicDepartmentProjection,
  PublicSystemStatus,
} from "./types";
import { PUBLIC_DEPARTMENT_IDS } from "./types";

const PUBLIC_AGENT_ROLES: Array<{ public_agent_id: string; role: string; department: PublicDepartmentId }> = [
  { public_agent_id: "public-ops", role: "Operations", department: "OPERATIONS" },
  { public_agent_id: "public-growth", role: "Growth", department: "GROWTH" },
  { public_agent_id: "public-validation", role: "Validation", department: "VALIDATION" },
];

const DEPARTMENT_IDLE_LABEL: Record<PublicDepartmentId, string> = {
  OPERATIONS: "Monitoring ventures",
  RESEARCH: "Evaluating opportunities",
  GROWTH: "Monitoring active campaigns",
  VALIDATION: "Reviewing quality",
  SYSTEMS: "Monitoring infrastructure",
  FINANCE: "Reviewing financial infrastructure",
  PRODUCT: "Preparing product improvements",
  CREATIVE: "Waiting for new evidence",
};

export function mapLoopStateToPublicActivity(loop: InternalLoopObservation | null): PublicActivityLevel {
  if (!loop) return "IDLE";
  if (loop.portfolio_state === "DEGRADED") return "DEGRADED";
  if (loop.portfolio_state === "MISSION_ACTIVE") return "ACTIVE";
  if (loop.portfolio_state === "WAITING_FOR_EVIDENCE" || loop.portfolio_state === "WAITING_FOR_DEPENDENCY") {
    return "MONITORING";
  }
  if (loop.last_outcome === "RESEARCH_REQUIRED") return "RESEARCHING";
  if (loop.last_outcome === "REPAIR_REQUIRED") return "BUILDING";
  if (loop.last_outcome === "CONTINUE_EXISTING_ACTION") return "MONITORING";
  if (loop.portfolio_state === "IDLE_NO_ACTION" || loop.last_outcome === "NO_ACTION_JUSTIFIED") return "IDLE";
  if (loop.portfolio_state === "PAUSED") return "WAITING";
  if (loop.portfolio_state === "BLOCKED") return "DEGRADED";
  return "IDLE";
}

export function mapLoopStateToSystemStatus(loop: InternalLoopObservation | null): PublicSystemStatus {
  if (!loop) return "OPERATIONAL";
  if (loop.portfolio_state === "DEGRADED" || loop.portfolio_state === "BLOCKED") return "DEGRADED";
  return "OPERATIONAL";
}

export function mapAutonomousMode(loop: InternalLoopObservation | null): PublicAutonomousMode {
  if (!loop) return "ENABLED";
  if (loop.portfolio_state === "PAUSED" && loop.last_outcome !== "CONTINUE_EXISTING_ACTION" && loop.last_outcome !== "NO_ACTION_JUSTIFIED") {
    return "PAUSED";
  }
  if (loop.portfolio_state === "OBSERVING" || loop.portfolio_state === "BOOTSTRAPPING") return "OBSERVING";
  return "ENABLED";
}

export function mapPublicActivityReason(loop: InternalLoopObservation | null): string {
  const activity = mapLoopStateToPublicActivity(loop);
  if (activity === "DEGRADED") return "Systems experiencing a temporary operational issue";
  if (activity === "ACTIVE") return "Executing approved operating work";
  if (activity === "RESEARCHING") return "Evaluating opportunities";
  if (activity === "BUILDING") return "Building venture systems";
  if (loop?.last_outcome === "CONTINUE_EXISTING_ACTION") return "Monitoring an active growth experiment";
  if (activity === "MONITORING") return "Monitoring venture performance";
  if (activity === "WAITING") return "Waiting for new evidence";
  return "Monitoring production systems";
}

export function projectPublicDepartments(
  loop: InternalLoopObservation | null,
  now: string,
): PublicDepartmentProjection[] {
  const summary = mapLoopStateToPublicActivity(loop);
  const last = loop?.updated_at ?? null;
  return PUBLIC_DEPARTMENT_IDS.map((id) => {
    const status = departmentStatus(id, summary, loop);
    return {
      public_name: id,
      public_status: status,
      active_agent_count: status === "ACTIVE" ? 1 : 0,
      generic_activity_label: departmentLabel(id, status),
      last_activity_at: last ?? now,
    };
  });
}

function departmentStatus(
  id: PublicDepartmentId,
  summary: PublicActivityLevel,
  loop: InternalLoopObservation | null,
): PublicActivityLevel {
  if (summary === "DEGRADED") return id === "SYSTEMS" ? "DEGRADED" : "WAITING";
  if (summary === "ACTIVE") {
    if (id === "OPERATIONS" || id === "GROWTH" || id === "VALIDATION") return "ACTIVE";
    return "MONITORING";
  }
  if (summary === "MONITORING") {
    if (id === "GROWTH") return "MONITORING";
    if (id === "OPERATIONS") return "MONITORING";
    if (id === "VALIDATION") return "REVIEWING";
    return "IDLE";
  }
  if (summary === "RESEARCHING" && id === "RESEARCH") return "RESEARCHING";
  if (summary === "BUILDING" && (id === "PRODUCT" || id === "SYSTEMS")) return "BUILDING";
  if (loop?.last_outcome === "CONTINUE_EXISTING_ACTION" && id === "GROWTH") return "MONITORING";
  return "IDLE";
}

function departmentLabel(id: PublicDepartmentId, status: PublicActivityLevel): string {
  if (status === "ACTIVE" && id === "OPERATIONS") return "Monitoring ventures";
  if (status === "ACTIVE" && id === "GROWTH") return "Monitoring active campaigns";
  if (status === "ACTIVE" && id === "VALIDATION") return "Validating product changes";
  if (status === "MONITORING" && id === "GROWTH") return "Monitoring active campaigns";
  if (status === "MONITORING" && id === "OPERATIONS") return "Monitoring venture performance";
  if (status === "REVIEWING") return "Reviewing quality";
  if (status === "RESEARCHING") return "Evaluating opportunities";
  if (status === "BUILDING" && id === "PRODUCT") return "Building venture systems";
  if (status === "BUILDING") return "Building venture systems";
  if (status === "DEGRADED") return "Systems operational issue under review";
  return DEPARTMENT_IDLE_LABEL[id];
}

export function projectPublicAgents(
  loop: InternalLoopObservation | null,
  now: string,
): PublicAgentProjection[] {
  const active = mapLoopStateToPublicActivity(loop) === "ACTIVE";
  const last = loop?.updated_at ?? null;
  return PUBLIC_AGENT_ROLES.map((row) => ({
    public_agent_id: row.public_agent_id,
    role: row.role,
    department: row.department,
    public_status: active ? "ACTIVE" : "IDLE",
    generic_activity: active ? genericActiveLabel(row.department) : "Present and idle",
    last_activity_at: last ?? now,
  }));
}

function genericActiveLabel(department: PublicDepartmentId): string {
  if (department === "GROWTH") return "Monitoring active campaigns";
  if (department === "VALIDATION") return "Validating product changes";
  return "Monitoring venture performance";
}

export function countActivePublicAgents(agents: PublicAgentProjection[]): number {
  return agents.filter((row) => row.public_status === "ACTIVE").length;
}

export function countIdlePublicAgents(agents: PublicAgentProjection[]): number {
  return agents.filter((row) => row.public_status === "IDLE").length;
}

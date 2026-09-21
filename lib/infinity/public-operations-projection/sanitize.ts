import type { CanonicalOccupancyLevel, CanonicalPublicOccupancy } from "./occupancy";
import type {
  InternalLoopObservation,
  PublicActivityLevel,
  PublicAgentProjection,
  PublicAutonomousMode,
  PublicDepartmentId,
  PublicDepartmentProjection,
  PublicSalesRoomProjection,
  PublicSystemStatus,
} from "./types";
import { PUBLIC_DEPARTMENT_IDS } from "./types";

const PUBLIC_AGENT_ROLES: Array<{ public_agent_id: string; role: string; department: PublicDepartmentId }> = [
  { public_agent_id: "public-ops", role: "Operations", department: "OPERATIONS" },
  { public_agent_id: "public-ops-2", role: "Coordination", department: "OPERATIONS" },
  { public_agent_id: "public-research", role: "Research", department: "RESEARCH" },
  { public_agent_id: "public-growth", role: "Growth", department: "GROWTH" },
  { public_agent_id: "public-growth-2", role: "Acquisition", department: "GROWTH" },
  { public_agent_id: "public-validation", role: "Validation", department: "VALIDATION" },
  { public_agent_id: "public-systems", role: "Systems", department: "SYSTEMS" },
  { public_agent_id: "public-finance", role: "Finance", department: "FINANCE" },
  { public_agent_id: "public-product", role: "Product", department: "PRODUCT" },
  { public_agent_id: "public-creative", role: "Creative", department: "CREATIVE" },
  { public_agent_id: "public-prospect-scout", role: "Source Scout", department: "PROSPECT_INTELLIGENCE" },
  { public_agent_id: "public-prospect-resolver", role: "Identity Resolver", department: "PROSPECT_INTELLIGENCE" },
  { public_agent_id: "public-sales-out", role: "Outbound", department: "GROWTH" },
  { public_agent_id: "public-sales-in", role: "Inbound", department: "GROWTH" },
  { public_agent_id: "public-sales-partner", role: "Partnerships", department: "GROWTH" },
];

const DEPARTMENT_IDLE_LABEL: Record<PublicDepartmentId, string> = {
  OPERATIONS: "Coordinating active venture priorities and monitoring operating state.",
  RESEARCH: "Evaluating opportunity evidence for future ventures.",
  GROWTH: "Monitoring active campaigns",
  VALIDATION: "Reviewing quality and release readiness.",
  SYSTEMS: "Monitoring runtime and deployment infrastructure.",
  FINANCE: "Monitoring financial infrastructure and venture economics.",
  PRODUCT: "Reviewing product evidence and improvement opportunities.",
  CREATIVE: "Preparing assets when operating evidence supports new work.",
  PROSPECT_INTELLIGENCE: "Maintaining commercial entity coverage.",
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

export function occupancyToPublicActivity(level: CanonicalOccupancyLevel): PublicActivityLevel {
  return level;
}

export function projectPublicDepartments(
  loop: InternalLoopObservation | null,
  now: string,
  occupancy?: CanonicalPublicOccupancy | null,
): PublicDepartmentProjection[] {
  const summary = occupancy ? occupancyToPublicActivity(occupancy.summary) : mapLoopStateToPublicActivity(loop);
  const last = occupancy?.generated_at ?? loop?.updated_at ?? null;
  return PUBLIC_DEPARTMENT_IDS.map((id) => {
    const status = occupancy ? occupancyToPublicActivity(occupancy.departments[id]) : departmentStatus(id, summary, loop);
    return {
      public_name: id,
      public_status: status,
      active_agent_count: status === "ACTIVE" ? 1 : status === "MONITORING" ? 0 : 0,
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
    if (id === "PROSPECT_INTELLIGENCE") return "MONITORING";
    if (id === "VALIDATION") return "REVIEWING";
    return "IDLE";
  }
  if (summary === "RESEARCHING" && id === "RESEARCH") return "RESEARCHING";
  if (summary === "BUILDING" && (id === "PRODUCT" || id === "SYSTEMS")) return "BUILDING";
  if (loop?.last_outcome === "CONTINUE_EXISTING_ACTION" && id === "GROWTH") return "MONITORING";
  return "IDLE";
}

function departmentLabel(id: PublicDepartmentId, status: PublicActivityLevel): string {
  if (status === "ACTIVE" && id === "OPERATIONS") return DEPARTMENT_IDLE_LABEL.OPERATIONS;
  if (status === "ACTIVE" && id === "GROWTH") return "Monitoring active campaigns";
  if (status === "ACTIVE" && id === "VALIDATION") return DEPARTMENT_IDLE_LABEL.VALIDATION;
  if (status === "MONITORING" && id === "GROWTH") return "Monitoring active campaigns";
  if (status === "MONITORING" && id === "OPERATIONS") return DEPARTMENT_IDLE_LABEL.OPERATIONS;
  if (status === "MONITORING" && id === "PROSPECT_INTELLIGENCE") return "Refreshing market intelligence";
  if (status === "ACTIVE" && id === "PROSPECT_INTELLIGENCE") return "Updating prospect intelligence";
  if (status === "REVIEWING") return DEPARTMENT_IDLE_LABEL.VALIDATION;
  if (status === "RESEARCHING") return DEPARTMENT_IDLE_LABEL.RESEARCH;
  if (status === "BUILDING" && id === "PRODUCT") return DEPARTMENT_IDLE_LABEL.PRODUCT;
  if (status === "BUILDING") return DEPARTMENT_IDLE_LABEL.SYSTEMS;
  if (status === "DEGRADED") return "Systems operational issue under review";
  return DEPARTMENT_IDLE_LABEL[id];
}

const SALES_ROOM_COPY: PublicSalesRoomProjection[] = [
  { room_id: "OUTBOUND_ACQUISITION", public_name: "Outbound Acquisition", public_status: "MONITORING", generic_activity_label: "Monitoring qualified sales motions across active ventures." },
  { room_id: "INBOUND_CONVERSION", public_name: "Inbound Conversion", public_status: "MONITORING", generic_activity_label: "Monitoring inbound interest and conversion readiness." },
  { room_id: "EXPANSION_RETENTION", public_name: "Expansion & Retention", public_status: "PRESENT_IDLE", generic_activity_label: "Waiting for customer evidence before expansion work." },
  { room_id: "PARTNERSHIPS_CHANNEL", public_name: "Partnerships & Channel", public_status: "MONITORING", generic_activity_label: "Developing partner channels and monitoring affiliate-program activity." },
  { room_id: "OFFER_CLOSING", public_name: "Offer & Closing", public_status: "WAITING", generic_activity_label: "Preparing to take ownership when qualified intent appears." },
];

function salesOccupancyStatus(level: CanonicalOccupancyLevel): PublicSalesRoomProjection["public_status"] {
  if (level === "ACTIVE") return "ACTIVE";
  if (level === "MONITORING") return "MONITORING";
  return "PRESENT_IDLE";
}

export function projectPublicSalesRooms(
  loop: InternalLoopObservation | null,
  occupancy?: CanonicalPublicOccupancy | null,
): PublicSalesRoomProjection[] {
  if (occupancy) {
    return SALES_ROOM_COPY.map((room) => ({
      ...room,
      public_status: salesOccupancyStatus(occupancy.sales_rooms[room.room_id]),
      generic_activity_label: occupancy.sales_rooms[room.room_id] === "ACTIVE"
        ? "Executing qualified sales work across operating ventures."
        : occupancy.sales_rooms[room.room_id] === "MONITORING"
          ? room.generic_activity_label
          : "Sales operators present. No current execution.",
    }));
  }
  const summary = mapLoopStateToPublicActivity(loop);
  return SALES_ROOM_COPY.map((room) => {
    if (summary === "DEGRADED") return { ...room, public_status: "WAITING" };
    if (summary === "ACTIVE" && (room.room_id === "OUTBOUND_ACQUISITION" || room.room_id === "INBOUND_CONVERSION" || room.room_id === "PARTNERSHIPS_CHANNEL")) {
      return { ...room, public_status: "MONITORING" };
    }
    if (summary === "MONITORING" && (room.room_id === "OUTBOUND_ACQUISITION" || room.room_id === "INBOUND_CONVERSION" || room.room_id === "PARTNERSHIPS_CHANNEL")) {
      return { ...room, public_status: "MONITORING" };
    }
    return { ...room, public_status: "PRESENT_IDLE", generic_activity_label: "Sales operators present. No current execution." };
  });
}

export function projectPublicAgents(
  loop: InternalLoopObservation | null,
  now: string,
  occupancy?: CanonicalPublicOccupancy | null,
): PublicAgentProjection[] {
  const last = occupancy?.generated_at ?? loop?.updated_at ?? null;
  if (occupancy) {
    return PUBLIC_AGENT_ROLES.map((row) => {
      const status = occupancy.agents[row.public_agent_id] ?? occupancy.departments[row.department];
      return {
        public_agent_id: row.public_agent_id,
        role: row.role,
        department: row.department,
        public_status: status,
        generic_activity: status === "ACTIVE"
          ? genericActiveLabel(row.department)
          : status === "MONITORING"
            ? "Watching assigned operating work"
            : "Present and idle",
        last_activity_at: last ?? now,
      };
    });
  }
  const active = mapLoopStateToPublicActivity(loop) === "ACTIVE";
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
  if (department === "PROSPECT_INTELLIGENCE") return "Updating prospect intelligence";
  return "Monitoring venture performance";
}

export function countActivePublicAgents(agents: PublicAgentProjection[]): number {
  return agents.filter((row) => row.public_status === "ACTIVE").length;
}

export function countIdlePublicAgents(agents: PublicAgentProjection[]): number {
  return agents.filter((row) => row.public_status === "IDLE").length;
}

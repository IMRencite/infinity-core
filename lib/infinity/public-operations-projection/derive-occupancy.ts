import {
  agentsFromDepartments,
  emptyCanonicalOccupancy,
  maxOccupancy,
  occupancySummary,
  type CanonicalOccupancyLevel,
  type CanonicalPublicOccupancy,
} from "./occupancy";
import { PUBLIC_DEPARTMENT_IDS, PUBLIC_SALES_ROOM_IDS, type InternalLoopObservation, type PublicDepartmentId } from "./types";

const HQ_ROOM_TO_PUBLIC: Record<string, PublicDepartmentId> = {
  executive_office: "OPERATIONS",
  operations: "OPERATIONS",
  company_operations: "OPERATIONS",
  launch_operations: "OPERATIONS",
  research_department: "RESEARCH",
  intelligence_center: "RESEARCH",
  opportunity_lab: "RESEARCH",
  growth_department: "GROWTH",
  quality_control: "VALIDATION",
  systems_architect: "SYSTEMS",
  strategy_finance: "FINANCE",
  product_lab: "PRODUCT",
  creative_studio: "CREATIVE",
  prospect_intelligence: "PROSPECT_INTELLIGENCE",
};

export function hqStatusToOccupancy(status: string | null | undefined): CanonicalOccupancyLevel {
  if (status === "ACTIVE_WORK" || status === "ACTIVE") return "ACTIVE";
  if (
    status === "WAITING_INTERNAL" ||
    status === "WAITING_EXTERNAL" ||
    status === "QUEUED" ||
    status === "MONITORING" ||
    status === "WAITING" ||
    status === "READY_BLOCKED"
  ) {
    return "MONITORING";
  }
  return "IDLE";
}

export function salesSnapshotToOccupancy(snapshot: {
  attempted?: number;
  send_attempted?: number;
  qualified_prospects?: number;
  replies?: number;
  real_outreach_eligible?: boolean;
  training_active?: boolean;
}): { status: "ACTIVE" | "MONITORING" | "IDLE"; sending: boolean } {
  const sending = (snapshot.attempted ?? 0) > 0 || (snapshot.send_attempted ?? 0) > 0;
  if (sending) return { status: "ACTIVE", sending: true };
  if (snapshot.training_active) return { status: "ACTIVE", sending: false };
  if ((snapshot.qualified_prospects ?? 0) > 0 || (snapshot.replies ?? 0) > 0 || snapshot.real_outreach_eligible) {
    return { status: "MONITORING", sending: false };
  }
  return { status: "IDLE", sending: false };
}

export function loopToOccupancy(loop: InternalLoopObservation | null): CanonicalOccupancyLevel {
  if (!loop) return "IDLE";
  if (loop.portfolio_state === "MISSION_ACTIVE") return "ACTIVE";
  if (
    loop.portfolio_state === "WAITING_FOR_EVIDENCE" ||
    loop.portfolio_state === "WAITING_FOR_DEPENDENCY" ||
    loop.last_outcome === "CONTINUE_EXISTING_ACTION" ||
    loop.last_outcome === "RESEARCH_REQUIRED" ||
    loop.last_outcome === "REPAIR_REQUIRED"
  ) {
    return "MONITORING";
  }
  return "IDLE";
}

export function deriveCanonicalPublicOccupancy(input: {
  now: string;
  loop?: InternalLoopObservation | null;
  hqRooms?: Record<string, string | null | undefined>;
  prospect?: { activity: CanonicalOccupancyLevel };
  sales?: { status: "ACTIVE" | "MONITORING" | "PRESENT_IDLE" | "WAITING" | "BLOCKED" | "DEGRADED" | "IDLE"; sending?: boolean };
  organic?: { occupancy: CanonicalOccupancyLevel };
}): CanonicalPublicOccupancy {
  const base = emptyCanonicalOccupancy(input.now, "IDLE");
  const loopLevel = loopToOccupancy(input.loop ?? null);

  for (const id of PUBLIC_DEPARTMENT_IDS) {
    base.departments[id] = loopLevel === "ACTIVE" && (id === "OPERATIONS" || id === "GROWTH" || id === "VALIDATION")
      ? "ACTIVE"
      : loopLevel === "MONITORING" && (id === "OPERATIONS" || id === "GROWTH" || id === "VALIDATION" || id === "PROSPECT_INTELLIGENCE")
        ? "MONITORING"
        : loopLevel === "ACTIVE"
          ? "MONITORING"
          : "IDLE";
  }

  if (input.hqRooms) {
    for (const [room, status] of Object.entries(input.hqRooms)) {
      const publicId = HQ_ROOM_TO_PUBLIC[room];
      if (!publicId) continue;
      base.departments[publicId] = maxOccupancy(base.departments[publicId], hqStatusToOccupancy(status));
    }
  }

  if (input.prospect) {
    base.departments.PROSPECT_INTELLIGENCE = input.prospect.activity;
  }

  if (input.organic) {
    base.departments.GROWTH = maxOccupancy(base.departments.GROWTH, input.organic.occupancy);
  }

  const salesLevel: CanonicalOccupancyLevel = input.sales?.status === "ACTIVE" || input.sales?.sending
    ? "ACTIVE"
    : input.sales?.status === "MONITORING"
      ? "MONITORING"
      : input.hqRooms?.sales_floor
        ? hqStatusToOccupancy(input.hqRooms.sales_floor)
        : loopLevel === "ACTIVE"
          ? "MONITORING"
          : loopLevel;
  if (input.sales || input.hqRooms?.sales_floor) {
    base.departments.GROWTH = maxOccupancy(base.departments.GROWTH, salesLevel);
    for (const room of PUBLIC_SALES_ROOM_IDS) {
      if (room === "OUTBOUND_ACQUISITION" || room === "INBOUND_CONVERSION") {
        base.sales_rooms[room] = salesLevel;
      } else if (room === "EXPANSION_RETENTION") {
        base.sales_rooms[room] = salesLevel === "ACTIVE" ? "MONITORING" : salesLevel === "MONITORING" ? "IDLE" : "IDLE";
      } else {
        base.sales_rooms[room] = salesLevel === "ACTIVE" ? "MONITORING" : salesLevel;
      }
    }
  }

  base.agents = agentsFromDepartments(base.departments);
  if (input.organic) {
    base.agents["public-growth"] = input.organic.occupancy;
    base.agents["public-growth-2"] = input.organic.occupancy === "ACTIVE" ? "MONITORING" : input.organic.occupancy;
  }
  if (salesLevel === "ACTIVE") {
    base.agents["public-sales-out"] = "ACTIVE";
    base.agents["public-sales-in"] = "MONITORING";
  } else if (salesLevel === "MONITORING") {
    base.agents["public-sales-out"] = "MONITORING";
    base.agents["public-sales-in"] = "MONITORING";
  }
  base.summary = occupancySummary(base);
  base.generated_at = input.now;
  return base;
}

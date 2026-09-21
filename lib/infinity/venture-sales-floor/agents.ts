import type { DepartmentUiState, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { SALES_FLOOR_DEPARTMENT_ID, SALES_ROOMS, type SalesRoomId, type SalesRoomState } from "./contract";
import type { SalesRoomProjection } from "./types";

export const SALES_ROOM_ASSIGNED_ROLES: Record<SalesRoomId, readonly string[]> = {
  OUTBOUND_ACQUISITION: ["Prospect Research", "Qualification", "Outreach", "Follow-Up"],
  INBOUND_CONVERSION: ["Inbound Lead", "Trial Conversion", "Intent Analysis"],
  EXPANSION_RETENTION: ["Retention", "Expansion", "Reactivation"],
  PARTNERSHIPS_CHANNEL: ["Partner Discovery", "Affiliate Recruitment", "Affiliate Operations", "Channel Development"],
  OFFER_CLOSING: ["Closing", "Objection", "Proposal", "Deal Progression"],
};

export type SalesRoomAgent = OperatorWorkerNode & {
  salesRoomId: SalesRoomId;
  presenceState: SalesRoomState;
};

export function salesRoomStateToWorkerStatus(state: SalesRoomState): DepartmentUiState {
  if (state === "ACTIVE") return "RUNNING";
  if (state === "BLOCKED") return "BLOCKED";
  if (state === "DEGRADED") return "FAILED";
  if (state === "WAITING" || state === "MONITORING") return "WAITING";
  return "WAITING";
}

export function buildSalesRoomAgents(rooms: SalesRoomProjection[]): SalesRoomAgent[] {
  return rooms.flatMap((room) =>
    SALES_ROOM_ASSIGNED_ROLES[room.room].map((role) => {
      const executing = room.state === "ACTIVE";
      const status = salesRoomStateToWorkerStatus(room.state);
      return {
        nodeId: `${SALES_FLOOR_DEPARTMENT_ID}:${room.room}:${role.toLowerCase().replace(/\s+/g, "-")}`,
        departmentId: SALES_FLOOR_DEPARTMENT_ID,
        salesRoomId: room.room,
        role,
        displayRole: role,
        status,
        task: executing ? room.contribution : null,
        displayTask: executing ? room.contribution : null,
        provider: null,
        model: null,
        isActive: executing,
        isDormant: !executing,
        motionActive: executing,
        presenceState: room.state,
      };
    }),
  );
}

export function agentsForSalesRoom(agents: SalesRoomAgent[], room: SalesRoomId): SalesRoomAgent[] {
  return agents.filter((agent) => agent.salesRoomId === room);
}

export function allSalesRoomsHaveVisibleAgents(agents: SalesRoomAgent[]): boolean {
  return SALES_ROOMS.every((room) => agentsForSalesRoom(agents, room).length > 0);
}

export function idleAgentsRemainVisible(agents: SalesRoomAgent[]): boolean {
  return agents.every((agent) => agent.isDormant || agent.isActive) && agents.length > 0;
}

import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";

/**
 * Canonical assigned team for each first-class HQ room.
 * Presence is capability, not current execution.
 * Future first-class rooms inherit orb visibility by registering roles here.
 */
export const HQ_FIRST_CLASS_ROOM_ASSIGNED_ROLES: Partial<Record<DepartmentId, readonly string[]>> = {
  opportunity_lab: ["Scanner"],
  research_department: ["Research", "Synthesis"],
  strategy_finance: ["Economics"],
  company_operations: ["Blueprint"],
  systems_architect: ["Architect"],
  growth_department: ["Planning"],
  creative_studio: ["Generator", "Quality"],
  product_lab: ["Implementer", "Reviewer"],
  quality_control: ["Inspection"],
  launch_operations: ["Dispatch"],
  intelligence_center: ["Analysis"],
  executive_office: ["Decision"],
  operations: [
    "Venture Operator",
    "Portfolio Operator",
    "Performance Observer",
    "Payment Monitor",
    "Fulfillment Monitor",
    "Growth Operator",
    "Outreach Operator",
    "Venture QC Monitor",
    "Recovery Operator",
  ],
};

export function assignedWorkerRolesForRoom(roomId: DepartmentId): string[] {
  return [...(HQ_FIRST_CLASS_ROOM_ASSIGNED_ROLES[roomId] ?? [])];
}

export function assignedWorkerCountForRoom(roomId: DepartmentId): number {
  return assignedWorkerRolesForRoom(roomId).length;
}

export function firstClassRoomWorkerSource(roomId: DepartmentId): string {
  if (roomId === OPERATIONS_ROOM_ID) return "projectOperationsRoom.workers";
  const roles = assignedWorkerRolesForRoom(roomId);
  return roles.length > 0 ? `buildWorkerNodes:${roles.join(",")}` : "buildWorkerNodes";
}

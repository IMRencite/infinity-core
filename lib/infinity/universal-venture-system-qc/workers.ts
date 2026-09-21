import { assignedWorkerRolesForRoom } from "@/lib/infinity/hq-room-workers/assigned-roles";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";

export const CANONICAL_ROOM_WORKER_INVENTORY_CONTRACT = "CanonicalRoomWorkerInventoryContract" as const;

export function canonicalAssignedWorkers(roomId: DepartmentId = OPERATIONS_ROOM_ID): string[] {
  return assignedWorkerRolesForRoom(roomId);
}

export function evaluateCanonicalRoomWorkerInventory(input: {
  room_id?: DepartmentId;
  projected: readonly string[];
}): {
  contract: typeof CANONICAL_ROOM_WORKER_INVENTORY_CONTRACT;
  result: "PASS" | "FAIL";
  reasons: string[];
  expected: string[];
  derived_from_registration: true;
} {
  const expected = canonicalAssignedWorkers(input.room_id ?? OPERATIONS_ROOM_ID);
  const reasons: string[] = [];
  for (const role of expected) {
    if (!input.projected.includes(role)) reasons.push(`MISSING_REGISTERED_WORKER:${role}`);
  }
  for (const role of input.projected) {
    if (!expected.includes(role)) reasons.push(`UNREGISTERED_WORKER:${role}`);
  }
  const dupes = input.projected.filter((role, index) => input.projected.indexOf(role) !== index);
  for (const role of new Set(dupes)) reasons.push(`DUPLICATE_WORKER:${role}`);
  return {
    contract: CANONICAL_ROOM_WORKER_INVENTORY_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    expected,
    derived_from_registration: true,
  };
}

export function ventureQcMonitorRegistered(): boolean {
  return canonicalAssignedWorkers().includes("Venture QC Monitor");
}

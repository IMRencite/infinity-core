import { HQ_OPERATIONS_ROUTE, HQ_RUNTIME_ROUTE } from "@/lib/infinity/hq-information-architecture/contract";
import { ALL_HQ_ROOM_IDS, OPERATIONS_ROOM_ID, getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import { humanizeDepartmentHeadline } from "@/lib/infinity/operator-console/humanize";
import type { DepartmentUiState } from "@/lib/infinity/operator-console/types";
import {
  HQ_FIRST_CLASS_ROOM_CONTRACT,
  HQ_FIRST_CLASS_ROOM_REGISTRATION_GATE,
  HQ_ROOM_ACTIVITY_CONSISTENCY_GATE,
  HQ_ROOM_PARITY_CONTRACT,
  HQ_ROOM_SNAPSHOT_ENRICHMENT_GATE,
  HQ_ROOM_WORKER_PRESENCE_GATE,
  missingFirstClassRoomFields,
  type NamedGateResult,
} from "./contract";
import { DEPARTMENT_HEADLINES } from "./headlines";
import { HQ_FIRST_CLASS_ROOMS, firstClassRoom } from "./registry";

const ENRICHMENT_STATES: DepartmentUiState[] = [
  "RUNNING",
  "WAITING",
  "COMPLETE",
  "BLOCKED",
  "FAILED",
  "NOT_STARTED",
];

export function evaluateHQFirstClassRoomContract(): NamedGateResult {
  const reasons: string[] = [];
  if (HQ_FIRST_CLASS_ROOMS.length !== ALL_HQ_ROOM_IDS.length) {
    reasons.push("REGISTERED_ROOM_COUNT_MISMATCH");
  }
  for (const id of ALL_HQ_ROOM_IDS) {
    const room = HQ_FIRST_CLASS_ROOMS.find((row) => row.id === id);
    if (!room) {
      reasons.push(`UNREGISTERED:${id}`);
      continue;
    }
    const missing = missingFirstClassRoomFields(room);
    if (missing.length > 0) reasons.push(`INCOMPLETE:${id}:${missing.join(",")}`);
    if (!DEPARTMENT_HEADLINES[id]) reasons.push(`HEADLINE_SOURCE_MISSING:${id}`);
  }
  return {
    gate: HQ_FIRST_CLASS_ROOM_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQFirstClassRoomRegistrationGate(): NamedGateResult {
  const reasons: string[] = [];
  const contract = evaluateHQFirstClassRoomContract();
  reasons.push(...contract.reasons);
  const operations = HQ_FIRST_CLASS_ROOMS.find((row) => row.id === OPERATIONS_ROOM_ID);
  if (!operations) reasons.push("OPERATIONS_UNREGISTERED");
  else {
    if (!operations.headline.trim()) reasons.push("OPERATIONS_HEADLINE_MISSING");
    if (!operations.purpose.trim()) reasons.push("OPERATIONS_PURPOSE_MISSING");
    if (!operations.workerSource.trim()) reasons.push("OPERATIONS_WORKER_SOURCE_MISSING");
    if (!operations.outputHistorySource.trim()) reasons.push("OPERATIONS_OUTPUT_SOURCE_MISSING");
    if (operations.route !== HQ_OPERATIONS_ROUTE) reasons.push("OPERATIONS_ROUTE_INVALID");
  }
  for (const room of HQ_FIRST_CLASS_ROOMS) {
    if (!room.headline) reasons.push(`HEADLINE_MISSING:${room.id}`);
    if (!room.purpose) reasons.push(`PURPOSE_MISSING:${room.id}`);
    if (!room.route) reasons.push(`ROUTE_MISSING:${room.id}`);
    if (!room.workerSource) reasons.push(`WORKER_SOURCE_MISSING:${room.id}`);
    if (!room.outputHistorySource) reasons.push(`OUTPUT_SOURCE_MISSING:${room.id}`);
    if (!room.statusResolver) reasons.push(`STATUS_MAPPING_MISSING:${room.id}`);
  }
  return {
    gate: HQ_FIRST_CLASS_ROOM_REGISTRATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomSnapshotEnrichmentGate(): NamedGateResult {
  const reasons: string[] = [];
  let unhandledCrashes = 0;
  for (const room of HQ_FIRST_CLASS_ROOMS) {
    for (const state of ENRICHMENT_STATES) {
      try {
        const headline = humanizeDepartmentHeadline(room.id, state);
        if (typeof headline !== "string" || headline.trim().length === 0) {
          reasons.push(`EMPTY_HEADLINE:${room.id}:${state}`);
        }
      } catch {
        unhandledCrashes += 1;
        reasons.push(`ENRICHMENT_CRASH:${room.id}:${state}`);
      }
    }
    const names = getRoomDisplayNames(room.id);
    if (!names.displayName || !names.shortDescription) {
      reasons.push(`DISPLAY_METADATA_MISSING:${room.id}`);
    }
    if (!room.workerSource || !room.outputHistorySource) {
      reasons.push(`MALFORMED_PROJECTION:${room.id}`);
    }
  }
  if (unhandledCrashes > 0) reasons.push(`UNHANDLED_METADATA_CRASH:${unhandledCrashes}`);
  return {
    gate: HQ_ROOM_SNAPSHOT_ENRICHMENT_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomParityContract(): NamedGateResult {
  const reasons: string[] = [];
  const operations = firstClassRoom(OPERATIONS_ROOM_ID);
  if (operations.route === HQ_RUNTIME_ROUTE) reasons.push("OPERATIONS_COLLAPSED_INTO_RUNTIME");
  if (operations.floorPosition !== "operating-floor-first" || operations.floorOrder !== 1) {
    reasons.push("OPERATIONS_FLOOR_POSITION_INVALID");
  }
  if (!ALL_HQ_ROOM_IDS.includes(OPERATIONS_ROOM_ID)) reasons.push("OPERATIONS_NOT_FIRST_CLASS");
  if (operations.name !== "Operations Room") reasons.push("OPERATIONS_NAME_INVALID");
  return {
    gate: HQ_ROOM_PARITY_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomWorkerPresenceGate(): NamedGateResult {
  const reasons: string[] = [];
  for (const room of HQ_FIRST_CLASS_ROOMS) {
    if (!room.workerSource.trim()) reasons.push(`WORKER_SOURCE_MISSING:${room.id}`);
  }
  if (!firstClassRoom(OPERATIONS_ROOM_ID).workerSource.includes("projectOperationsRoom")) {
    reasons.push("OPERATIONS_WORKER_SOURCE_NOT_CANONICAL");
  }
  return {
    gate: HQ_ROOM_WORKER_PRESENCE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomActivityConsistencyGate(): NamedGateResult {
  const reasons: string[] = [];
  for (const room of HQ_FIRST_CLASS_ROOMS) {
    if (!room.currentWorkResolver.trim()) reasons.push(`CURRENT_WORK_RESOLVER_MISSING:${room.id}`);
    if (!room.outputHistorySource.trim()) reasons.push(`OUTPUT_HISTORY_MISSING:${room.id}`);
    if (!room.statusResolver.trim()) reasons.push(`STATUS_RESOLVER_MISSING:${room.id}`);
  }
  return {
    gate: HQ_ROOM_ACTIVITY_CONSISTENCY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

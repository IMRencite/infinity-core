import {
  isGenericImplementationText,
  isUnavailableTaskDetail,
  workTheme,
  type AgentCurrentTaskProjection,
  type RoomCurrentWorkProjection,
} from "./resolver";
import type { CanonicalWorkExecutionContract } from "@/lib/infinity/canonical-work/types";

export function evaluateRoomCurrentWorkProjectionGate(rows: RoomCurrentWorkProjection[]): {
  gate: "RoomCurrentWorkProjectionGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const row of rows) {
    if (!row.mission_id || !row.room_id || !row.contribution_summary) reasons.push(`MISSING_FIELDS:${row.room_id}`);
    if (!row.source || !row.last_activity_at) reasons.push(`MISSING_PROVENANCE:${row.room_id}`);
  }
  return { gate: "RoomCurrentWorkProjectionGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["ROOM_WORK_PROJECTED"] };
}

export function evaluateAgentCurrentTaskProjectionGate(rows: AgentCurrentTaskProjection[]): {
  gate: "AgentCurrentTaskProjectionGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const row of rows) {
    if (!row.agent_id || !row.task_summary || !row.mission_id) reasons.push(`MISSING_FIELDS:${row.agent_id}`);
  }
  return { gate: "AgentCurrentTaskProjectionGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["AGENT_TASKS_PROJECTED"] };
}

export function evaluateRoomWorkSpecificityGate(input: {
  mission: string;
  rooms: Array<{ room: string; contribution: string }>;
}): { gate: "RoomWorkSpecificityGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  const active = input.rooms.filter((row) => row.contribution);
  const generic = active.filter((row) => isGenericImplementationText(row.contribution));
  if (generic.length > 1) reasons.push("MULTIPLE_ROOMS_GENERIC_IMPLEMENTATION");
  const unique = new Set(active.map((row) => row.contribution.trim().toLowerCase()));
  if (active.length > 1 && unique.size === 1 && active[0] && isGenericImplementationText(active[0].contribution)) {
    reasons.push("IDENTICAL_GENERIC_ROOM_TEXT");
  }
  const repeatsMission = active.filter((row) => row.contribution.trim() === input.mission.trim());
  if (repeatsMission.length > 1) reasons.push("ROOMS_REPEAT_MISSION_TITLE");
  return { gate: "RoomWorkSpecificityGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["ROOM_CONTRIBUTIONS_DISTINCT"] };
}

export function evaluateAgentTaskLineageGate(input: {
  work: CanonicalWorkExecutionContract | null;
  displayed: string | null | undefined;
}): { gate: "AgentTaskLineageGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  if (!input.work) {
    return {
      gate: "AgentTaskLineageGate",
      result: isUnavailableTaskDetail(input.displayed) ? "PASS" : "PASS",
      reasons: ["NO_ACTIVE_WORK"],
    };
  }
  const theme = workTheme(input.work);
  const description = input.work.description?.trim() ?? "";
  const lineageExists =
    Boolean(theme && !isGenericImplementationText(theme)) ||
    Boolean(description && !isGenericImplementationText(description) && !isUnavailableTaskDetail(description));
  if (lineageExists && isUnavailableTaskDetail(input.displayed)) {
    return { gate: "AgentTaskLineageGate", result: "FAIL", reasons: ["LINEAGE_EXISTS_UI_UNAVAILABLE"] };
  }
  return { gate: "AgentTaskLineageGate", result: "PASS", reasons: lineageExists ? ["LINEAGE_RENDERED"] : ["NO_LINEAGE_UNAVAILABLE_ALLOWED"] };
}

export function evaluateAgentTaskSpecificityGate(rows: Array<{ task: string }>): {
  gate: "AgentTaskSpecificityGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const generic = rows.filter((row) => isGenericImplementationText(row.task));
  if (generic.length > 0) reasons.push("GENERIC_IMPLEMENTATION_TEXT");
  return { gate: "AgentTaskSpecificityGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["AGENT_TASKS_SPECIFIC"] };
}

export function evaluateRoomInformationGainGate(input: {
  mission: string;
  rooms: Array<{ contribution: string }>;
}): { gate: "RoomInformationGainGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  for (const row of input.rooms) {
    if (!row.contribution || row.contribution.trim() === input.mission.trim()) {
      reasons.push("ROOM_DOES_NOT_ADD_INFORMATION");
    }
  }
  return { gate: "RoomInformationGainGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["ROOMS_MORE_SPECIFIC_THAN_COMMAND"] };
}

export function evaluateRoomMissionConsistencyGate(input: {
  missionId: string | null;
  rooms: Array<{ mission_id: string }>;
}): { gate: "RoomMissionConsistencyGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.missionId) return { gate: "RoomMissionConsistencyGate", result: "PASS", reasons: ["NO_ACTIVE_MISSION"] };
  for (const row of input.rooms) {
    if (row.mission_id !== input.missionId) reasons.push("ROOM_MISSION_MISMATCH");
  }
  return { gate: "RoomMissionConsistencyGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["ROOMS_MATCH_MISSION"] };
}

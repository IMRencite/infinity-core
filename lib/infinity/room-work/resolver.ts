import { ACTIVITY_ROOM_LABELS, type HqActivityRoomId } from "@/lib/infinity/mission-activity/constants";
import { OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";
import type { CanonicalWorkExecutionContract } from "@/lib/infinity/canonical-work/types";

export const ROOM_CURRENT_WORK_PROJECTION = "RoomCurrentWorkProjection" as const;
export const AGENT_CURRENT_TASK_PROJECTION = "AgentCurrentTaskProjection" as const;
export const ROOM_MISSION_CONTRIBUTION_RESOLVER = "RoomMissionContributionResolver" as const;

const GENERIC_WORK_TEXT =
  /^(implementation in progress|working on (the )?current mission|working on current mission\.?)$/i;
export const TASK_DETAIL_UNAVAILABLE = "TASK DETAIL UNAVAILABLE" as const;

export type RoomCurrentWorkProjection = {
  contract: typeof ROOM_CURRENT_WORK_PROJECTION;
  mission_id: string;
  room_id: string;
  room_name: string;
  room_role: string;
  contribution_summary: string;
  current_step: string;
  execution_state: "ACTIVE" | "PRESENT_IDLE" | "WAITING" | "BLOCKED";
  assigned_agents: string[];
  source: "explicit_package" | "assigned_task" | "artifact_qc" | "mission_phase_role" | "unavailable";
  started_at: string;
  last_activity_at: string;
};

export type AgentCurrentTaskProjection = {
  contract: typeof AGENT_CURRENT_TASK_PROJECTION;
  agent_id: string;
  agent_name: string;
  room_id: string;
  mission_id: string;
  task_summary: string;
  task_type: string;
  execution_state: "ACTIVE" | "PRESENT_IDLE" | "WAITING" | "BLOCKED";
  source: "explicit_package" | "assigned_task" | "artifact_qc" | "mission_phase_role" | "unavailable";
  started_at: string;
  last_activity_at: string;
};

export function isGenericImplementationText(value: string | null | undefined): boolean {
  if (!value) return true;
  return GENERIC_WORK_TEXT.test(value.trim());
}

export function isUnavailableTaskDetail(value: string | null | undefined): boolean {
  return !value || /^TASK DETAIL UNAVAILABLE$/i.test(value.trim());
}

export function workTheme(work: Pick<CanonicalWorkExecutionContract, "title" | "description" | "stage">): string {
  const title = work.title.replace(/^INFINITY\s*[—-]\s*/i, "").trim();
  return title || work.stage || "the current mission";
}

function roomName(roomId: string): string {
  if (roomId === OPERATIONS_ROOM_ID || roomId === "operations") return "Operations Room";
  return ACTIVITY_ROOM_LABELS[roomId as HqActivityRoomId] ?? roomId;
}

function roomRole(roomId: string): string {
  if (roomId === OPERATIONS_ROOM_ID || roomId === "operations") {
    return "Coordinate operational verification of live projections and affected venture state.";
  }
  if (roomId === "systems_architect") {
    return "Repair canonical capability source, scope, and freshness contracts.";
  }
  if (roomId === "quality_control") {
    return "Run data/state, rendered, responsive, and final-browser QC.";
  }
  if (roomId === "launch_operations") {
    return "Verify hosting, DNS, registrar, and deployment capability projections.";
  }
  if (roomId === "strategy_finance") {
    return "Verify shared payment processor state and venture activation consistency.";
  }
  if (roomId === "intelligence_center") {
    return "Verify performance-learning freshness and latest-learning projections.";
  }
  if (roomId === "product_lab") {
    return "Implement the coding changes required by the current mission.";
  }
  if (roomId === "executive_office") return "Own the broad HQ mission.";
  return `Contribute the ${roomName(roomId)} department role to the current mission.`;
}

function punctuate(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function shortTheme(theme: string): string {
  return theme.replace(/^INFINITY\s*[—-]\s*/i, "").trim();
}

function roomExactContribution(roomId: string, theme: string, step: string | null): string {
  const role = contributionFromRole(roomId, theme);
  if (!step || isGenericImplementationText(step) || isUnavailableTaskDetail(step)) return role;
  const action = step.replace(/[.]+$/, "");
  const themeLabel = shortTheme(theme);
  const needsTheme =
    Boolean(themeLabel) &&
    !action.toLowerCase().includes(themeLabel.slice(0, Math.min(24, themeLabel.length)).toLowerCase());
  const withTheme = (sentence: string) =>
    needsTheme ? `${sentence.replace(/[.]+$/, "")} for ${themeLabel}.` : punctuate(sentence);

  if (roomId === "product_lab" || roomId === "creative_studio") return withTheme(action);
  if (roomId === "quality_control") return withTheme(`Checking that this is done correctly: ${action}`);
  if (roomId === "launch_operations") return withTheme(`Preparing to ship: ${action}`);
  if (roomId === OPERATIONS_ROOM_ID || roomId === "operations") {
    return withTheme(`Reporting live progress: ${action}`);
  }
  if (roomId === "executive_office") return withTheme(`Directing: ${action}`);
  if (roomId === "systems_architect") return withTheme(`Fitting this into the system: ${action}`);
  return `${role.replace(/[.]+$/, "")}: ${action}.`;
}

function contributionFromRole(roomId: string, theme: string): string {
  if (roomId === "executive_office") return theme;
  if (roomId === OPERATIONS_ROOM_ID || roomId === "operations") {
    if (/spend authority/i.test(theme)) {
      return `Confirm live Treasury projection of OccupancyNPV allocation vs spend authority during ${theme}.`;
    }
    return `Coordinate operational verification of live HQ capability projections and affected venture state during ${theme}.`;
  }
  if (roomId === "systems_architect") {
    if (/spend authority/i.test(theme)) {
      return `Author VentureSpendAuthority, commitment, and EconomicActionGate contracts for ${theme}.`;
    }
    return `Repair canonical capability source, scope, and freshness contracts for ${theme}.`;
  }
  if (roomId === "quality_control") {
    if (/spend authority/i.test(theme)) {
      return `Verify spend-authority gates, Treasury/HQ consistency, and no-money-movement QC for ${theme}.`;
    }
    return `Run data/state, rendered, responsive, and final-browser QC for ${theme}.`;
  }
  if (roomId === "launch_operations") {
    return `Verify hosting, DNS, and deployment capability projections for ${theme}.`;
  }
  if (roomId === "strategy_finance") {
    if (/spend authority/i.test(theme)) {
      return `Keep OccupancyNPV $25 allocation separate from the $5 spend ceiling and $0 paid acquisition during ${theme}.`;
    }
    return `Verify shared payment processor state and venture activation consistency for ${theme}.`;
  }
  if (roomId === "intelligence_center") {
    return `Verify performance-learning and latest-learning projections for ${theme}.`;
  }
  if (roomId === "product_lab") {
    return `Implement the current coding and product changes required by ${theme}.`;
  }
  return `${roomRole(roomId)} Current mission: ${theme}.`;
}

function specificStep(work: CanonicalWorkExecutionContract): string | null {
  const description = (work.description ?? "").trim().replace(/^Continue\s+/i, "");
  if (!description || isGenericImplementationText(description) || isUnavailableTaskDetail(description)) return null;
  return description;
}

export function resolveRoomCurrentWork(
  work: CanonicalWorkExecutionContract,
  roomId: string,
): RoomCurrentWorkProjection {
  const theme = workTheme(work);
  const step = specificStep(work);
  const source = step && !isGenericImplementationText(work.description)
    ? "assigned_task"
    : "mission_phase_role";
  const contribution = roomExactContribution(roomId, theme, step);
  return {
    contract: ROOM_CURRENT_WORK_PROJECTION,
    mission_id: work.mission_id,
    room_id: roomId,
    room_name: roomName(roomId),
    room_role: roomRole(roomId),
    contribution_summary: contribution,
    current_step: step ?? contribution,
    execution_state: work.status === "ACTIVE" ? "ACTIVE" : work.status === "BLOCKED" ? "BLOCKED" : "WAITING",
    assigned_agents: work.assigned_workers,
    source,
    started_at: work.started_at,
    last_activity_at: work.updated_at,
  };
}

export function resolveAgentCurrentTask(input: {
  work: CanonicalWorkExecutionContract;
  roomId: string;
  agentName: string;
  agentId: string;
}): AgentCurrentTaskProjection {
  const room = resolveRoomCurrentWork(input.work, input.roomId);
  const step = specificStep(input.work);
  const roleTask = room.room_role.replace(/\.$/, "");
  const theme = workTheme(input.work);
  const lineageTask = step
    ? step
    : !isGenericImplementationText(theme) && theme
      ? `${roleTask} · ${theme}`
      : roleTask;
  return {
    contract: AGENT_CURRENT_TASK_PROJECTION,
    agent_id: input.agentId,
    agent_name: input.agentName,
    room_id: input.roomId,
    mission_id: input.work.mission_id,
    task_summary: lineageTask || TASK_DETAIL_UNAVAILABLE,
    task_type: input.work.work_type,
    execution_state: room.execution_state,
    source: room.source,
    started_at: input.work.started_at,
    last_activity_at: input.work.updated_at,
  };
}

export function commandMissionSummary(work: CanonicalWorkExecutionContract): string {
  const step = specificStep(work);
  if (step) return punctuate(step);
  const theme = workTheme(work);
  if (theme && !isGenericImplementationText(theme)) return punctuate(theme);
  return punctuate(work.title.replace(/^INFINITY\s*[—-]\s*/i, "").trim() || "Coordinating the current implementation");
}

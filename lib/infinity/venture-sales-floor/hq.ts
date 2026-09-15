import type { DepartmentUiState, OperatorDepartmentSnapshot } from "@/lib/infinity/operator-console/types";
import { SALES_FLOOR_DEPARTMENT_ID, SALES_ROOM_LABELS } from "./contract";
import { projectSalesIntelligence } from "./intelligence";
import { resolveSalesMotion } from "./motion";
import { occupancyNpvSalesEvidence } from "./occupancy";
import { highestPriorityRoom, provisionSalesRooms } from "./rooms";
import type { SalesFloorEvidence, SalesFloorHqView } from "./types";

export function buildSalesFloorHqView(evidence: SalesFloorEvidence = occupancyNpvSalesEvidence()): SalesFloorHqView {
  const rooms = provisionSalesRooms(evidence);
  const motion = resolveSalesMotion(evidence);
  const top = highestPriorityRoom(rooms);
  const activeLike = rooms.some((room) => room.state === "ACTIVE");
  const monitoring = rooms.some((room) => room.state === "MONITORING" || room.state === "WAITING");
  return {
    floor: "Sales Floor",
    status: activeLike ? "ACTIVE" : monitoring ? "MONITORING" : "PRESENT_IDLE",
    venture_id: evidence.venture_id,
    venture_name: evidence.display_name,
    total_pipeline: evidence.pipeline.length,
    qualified_opportunities: evidence.qualified_opportunities,
    deals_in_progress: evidence.qualified_opportunities,
    wins: evidence.won_deals,
    losses: evidence.lost_deals,
    rooms,
    intelligence: projectSalesIntelligence({
      observations: evidence.observations,
      objections: evidence.objections,
      pipeline_count: evidence.pipeline.length,
    }),
    priorities: rooms.map((room) => ({ room: room.room, priority: room.priority })),
    latest_outcomes: rooms.map((room) => room.latest_result).filter(Boolean),
    next_actions: rooms.map((room) => `${SALES_ROOM_LABELS[room.room]}: ${room.next_action}`),
    recognized_campaign_id: evidence.existing_campaign?.recognized ? evidence.existing_campaign.campaign_id : null,
    duplicate_campaign_created: false,
    autonomous_execution_enabled: false,
    current_motion: motion.recommended_motion,
    highest_priority_room: top.room,
    highest_priority_reason: top.reason,
  };
}

export function salesFloorDepartmentSnapshot(view: SalesFloorHqView = buildSalesFloorHqView()): OperatorDepartmentSnapshot {
  const state: DepartmentUiState = view.status === "ACTIVE" ? "RUNNING" : view.status === "BLOCKED" ? "BLOCKED" : "WAITING";
  return {
    id: SALES_FLOOR_DEPARTMENT_ID,
    label: "Sales Floor",
    state,
    engines: [],
    summary: `${view.venture_name} · ${view.rooms.filter((room) => room.state !== "PRESENT_IDLE").length} rooms monitoring`,
    currentTask: `${SALES_ROOM_LABELS[highestPriorityRoom(view.rooms).room]} has highest priority`,
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: view.rooms.length,
    detail: { salesFloorView: view, showWorkers: false },
    isActive: view.status === "ACTIVE",
    isNextMissionTarget: false,
    displayName: "Sales Floor",
    supportingLabel: "Converts qualified demand into revenue for every commercial venture.",
    displayHeadline: view.status === "ACTIVE" ? "Advancing qualified pipeline" : "Sales floor present and monitoring",
    displayTask: view.next_actions[0] ?? null,
    displaySummary: view.intelligence.pipeline_health,
  };
}

export function workHierarchyCopy(input: { mission: string; floor: string; room: string; agent: string }) {
  return {
    mission: input.mission,
    sales_floor_contribution: input.floor,
    sales_room_contribution: input.room,
    agent_task: input.agent,
  };
}

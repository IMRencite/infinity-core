import type { DepartmentUiState, OperatorDepartmentSnapshot } from "@/lib/infinity/operator-console/types";
import type { SalesPerformanceView } from "@/lib/infinity/autonomous-sales-execution/hq";
import { buildAffiliateHqView } from "@/lib/infinity/affiliate-referral/hq";
import { projectSalesLearningHq } from "@/lib/infinity/sales-learning/hq";
import { projectProductionOutboundHq } from "@/lib/infinity/production-outbound/hq";
import { getDefaultProductionOutboundState } from "@/lib/infinity/production-outbound/store";
import { SALES_FLOOR_DEPARTMENT_ID, SALES_ROOM_LABELS } from "./contract";
import { buildSalesRoomAgents } from "./agents";
import { projectSalesIntelligence, unknownMetricDisplay } from "./intelligence";
import { projectSalesFloorLiveState } from "./live-state";
import { resolveSalesMotion } from "./motion";
import { salesFloorCurrentWork } from "./narrative";
import { occupancyNpvSalesEvidence } from "./occupancy";
import { highestPriorityRoom, provisionSalesRooms } from "./rooms";
import type { SalesFloorEvidence, SalesFloorHqView } from "./types";
import { projectSalesCommandCenterView } from "@/lib/infinity/always-closing-sales/hq";

function projectFloorPerformance(evidence: SalesFloorEvidence): SalesPerformanceView {
  return {
    qualified_prospects: unknownMetricDisplay(evidence.qualified_opportunities),
    send_attempts: "UNKNOWN",
    delivered: "UNKNOWN",
    replies: "UNKNOWN",
    positive_replies: "UNKNOWN",
    opportunities: unknownMetricDisplay(evidence.qualified_opportunities),
    trial_starts: "UNKNOWN",
    closed_wins: unknownMetricDisplay(evidence.won_deals),
    sales_attributed_revenue: "UNKNOWN",
  };
}

export function buildSalesFloorHqView(evidence: SalesFloorEvidence = occupancyNpvSalesEvidence()): SalesFloorHqView {
  const rooms = provisionSalesRooms(evidence);
  const motion = resolveSalesMotion(evidence);
  const top = highestPriorityRoom(rooms);
  const activeLike = rooms.some((room) => room.state === "ACTIVE");
  const monitoring = rooms.some((room) => room.state === "MONITORING" || room.state === "WAITING");
  const base: SalesFloorHqView = {
    floor: "Sales Floor",
    status: activeLike ? "ACTIVE" : monitoring ? "MONITORING" : "PRESENT_IDLE",
    venture_id: evidence.venture_id,
    venture_name: evidence.display_name,
    total_pipeline: evidence.pipeline.length,
    qualified_opportunities: evidence.qualified_opportunities,
    deals_in_progress: evidence.qualified_opportunities,
    wins: evidence.won_deals,
    losses: evidence.lost_deals,
    performance: projectFloorPerformance(evidence),
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
  const affiliate = evidence.venture_id === occupancyNpvSalesEvidence().venture_id ? buildAffiliateHqView() : null;
  const live = projectSalesFloorLiveState(base, affiliate);
  return {
    ...base,
    current_work: salesFloorCurrentWork(base),
    live,
  };
}

export function salesFloorDepartmentSnapshot(view: SalesFloorHqView = buildSalesFloorHqView()): OperatorDepartmentSnapshot {
  const learning = projectSalesLearningHq();
  const outbound = projectProductionOutboundHq(getDefaultProductionOutboundState());
  const state: DepartmentUiState = learning.training_active || view.status === "ACTIVE" ? "RUNNING" : view.status === "BLOCKED" ? "BLOCKED" : "WAITING";
  const now = learning.training_active
    ? { ...salesFloorCurrentWork(view), displayText: learning.current_work }
    : view.current_work ?? salesFloorCurrentWork(view);
  return {
    id: SALES_FLOOR_DEPARTMENT_ID,
    label: "Sales Floor",
    state,
    engines: [],
    summary: now.displayText,
    currentTask: now.displayText,
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: now.startedAt,
    lastActivityAt: now.lastChangedAt,
    recordCount: view.rooms.length,
    detail: {
      salesFloorView: view,
      currentWorkNarrative: now,
      showWorkers: true,
      affiliateHqView: view.live?.affiliate ?? null,
      salesLearning: learning,
      outbound,
      salesCommandCenter: projectSalesCommandCenterView(),
    },
    isActive: view.status === "ACTIVE" || learning.training_active,
    isNextMissionTarget: false,
    displayName: "Sales Floor",
    supportingLabel: "Converts qualified demand into revenue for every commercial venture.",
    displayHeadline: now.displayText,
    displayTask: now.displayText,
    displaySummary: view.intelligence.pipeline_health,
  };
}

export function salesFloorWorkerNodes(view: SalesFloorHqView = buildSalesFloorHqView()) {
  return buildSalesRoomAgents(view.rooms);
}

export function workHierarchyCopy(input: { mission: string; floor: string; room: string; agent: string }) {
  return {
    mission: input.mission,
    sales_floor_contribution: input.floor,
    sales_room_contribution: input.room,
    agent_task: input.agent,
  };
}

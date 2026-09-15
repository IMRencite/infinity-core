import { SALES_ROOMS, type SalesMotion, type SalesPriority, type SalesRoomId } from "./contract";
import { highestPriorityRoom, provisionSalesRooms } from "./rooms";
import type { AutonomousSalesRecommendation, SalesFloorEvidence, SalesLearningDecision, SalesMotionResolution } from "./types";

export function resolveSalesMotion(evidence: SalesFloorEvidence, learning?: SalesLearningDecision): SalesMotionResolution {
  const rooms = provisionSalesRooms(evidence);
  const learned = applyLearning(rooms, learning);
  const top = highestPriorityRoom(learned);
  const motion = motionForRoom(top.room);
  return {
    venture_id: evidence.venture_id,
    eligible_rooms: SALES_ROOMS.filter((room) => learned.find((row) => row.room === room)?.applicable),
    priority_by_room: Object.fromEntries(learned.map((row) => [row.room, row.priority])) as Record<SalesRoomId, SalesPriority>,
    recommended_motion: learning?.preferred_motion ?? motion,
    recommended_room: learning?.preferred_room ?? top.room,
    reason: learning?.reason ?? top.reason,
    expected_outcome: "Advance the highest-evidence sales motion without forcing activity",
    evidence: [
      `customers=${evidence.customers}`,
      `inbound=${evidence.inbound_signals.length}`,
      `qualified=${evidence.qualified_opportunities}`,
      `campaign=${evidence.existing_campaign?.campaign_id ?? "none"}`,
    ],
    risk: "Do not send unauthorized outreach",
    financial_exposure: "NONE",
    required_capability: "SALES_FLOOR_FOUNDATION",
    next_review_condition: "New inbound signal, campaign evidence, customer, or qualified opportunity",
  };
}

export function resolveAutonomousSalesOpportunity(
  evidence: SalesFloorEvidence,
  learning?: SalesLearningDecision,
): AutonomousSalesRecommendation {
  const resolution = resolveSalesMotion(evidence, learning);
  return {
    recommended_room: resolution.recommended_room,
    recommended_action: "Observe and prioritize; do not execute uncontrolled outreach",
    reason: resolution.reason,
    evidence: resolution.evidence,
    expected_value: evidence.qualified_opportunities > 0 ? "UNKNOWN" : 0,
    execution_authorized: false,
  };
}

function motionForRoom(room: SalesRoomId): SalesMotion {
  if (room === "OUTBOUND_ACQUISITION") return "OUTBOUND_PROSPECTING";
  if (room === "INBOUND_CONVERSION") return "INBOUND_CONVERSION";
  if (room === "EXPANSION_RETENTION") return "RETENTION";
  if (room === "PARTNERSHIPS_CHANNEL") return "PARTNER_SOURCED";
  return "ASSISTED_CLOSE";
}

function applyLearning(
  rooms: ReturnType<typeof provisionSalesRooms>,
  learning?: SalesLearningDecision,
) {
  if (!learning?.changes_priority || !learning.preferred_room) return rooms;
  return rooms.map((room) =>
    room.room === learning.preferred_room ? { ...room, priority: "HIGH" as const, reason: learning.reason } : room,
  );
}

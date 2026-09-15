import {
  SALES_ROOM_LABELS,
  SALES_ROOM_QUESTIONS,
  SALES_ROOMS,
  type SalesPriority,
  type SalesRoomId,
  type SalesRoomState,
} from "./contract";
import type { SalesFloorEvidence, SalesRoomProjection } from "./types";

export function provisionSalesRooms(evidence: SalesFloorEvidence): SalesRoomProjection[] {
  return SALES_ROOMS.map((room) => projectRoom(room, evidence));
}

function projectRoom(room: SalesRoomId, evidence: SalesFloorEvidence): SalesRoomProjection {
  const campaign = evidence.existing_campaign;
  if (room === "OUTBOUND_ACQUISITION") {
    const sending = Boolean(campaign?.sending && campaign.authorized_to_execute);
    const recognized = Boolean(campaign?.recognized);
    const state: SalesRoomState = sending ? "ACTIVE" : recognized ? "MONITORING" : "PRESENT_IDLE";
    return base(room, evidence, {
      state,
      priority: recognized || sending ? "HIGH" : "MEDIUM",
      queue_count: sending ? 1 : 0,
      contribution: recognized ? "Observing existing outbound validation campaign" : "Ready to qualify outbound prospects",
      latest_result: recognized ? "Existing outbound campaign recognized" : "No outbound motion yet",
      next_action: sending ? "Observe authorized outbound execution" : "Do not send; monitor campaign eligibility",
      reason: recognized ? "Existing outbound campaign is the source of truth" : "No outbound evidence",
      kpi_summary: unknownSafeKpis({
        qualified_prospects: "UNKNOWN",
        contacts_attempted: campaign?.sending ? "UNKNOWN" : 0,
        reply_rate: "UNKNOWN",
        meetings: 0,
        won_revenue: "UNKNOWN",
      }),
    });
  }
  if (room === "INBOUND_CONVERSION") {
    const signals = evidence.inbound_signals.filter((row) => row.available).length;
    const state: SalesRoomState = signals > 0 ? "ACTIVE" : evidence.public_site_live ? "MONITORING" : "PRESENT_IDLE";
    return base(room, evidence, {
      state,
      priority: signals > 0 ? "HIGH" : evidence.public_site_live ? "MEDIUM" : "LOW",
      queue_count: signals,
      contribution: signals > 0 ? "Convert existing inbound intent" : "Monitor inbound interest",
      latest_result: signals > 0 ? `${signals} inbound signals` : "No inbound intent yet",
      next_action: signals > 0 ? "Respond to highest-intent inbound lead" : "Wait for legally available inbound signals",
      reason: signals > 0 ? "Inbound intent exists" : "No inbound evidence",
      kpi_summary: unknownSafeKpis({
        inbound_leads: signals,
        speed_to_response: "UNKNOWN",
        trial_to_paid: "UNKNOWN",
        won_revenue: "UNKNOWN",
      }),
    });
  }
  if (room === "EXPANSION_RETENTION") {
    const customers = evidence.customers;
    const state: SalesRoomState = customers > 0 ? "MONITORING" : "PRESENT_IDLE";
    return base(room, evidence, {
      state,
      priority: customers > 0 ? "MEDIUM" : "LOW",
      queue_count: 0,
      contribution: customers > 0 ? "Protect and expand customer revenue" : "Waiting for first customer",
      latest_result: customers > 0 ? `${customers} customers` : "No customer context",
      next_action: customers > 0 ? "Review retention and expansion evidence" : "Do not treat prospects as customers",
      reason: customers > 0 ? "Customer accounts exist" : "Expansion requires existing customer context",
      kpi_summary: unknownSafeKpis({
        renewals: customers > 0 ? "UNKNOWN" : 0,
        retention: "UNKNOWN",
        expansion_revenue: "UNKNOWN",
        churn_saved: "UNKNOWN",
      }),
    });
  }
  if (room === "PARTNERSHIPS_CHANNEL") {
    const active = evidence.partners.filter((row) => row.relationship === "ACTIVE_PARTNER").length;
    const sourced = evidence.partners.length;
    const state: SalesRoomState = active > 0 ? "ACTIVE" : sourced > 0 ? "MONITORING" : "PRESENT_IDLE";
    return base(room, evidence, {
      state,
      priority: active > 0 ? "HIGH" : "MEDIUM",
      queue_count: sourced,
      contribution: sourced > 0 ? "Develop partner-sourced pipeline" : "Identify channel leverage",
      latest_result: sourced > 0 ? `${sourced} partner records` : "No partners yet",
      next_action: sourced > 0 ? "Advance the highest-fit partner relationship" : "Research partners who already reach buyers",
      reason: sourced > 0 ? "Partner records exist" : "No partner evidence",
      kpi_summary: unknownSafeKpis({
        partners_sourced: sourced,
        active_partners: active,
        referrals: evidence.partners.reduce((sum, row) => sum + row.referrals, 0),
        partner_revenue: "UNKNOWN",
      }),
    });
  }
  const qualified = evidence.qualified_opportunities;
  const state: SalesRoomState = qualified > 0 ? "ACTIVE" : evidence.offer_ready ? "MONITORING" : "PRESENT_IDLE";
  return base(room, evidence, {
    state,
    priority: qualified > 0 ? "HIGH" : evidence.offer_ready ? "MEDIUM" : "LOW",
    queue_count: qualified,
    contribution: qualified > 0 ? "Advance qualified opportunities to close" : "Prepare close path when intent appears",
    latest_result: qualified > 0 ? `${qualified} qualified opportunities` : "No qualified close path yet",
    next_action: qualified > 0 ? "Handle the blocking objection" : "Do not manufacture urgency",
    reason: qualified > 0 ? "Qualified commercial intent exists" : "Closing requires a qualified opportunity",
    kpi_summary: unknownSafeKpis({
      qualified_opportunities: qualified,
      objections: evidence.objections.length,
      close_rate: "UNKNOWN",
      sales_cycle_length: "UNKNOWN",
      won_revenue: evidence.won_deals > 0 ? "UNKNOWN" : 0,
    }),
  });
}

function base(
  room: SalesRoomId,
  evidence: SalesFloorEvidence,
  extra: Omit<SalesRoomProjection, "room" | "label" | "question" | "applicable" | "active_ventures">,
): SalesRoomProjection {
  return {
    room,
    label: SALES_ROOM_LABELS[room],
    question: SALES_ROOM_QUESTIONS[room],
    applicable: extra.state !== "NOT_APPLICABLE_TO_CURRENT_STATE",
    active_ventures: [evidence.display_name],
    ...extra,
  };
}

function unknownSafeKpis(input: Record<string, number | "UNKNOWN">): Record<string, number | "UNKNOWN"> {
  return input;
}

export function roomStatesAreTruthful(rooms: SalesRoomProjection[]): boolean {
  return rooms.every((room) => room.state !== "ACTIVE" || room.queue_count > 0 || room.latest_result !== "No outbound motion yet");
}

export function highestPriorityRoom(rooms: SalesRoomProjection[]): {
  room: SalesRoomId;
  priority: SalesPriority;
  reason: string;
} {
  const rank: Record<SalesPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const top = [...rooms].sort((a, b) => rank[b.priority] - rank[a.priority] || b.queue_count - a.queue_count)[0]!;
  return { room: top.room, priority: top.priority, reason: top.reason };
}

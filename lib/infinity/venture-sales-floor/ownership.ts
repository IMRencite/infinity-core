import type { SalesRoomId } from "./contract";
import { FULFILLMENT_OWNER, GROWTH_OWNER, SALES_OWNER, SUPPORT_OWNER } from "./contract";

export function resolveSalesActionOwnership(input: {
  target_id: string;
  is_customer: boolean;
  inbound_active: boolean;
  qualified_commercial_intent: boolean;
  partner_referred: boolean;
  current_owner?: SalesRoomId;
}): { primary_room: SalesRoomId; contributing_rooms: SalesRoomId[]; reasons: string[] } {
  if (input.is_customer) {
    return { primary_room: "EXPANSION_RETENTION", contributing_rooms: ["OFFER_CLOSING"], reasons: ["CUSTOMER_OWNED_BY_EXPANSION"] };
  }
  if (input.qualified_commercial_intent) {
    return { primary_room: "OFFER_CLOSING", contributing_rooms: input.inbound_active ? ["INBOUND_CONVERSION"] : ["OUTBOUND_ACQUISITION"], reasons: ["CLOSING_OWNS_QUALIFIED_INTENT"] };
  }
  if (input.inbound_active) {
    return { primary_room: "INBOUND_CONVERSION", contributing_rooms: [], reasons: ["INBOUND_TOOK_OVER_AFTER_INTEREST"] };
  }
  if (input.partner_referred) {
    return { primary_room: "PARTNERSHIPS_CHANNEL", contributing_rooms: ["OUTBOUND_ACQUISITION"], reasons: ["PARTNER_INTRODUCED"] };
  }
  return { primary_room: input.current_owner ?? "OUTBOUND_ACQUISITION", contributing_rooms: [], reasons: ["OUTBOUND_OWNS_PROSPECT"] };
}

export function expansionMayAct(isCustomer: boolean): boolean {
  return isCustomer;
}

export function conflictingRoomActions(input: {
  target_id: string;
  actions: Array<{ room: SalesRoomId; kind: "OUTREACH" | "PROPOSAL" | "FOLLOW_UP" }>;
}): boolean {
  const outreach = input.actions.filter((row) => row.kind === "OUTREACH" || row.kind === "FOLLOW_UP");
  const rooms = new Set(outreach.map((row) => row.room));
  return rooms.size > 1;
}

export function resolveWorkOwner(kind: "DEMAND_CREATION" | "REVENUE_CONVERSION" | "DELIVERY" | "SUPPORT"): string {
  if (kind === "DEMAND_CREATION") return GROWTH_OWNER;
  if (kind === "REVENUE_CONVERSION") return SALES_OWNER;
  if (kind === "DELIVERY") return FULFILLMENT_OWNER;
  return SUPPORT_OWNER;
}

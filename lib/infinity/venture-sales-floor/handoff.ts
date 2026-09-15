import type { SalesRoomId } from "./contract";

export type SalesHandoff = {
  from: SalesRoomId;
  to: SalesRoomId;
  trigger: string;
  allowed: boolean;
  reasons: string[];
};

export function resolveSalesRoomHandoff(input: {
  from: SalesRoomId;
  event:
    | "ACCOUNT_OR_TRIAL_CREATED"
    | "INBOUND_ACTIVE"
    | "QUALIFIED_COMMERCIAL_INTENT"
    | "PROPOSAL_OR_DECISION"
    | "WON_AND_ACTIVATED"
    | "PARTNER_REFERRED_PROSPECT"
    | "PARTNER_REFERRED_INTENT"
    | "PARTNER_REFERRED_CUSTOMER";
}): SalesHandoff {
  const { from, event } = input;
  if (from === "OUTBOUND_ACQUISITION" && (event === "ACCOUNT_OR_TRIAL_CREATED" || event === "INBOUND_ACTIVE")) {
    return pass(from, "INBOUND_CONVERSION", event);
  }
  if (from === "OUTBOUND_ACQUISITION" && event === "QUALIFIED_COMMERCIAL_INTENT") {
    return pass(from, "OFFER_CLOSING", event);
  }
  if (from === "INBOUND_CONVERSION" && (event === "QUALIFIED_COMMERCIAL_INTENT" || event === "PROPOSAL_OR_DECISION")) {
    return pass(from, "OFFER_CLOSING", event);
  }
  if ((from === "OFFER_CLOSING" || from === "INBOUND_CONVERSION" || from === "OUTBOUND_ACQUISITION") && event === "WON_AND_ACTIVATED") {
    return pass(from, "EXPANSION_RETENTION", event);
  }
  if (from === "PARTNERSHIPS_CHANNEL" && event === "PARTNER_REFERRED_PROSPECT") {
    return pass(from, "OUTBOUND_ACQUISITION", event);
  }
  if (from === "PARTNERSHIPS_CHANNEL" && event === "PARTNER_REFERRED_INTENT") {
    return pass(from, "INBOUND_CONVERSION", event);
  }
  if (from === "PARTNERSHIPS_CHANNEL" && event === "PARTNER_REFERRED_CUSTOMER") {
    return pass(from, "EXPANSION_RETENTION", event);
  }
  return { from, to: from, trigger: event, allowed: false, reasons: ["HANDOFF_NOT_DEFINED"] };
}

function pass(from: SalesRoomId, to: SalesRoomId, trigger: string): SalesHandoff {
  return { from, to, trigger, allowed: true, reasons: [`HANDOFF:${from}->${to}`] };
}

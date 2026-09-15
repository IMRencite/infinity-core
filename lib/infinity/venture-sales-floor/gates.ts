import { SALES_ROOMS } from "./contract";
import { salesOutreachBlocked } from "./compliance";
import { resolveSalesRoomHandoff } from "./handoff";
import { conflictingRoomActions, expansionMayAct, resolveWorkOwner } from "./ownership";
import { isDuplicateOpportunity } from "./pipeline";
import { projectPublicSalesFloor, publicSalesFloorIsSafe, salesFloorExposedInPublicOperations } from "./public";
import { qualifySalesProspect } from "./qualification";
import { provisionSalesRooms } from "./rooms";
import type { SalesFloorEvidence, SalesFloorHqView } from "./types";

export type NamedSalesGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };

function pass(gate: string, reason: string): NamedSalesGate {
  return { gate, result: "PASS", reasons: [reason] };
}
function fail(gate: string, reasons: string[]): NamedSalesGate {
  return { gate, result: "FAIL", reasons };
}

export const SALES_FLOOR_CANONICAL_MODEL_GATE = "SalesFloorCanonicalModelGate" as const;
export const COMMERCIAL_VENTURE_SALES_FLOOR_COVERAGE_GATE = "CommercialVentureSalesFloorCoverageGate" as const;
export const FIVE_ROOM_SALES_FLOOR_GATE = "FiveRoomSalesFloorGate" as const;
export const SALES_MOTION_RESOLVER_GATE = "SalesMotionResolverGate" as const;
export const SALES_ROOM_STATE_TRUTH_GATE = "SalesRoomStateTruthGate" as const;
export const SALES_PIPELINE_TRUTH_GATE = "SalesPipelineTruthGate" as const;
export const SALES_QUALIFICATION_GATE = "SalesQualificationGate" as const;
export const SALES_INTELLIGENCE_LEARNING_GATE = "SalesIntelligenceLearningGate" as const;
export const SALES_DUPLICATE_ACTION_GATE = "SalesDuplicateActionGate" as const;
export const SALES_ACTION_OWNERSHIP_GATE = "SalesActionOwnershipGate" as const;
export const SALES_ROOM_HANDOFF_GATE = "SalesRoomHandoffGate" as const;
export const SALES_GROWTH_BOUNDARY_GATE = "SalesGrowthBoundaryGate" as const;
export const SALES_FULFILLMENT_BOUNDARY_GATE = "SalesFulfillmentBoundaryGate" as const;
export const SALES_CUSTOMER_PRIVACY_GATE = "SalesCustomerPrivacyGate" as const;
export const SALES_PROSPECT_PRIVACY_GATE = "SalesProspectPrivacyGate" as const;
export const SALES_SUPPRESSION_GATE = "SalesSuppressionGate" as const;
export const SALES_NO_FAKE_EVIDENCE_GATE = "SalesNoFakeEvidenceGate" as const;
export const SALES_UNKNOWN_NOT_ZERO_GATE = "SalesUnknownNotZeroGate" as const;
export const SALES_REVENUE_ATTRIBUTION_GATE = "SalesRevenueAttributionGate" as const;

export function evaluateSalesFloorCanonicalModelGate(view: SalesFloorHqView): NamedSalesGate {
  if (view.rooms.length !== 5) return fail(SALES_FLOOR_CANONICAL_MODEL_GATE, ["ROOM_COUNT"]);
  return pass(SALES_FLOOR_CANONICAL_MODEL_GATE, "FIVE_ROOMS_PLUS_INTELLIGENCE");
}

export function evaluateCommercialVentureSalesFloorCoverageGate(input: {
  commercial: boolean;
  rooms: number;
  nonCommercialExempt?: boolean;
}): NamedSalesGate {
  if (!input.commercial && input.nonCommercialExempt) return pass(COMMERCIAL_VENTURE_SALES_FLOOR_COVERAGE_GATE, "NON_COMMERCIAL_EXEMPT");
  if (input.commercial && input.rooms === 5) return pass(COMMERCIAL_VENTURE_SALES_FLOOR_COVERAGE_GATE, "COMMERCIAL_COVERED");
  return fail(COMMERCIAL_VENTURE_SALES_FLOOR_COVERAGE_GATE, ["SALES_FLOOR_OMITTED"]);
}

export function evaluateFiveRoomSalesFloorGate(evidence: SalesFloorEvidence): NamedSalesGate {
  const rooms = provisionSalesRooms(evidence);
  const ids = rooms.map((row) => row.room);
  if (SALES_ROOMS.every((id) => ids.includes(id))) return pass(FIVE_ROOM_SALES_FLOOR_GATE, "ALL_FIVE_PRESENT");
  return fail(FIVE_ROOM_SALES_FLOOR_GATE, ["MISSING_ROOM"]);
}

export function evaluateSalesMotionResolverGate(forcedActive: boolean, evidenceDriven: boolean): NamedSalesGate {
  if (forcedActive) return fail(SALES_MOTION_RESOLVER_GATE, ["ROOMS_FORCED_ACTIVE"]);
  if (!evidenceDriven) return fail(SALES_MOTION_RESOLVER_GATE, ["NOT_EVIDENCE_DRIVEN"]);
  return pass(SALES_MOTION_RESOLVER_GATE, "EVIDENCE_DRIVEN");
}

export function evaluateSalesRoomStateTruthGate(evidence: SalesFloorEvidence): NamedSalesGate {
  const rooms = provisionSalesRooms(evidence);
  if (rooms.some((room) => room.state === "ACTIVE" && room.queue_count === 0 && !evidence.existing_campaign?.sending)) {
    return fail(SALES_ROOM_STATE_TRUTH_GATE, ["FAKE_ACTIVE"]);
  }
  return pass(SALES_ROOM_STATE_TRUTH_GATE, "NO_FAKE_ACTIVE");
}

export function evaluateSalesPipelineTruthGate(input: { wonFromReply: boolean; transitionAllowed: boolean }): NamedSalesGate {
  if (input.wonFromReply) return fail(SALES_PIPELINE_TRUTH_GATE, ["WON_FROM_REPLY"]);
  if (!input.transitionAllowed) return fail(SALES_PIPELINE_TRUTH_GATE, ["MISSING_EVIDENCE"]);
  return pass(SALES_PIPELINE_TRUTH_GATE, "EVIDENCE_BACKED");
}

export function evaluateSalesQualificationGate(qualified: boolean, icpMatch: boolean): NamedSalesGate {
  const result = qualifySalesProspect({ icp_match: icpMatch });
  if (qualified !== result.qualified) return fail(SALES_QUALIFICATION_GATE, ["QUALIFICATION_MISMATCH"]);
  return pass(SALES_QUALIFICATION_GATE, "FIT_OVER_QUANTITY");
}

export function evaluateSalesIntelligenceLearningGate(changesPriority: boolean): NamedSalesGate {
  return changesPriority
    ? pass(SALES_INTELLIGENCE_LEARNING_GATE, "LEARNING_CHANGES_PRIORITY")
    : fail(SALES_INTELLIGENCE_LEARNING_GATE, ["NO_LEARNING_EFFECT"]);
}

export function evaluateSalesDuplicateActionGate(blocked: boolean): NamedSalesGate {
  return blocked ? pass(SALES_DUPLICATE_ACTION_GATE, "DUPLICATE_BLOCKED") : fail(SALES_DUPLICATE_ACTION_GATE, ["DUPLICATE_ALLOWED"]);
}

export function evaluateSalesActionOwnershipGate(input: Parameters<typeof conflictingRoomActions>[0]): NamedSalesGate {
  return conflictingRoomActions(input)
    ? fail(SALES_ACTION_OWNERSHIP_GATE, ["CONFLICTING_ROOM_ACTIONS"])
    : pass(SALES_ACTION_OWNERSHIP_GATE, "SINGLE_OWNER");
}

export function evaluateSalesRoomHandoffGate(): NamedSalesGate {
  const outboundClose = resolveSalesRoomHandoff({ from: "OUTBOUND_ACQUISITION", event: "QUALIFIED_COMMERCIAL_INTENT" });
  const inboundClose = resolveSalesRoomHandoff({ from: "INBOUND_CONVERSION", event: "PROPOSAL_OR_DECISION" });
  const wonExpand = resolveSalesRoomHandoff({ from: "OFFER_CLOSING", event: "WON_AND_ACTIVATED" });
  const partner = resolveSalesRoomHandoff({ from: "PARTNERSHIPS_CHANNEL", event: "PARTNER_REFERRED_PROSPECT" });
  if (outboundClose.allowed && inboundClose.allowed && wonExpand.allowed && partner.allowed) {
    return pass(SALES_ROOM_HANDOFF_GATE, "HANDOFFS_DEFINED");
  }
  return fail(SALES_ROOM_HANDOFF_GATE, ["HANDOFF_MISSING"]);
}

export function evaluateSalesGrowthBoundaryGate(): NamedSalesGate {
  if (resolveWorkOwner("DEMAND_CREATION") !== "GROWTH") return fail(SALES_GROWTH_BOUNDARY_GATE, ["GROWTH_OWNER_WRONG"]);
  if (resolveWorkOwner("REVENUE_CONVERSION") !== "SALES") return fail(SALES_GROWTH_BOUNDARY_GATE, ["SALES_OWNER_WRONG"]);
  return pass(SALES_GROWTH_BOUNDARY_GATE, "GROWTH_CREATES_DEMAND_SALES_CONVERTS");
}

export function evaluateSalesFulfillmentBoundaryGate(): NamedSalesGate {
  if (resolveWorkOwner("DELIVERY") !== "FULFILLMENT") return fail(SALES_FULFILLMENT_BOUNDARY_GATE, ["FULFILLMENT_OWNER_WRONG"]);
  if (expansionMayAct(false)) return fail(SALES_FULFILLMENT_BOUNDARY_GATE, ["EXPANSION_ON_PROSPECT"]);
  return pass(SALES_FULFILLMENT_BOUNDARY_GATE, "COMMERCIAL_EXPANSION_ONLY");
}

export function evaluateSalesCustomerPrivacyGate(publicJson: string): NamedSalesGate {
  if (salesFloorExposedInPublicOperations(publicJson)) return fail(SALES_CUSTOMER_PRIVACY_GATE, ["PUBLIC_SALES_FLOOR_EXPOSED"]);
  return pass(SALES_CUSTOMER_PRIVACY_GATE, "NOT_IN_PUBLIC_PROJECTION");
}

export function evaluateSalesProspectPrivacyGate(serialized: string): NamedSalesGate {
  return publicSalesFloorIsSafe(serialized)
    ? pass(SALES_PROSPECT_PRIVACY_GATE, "PUBLIC_SALES_SAFE")
    : fail(SALES_PROSPECT_PRIVACY_GATE, ["IDENTIFYING_SALES_DATA"]);
}

export function evaluateSalesSuppressionGate(unsubscribed: boolean): NamedSalesGate {
  return salesOutreachBlocked({ unsubscribed })
    ? pass(SALES_SUPPRESSION_GATE, "UNSUBSCRIBE_BLOCKS_ALL_ROOMS")
    : fail(SALES_SUPPRESSION_GATE, ["UNSUBSCRIBE_NOT_HONORED"]);
}

export function evaluateSalesNoFakeEvidenceGate(input: { fakeDiscount?: boolean; fakeUrgency?: boolean; fakeLeads?: boolean }): NamedSalesGate {
  if (input.fakeDiscount || input.fakeUrgency || input.fakeLeads) return fail(SALES_NO_FAKE_EVIDENCE_GATE, ["FAKE_SALES_TACTIC"]);
  return pass(SALES_NO_FAKE_EVIDENCE_GATE, "NO_FAKE_EVIDENCE");
}

export function evaluateSalesUnknownNotZeroGate(metric: number | "UNKNOWN", rendered: string): NamedSalesGate {
  if (metric === "UNKNOWN" && rendered === "0") return fail(SALES_UNKNOWN_NOT_ZERO_GATE, ["UNKNOWN_RENDERED_ZERO"]);
  return pass(SALES_UNKNOWN_NOT_ZERO_GATE, "UNKNOWN_PRESERVED");
}

export function evaluateSalesRevenueAttributionGate(input: { attributed: number | "UNKNOWN"; confusedWithCash?: boolean }): NamedSalesGate {
  if (input.confusedWithCash) return fail(SALES_REVENUE_ATTRIBUTION_GATE, ["ATTRIBUTED_CONFUSED_WITH_CASH"]);
  return pass(SALES_REVENUE_ATTRIBUTION_GATE, "ATTRIBUTION_DISTINCT");
}

export function evaluateSalesDuplicateOpportunityPrevention(existing: Array<{ account_id: string; commercial_event: string }>, next: {
  account_id: string;
  commercial_event: string;
}): NamedSalesGate {
  return isDuplicateOpportunity(existing, next)
    ? pass(SALES_DUPLICATE_ACTION_GATE, "DUPLICATE_OPPORTUNITY_BLOCKED")
    : fail(SALES_DUPLICATE_ACTION_GATE, ["DUPLICATE_OPPORTUNITY_ALLOWED"]);
}

export { projectPublicSalesFloor };

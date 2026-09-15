import { describe, expect, it } from "vitest";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/growth-engine/venture-identity";
import { recordGrowthSuppression, resetGrowthSuppression } from "@/lib/infinity/growth-engine/suppression";
import {
  OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
  SALES_ROOMS,
  askReviewSalesEvidence,
  buildSalesFloorHqView,
  canTransitionPipelineStage,
  duplicateSalesActionBlocked,
  evaluateCommercialVentureSalesFloorCoverageGate,
  evaluateFiveRoomSalesFloorGate,
  evaluateSalesActionOwnershipGate,
  evaluateSalesCustomerPrivacyGate,
  evaluateSalesDuplicateActionGate,
  evaluateSalesFloorCanonicalModelGate,
  evaluateSalesFulfillmentBoundaryGate,
  evaluateSalesGrowthBoundaryGate,
  evaluateSalesIntelligenceLearningGate,
  evaluateSalesMotionResolverGate,
  evaluateSalesNoFakeEvidenceGate,
  evaluateSalesPipelineTruthGate,
  evaluateSalesProspectPrivacyGate,
  evaluateSalesQualificationGate,
  evaluateSalesRoomHandoffGate,
  evaluateSalesRoomStateTruthGate,
  evaluateSalesSuppressionGate,
  evaluateSalesUnknownNotZeroGate,
  expansionMayAct,
  isCommercialVenture,
  isDuplicateOpportunity,
  learnFromSalesEvidence,
  occupancyNpvSalesEvidence,
  projectPublicSalesFloor,
  provisionSalesRooms,
  qualifySalesProspect,
  recognizesOccupancyOutboundCampaign,
  resolveAutonomousSalesOpportunity,
  resolveSalesActionOwnership,
  resolveSalesMotion,
  resolveSalesRoomHandoff,
  resolveWorkOwner,
  salesOutreachBlocked,
  unknownMetricDisplay,
  workHierarchyCopy,
} from "..";

describe("Venture Sales Floor Foundation V1", () => {
  it("1-3. every commercial venture receives five rooms; non-commercial may be exempt", () => {
    const occupancy = occupancyNpvSalesEvidence();
    const ask = askReviewSalesEvidence();
    expect(isCommercialVenture({ venture_id: CRE_VENTURE_ID })).toBe(true);
    expect(isCommercialVenture({ venture_id: ASKREVIEW_VENTURE_ID })).toBe(true);
    expect(provisionSalesRooms(occupancy)).toHaveLength(5);
    expect(provisionSalesRooms(ask)).toHaveLength(5);
    expect(evaluateFiveRoomSalesFloorGate(occupancy).result).toBe("PASS");
    expect(evaluateCommercialVentureSalesFloorCoverageGate({ commercial: true, rooms: 5 }).result).toBe("PASS");
    expect(evaluateCommercialVentureSalesFloorCoverageGate({
      commercial: false,
      rooms: 0,
      nonCommercialExempt: true,
    }).result).toBe("PASS");
    expect(isCommercialVenture({ venture_id: "internal-lab", explicitly_non_commercial: true })).toBe(false);
  });

  it("4. room state does not fake ACTIVE", () => {
    const rooms = provisionSalesRooms(occupancyNpvSalesEvidence({ sending: false }));
    expect(rooms.every((room) => room.state !== "ACTIVE")).toBe(true);
    expect(evaluateSalesRoomStateTruthGate(occupancyNpvSalesEvidence()).result).toBe("PASS");
    expect(evaluateSalesMotionResolverGate(false, true).result).toBe("PASS");
  });

  it("5-9. room workflows accept the correct evidence and reject fake customer context", () => {
    expect(qualifySalesProspect({ icp_match: true, role_fit: true, use_case_fit: true }).qualified).toBe(true);
    expect(evaluateSalesQualificationGate(true, true).result).toBe("PASS");
    expect(provisionSalesRooms(occupancyNpvSalesEvidence({
      inbound_signals: [{ signal_id: "s1", source: "DEMO_REQUEST", target_id: "lead-1", available: true }],
    })).find((room) => room.room === "INBOUND_CONVERSION")?.state).toBe("ACTIVE");
    expect(expansionMayAct(false)).toBe(false);
    expect(provisionSalesRooms(occupancyNpvSalesEvidence({
      partners: [{ partner_id: "p1", venture_id: CRE_VENTURE_ID, relationship: "IDENTIFIED", referrals: 0 }],
    })).find((room) => room.room === "PARTNERSHIPS_CHANNEL")?.state).toBe("MONITORING");
    expect(resolveSalesActionOwnership({
      target_id: "opp-1",
      is_customer: false,
      inbound_active: false,
      qualified_commercial_intent: true,
      partner_referred: false,
    }).primary_room).toBe("OFFER_CLOSING");
  });

  it("10-12. handoffs outbound/inbound to closing and won to expansion", () => {
    expect(resolveSalesRoomHandoff({ from: "OUTBOUND_ACQUISITION", event: "QUALIFIED_COMMERCIAL_INTENT" }).to).toBe("OFFER_CLOSING");
    expect(resolveSalesRoomHandoff({ from: "INBOUND_CONVERSION", event: "PROPOSAL_OR_DECISION" }).to).toBe("OFFER_CLOSING");
    expect(resolveSalesRoomHandoff({ from: "OFFER_CLOSING", event: "WON_AND_ACTIVATED" }).to).toBe("EXPANSION_RETENTION");
    expect(resolveSalesRoomHandoff({ from: "PARTNERSHIPS_CHANNEL", event: "PARTNER_REFERRED_PROSPECT" }).to).toBe("OUTBOUND_ACQUISITION");
    expect(evaluateSalesRoomHandoffGate().result).toBe("PASS");
  });

  it("13-15. duplicate actions and unsubscribes are blocked", () => {
    resetGrowthSuppression();
    recordGrowthSuppression("global:broker@example.com");
    expect(duplicateSalesActionBlocked({ same_target: true, same_kind: true, already_executed: true })).toBe(true);
    expect(evaluateSalesDuplicateActionGate(true).result).toBe("PASS");
    expect(salesOutreachBlocked({ unsubscribed: true })).toBe(true);
    expect(salesOutreachBlocked({ email: "broker@example.com" })).toBe(true);
    expect(evaluateSalesSuppressionGate(true).result).toBe("PASS");
    expect(evaluateSalesActionOwnershipGate({
      target_id: "lead-1",
      actions: [
        { room: "OUTBOUND_ACQUISITION", kind: "OUTREACH" },
        { room: "INBOUND_CONVERSION", kind: "OUTREACH" },
      ],
    }).result).toBe("FAIL");
    expect(evaluateSalesActionOwnershipGate({
      target_id: "lead-1",
      actions: [{ room: "INBOUND_CONVERSION", kind: "OUTREACH" }],
    }).result).toBe("PASS");
    resetGrowthSuppression();
  });

  it("16-19. pipeline stages require evidence and do not treat provider failure as rejection", () => {
    expect(canTransitionPipelineStage({
      from: "CONTACT_READY",
      to: "CONTACTED",
      evidence: [],
    }).allowed).toBe(false);
    expect(canTransitionPipelineStage({
      from: "CONTACT_READY",
      to: "CONTACTED",
      evidence: ["successful_outbound_execution"],
    }).allowed).toBe(true);
    expect(canTransitionPipelineStage({
      from: "ENGAGED",
      to: "WON",
      evidence: [],
      positive_reply: true,
    }).allowed).toBe(false);
    expect(canTransitionPipelineStage({
      from: "ENGAGED",
      to: "LOST",
      evidence: [],
      provider_failure: true,
    }).allowed).toBe(false);
    expect(evaluateSalesPipelineTruthGate({ wonFromReply: true, transitionAllowed: false }).result).toBe("FAIL");
    expect(evaluateSalesPipelineTruthGate({ wonFromReply: false, transitionAllowed: true }).result).toBe("PASS");
    expect(isDuplicateOpportunity(
      [{ account_id: "a1", commercial_event: "lease-compare-pilot" }],
      { account_id: "a1", commercial_event: "lease-compare-pilot" },
    )).toBe(true);
  });

  it("18. unknown metrics are not rendered as zero", () => {
    expect(unknownMetricDisplay("UNKNOWN")).toBe("UNKNOWN");
    expect(evaluateSalesUnknownNotZeroGate("UNKNOWN", "UNKNOWN").result).toBe("PASS");
    expect(evaluateSalesUnknownNotZeroGate("UNKNOWN", "0").result).toBe("FAIL");
  });

  it("20-21. objections aggregate and learning changes future priority", () => {
    const evidence = occupancyNpvSalesEvidence({
      observations: [{ observation_id: "o1", kind: "CHANNEL", key: "inbound-demo", converts: true, weight: 4 }],
      objections: [
        { objection_id: "j1", class: "PRICE" },
        { objection_id: "j2", class: "PRICE" },
        { objection_id: "j3", class: "TRUST" },
      ],
    });
    const view = buildSalesFloorHqView(evidence);
    expect(view.intelligence.top_recurring_objection).toBe("PRICE");
    const learning = learnFromSalesEvidence(evidence.observations);
    expect(learning.changes_priority).toBe(true);
    expect(resolveSalesMotion(evidence, learning).recommended_room).toBe("INBOUND_CONVERSION");
    expect(evaluateSalesIntelligenceLearningGate(true).result).toBe("PASS");
  });

  it("22-23. growth and fulfillment stay distinct from sales", () => {
    expect(resolveWorkOwner("DEMAND_CREATION")).toBe("GROWTH");
    expect(resolveWorkOwner("REVENUE_CONVERSION")).toBe("SALES");
    expect(resolveWorkOwner("DELIVERY")).toBe("FULFILLMENT");
    expect(evaluateSalesGrowthBoundaryGate().result).toBe("PASS");
    expect(evaluateSalesFulfillmentBoundaryGate().result).toBe("PASS");
  });

  it("24-26. paid acquisition and money movement stay blocked", () => {
    const evidence = occupancyNpvSalesEvidence();
    expect(evidence.paid_acquisition).toBe(0);
    expect(evidence.money_movement).toBe("DISABLED");
    expect(evidence.mercury).toBe("READ_ONLY");
    expect(resolveAutonomousSalesOpportunity(evidence).execution_authorized).toBe(false);
    expect(evaluateSalesNoFakeEvidenceGate({ fakeDiscount: false, fakeUrgency: false, fakeLeads: false }).result).toBe("PASS");
  });

  it("27-28. public sales projection is sanitized and not wired into public operations", () => {
    const publicFloor = JSON.stringify(projectPublicSalesFloor());
    expect(evaluateSalesProspectPrivacyGate(publicFloor).result).toBe("PASS");
    expect(evaluateSalesCustomerPrivacyGate(JSON.stringify({
      contract: "PublicOperationsProjection",
      public_ventures: [{ public_name: "OccupancyNPV" }],
    })).result).toBe("PASS");
    expect(publicFloor).not.toContain("broker@");
    expect(publicFloor).not.toContain("$50");
  });

  it("29. OccupancyNPV existing outbound campaign is recognized and not duplicated", () => {
    const view = buildSalesFloorHqView(occupancyNpvSalesEvidence());
    expect(recognizesOccupancyOutboundCampaign(OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID)).toBe(true);
    expect(view.recognized_campaign_id).toBe(OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID);
    expect(view.duplicate_campaign_created).toBe(false);
    expect(view.rooms.find((room) => room.room === "OUTBOUND_ACQUISITION")?.state).toBe("MONITORING");
    expect(view.highest_priority_room).toBe("OUTBOUND_ACQUISITION");
    expect(view.current_motion).toBe("OUTBOUND_PROSPECTING");
    expect(resolveSalesMotion(occupancyNpvSalesEvidence()).recommended_room).toBe("OUTBOUND_ACQUISITION");
  });

  it("30. fixture tests do not mutate production sales state", () => {
    const first = occupancyNpvSalesEvidence({ customers: 0 });
    const second = occupancyNpvSalesEvidence({ customers: 2 });
    expect(first.customers).toBe(0);
    expect(second.customers).toBe(2);
    expect(SALES_ROOMS).toHaveLength(5);
    expect(evaluateSalesFloorCanonicalModelGate(buildSalesFloorHqView()).result).toBe("PASS");
    expect(workHierarchyCopy({
      mission: "Improve OccupancyNPV revenue generation",
      floor: "Advance qualified pipeline",
      room: "Source qualified tenant-rep prospects",
      agent: "Qualify next batch of CRE contacts",
    }).sales_room_contribution).toContain("tenant-rep");
  });
});

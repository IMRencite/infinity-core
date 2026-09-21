import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSalesFloorHqView,
  evaluateCommercialVentureSalesFloorCoverageGate,
  evaluateFiveRoomSalesFloorGate,
  evaluateSalesActionOwnershipGate,
  evaluateSalesCustomerPrivacyGate,
  evaluateSalesDuplicateActionGate,
  evaluateSalesFloorAgentPresenceGate,
  evaluateSalesFloorCanonicalModelGate,
  evaluateSalesFulfillmentBoundaryGate,
  evaluateSalesGrowthBoundaryGate,
  evaluateSalesIntelligenceLearningGate,
  evaluateSalesMotionResolverGate,
  evaluateSalesNoFakeEvidenceGate,
  evaluateSalesPipelineTruthGate,
  evaluateSalesQualificationGate,
  evaluateSalesRoomActivityAnimationGate,
  evaluateSalesRoomHandoffGate,
  evaluateSalesRoomLiveStateProjectionGate,
  evaluateSalesRoomOrbTruthGate,
  evaluateSalesRoomReducedMotionGate,
  evaluateSalesRoomStateTruthGate,
  occupancyNpvSalesEvidence,
  projectSalesFloorLiveState,
} from "..";
import { evaluateHQRoomContributionSpecificityGate } from "@/lib/infinity/current-work-narrative";

describe("Sales Floor HQ experience V1", () => {
  const view = buildSalesFloorHqView(occupancyNpvSalesEvidence());

  it("11-13. five rooms render with visible idle agents", () => {
    expect(view.rooms).toHaveLength(5);
    expect(evaluateSalesFloorAgentPresenceGate(view).result).toBe("PASS");
    expect(view.live?.rooms.every((room) => room.agents.length > 0 && room.agents.every((agent) => !agent.isActive || room.state === "ACTIVE"))).toBe(true);
    expect(view.live?.rooms.find((room) => room.room === "EXPANSION_RETENTION")?.agents.every((agent) => agent.isDormant)).toBe(true);
  });

  it("14-17. orbs follow canonical state and do not fake productivity", () => {
    expect(evaluateSalesRoomOrbTruthGate(view).result).toBe("PASS");
    expect(evaluateSalesRoomActivityAnimationGate(view).result).toBe("PASS");
    expect(view.live?.rooms.find((room) => room.room === "OUTBOUND_ACQUISITION")?.orb.motion).toBe("SUBDUED");
    expect(view.live?.rooms.find((room) => room.room === "EXPANSION_RETENTION")?.orb.active).toBe(false);
    const blocked = projectSalesFloorLiveState({
      ...view,
      rooms: view.rooms.map((room) => room.room === "OFFER_CLOSING" ? { ...room, state: "BLOCKED" } : room),
    });
    expect(blocked.rooms.find((room) => room.room === "OFFER_CLOSING")?.orb.motion).toBe("BLOCKED");
  });

  it("18-20. reduced motion, one live state, and specific Now", () => {
    expect(evaluateSalesRoomReducedMotionGate(view).result).toBe("PASS");
    expect(evaluateSalesRoomLiveStateProjectionGate(view).result).toBe("PASS");
    expect(evaluateHQRoomContributionSpecificityGate(view.live!.rooms.map((room) => room.now)).result).toBe("PASS");
    expect(view.current_work?.displayText).toContain("affiliate-program capability");
    expect(view.live?.rooms.find((room) => room.room === "PARTNERSHIPS_CHANNEL")?.now.displayText).toMatch(/affiliate/i);
  });

  it("re-runs verified sales foundation gates", () => {
    const evidence = occupancyNpvSalesEvidence();
    expect(evaluateSalesFloorCanonicalModelGate(view).result).toBe("PASS");
    expect(evaluateCommercialVentureSalesFloorCoverageGate({ commercial: true, rooms: 5 }).result).toBe("PASS");
    expect(evaluateFiveRoomSalesFloorGate(evidence).result).toBe("PASS");
    expect(evaluateSalesMotionResolverGate(false, true).result).toBe("PASS");
    expect(evaluateSalesRoomStateTruthGate(evidence).result).toBe("PASS");
    expect(evaluateSalesPipelineTruthGate({ wonFromReply: false, transitionAllowed: true }).result).toBe("PASS");
    expect(evaluateSalesQualificationGate(true, true).result).toBe("PASS");
    expect(evaluateSalesIntelligenceLearningGate(true).result).toBe("PASS");
    expect(evaluateSalesDuplicateActionGate(true).result).toBe("PASS");
    expect(evaluateSalesActionOwnershipGate({
      target_id: "lead-1",
      actions: [{ room: "INBOUND_CONVERSION", kind: "OUTREACH" }],
    }).result).toBe("PASS");
    expect(evaluateSalesRoomHandoffGate().result).toBe("PASS");
    expect(evaluateSalesGrowthBoundaryGate().result).toBe("PASS");
    expect(evaluateSalesFulfillmentBoundaryGate().result).toBe("PASS");
    expect(evaluateSalesCustomerPrivacyGate(JSON.stringify({ contract: "PublicOperationsProjection" })).result).toBe("PASS");
    expect(evaluateSalesNoFakeEvidenceGate({}).result).toBe("PASS");
  });

  it("Sales Floor UI uses HQ room shells instead of a card dashboard", () => {
    const source = readFileSync(join(process.cwd(), "components/dashboard/operator-console/hq-sales-floor.tsx"), "utf8");
    expect(source).toContain("InfinityRoomShell");
    expect(source).toContain("RoomPresenceTrack");
    expect(source).toContain("RoomCurrentActivity");
    expect(source).toContain("hq-sales-operating-floor");
    expect(source).toContain("prefers-reduced-motion");
    expect(source).toContain("data-hq-sales-learning");
  });
});

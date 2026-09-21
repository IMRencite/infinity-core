import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_HQ_ROOM_IDS } from "@/lib/infinity/operator-console/room-naming";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import { occupancynpvGrowthRecommendation } from "@/lib/infinity/growth-engine/recommendations";
import {
  GLOBAL_SHARED_COMPONENT_DEFECT,
  HQ_CARD_CONTENT_SPACING_CONTRACT,
  HQ_FIRST_CLASS_ROOM_RENDERED_QC_REGISTRY,
  HQ_LONG_CONTENT_PRESENTATION_GATE,
  HQ_OUTPUT_CARD,
  HQ_STATUS_BADGE,
  REPEATED_VISUAL_DEFECT_ESCAPED_QC,
  evaluateAllFirstClassRoomsRenderedQuality,
  evaluateGrowthNexusCompletenessGate,
  evaluateHQCardContentSpacingContract,
  evaluateHQContentOverflowGate,
  evaluateHQFirstClassRoomRenderedQCRegistry,
  evaluateHQFirstClassRoomRenderedQualityGate,
  evaluateHQLongContentPresentationGate,
  evaluateHQRoomContentRhythmGate,
  evaluateHQRoomOutputCountConsistencyGate,
  evaluateHQRoomStateContentConsistencyGate,
  evaluateHQTextCollisionGate,
  evaluateRepeatedHQVisualDefectPromotionGate,
  hqFirstClassRoomRenderedQCRegistry,
  hqPresentationKind,
  isCompactDecisionToken,
} from "../index";

const ROOT = process.cwd();

describe("HQFirstClassRoomRenderedQCRegistry", () => {
  it("includes every registered first-class room automatically", () => {
    const gate = evaluateHQFirstClassRoomRenderedQCRegistry();
    expect(gate.gate).toBe(HQ_FIRST_CLASS_ROOM_RENDERED_QC_REGISTRY);
    expect(gate.result).toBe("PASS");
    expect(hqFirstClassRoomRenderedQCRegistry()).toEqual(expect.arrayContaining([...ALL_HQ_ROOM_IDS]));
    expect(hqFirstClassRoomRenderedQCRegistry()).toHaveLength(ALL_HQ_ROOM_IDS.length);
  });
});

describe("HQRoomStateContentConsistencyGate", () => {
  it("fails EMPTY while Growth Nexus outputs exist", () => {
    expect(
      evaluateHQRoomStateContentConsistencyGate({
        renderedState: "EMPTY",
        currentWorkCount: 0,
        recentOutputCount: 2,
        canonicalRecordCount: 2,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateHQRoomStateContentConsistencyGate({
        renderedState: "PRESENT_IDLE",
        currentWorkCount: 0,
        recentOutputCount: 2,
        canonicalRecordCount: 2,
      }).result,
    ).toBe("PASS");
  });

  it("deriveRoomPresence is PRESENT_IDLE when outputs exist without workers", () => {
    expect(deriveRoomPresence([], "COMPLETE", false, { outputCount: 2 }).state).toBe("PRESENT_IDLE");
    expect(deriveRoomPresence([], "NOT_STARTED").state).toBe("EMPTY");
  });
});

describe("HQLongContentPresentationGate", () => {
  it("fails long growth learning objectives forced into pills", () => {
    const long =
      "GROWTH_ACTIVATION_REQUIRED — Which entry offer produces a completed lease comparison from qualified CRE operators";
    expect(hqPresentationKind({ value: long })).toBe(HQ_OUTPUT_CARD);
    expect(evaluateHQLongContentPresentationGate({ value: long, renderedKind: HQ_STATUS_BADGE }).result).toBe("FAIL");
    expect(evaluateHQLongContentPresentationGate({ value: long, role: "output" }).gate).toBe(
      HQ_LONG_CONTENT_PRESENTATION_GATE,
    );
    expect(evaluateHQLongContentPresentationGate({ value: long, role: "output" }).result).toBe("PASS");
    expect(isCompactDecisionToken("BUILD")).toBe(true);
    expect(isCompactDecisionToken(long)).toBe(false);
  });
});

describe("shared presentation and growth nexus", () => {
  it("requires roomier output-card spacing than the prior pill padding", () => {
    const gate = evaluateHQCardContentSpacingContract({
      horizontalPaddingPx: 22,
      verticalPaddingPx: 18,
      lineHeight: 1.5,
      textBorderGapPx: 16,
      titleBodyGapPx: 8,
    });
    expect(gate.gate).toBe(HQ_CARD_CONTENT_SPACING_CONTRACT);
    expect(gate.result).toBe("PASS");
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    expect(css).toContain("1.1rem 1.4rem");
    expect(css).toContain("minmax(14.5rem, 1fr)");
  });

  it("promotes the Profit Lab / Growth Nexus repeat as a shared-component defect", () => {
    const gate = evaluateRepeatedHQVisualDefectPromotionGate({
      roomsWithEquivalentDefect: ["strategy_finance", "growth_department"],
      repairedLocallyOnly: true,
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(expect.arrayContaining([GLOBAL_SHARED_COMPONENT_DEFECT, REPEATED_VISUAL_DEFECT_ESCAPED_QC]));
    expect(
      evaluateRepeatedHQVisualDefectPromotionGate({
        roomsWithEquivalentDefect: [],
        repairedLocallyOnly: false,
      }).result,
    ).toBe("PASS");
  });

  it("Growth Nexus with strategy cannot render EMPTY", () => {
    const rec = occupancynpvGrowthRecommendation();
    expect(
      evaluateGrowthNexusCompletenessGate({
        strategyExists: true,
        outputExists: true,
        campaignExists: true,
        learningObjectiveExists: Boolean(rec.strategy.next_learning_objective),
        renderedEmpty: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateGrowthNexusCompletenessGate({
        strategyExists: true,
        outputExists: true,
        campaignExists: true,
        learningObjectiveExists: true,
        renderedEmpty: false,
      }).result,
    ).toBe("PASS");
  });

  it("output count cannot be EMPTY", () => {
    expect(
      evaluateHQRoomOutputCountConsistencyGate({
        announcedOutputCount: 2,
        renderedOutputCount: 2,
        viewAllAvailable: true,
        renderedState: "EMPTY",
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateHQRoomOutputCountConsistencyGate({
        announcedOutputCount: 2,
        renderedOutputCount: 2,
        viewAllAvailable: true,
        renderedState: "PRESENT_IDLE",
      }).result,
    ).toBe("PASS");
  });

  it("collision, overflow, and rhythm gates fail cramped geometry", () => {
    expect(
      evaluateHQTextCollisionGate({
        textOverlapsText: true,
        textOverlapsBorder: false,
        textOverlapsBadge: false,
        cardOverlap: false,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateHQContentOverflowGate({
        clipped: false,
        hidden: false,
        overflowedOutsideCard: true,
        unreadablyTruncated: false,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateHQRoomContentRhythmGate({
        rowGapPx: 12,
        sectionGapPx: 16,
        titleBodyGapPx: 8,
        metadataGapPx: 8,
      }).result,
    ).toBe("PASS");
  });

  it("runs rendered quality across every registered room", () => {
    const rooms = hqFirstClassRoomRenderedQCRegistry().map((roomId) => {
      const circular = roomId === "strategy_finance" || roomId === "growth_department" || roomId === "opportunity_lab";
      return {
        roomId,
        readableCards: true,
        collisions: false,
        clipping: false,
        overflow: false,
        stateContentConsistent: true,
        usesCircularOutputs: circular,
        circularGeometry: circular
          ? { intendedForm: "CIRCULAR_OUTPUT" as const, widthPx: 156, heightPx: 156, borderRadiusPercent: 50 }
          : undefined,
        circularSpacing: circular
          ? {
              horizontalPaddingPx: 18,
              verticalPaddingPx: 18,
              lineHeight: 1.35,
              textTouchesCircumference: false,
              overflow: false,
              fontSizePx: 12,
              centered: true,
            }
          : undefined,
        visualForm: circular
          ? { intended: "CIRCULAR_OUTPUT" as const, rendered: "CIRCULAR_OUTPUT" as const }
          : { intended: "CARD" as const, rendered: "CARD" as const },
        longContentSeparated: true,
      };
    });
    const summary = evaluateAllFirstClassRoomsRenderedQuality(rooms);
    expect(summary.omitted).toBe(0);
    expect(summary.failed).toEqual([]);
    expect(summary.passed).toHaveLength(ALL_HQ_ROOM_IDS.length);
    expect(evaluateHQFirstClassRoomRenderedQualityGate(rooms[0]!).result).toBe("PASS");
  });

  it("ArtifactStack no longer routes long growth titles through DecisionToken", () => {
    const primitives = readFileSync(join(ROOT, "components/dashboard/operator-console/artifacts/primitives.tsx"), "utf8");
    expect(primitives).toContain("isCompactDecisionToken");
    expect(primitives).toContain("HQCircularOutputNode");
    expect(primitives).toContain("hq-circular-orb");
    expect(primitives).not.toMatch(/isCompactDecisionToken[\s\S]*DecisionToken[\s\S]*learning_decision/);
    const attach = readFileSync(join(ROOT, "lib/infinity/operator-console/attach-global-hq-floor.ts"), "utf8");
    expect(attach).toContain('artifactType: "learning_decision"');
    expect(attach).toContain("HQCircularOutputCard");
    expect(attach).toMatch(/function growthNexusArtifacts[\s\S]*?artifactType: "learning_decision"/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { occupancynpvGrowthRecommendation } from "@/lib/infinity/growth-engine/recommendations";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import {
  HQ_CIRCULAR_CONTENT_SPACING_GATE,
  HQ_CIRCULAR_GEOMETRY_GATE,
  HQ_CIRCULAR_OUTPUT_CARD,
  HQ_CIRCULAR_OUTPUT_PRESENTATION_CONTRACT,
  HQ_CIRCULAR_RENDERED_QUALITY_GATE,
  HQ_LONG_FORM_VALUE,
  HQ_OUTPUT_DETAIL,
  HQ_VISUAL_DESIGN_INTENT_GATE,
  evaluateHQCircularContentSpacingGate,
  evaluateHQCircularGeometryGate,
  evaluateHQCircularOutputPresentationContract,
  evaluateHQCircularRenderedQualityGate,
  evaluateHQCircularResponsiveGrid,
  evaluateHQLongContentPresentationGate,
  evaluateHQVisualDesignIntentGate,
  evaluateRepeatedHQVisualDefectPromotionGate,
  hqPresentationClassName,
  roomInheritsCircularQC,
  splitCircularOutput,
} from "../index";

const ROOT = process.cwd();

const TRUE_CIRCLE = {
  intendedForm: "CIRCULAR_OUTPUT" as const,
  widthPx: 156,
  heightPx: 156,
  borderRadiusPercent: 50,
};

const CIRCLE_SPACING = {
  horizontalPaddingPx: 18,
  verticalPaddingPx: 18,
  lineHeight: 1.35,
  textTouchesCircumference: false,
  overflow: false,
  fontSizePx: 12,
  centered: true,
};

describe("HQCircularOutputPresentationContract", () => {
  it("splits compact growth status from the long learning objective", () => {
    const rec = occupancynpvGrowthRecommendation();
    const parts = splitCircularOutput(
      rec.strategy.current_status,
      rec.strategy.next_learning_objective,
      rec.strategy.current_status,
    );
    expect(parts.orb).toBe(rec.strategy.current_status.replace(/_/g, " "));
    expect(parts.detail).toBe(rec.strategy.next_learning_objective);
    expect(parts.detail && parts.detail.length > 36).toBe(true);
    expect(
      evaluateHQCircularOutputPresentationContract({
        semanticType: "STATUS_NODE",
        orbValue: parts.orb,
        detailValue: parts.detail,
        widthPx: 156,
        heightPx: 156,
        borderRadiusPercent: 50,
      }).gate,
    ).toBe(HQ_CIRCULAR_OUTPUT_PRESENTATION_CONTRACT);
    expect(
      evaluateHQCircularOutputPresentationContract({
        semanticType: "STATUS_NODE",
        orbValue: parts.orb,
        detailValue: parts.detail,
        widthPx: 156,
        heightPx: 156,
        borderRadiusPercent: 50,
      }).result,
    ).toBe("PASS");
  });

  it("maps circular and detail primitives to distinct classes", () => {
    expect(hqPresentationClassName(HQ_CIRCULAR_OUTPUT_CARD)).toBe("hq-circular-orb");
    expect(hqPresentationClassName(HQ_OUTPUT_DETAIL)).toBe("hq-circular-output-detail");
    expect(hqPresentationClassName(HQ_LONG_FORM_VALUE)).toBe("hq-long-form-value");
  });
});

describe("HQCircularGeometryGate", () => {
  it("fails a rectangular card pretending to be a circle", () => {
    const gate = evaluateHQCircularGeometryGate({
      intendedForm: "CIRCULAR_OUTPUT",
      widthPx: 220,
      heightPx: 140,
      borderRadiusPx: 14,
    });
    expect(gate.gate).toBe(HQ_CIRCULAR_GEOMETRY_GATE);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(
      expect.arrayContaining(["NOT_1_TO_1_CIRCLE", "NOT_TRUE_CIRCULAR_RADIUS", "ROUNDED_RECTANGLE_NOT_CIRCLE"]),
    );
    expect(
      evaluateHQVisualDesignIntentGate({ intended: "CIRCULAR_OUTPUT", rendered: "CARD" }).result,
    ).toBe("FAIL");
  });

  it("passes true 1:1 circular geometry", () => {
    expect(evaluateHQCircularGeometryGate(TRUE_CIRCLE).result).toBe("PASS");
  });
});

describe("HQCircularContentSpacingGate", () => {
  it("fails a true circle with cramped interior text", () => {
    const gate = evaluateHQCircularContentSpacingGate({
      horizontalPaddingPx: 4,
      verticalPaddingPx: 4,
      lineHeight: 1.05,
      textTouchesCircumference: true,
      overflow: true,
      clipped: true,
      fontSizePx: 8,
    });
    expect(gate.gate).toBe(HQ_CIRCULAR_CONTENT_SPACING_GATE);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(
      expect.arrayContaining([
        "CIRCLE_HORIZONTAL_PADDING_CRAMPED",
        "TEXT_TOUCHES_CIRCUMFERENCE",
        "CIRCLE_OVERFLOW",
        "TINY_FONT_WORKAROUND",
      ]),
    );
  });

  it("passes padded centered circular content", () => {
    expect(evaluateHQCircularContentSpacingGate(CIRCLE_SPACING).result).toBe("PASS");
  });
});

describe("HQLongContentPresentationGate circular fixtures", () => {
  it("fails a long learning objective forced entirely inside a compact circle", () => {
    const long = "Which entry offer produces a completed lease comparison from qualified CRE operators";
    expect(
      evaluateHQLongContentPresentationGate({ value: long, renderedKind: HQ_CIRCULAR_OUTPUT_CARD }).result,
    ).toBe("FAIL");
  });

  it("passes orb plus associated explanatory body", () => {
    const quality = evaluateHQCircularRenderedQualityGate({
      geometry: TRUE_CIRCLE,
      spacing: CIRCLE_SPACING,
      longContent: {
        value: "GROWTH_ACTIVATION_REQUIRED",
        renderedKind: HQ_CIRCULAR_OUTPUT_CARD,
      },
      eligibility: "STATUS_NODE",
      visualForm: { intended: "CIRCULAR_OUTPUT", rendered: "CIRCULAR_OUTPUT" },
    });
    expect(quality.gate).toBe(HQ_CIRCULAR_RENDERED_QUALITY_GATE);
    expect(quality.result).toBe("PASS");
    expect(
      evaluateHQLongContentPresentationGate({
        value: "Which entry offer produces a completed lease comparison from qualified CRE operators",
        renderedKind: HQ_OUTPUT_DETAIL,
      }).result,
    ).toBe("PASS");
  });
});

describe("HQVisualDesignIntentGate", () => {
  it("does not require cards to become circles", () => {
    expect(evaluateHQVisualDesignIntentGate({ intended: "CARD", rendered: "CARD" }).gate).toBe(
      HQ_VISUAL_DESIGN_INTENT_GATE,
    );
    expect(evaluateHQVisualDesignIntentGate({ intended: "CARD", rendered: "CARD" }).result).toBe("PASS");
    expect(evaluateHQVisualDesignIntentGate({ intended: "CARD", rendered: "CIRCULAR_OUTPUT" }).result).toBe("PASS");
  });

  it("records the readability repair that erased circular language", () => {
    const gate = evaluateRepeatedHQVisualDefectPromotionGate({
      roomsWithEquivalentDefect: ["strategy_finance", "growth_department"],
      repairedLocallyOnly: false,
      erasedDeclaredVisualForm: true,
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toContain("VISUAL_LANGUAGE_ERASED_BY_READABILITY_REPAIR");
  });
});

describe("responsive circular grid", () => {
  it("reduces columns instead of shrinking the circle unreadably", () => {
    expect(
      evaluateHQCircularResponsiveGrid({
        viewportWidthPx: 700,
        columnCount: 4,
        circleDiameterPx: 80,
        fontSizePx: 9,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateHQCircularResponsiveGrid({
        viewportWidthPx: 700,
        columnCount: 1,
        circleDiameterPx: 160,
        fontSizePx: 12,
      }).result,
    ).toBe("PASS");
  });
});

describe("circular implementation and inheritance", () => {
  it("uses true circular CSS rather than a rounded rectangle", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/\.hq-circular-orb \{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1/);
    expect(css).toMatch(/\.hq-circular-orb \{[\s\S]*?border-radius:\s*50%/);
    expect(css).toMatch(/\.hq-circular-orb \{[\s\S]*?padding:\s*1\.15rem/);
    expect(css).toMatch(/\.hq-circular-output-detail \{[\s\S]*?padding:\s*1\.1rem\s+1\.4rem/);
    expect(css).toContain("minmax(16rem, 1fr)");
  });

  it("inherits circular QC from output semantics, not a manual QC list", () => {
    expect(roomInheritsCircularQC({ roomId: "growth_department" })).toBe(true);
    expect(roomInheritsCircularQC({ roomId: "strategy_finance" })).toBe(true);
    expect(roomInheritsCircularQC({ roomId: "opportunity_lab" })).toBe(true);
    expect(roomInheritsCircularQC({ roomId: "research_department" })).toBe(false);
    expect(roomInheritsCircularQC({ roomId: "future_room", artifactTypes: ["learning_decision"] })).toBe(true);
    expect(roomInheritsCircularQC({ roomId: "future_room", usesCircularOutputs: true })).toBe(true);
  });

  it("keeps DecisionToken off long growth titles", () => {
    const primitives = readFileSync(join(ROOT, "components/dashboard/operator-console/artifacts/primitives.tsx"), "utf8");
    expect(primitives).toContain("isCompactDecisionToken");
    expect(primitives).toContain("HQCircularOutputNode");
    expect(primitives).toContain("usesCircularFloorOutput");
    const presence = deriveRoomPresence([], "COMPLETE", false, { outputCount: 2 });
    expect(presence.state).toBe("PRESENT_IDLE");
  });
});

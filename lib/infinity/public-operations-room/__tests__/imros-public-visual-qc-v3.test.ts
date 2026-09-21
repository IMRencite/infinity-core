import { describe, expect, it } from "vitest";
import {
  evaluateArchitecturalVisualIntentGate,
  evaluateBrandExperienceQualityGate,
  evaluateFounderVisualAcceptanceGate,
  evaluatePublicActiveRoomVisualResponseGate,
  evaluatePublicAgentPresenceProminenceGate,
  evaluatePublicFullWidthOperationsExperienceGate,
  evaluatePublicFuturisticGridBackgroundGate,
  evaluatePublicHQPaletteConsistencyGate,
  evaluatePublicHomepageVisualSophisticationGate,
  evaluatePublicOperationsThreeColumnLayoutGate,
  evaluatePublicIdleAgentPresenceGate,
  evaluatePublicImrBrandMarkGate,
  evaluatePublicOverheadRoomCompositionGate,
} from "../visual-gates";

describe("IMROS public visual QC V3", () => {
  it("requires full-width overhead HQ rather than a narrow dashboard", () => {
    expect(evaluatePublicHomepageVisualSophisticationGate().result).toBe("PASS");
    expect(evaluateArchitecturalVisualIntentGate().result).toBe("PASS");
    expect(evaluateBrandExperienceQualityGate().result).toBe("PASS");
    expect(evaluatePublicOverheadRoomCompositionGate().result).toBe("PASS");
    expect(evaluatePublicOperationsThreeColumnLayoutGate().result).toBe("PASS");
    expect(evaluatePublicAgentPresenceProminenceGate().result).toBe("PASS");
    expect(evaluatePublicActiveRoomVisualResponseGate().result).toBe("PASS");
    expect(evaluatePublicHQPaletteConsistencyGate().result).toBe("PASS");
    expect(evaluatePublicFuturisticGridBackgroundGate().result).toBe("PASS");
    expect(evaluatePublicFullWidthOperationsExperienceGate().result).toBe("PASS");
    expect(evaluatePublicIdleAgentPresenceGate().result).toBe("PASS");
    expect(evaluatePublicImrBrandMarkGate().result).toBe("PASS");
  });

  it("keeps founder physical evidence above an automated visual pass", () => {
    expect(evaluateFounderVisualAcceptanceGate({ priorAutomatedPass: true }).result).toBe("PENDING_FOUNDER_REVIEW");
    expect(evaluateFounderVisualAcceptanceGate({ founderRejected: true }).result).toBe("FAIL");
    expect(evaluateFounderVisualAcceptanceGate({ founderAccepted: true }).result).toBe("PASS");
  });
});

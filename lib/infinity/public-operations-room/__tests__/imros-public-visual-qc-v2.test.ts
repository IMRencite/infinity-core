import { describe, expect, it } from "vitest";
import {
  evaluateArchitecturalVisualIntentGate,
  evaluateBrandExperienceQualityGate,
  evaluateFounderVisualAcceptanceGate,
  evaluatePublicHomepageVisualSophisticationGate,
} from "../visual-gates";

describe("IMROS public visual QC V2", () => {
  it("fails a flat dashboard and requires architectural HQ intent", () => {
    expect(evaluatePublicHomepageVisualSophisticationGate().result).toBe("PASS");
    expect(evaluateArchitecturalVisualIntentGate().result).toBe("PASS");
    expect(evaluateBrandExperienceQualityGate().result).toBe("PASS");
  });

  it("keeps founder physical evidence above an automated visual pass", () => {
    expect(evaluateFounderVisualAcceptanceGate({ priorAutomatedPass: true }).result).toBe("PENDING_FOUNDER_REVIEW");
    expect(evaluateFounderVisualAcceptanceGate({ founderRejected: true }).result).toBe("FAIL");
    expect(evaluateFounderVisualAcceptanceGate({ founderAccepted: true }).result).toBe("PASS");
  });
});

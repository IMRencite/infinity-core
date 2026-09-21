import { describe, expect, it } from "vitest";
import { buildFavc1TerminalDisplay } from "@/lib/infinity/operator-console/favc1-cycle/terminal-messaging";

describe("FAVC1 terminal messaging", () => {
  it("maps validation_required to validation-specific headline", () => {
    const display = buildFavc1TerminalDisplay({
      terminalOutcome: "BUSINESS_NO_GO",
      selectionStopReasonPath: "validation_required",
      validationOutcome: "VALIDATE",
    });
    expect(display.headline).toBe("Mission Completed — Candidate Still Requires Validation");
    expect(display.decision).toContain("bounded validation round");
    expect(display.systemDetail).toContain("validationOutcome=VALIDATE");
  });

  it("maps safety_constraints to safety headline", () => {
    const display = buildFavc1TerminalDisplay({
      terminalOutcome: "BUSINESS_NO_GO",
      selectionStopReasonPath: "safety_constraints",
    });
    expect(display.headline).toBe("Mission Completed — Candidate Blocked By Safety Constraints");
  });

  it("maps SYSTEM_FAILURE to failure headline", () => {
    const display = buildFavc1TerminalDisplay({
      terminalOutcome: "SYSTEM_FAILURE",
      failureMessage: "provider_timeout",
    });
    expect(display.headline).toBe("Mission Interrupted — System Failure");
  });

  it("maps INFRASTRUCTURE_BLOCKED to infrastructure headline", () => {
    const display = buildFavc1TerminalDisplay({
      terminalOutcome: "INFRASTRUCTURE_BLOCKED",
      failureMessage: "database_unavailable",
    });
    expect(display.headline).toBe("Mission Blocked — Infrastructure Unavailable");
  });

  it("maps LEVEL_4 to success headline", () => {
    const display = buildFavc1TerminalDisplay({ terminalOutcome: "LEVEL_4" });
    expect(display.headline).toBe("Autonomous Venture Cycle Complete");
  });

  it("falls back to raw stopReason when path unknown", () => {
    const display = buildFavc1TerminalDisplay({
      terminalOutcome: "BUSINESS_NO_GO",
      stopReason: "custom_stop_reason",
    });
    expect(display.headline).toBe("Mission Completed — No Candidate Passed the Build Decision");
    expect(display.systemDetail).toBe("custom_stop_reason");
  });
});

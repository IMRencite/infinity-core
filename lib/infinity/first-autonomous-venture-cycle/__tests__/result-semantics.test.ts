import { describe, it, expect } from "vitest";
import {
  classifyFavc1Outcome,
  isTechnicalFavc1Failure,
  mapScannerFailureToCycleLevel,
} from "../result-semantics";
import { classifyScannerFailure } from "@/lib/infinity/opportunity-scanner/failures";

describe("FAVC1 result semantics", () => {
  it("maps scanner_unavailable to LEVEL_0_SYSTEM_FAILURE", () => {
    expect(mapScannerFailureToCycleLevel("scanner_unavailable")).toBe("LEVEL_0_SYSTEM_FAILURE");
  });

  it("maps persistence_failure to LEVEL_0_SYSTEM_FAILURE", () => {
    expect(mapScannerFailureToCycleLevel("persistence_failure")).toBe("LEVEL_0_SYSTEM_FAILURE");
  });

  it("maps infrastructure_blocked to INFRASTRUCTURE_BLOCKED", () => {
    expect(mapScannerFailureToCycleLevel("infrastructure_blocked")).toBe("INFRASTRUCTURE_BLOCKED");
  });

  it("maps timeout to INFRASTRUCTURE_BLOCKED", () => {
    expect(mapScannerFailureToCycleLevel("timeout")).toBe("INFRASTRUCTURE_BLOCKED");
  });

  it("classifies technical scanner failure as SYSTEM_FAILURE outcome", () => {
    expect(
      classifyFavc1Outcome({
        ok: false,
        level: "LEVEL_0_SYSTEM_FAILURE",
        closedLoopProven: false,
      }),
    ).toBe("SYSTEM_FAILURE");
  });

  it("classifies market rejection as BUSINESS_NO_GO outcome", () => {
    expect(
      classifyFavc1Outcome({
        ok: false,
        level: "NO_GO_MARKET_DECISION",
        closedLoopProven: false,
      }),
    ).toBe("BUSINESS_NO_GO");
  });

  it("classifies LEVEL_4 closed loop as CLOSED_LOOP_VERIFIED", () => {
    expect(
      classifyFavc1Outcome({
        ok: true,
        level: "LEVEL_4",
        closedLoopProven: true,
      }),
    ).toBe("CLOSED_LOOP_VERIFIED");
  });

  it("flags technical failures for live verification rejection", () => {
    expect(isTechnicalFavc1Failure("LEVEL_0_SYSTEM_FAILURE")).toBe(true);
    expect(isTechnicalFavc1Failure("INFRASTRUCTURE_BLOCKED")).toBe(true);
    expect(isTechnicalFavc1Failure("NO_GO_MARKET_DECISION")).toBe(false);
    expect(isTechnicalFavc1Failure("LEVEL_4")).toBe(false);
  });

  it("maps SQLSTATE 57014 to INFRASTRUCTURE_BLOCKED via scanner classifier", () => {
    const classified = classifyScannerFailure({
      code: "57014",
      message: "canceling statement due to statement timeout",
    });
    expect(classified.classification).toBe("infrastructure_blocked");
    expect(mapScannerFailureToCycleLevel(classified.classification)).toBe("INFRASTRUCTURE_BLOCKED");
  });
});

describe("failed FAVC1 cycle-1786902188200 semantics", () => {
  it("would fail live verification under repaired contract", () => {
    const failedRun = {
      ok: false,
      level: "LEVEL_0_SYSTEM_FAILURE" as const,
      outcome: "SYSTEM_FAILURE" as const,
      closedLoopProven: false,
      stopReason: "[scanner_unavailable] Unknown scanner failure.",
      ventureAssemblyId: null,
    };

    expect(isTechnicalFavc1Failure(failedRun.level)).toBe(true);
    expect(failedRun.ok).toBe(false);
    expect(failedRun.closedLoopProven).toBe(false);
    expect(failedRun.ventureAssemblyId).toBeNull();
  });
});

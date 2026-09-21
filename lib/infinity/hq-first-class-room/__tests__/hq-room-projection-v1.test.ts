import { describe, expect, it } from "vitest";
import {
  GROWTH_STRATEGY_REQUIRED,
  HQ_GLOBAL_ROOM_SCOPE_INTEGRITY_GATE,
  HQ_ROOM_EMPTY_STATE_VALIDITY_GATE,
  HQ_ROOM_PROJECTION_CONTRACT,
  HQ_ROOM_PROJECTION_FALLBACK_MASKING_GATE,
  PROJECTION_ERROR,
  evaluateHQGlobalRoomScopeIntegrityGate,
  evaluateHQRoomEmptyStateValidityGate,
  evaluateHQRoomProjectionContract,
  evaluateHQRoomProjectionFallbackMaskingGate,
} from "../room-projection";

describe("HQRoomProjectionContract", () => {
  it("registers global and venture-linked floor rooms", () => {
    const gate = evaluateHQRoomProjectionContract();
    expect(gate.gate).toBe(HQ_ROOM_PROJECTION_CONTRACT);
    expect(gate.result).toBe("PASS");
    expect(GROWTH_STRATEGY_REQUIRED).toBe("GROWTH_STRATEGY_REQUIRED");
  });
});

describe("HQRoomEmptyStateValidityGate", () => {
  it("Fixture D: 133 opportunities + empty Venture Radar fails", () => {
    const gate = evaluateHQRoomEmptyStateValidityGate({
      roomId: "opportunity_lab",
      renderedEmpty: true,
      canonicalRecordCount: 133,
    });
    expect(gate.gate).toBe(HQ_ROOM_EMPTY_STATE_VALIDITY_GATE);
    expect(gate.result).toBe("FAIL");
  });

  it("Fixture E: economics records + empty Profit Lab fails", () => {
    const gate = evaluateHQRoomEmptyStateValidityGate({
      roomId: "strategy_finance",
      renderedEmpty: true,
      canonicalRecordCount: 2,
    });
    expect(gate.result).toBe("FAIL");
  });

  it("fails Growth Nexus EMPTY while strategy outputs exist", () => {
    const gate = evaluateHQRoomEmptyStateValidityGate({
      roomId: "growth_department",
      renderedEmpty: true,
      canonicalRecordCount: 2,
    });
    expect(gate.result).toBe("FAIL");
  });

  it("allows EMPTY only when the room has no canonical records", () => {
    const gate = evaluateHQRoomEmptyStateValidityGate({
      roomId: "company_operations",
      renderedEmpty: true,
      canonicalRecordCount: 0,
    });
    expect(gate.result).toBe("PASS");
  });
});

describe("HQRoomProjectionFallbackMaskingGate", () => {
  it("Fixture G: projection failure must not render as EMPTY", () => {
    const masked = evaluateHQRoomProjectionFallbackMaskingGate({
      projectionFailed: true,
      renderedState: "EMPTY",
    });
    expect(masked.gate).toBe(HQ_ROOM_PROJECTION_FALLBACK_MASKING_GATE);
    expect(masked.result).toBe("FAIL");
    const explicit = evaluateHQRoomProjectionFallbackMaskingGate({
      projectionFailed: true,
      renderedState: PROJECTION_ERROR,
    });
    expect(explicit.result).toBe("PASS");
  });
});

describe("HQGlobalRoomScopeIntegrityGate", () => {
  it("Fixture F: inspect OccupancyNPV must not erase global rooms", () => {
    const erased = evaluateHQGlobalRoomScopeIntegrityGate({
      inspectActive: true,
      radarArtifactCount: 0,
      opportunityCount: 133,
      profitLabRowCount: 0,
      economicsRecordCount: 2,
      operationsPresent: true,
    });
    expect(erased.gate).toBe(HQ_GLOBAL_ROOM_SCOPE_INTEGRITY_GATE);
    expect(erased.result).toBe("FAIL");
    expect(erased.reasons).toContain("INSPECT_QUERY_ERASED_GLOBAL_ROOMS");

    const restored = evaluateHQGlobalRoomScopeIntegrityGate({
      inspectActive: true,
      radarArtifactCount: 11,
      opportunityCount: 133,
      profitLabRowCount: 2,
      economicsRecordCount: 2,
      operationsPresent: true,
    });
    expect(restored.result).toBe("PASS");
  });
});

import { describe, expect, it } from "vitest";
import {
  evaluateHQCurrentWorkCanonicalSourceGate,
  evaluateHQCurrentWorkFreshnessGate,
  evaluateHQCurrentWorkSpecificityGate,
  evaluateHQCurrentWorkStateConsistencyGate,
  evaluateHQGenericWorkDescriptionGate,
  evaluateHQRoomContributionSpecificityGate,
  historicalWorkCannotRelight,
  isGenericWorkerOnlyNow,
  narrativeLeavesCompletedWork,
  projectCurrentWorkNarrative,
} from "..";
import { buildSalesFloorHqView } from "@/lib/infinity/venture-sales-floor/hq";
import { occupancyNpvSalesEvidence } from "@/lib/infinity/venture-sales-floor/occupancy";

function specific(overrides: Partial<Parameters<typeof projectCurrentWorkNarrative>[0]> = {}) {
  return projectCurrentWorkNarrative({
    ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    departmentId: "sales_floor",
    roomId: "PARTNERSHIPS_CHANNEL",
    state: "MONITORING",
    action: "Building",
    object: "OccupancyNPV affiliate program",
    purpose: "prepare recruitment channels",
    displayText: "Building OccupancyNPV's affiliate program and preparing qualified affiliate recruitment channels.",
    nextExpectedAction: "Do not send outreach",
    sourceType: "SALES_ROOM",
    sourceId: "sales-room:PARTNERSHIPS_CHANNEL:MONITORING",
    ...overrides,
  });
}

describe("HQ Current Work Narrative V1", () => {
  it("1. specific Now text replaces generic worker-only text", () => {
    expect(isGenericWorkerOnlyNow("External Implementation Agent")).toBe(true);
    expect(isGenericWorkerOnlyNow("Working")).toBe(true);
    expect(evaluateHQCurrentWorkSpecificityGate(specific()).result).toBe("PASS");
    expect(evaluateHQGenericWorkDescriptionGate(specific({ displayText: "Working" })).result).toBe("FAIL");
  });

  it("2. worker remains visible as secondary metadata", () => {
    const narrative = specific({ workerLabel: "External Implementation Agent", workerState: "MONITORING" });
    expect(narrative.displayText).not.toBe(narrative.workerLabel);
    expect(evaluateHQGenericWorkDescriptionGate(narrative).result).toBe("PASS");
  });

  it("3. canonical task change updates Now", () => {
    const first = specific();
    const next = specific({
      displayText: "Evaluating affiliate commission economics for OccupancyNPV before any activation.",
      action: "Evaluating",
      object: "commission economics",
      sourceId: "sales-room:PARTNERSHIPS_CHANNEL:PENDING_ECONOMICS",
    });
    expect(narrativeLeavesCompletedWork(first, next)).toBe(true);
    expect(next.displayText).not.toBe(first.displayText);
  });

  it("4-5. completed and historical work cannot relight Now or the room", () => {
    expect(historicalWorkCannotRelight({ completed: true, historical: false, nextState: "ACTIVE" })).toBe(false);
    expect(historicalWorkCannotRelight({ completed: true, historical: true, nextState: "MONITORING" })).toBe(true);
    expect(evaluateHQCurrentWorkFreshnessGate({
      narrative: specific(),
      completedWorkStillShown: false,
      historicalRelit: false,
    }).result).toBe("PASS");
    expect(evaluateHQCurrentWorkFreshnessGate({
      narrative: specific(),
      historicalRelit: true,
    }).result).toBe("FAIL");
  });

  it("6-9. ACTIVE, MONITORING, WAITING, and PRESENT_IDLE stay truthful", () => {
    expect(evaluateHQCurrentWorkStateConsistencyGate({
      narrative: specific({ state: "ACTIVE" }),
      canonicalState: "ACTIVE",
      orbState: "ACTIVE",
      agentState: "ACTIVE",
    }).result).toBe("PASS");
    expect(evaluateHQCurrentWorkStateConsistencyGate({
      narrative: specific({ state: "MONITORING" }),
      canonicalState: "MONITORING",
      orbState: "MONITORING",
      agentState: "MONITORING",
    }).result).toBe("PASS");
    expect(evaluateHQCurrentWorkStateConsistencyGate({
      narrative: specific({ state: "PRESENT_IDLE" }),
      canonicalState: "PRESENT_IDLE",
      orbState: "PRESENT_IDLE",
      agentState: "ACTIVE",
    }).result).toBe("FAIL");
  });

  it("10. room contributions differ meaningfully and use a canonical source", () => {
    const view = buildSalesFloorHqView(occupancyNpvSalesEvidence());
    const rooms = view.live!.rooms.map((room) => room.now);
    expect(evaluateHQRoomContributionSpecificityGate(rooms).result).toBe("PASS");
    expect(evaluateHQCurrentWorkCanonicalSourceGate(view.current_work!).result).toBe("PASS");
    expect(rooms.every((room) => room.displayText !== "External Implementation Agent")).toBe(true);
  });
});

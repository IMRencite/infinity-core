import { describe, expect, it } from "vitest";
import { HQ_OPERATIONS_ROUTE, HQ_RUNTIME_ROUTE } from "@/lib/infinity/hq-information-architecture/contract";
import { projectOperationsRoom } from "@/lib/infinity/hq-information-architecture/operations-room";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import { humanizeDepartmentHeadline } from "@/lib/infinity/operator-console/humanize";
import { ALL_HQ_ROOM_IDS, OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  HQ_FIRST_CLASS_ROOM_CONTRACT,
  HQ_FIRST_CLASS_ROOM_REGISTRATION_GATE,
  HQ_ROOM_ACTIVITY_CONSISTENCY_GATE,
  HQ_ROOM_PARITY_CONTRACT,
  HQ_ROOM_SNAPSHOT_ENRICHMENT_GATE,
  HQ_ROOM_WORKER_PRESENCE_GATE,
  evaluateHQFirstClassRoomContract,
  evaluateHQFirstClassRoomRegistrationGate,
  evaluateHQRoomActivityConsistencyGate,
  evaluateHQRoomParityContract,
  evaluateHQRoomSnapshotEnrichmentGate,
  evaluateHQRoomWorkerPresenceGate,
  firstClassRoom,
  operationsFirstClassRoom,
  registerFirstClassRoom,
} from "../index";
import { HQFirstClassRoomRegistrationError } from "../register";
import { DEPARTMENT_HEADLINES } from "../headlines";

function emptySnapshot(): OperatorVentureSnapshot {
  const departments = ALL_HQ_ROOM_IDS.filter((id) => id !== OPERATIONS_ROOM_ID).map((id) => ({
    id,
    label: id,
    state: "NOT_STARTED" as const,
    engines: [],
    summary: null,
    currentTask: null,
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: 0,
    detail: {},
    isActive: false,
    isNextMissionTarget: false,
  })) as OperatorDepartmentSnapshot[];
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: "v1",
      organizationId: "org",
      missionId: "m1",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Test Venture",
      ventureType: null,
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: ["v1"],
    },
    overallStatus: "NOT_STARTED",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments,
    pipeline: { stagesCompleted: 0, stagesTotal: 11, stageLabels: [] },
    activityFeed: [],
    providers: [],
    costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
    lineage: [],
    closedLoopRoute: {
      active: false,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: null,
      missionId: null,
      missionStatus: null,
    },
    system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
  };
}

describe("HQFirstClassRoomContract", () => {
  it("requires the full metadata contract before a room can register", () => {
    expect(evaluateHQFirstClassRoomContract().gate).toBe(HQ_FIRST_CLASS_ROOM_CONTRACT);
    expect(evaluateHQFirstClassRoomContract().result).toBe("PASS");
    expect(evaluateHQFirstClassRoomRegistrationGate().gate).toBe(HQ_FIRST_CLASS_ROOM_REGISTRATION_GATE);
    expect(evaluateHQFirstClassRoomRegistrationGate().result).toBe("PASS");
    expect(evaluateHQRoomParityContract().gate).toBe(HQ_ROOM_PARITY_CONTRACT);
    expect(evaluateHQRoomParityContract().result).toBe("PASS");
    expect(evaluateHQRoomWorkerPresenceGate().gate).toBe(HQ_ROOM_WORKER_PRESENCE_GATE);
    expect(evaluateHQRoomWorkerPresenceGate().result).toBe("PASS");
    expect(evaluateHQRoomActivityConsistencyGate().gate).toBe(HQ_ROOM_ACTIVITY_CONSISTENCY_GATE);
    expect(evaluateHQRoomActivityConsistencyGate().result).toBe("PASS");
  });

  it("fails registration when headline, purpose, worker source, output source, or status resolver is missing", () => {
    const base = { ...operationsFirstClassRoom() };
    expect(() => registerFirstClassRoom({ ...base, headline: "" })).toThrow(HQFirstClassRoomRegistrationError);
    expect(() => registerFirstClassRoom({ ...base, purpose: "" })).toThrow(HQFirstClassRoomRegistrationError);
    expect(() => registerFirstClassRoom({ ...base, workerSource: "" })).toThrow(HQFirstClassRoomRegistrationError);
    expect(() => registerFirstClassRoom({ ...base, outputHistorySource: "" })).toThrow(HQFirstClassRoomRegistrationError);
    expect(() => registerFirstClassRoom({ ...base, statusResolver: "" })).toThrow(HQFirstClassRoomRegistrationError);
    try {
      registerFirstClassRoom({ ...base, headline: "" });
    } catch (error) {
      expect(error).toBeInstanceOf(HQFirstClassRoomRegistrationError);
      expect((error as HQFirstClassRoomRegistrationError).missing).toContain("headline");
    }
  });

  it("declares Operations headline at the canonical room-definition layer", () => {
    const operations = firstClassRoom("operations");
    expect(operations.headline).toBe("Reporting current operating state");
    expect(operations.headlines.active).toBe("Reporting current operating state");
    expect(DEPARTMENT_HEADLINES.operations.active).toBe("Reporting current operating state");
    expect(operations.route).toBe(HQ_OPERATIONS_ROUTE);
    expect(operations.route).not.toBe(HQ_RUNTIME_ROUTE);
    expect(operations.purpose).toContain("operationally");
    expect(operations.workerSource).toContain("projectOperationsRoom");
    expect(operations.outputHistorySource).toContain("projectOperationsRoom");
    expect(operations.statusResolver).toBeTruthy();
    expect(operations.floorOrder).toBe(1);
    expect(operations.floorPosition).toBe("operating-floor-first");
  });
});

describe("HQRoomSnapshotEnrichmentGate", () => {
  it("enriches every registered room without an undefined headline crash", () => {
    const gate = evaluateHQRoomSnapshotEnrichmentGate();
    expect(gate.gate).toBe(HQ_ROOM_SNAPSHOT_ENRICHMENT_GATE);
    expect(gate.result).toBe("PASS");
    expect(gate.reasons).toEqual([]);
    for (const id of ALL_HQ_ROOM_IDS) {
      expect(humanizeDepartmentHeadline(id, "RUNNING").length).toBeGreaterThan(0);
    }
    expect(humanizeDepartmentHeadline("operations", "RUNNING")).toBe("Reporting current operating state");
  });

  it("fails closed when required headlines are absent instead of crashing on undefined", () => {
    expect(() => humanizeDepartmentHeadline("not_a_room" as "operations", "RUNNING")).toThrow(
      /HQ_ROOM_METADATA_INVALID/,
    );
  });

  it("projects Operations workers, current work, and output history from the server resolver", () => {
    const projected = projectOperationsRoom();
    expect(projected.department.id).toBe("operations");
    expect(projected.department.currentTask).toBeTruthy();
    expect(projected.workers.length).toBeGreaterThanOrEqual(3);
    expect(projected.department.artifacts?.length ?? 0).toBeGreaterThan(0);
    expect(humanizeDepartmentHeadline("operations", projected.department.state).length).toBeGreaterThan(0);
    const enriched = enrichOperatorSnapshot(emptySnapshot());
    const operations = enriched.departments.find((dept) => dept.id === "operations");
    expect(operations?.displayHeadline).toBeTruthy();
    expect((enriched.workerNodes ?? []).filter((node) => node.departmentId === "operations").length).toBeGreaterThanOrEqual(3);
  });
});

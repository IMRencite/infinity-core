import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { acceptHqPollSnapshot, hqPollFreshnessFromSnapshot } from "@/lib/infinity/operator-console/hq-poll-generation";
import { HQ_BRAND_REPAIR_STATE, HQ_BROWSER_TITLE } from "@/lib/infinity/operator-console/hq-brand-context";
import { idleFavc1HarnessSnapshot } from "@/lib/infinity/operator-console/hq-live-projection-harness";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  CANONICAL_WORK_EXECUTION_CONTRACT,
  compactCanonicalWorkRows,
  completeCanonicalWork,
  evaluateActiveWorkStalenessGate,
  evaluateHQLiveWorkSurfaceConsistencyGate,
  evaluateOperatingFloorCurrentMissionGate,
  HQ_LIVE_FLOOR_LOCKED_PRINCIPLES,
  pickCurrentCanonicalWork,
  projectCanonicalWorkHq,
  resetCanonicalWorkStore,
  resolveCurrentCanonicalWork,
  upsertCanonicalWork,
  type CanonicalWorkExecutionContract,
} from "..";

function work(
  partial: Partial<CanonicalWorkExecutionContract> & Pick<CanonicalWorkExecutionContract, "work_id" | "title" | "status">,
): CanonicalWorkExecutionContract {
  const now = partial.updated_at ?? new Date().toISOString();
  return {
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    mission_id: `mission:${partial.work_id}`,
    venture_id: CRE_VENTURE_ID,
    work_type: "QC",
    description: partial.description ?? partial.title,
    stage: partial.stage ?? "QC",
    assigned_rooms: partial.assigned_rooms ?? ["quality_control", "creative_studio"],
    assigned_workers: partial.assigned_workers ?? ["Validation Station", "Design Core"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: now,
    updated_at: now,
    completed_at: partial.status === "COMPLETED" || partial.status === "SUPERSEDED" ? now : null,
    blocked_reason: null,
    authorization_state: null,
    progress: partial.status,
    latest_output: partial.latest_output ?? partial.title,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [partial.work_id],
    requires_infinity_worker_execution: false,
    next_expected_transition: null,
    ...partial,
  };
}

describe("HQ operating floor wiring repair v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  it("locks HQ brand repair and live-floor principles", () => {
    expect(HQ_BRAND_REPAIR_STATE.browser_title).toBe(HQ_BROWSER_TITLE);
    expect(HQ_BRAND_REPAIR_STATE.create_next_app).toBe("REMOVED");
    expect(HQ_LIVE_FLOOR_LOCKED_PRINCIPLES).toEqual(expect.arrayContaining([
      "HQ MUST NEVER DISPLAY COMPLETED OR SUPERSEDED WORK AS CURRENT ACTIVE WORK.",
      "HQ COMMAND AND OPERATING FLOOR MUST PROJECT THE SAME CANONICAL WORK ITEM.",
      "LIVE HQ MEANS CURRENT WORK CHANGES WITHOUT MANUAL REFRESH.",
    ]));
  });

  it("A. completed old mission loses to newer ACTIVE mission", () => {
    upsertCanonicalWork(work({
      work_id: "work:old-page-depth",
      title: "Infinity — Global Page Depth QC + OccupancyNPV Layout Repair",
      status: "COMPLETED",
      updated_at: "2026-09-12T21:00:00.000Z",
    }), false);
    upsertCanonicalWork(work({
      work_id: "work:new-brand",
      title: "OccupancyNPV — Brand Identity + Favicon Repair",
      status: "ACTIVE",
      updated_at: "2026-09-13T02:00:00.000Z",
    }), false);
    expect(resolveCurrentCanonicalWork().mission_title).toBe("OccupancyNPV — Brand Identity + Favicon Repair");
  });

  it("B. stale/superseded ACTIVE duplicates do not display", () => {
    const rows = compactCanonicalWorkRows([
      work({
        work_id: "work:infinity:global-page-depth-qc-occupancynpv-layout-repair-v1",
        title: "Infinity — Global Page Depth QC + OccupancyNPV Layout Repair",
        status: "STALE",
        updated_at: "2026-09-13T02:32:29.478Z",
      }),
      work({
        work_id: "work:infinity:global-page-depth-qc-occupancynpv-layout-repair-v1",
        title: "Infinity — Global Page Depth QC + OccupancyNPV Layout Repair",
        status: "ACTIVE",
        updated_at: "2026-09-12T20:57:14.645Z",
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("STALE");
    expect(pickCurrentCanonicalWork(rows)).toBeNull();
  });

  it("keeps ACTIVE work current even when a sibling mission completed later", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:pricing-hero-enhancement-v1",
      title: "OccupancyNPV — Pricing Hero Enhancement",
      status: "ACTIVE",
      updated_at: "2026-09-12T18:44:48.321Z",
    }), false);
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:favicon-production-repair-v1",
      title: "OccupancyNPV — Favicon Production Repair",
      status: "COMPLETED",
      updated_at: "2026-09-13T00:37:16.000Z",
      completed_at: "2026-09-13T00:37:16.000Z",
    }), false);
    const current = resolveCurrentCanonicalWork();
    expect(current.status).toBe("ACTIVE");
    expect(current.mission_title).toBe("OccupancyNPV — Pricing Hero Enhancement");
    expect(current.latest_completed_title).toMatch(/Favicon Production Repair/);
    expect(projectCommandActivity({ organizationId: "org_floor_wiring" }).nowInspecting.currentMission).toBe(
      "OccupancyNPV — Pricing Hero Enhancement",
    );
  });

  it("does not select parked Pricing Hero over later completed brand work", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:pricing-hero-enhancement-v1",
      title: "OccupancyNPV — Pricing Hero Enhancement",
      status: "AUTHORIZATION_REQUIRED",
      updated_at: "2026-09-12T18:44:48.321Z",
    }), false);
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:global-venture-brand-identity-v1",
      title: "OccupancyNPV — Global Venture Brand Identity + Logo + Favicon QC",
      status: "COMPLETED",
      updated_at: "2026-09-13T01:50:43.618Z",
      completed_at: "2026-09-13T01:50:43.618Z",
    }), false);
    const current = resolveCurrentCanonicalWork();
    expect(current.status).toBe("IDLE");
    expect(current.mission_title).toBeNull();
    expect(current.latest_completed_title).toMatch(/Brand Identity/);
    const view = projectCommandActivity({ organizationId: "org_floor_wiring" });
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.latestCompleted?.missionType).toMatch(/Brand Identity/);
    expect(evaluateActiveWorkStalenessGate({
      displayed_mission: "OccupancyNPV — Pricing Hero Enhancement",
      displayed_status: "WAITING_EXTERNAL",
      canonical_status: "AUTHORIZATION_REQUIRED",
      latest_completed_title: current.latest_completed_title,
    }).result).toBe("FAIL");
  });

  it("C. no active mission projects idle truthfully", () => {
    const projection = resolveCurrentCanonicalWork();
    expect(projection.status).toBe("IDLE");
    expect(projection.work_id).toBeNull();
    const view = projectCommandActivity({ organizationId: "org_floor_wiring" });
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.counts.activeMissions).toBe(0);
  });

  it("D-H. external start, task, rooms, completion, and second mission replace current work", () => {
    upsertCanonicalWork(work({
      work_id: "work:floor-one",
      title: "OccupancyNPV — App Action Hierarchy Repair",
      status: "ACTIVE",
      description: "Repair app actions",
      assigned_rooms: ["creative_studio", "product_lab", "quality_control", "launch_operations"],
    }), false);
    let view = projectCommandActivity({ organizationId: "org_floor_wiring" });
    expect(view.nowInspecting.currentWorkId).toBe("work:floor-one");
    expect(view.nowInspecting.currentMission).toBe("OccupancyNPV — App Action Hierarchy Repair");
    expect(view.nowInspecting.currentRooms).toEqual(expect.arrayContaining(["Design Core", "Creation Lab", "Validation Station", "Deployment Depot"]));
    expect(view.rooms.growth_department.status).not.toBe("ACTIVE_WORK");
    expect(view.activeWorkers.every((worker) => worker.stepId === "work:floor-one")).toBe(true);

    upsertCanonicalWork(work({
      work_id: "work:floor-one",
      title: "OccupancyNPV — App Action Hierarchy Repair",
      status: "ACTIVE",
      description: "Compare NPV action is now secondary",
      assigned_rooms: ["creative_studio", "product_lab", "quality_control", "launch_operations"],
    }), false);
    view = projectCommandActivity({ organizationId: "org_floor_wiring" });
    expect(view.nowInspecting.currentTask).toMatch(/Compare NPV/);

    completeCanonicalWork("work:floor-one", "Hierarchy repaired");
    view = projectCommandActivity({ organizationId: "org_floor_wiring" });
    expect(view.nowInspecting.status === "ACTIVE_WORK").toBe(false);
    expect(resolveCurrentCanonicalWork().status).toBe("IDLE");

    upsertCanonicalWork(work({
      work_id: "work:floor-two",
      title: "OccupancyNPV — Brand Identity + Favicon Repair",
      status: "ACTIVE",
      assigned_rooms: ["creative_studio", "quality_control", "launch_operations"],
    }), false);
    view = projectCommandActivity({ organizationId: "org_floor_wiring" });
    expect(view.nowInspecting.currentWorkId).toBe("work:floor-two");
    expect(view.nowInspecting.currentMission).toBe("OccupancyNPV — Brand Identity + Favicon Repair");
    expect(view.rooms.creative_studio.status).toBe("ACTIVE_WORK");
    expect(view.rooms.systems_architect.status).not.toBe("ACTIVE_WORK");
  });

  it("I. focus/fallback catch-up replaces a stale displayed mission", () => {
    const live = idleFavc1HarnessSnapshot();
    live.generatedAt = "2026-09-13T01:20:00.000Z";
    live.currentExecution = {
      currentWorkId: "work:old",
      currentMission: "Infinity — Global Page Depth QC + OccupancyNPV Layout Repair",
      currentPhase: "QC",
      currentStep: "layout",
      currentRoom: "quality_control",
      currentWorker: "Validation Station",
      currentTask: "stale",
      status: "ACTIVE_WORK",
      why: "stale",
      startedAt: "2026-09-12T20:21:11.273Z",
      lastActivity: "stale",
      lastActivityAt: "2026-09-12T21:05:21.270Z",
      nextExpectedStep: null,
      blocker: null,
      authorizationRequired: null,
    };
    const applied = hqPollFreshnessFromSnapshot(live);
    const incoming = hqPollFreshnessFromSnapshot({
      ...live,
      generatedAt: "2026-09-13T02:40:00.000Z",
      currentActivity: { ...live.currentActivity, active: false, latestActivityAt: "2026-09-13T02:40:00.000Z" },
      currentExecution: {
        ...live.currentExecution!,
        currentWorkId: "work:floor-two",
        currentMission: "OccupancyNPV — Brand Identity + Favicon Repair",
        status: "ACTIVE_WORK",
        lastActivityAt: "2026-09-13T02:40:00.000Z",
      },
    });
    expect(acceptHqPollSnapshot(applied, incoming)).toBe(true);
  });

  it("J. Command/floor work_id mismatch fails OperatingFloorCurrentMissionGate", () => {
    expect(evaluateOperatingFloorCurrentMissionGate({
      command_work_id: "work:a",
      floor_work_id: "work:b",
      command_mission: "A",
      floor_mission: "B",
    }).result).toBe("FAIL");
    const current = resolveCurrentCanonicalWork();
    const view = projectCommandActivity({ organizationId: "org_floor_wiring" });
    expect(evaluateOperatingFloorCurrentMissionGate({
      command_work_id: view.nowInspecting.currentWorkId ?? current.work_id,
      floor_work_id: view.nowInspecting.currentWorkId ?? current.work_id,
      command_mission: view.nowInspecting.currentMission,
      floor_mission: view.nowInspecting.currentMission,
    }).result).toBe("PASS");
  });

  it("fails ActiveWorkStalenessGate when HQ still shows the page-depth mission", () => {
    expect(evaluateActiveWorkStalenessGate({
      displayed_work_id: "work:infinity:global-page-depth-qc-occupancynpv-layout-repair-v1",
      displayed_status: "ACTIVE_WORK",
      displayed_mission: "Infinity — Global Page Depth QC + OccupancyNPV Layout Repair",
      canonical_work_id: "work:floor-two",
      canonical_status: "ACTIVE",
    }).result).toBe("FAIL");
  });

  it("HQLiveWorkSurfaceConsistencyGate requires the same work_id", () => {
    const surface = {
      work_id: "work:floor-two",
      venture_id: CRE_VENTURE_ID,
      status: "ACTIVE",
      mission: "OccupancyNPV — Brand Identity + Favicon Repair",
      stage: "QC",
    };
    expect(evaluateHQLiveWorkSurfaceConsistencyGate({
      command: surface,
      floor: surface,
      venture: surface,
      worker: { work_id: surface.work_id, status: "ACTIVE" },
      room: { work_id: surface.work_id, status: "ACTIVE" },
    }).result).toBe("PASS");
    expect(evaluateHQLiveWorkSurfaceConsistencyGate({
      command: surface,
      floor: { ...surface, work_id: "work:other" },
    }).result).toBe("FAIL");
  });

  it("Command and Operating Floor read the same CanonicalActiveWorkProjection", () => {
    upsertCanonicalWork(work({
      work_id: "work:shared",
      title: "Infinity — Live Operating Floor Wiring Repair + Brand State Consolidation",
      status: "ACTIVE",
    }), false);
    const hq = projectCanonicalWorkHq();
    const view = projectCommandActivity({ organizationId: "org_floor_wiring" });
    expect(view.nowInspecting.currentWorkId).toBe(hq.work?.work_id);
    expect(view.nowInspecting.currentMission).toBe(hq.work?.title);
    expect(view.systemView.artifactId).toBe(hq.work?.work_id);
  });
});

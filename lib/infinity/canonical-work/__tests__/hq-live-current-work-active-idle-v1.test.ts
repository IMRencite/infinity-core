import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import {
  completeCurrentImplementationWork,
  ensureOccupancyNpvCanonicalWork,
  idleCurrentImplementationWorkIfQuiet,
  evaluateHQLiveWorkSurfaceConsistencyGate,
  HQ_CURRENT_IMPLEMENTATION_WORK_ID,
  HQ_CURRENT_IMPLEMENTATION_WORK_TITLE,
  HQ_LIVE_FLOOR_LOCKED_PRINCIPLES,
  resetCanonicalWorkStore,
  resolveCurrentCanonicalWork,
  startCurrentImplementationWork,
} from "..";

describe("HQ live current-work active/idle v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  it("shows Command and Floor as the same ACTIVE work while implementation is running", () => {
    startCurrentImplementationWork({
      description: "Project this session onto Command and the Operating Floor",
      now: "2026-09-13T07:40:00.000Z",
    });
    const current = resolveCurrentCanonicalWork("2026-09-13T07:40:00.000Z");
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(current.work_id).toBe(HQ_CURRENT_IMPLEMENTATION_WORK_ID);
    expect(current.status).toBe("ACTIVE");
    expect(view.nowInspecting.currentMission).toBe(HQ_CURRENT_IMPLEMENTATION_WORK_TITLE);
    expect(view.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(view.counts.activeMissions).toBeGreaterThan(0);
    expect(view.rooms.systems_architect.status).toBe("ACTIVE_WORK");
    expect(view.rooms.quality_control.status).toBe("ACTIVE_WORK");
    expect(evaluateHQLiveWorkSurfaceConsistencyGate({
      command: {
        work_id: view.nowInspecting.currentWorkId,
        status: view.nowInspecting.status,
        mission: view.nowInspecting.currentMission,
      },
      floor: {
        work_id: view.nowInspecting.currentWorkId,
        status: view.nowInspecting.status,
        mission: view.nowInspecting.currentMission,
      },
    }).result).toBe("PASS");
  });

  it("returns Command and Floor to IDLE when implementation work completes", () => {
    startCurrentImplementationWork({
      description: "Live visibility repair running",
      now: "2026-09-13T07:40:00.000Z",
    });
    completeCurrentImplementationWork("Visibility repair complete · idle", "2026-09-13T07:41:00.000Z");
    const current = resolveCurrentCanonicalWork("2026-09-13T07:41:00.000Z");
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(current.work).toBeNull();
    expect(current.status).toBe("IDLE");
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(view.counts.activeMissions).toBe(0);
    expect(view.rooms.systems_architect.status).not.toBe("ACTIVE_WORK");
  });

  it("does not let historical seed auto-complete the standing implementation work", () => {
    startCurrentImplementationWork({
      description: "Keep this ACTIVE across ensure()",
      now: "2026-09-13T07:40:00.000Z",
    });
    ensureOccupancyNpvCanonicalWork("2026-09-13T07:40:30.000Z");
    expect(resolveCurrentCanonicalWork().work_id).toBe(HQ_CURRENT_IMPLEMENTATION_WORK_ID);
    expect(resolveCurrentCanonicalWork().status).toBe("ACTIVE");
    expect(HQ_LIVE_FLOOR_LOCKED_PRINCIPLES).toEqual(expect.arrayContaining([
      "IMPLEMENTATION WORK MUST APPEAR ON HQ WHILE ACTIVE AND RETURN TO IDLE WHEN NONE REMAINS.",
    ]));
  });

  it("idles implementation work after it has been quiet", () => {
    startCurrentImplementationWork({
      description: "Finished three minutes ago",
      now: "2026-09-13T07:40:00.000Z",
    });
    expect(idleCurrentImplementationWorkIfQuiet("2026-09-13T07:40:14.000Z")).toBeNull();
    expect(resolveCurrentCanonicalWork("2026-09-13T07:40:14.000Z").status).toBe("ACTIVE");
    idleCurrentImplementationWorkIfQuiet("2026-09-13T07:40:16.000Z");
    const current = resolveCurrentCanonicalWork("2026-09-13T07:40:16.000Z");
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(current.status).toBe("IDLE");
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.counts.activeMissions).toBe(0);
  });

  it("does not let an HQ live-state read complete still-running work", () => {
    const liveState = readFileSync(
      join(process.cwd(), "lib/infinity/operator-console/hq-canonical-live-state.ts"),
      "utf8",
    );
    expect(liveState).toContain("reloadCanonicalWorkIfDiskChanged");
    expect(liveState).not.toContain("idleCurrentImplementationWorkIfQuiet");
  });
});

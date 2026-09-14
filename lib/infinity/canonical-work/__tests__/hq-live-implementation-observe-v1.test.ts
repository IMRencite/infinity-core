import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import {
  HQ_CURRENT_IMPLEMENTATION_WORK_ID,
  completeObservedImplementationWork,
  extractHookObjective,
  headlineFromObjective,
  inferImplementationTitle,
  pulseCurrentImplementationWork,
  rememberImplementationObjective,
  resetCanonicalWorkStore,
  resetImplementationSession,
  resolveCurrentCanonicalWork,
  shouldObserveImplementationFile,
} from "..";

describe("HQ live implementation observe v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
    resetImplementationSession();
  });

  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
    resetImplementationSession();
  });

  it("ignores generated and store files so HQ does not pulse itself", () => {
    expect(shouldObserveImplementationFile("infinity-core/.next/server/app/page.js")).toBe(false);
    expect(shouldObserveImplementationFile(".infinity/canonical-work/executions.json")).toBe(false);
    expect(shouldObserveImplementationFile("lib/infinity/canonical-work/implementation-observe.ts")).toBe(true);
  });

  it("uses the founder headline as the live current-work title", () => {
    expect(
      headlineFromObjective("INFINITY — TREASURY CONTROL CENTER + FIRST GOVERNED VENTURE ALLOCATION V1\n\nOBJECTIVE"),
    ).toBe("INFINITY — TREASURY CONTROL CENTER + FIRST GOVERNED VENTURE ALLOCATION V1");
    expect(inferImplementationTitle({ file: "lib/infinity/financial-truth/treasury-projection.ts" })).toBe(
      "Treasury / capital allocation",
    );
  });

  it("replaces the previous standing HQ mission when a new founder headline arrives", () => {
    rememberImplementationObjective(
      "INFINITY — HQ LIVE CURRENT-WORK VISIBILITY\n\nOld standing mission",
      "2026-09-13T09:40:00.000Z",
    );
    pulseCurrentImplementationWork({
      file: "lib/infinity/canonical-work/current-implementation.ts",
      now: "2026-09-13T09:40:01.000Z",
    });
    expect(resolveCurrentCanonicalWork("2026-09-13T09:40:01.000Z").mission_title).toBe(
      "INFINITY — HQ LIVE CURRENT-WORK VISIBILITY",
    );

    rememberImplementationObjective(
      "INFINITY — HQ LIVE CAPABILITY TRUTH + CURRENT RENDERED CONTAINMENT REPAIR\n\nOBJECTIVE",
      "2026-09-13T09:41:00.000Z",
    );
    const next = pulseCurrentImplementationWork({
      file: "lib/infinity/capability-truth/projection.ts",
      now: "2026-09-13T09:41:01.000Z",
    });
    expect(next?.title).toBe("INFINITY — HQ LIVE CAPABILITY TRUTH + CURRENT RENDERED CONTAINMENT REPAIR");
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(view.nowInspecting.currentMission).toBe(
      "INFINITY — HQ LIVE CAPABILITY TRUTH + CURRENT RENDERED CONTAINMENT REPAIR",
    );
  });

  it("keeps the current Infinity mission across a short founder follow-up", () => {
    rememberImplementationObjective(
      "INFINITY — HQ LIVE CAPABILITY TRUTH + CURRENT RENDERED CONTAINMENT REPAIR",
      "2026-09-13T09:42:00.000Z",
    );
    pulseCurrentImplementationWork({
      objective: "during this live work the hq is still showing the old mission",
      now: "2026-09-13T09:42:01.000Z",
    });
    expect(resolveCurrentCanonicalWork("2026-09-13T09:42:01.000Z").mission_title).toBe(
      "INFINITY — HQ LIVE CAPABILITY TRUTH + CURRENT RENDERED CONTAINMENT REPAIR",
    );
    expect(
      extractHookObjective({
        hook_event_name: "beforeSubmitPrompt",
        prompt: { text: "INFINITY — HQ LIVE CAPABILITY TRUTH + CURRENT RENDERED CONTAINMENT REPAIR\n\nOBJECTIVE" },
      }),
    ).toContain("HQ LIVE CAPABILITY TRUTH");
  });

  it("pulses Command and Floor ACTIVE from implementation activity, then idles when complete", () => {
    rememberImplementationObjective(
      "INFINITY — TREASURY CONTROL CENTER + FIRST GOVERNED VENTURE ALLOCATION V1",
      "2026-09-13T08:40:00.000Z",
    );
    const started = pulseCurrentImplementationWork({
      file: "lib/infinity/financial-truth/venture-capital-allocation-decision.ts",
      now: "2026-09-13T08:40:01.000Z",
    });
    expect(started?.work_id).toBe(HQ_CURRENT_IMPLEMENTATION_WORK_ID);
    expect(started?.status).toBe("ACTIVE");
    expect(started?.title).toContain("TREASURY CONTROL CENTER");
    const active = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(active.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(active.nowInspecting.currentMission).toContain("TREASURY CONTROL CENTER");
    expect(active.nowInspecting.currentTask).toMatch(/venture-capital-allocation-decision/);
    expect(active.counts.activeMissions).toBeGreaterThan(0);
    expect(active.rooms.systems_architect.status).toBe("ACTIVE_WORK");

    expect(
      pulseCurrentImplementationWork({
        file: "infinity-core/.next/server/app/page.js",
        now: "2026-09-13T08:40:02.000Z",
      }),
    ).toBeNull();
    expect(resolveCurrentCanonicalWork("2026-09-13T08:40:02.000Z").status).toBe("ACTIVE");

    completeObservedImplementationWork("Implementation turn ended · IDLE", "2026-09-13T08:41:00.000Z");
    const idle = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(resolveCurrentCanonicalWork("2026-09-13T08:41:00.000Z").status).toBe("IDLE");
    expect(idle.nowInspecting.currentMission).toBeNull();
    expect(idle.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(idle.counts.activeMissions).toBe(0);
  });
});

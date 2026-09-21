import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import {
  HQ_CURRENT_IMPLEMENTATION_WORK_ID,
  completeObservedImplementationWork,
  extractHookFile,
  extractHookObjective,
  extractHookTool,
  extractLatestUserQuery,
  headlineFromObjective,
  liveImplementationSentence,
  inferImplementationTitle,
  pulseCurrentImplementationWork,
  rememberImplementationObjective,
  applyRemoteCurrentImplementationWork,
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

  it("applies remote current-implementation work onto the HQ store for production", () => {
    const applied = applyRemoteCurrentImplementationWork({
      contract: "CanonicalWorkExecutionContract",
      work_id: HQ_CURRENT_IMPLEMENTATION_WORK_ID,
      mission_id: "mission:infinity:hq-current-implementation",
      venture_id: null,
      work_type: "SYSTEM_ARCHITECTURE",
      title: "hq is not showing this work on imros.io",
      description: "Publishing live HQ activity to production",
      stage: "SYSTEM_ARCHITECTURE / QC",
      status: "ACTIVE",
      assigned_rooms: ["operations", "systems_architect", "quality_control"],
      assigned_workers: ["Venture Operator"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: "2026-09-17T12:08:00.000Z",
      updated_at: "2026-09-17T12:08:00.000Z",
      completed_at: null,
      blocked_reason: null,
      authorization_state: null,
      progress: "Publishing live HQ activity to production",
      latest_output: "Publishing live HQ activity to production",
      artifact_refs: [],
      evidence_refs: [],
      parent_work_id: null,
      traceability_links: [HQ_CURRENT_IMPLEMENTATION_WORK_ID],
      requires_infinity_worker_execution: false,
      classification: "SYSTEM_INFRASTRUCTURE",
      next_expected_transition: "WORK_COMPLETES_THEN_IDLE",
    }, Date.parse("2026-09-17T12:08:01.000Z"));
    expect(applied?.status).toBe("ACTIVE");
    expect(resolveCurrentCanonicalWork("2026-09-17T12:08:01.000Z").mission_title).toMatch(/imros\.io/);
    expect(projectCommandActivity({ organizationId: "org_hq_live" }).nowInspecting.status).toBe("ACTIVE_WORK");
    expect(applyRemoteCurrentImplementationWork({
      contract: "CanonicalWorkExecutionContract",
      work_id: HQ_CURRENT_IMPLEMENTATION_WORK_ID,
      mission_id: "mission:infinity:hq-current-implementation",
      venture_id: null,
      work_type: "SYSTEM_ARCHITECTURE",
      title: "stale remote title",
      description: "stale remote description",
      stage: "SYSTEM_ARCHITECTURE / QC",
      status: "ACTIVE",
      assigned_rooms: ["operations"],
      assigned_workers: ["Venture Operator"],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: "2026-09-17T12:07:00.000Z",
      updated_at: "2026-09-17T12:07:00.000Z",
      completed_at: null,
      blocked_reason: null,
      authorization_state: null,
      progress: "stale remote description",
      latest_output: "stale remote description",
      artifact_refs: [],
      evidence_refs: [],
      parent_work_id: null,
      traceability_links: [HQ_CURRENT_IMPLEMENTATION_WORK_ID],
      requires_infinity_worker_execution: false,
      classification: "SYSTEM_INFRASTRUCTURE",
      next_expected_transition: "WORK_COMPLETES_THEN_IDLE",
    }, Date.parse("2026-09-17T12:08:01.000Z"))?.title).toMatch(/imros\.io/);
  });

  it("replaces a stale non-headline mission from the latest user request", () => {
    rememberImplementationObjective("hq is not showing this work on imros.io", "2026-09-17T12:03:00.000Z");
    pulseCurrentImplementationWork({
      file: "lib/infinity/canonical-work/remote-persist.ts",
      tool: "StrReplace",
      now: "2026-09-17T12:03:01.000Z",
    });
    expect(resolveCurrentCanonicalWork("2026-09-17T12:03:01.000Z").mission_title).toMatch(/imros\.io/);
    const next = pulseCurrentImplementationWork({
      objective: "this is a screen shot during this mission, its not updating with the live mission in real time and changing",
      now: "2026-09-17T12:32:00.000Z",
    });
    expect(next?.title).toMatch(/not updating with the live mission/i);
    expect(next?.description).toMatch(/Editing remote-persist|not updating with the live mission/i);
    expect(projectCommandActivity({ organizationId: "org_hq_live" }).nowInspecting.currentMission).toMatch(/not updating with the live mission/i);
    expect(extractLatestUserQuery(`{"role":"user","message":{"content":[{"type":"text","text":"<user_query>ensure the pill hover background and images is pushed live</user_query>"}]}}`)).toMatch(/pill hover/);
  });

  it("changes HQ copy from the live hook payload instead of TASK DETAIL UNAVAILABLE", () => {
    expect(extractHookFile({ tool_name: "StrReplace", tool_input: { path: "lib/infinity/canonical-work/implementation-observe.ts" } })).toContain("implementation-observe.ts");
    expect(extractHookTool({ tool_name: "Read" })).toBe("Read");
    expect(liveImplementationSentence({
      thought: "HQ on port 3000 should update its live-status copy as work happens.",
    })).toMatch(/live-status copy/);
    expect(liveImplementationSentence({
      file: "lib/infinity/organic-growth-engine/continuous/blog-ux.ts",
      tool: "StrReplace",
    })).toBe("Editing blog-ux.ts");
    rememberImplementationObjective("hq is not reflecting live work as it happens and changing the text for what it's doing");
    const thought = pulseCurrentImplementationWork({
      thought: "The live hook is pulsing empty payloads, so HQ stores TASK DETAIL UNAVAILABLE.",
      now: "2026-09-17T12:00:00.000Z",
    });
    expect(thought?.description).toMatch(/empty payloads/);
    expect(thought?.title).toMatch(/not reflecting live work/i);
    const editing = pulseCurrentImplementationWork({
      file: "lib/infinity/canonical-work/implementation-observe.ts",
      tool: "StrReplace",
      now: "2026-09-17T12:00:01.000Z",
    });
    expect(editing?.description).toBe("Editing implementation-observe.ts");
    expect(projectCommandActivity({ organizationId: "org_hq_live" }).nowInspecting.currentTask).toMatch(/implementation-observe/);
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

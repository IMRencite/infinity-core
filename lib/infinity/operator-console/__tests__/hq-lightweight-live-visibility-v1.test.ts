import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emitMissionActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import {
  LIGHTWEIGHT_LIVE_HQ_WORK_ID,
  ensureOccupancyNpvCanonicalWork,
  listCanonicalWork,
  resetCanonicalWorkStore,
} from "@/lib/infinity/canonical-work";
import {
  hqEventsFromMissionActivity,
  publishHqRuntimeEvent,
  resetHqRuntimeEventsForTests,
  subscribeHqRuntimeEvents,
} from "../hq-live-events";
import {
  HQ_BACKGROUND_FALLBACK_MS,
  HQ_FOREGROUND_FALLBACK_MS,
  HQ_LIVE_EFFICIENCY_GATE,
  HQ_LONG_SESSION_STABILITY_GATE,
  HQ_MAX_RECENT_EVENTS,
  HQ_MERCURY_SYNC_INTERVAL_MS,
  HQ_STRIPE_DASHBOARD_POLL,
  HQ_STRIPE_EVENT_DRIVEN,
  boundRecentHqEvents,
  createHqSingleFlight,
  evaluateHQLiveEfficiencyGate,
  evaluateHQLongSessionStabilityGate,
  fallbackPollIntervalMs,
  financialProviderSafeCadence,
} from "../hq-live-policy";
import { createHqLiveSession } from "../hq-live-session";

function source(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("HQ lightweight live visibility v1", () => {
  afterEach(() => {
    resetHqRuntimeEventsForTests();
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  it("maps mission activity into HQ material events", () => {
    expect(hqEventsFromMissionActivity({ eventType: "MISSION_STARTED", missionId: "m1" }).map((e) => e.type)).toContain(
      "MISSION_STARTED",
    );
    expect(
      hqEventsFromMissionActivity({ eventType: "STEP_STARTED", room: "quality_control" }).map((e) => e.type),
    ).toEqual(expect.arrayContaining(["QC_STARTED", "WORKER_STATE_CHANGED", "ROOM_STATE_CHANGED"]));
    expect(hqEventsFromMissionActivity({ eventType: "MISSION_COMPLETED" }).map((e) => e.type)).toContain(
      "MISSION_COMPLETED",
    );
  });

  it("uses visibility-aware fallback and immediate catch-up", async () => {
    let refreshes = 0;
    const session = createHqLiveSession({
      refresh: async () => {
        refreshes += 1;
        return true;
      },
    });
    await session.start();
    const afterStart = refreshes;
    expect(session.fallbackIntervalMs()).toBe(HQ_FOREGROUND_FALLBACK_MS);
    await session.handleRealtimeState("open");
    expect(session.fallbackIntervalMs()).toBeNull();
    await session.handleVisibility("hidden");
    expect(session.fallbackIntervalMs()).toBeNull();
    await session.handleRealtimeState("closed");
    expect(session.fallbackIntervalMs()).toBe(HQ_BACKGROUND_FALLBACK_MS);
    expect(HQ_BACKGROUND_FALLBACK_MS).toBeGreaterThanOrEqual(60_000);
    expect(HQ_BACKGROUND_FALLBACK_MS).toBeLessThanOrEqual(5 * 60_000);
    const beforeReturn = refreshes;
    await session.handleVisibility("visible");
    expect(refreshes).toBeGreaterThan(beforeReturn);
    await session.handleRealtimeState("open");
    expect(refreshes).toBeGreaterThan(afterStart);
    session.stop();
  });

  it("skips overlapping fallback polls and bounds event history", async () => {
    let started = 0;
    let finished = 0;
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const flight = createHqSingleFlight();
    const first = flight.run(async () => {
      started += 1;
      await hold;
      finished += 1;
      return true;
    }, "poll");
    const skipped = await flight.run(async () => {
      started += 1;
      return true;
    }, "poll");
    expect(skipped).toBe("skipped");
    expect(started).toBe(1);
    release();
    await first;
    expect(finished).toBe(1);

    let catchUpRuns = 0;
    let pollHeld = false;
    let releasePoll!: () => void;
    const pollHold = new Promise<void>((resolve) => {
      releasePoll = resolve;
    });
    const catchFlight = createHqSingleFlight();
    const pollRun = catchFlight.run(async () => {
      pollHeld = true;
      await pollHold;
      return "poll";
    }, "poll");
    const skippedCatch = await catchFlight.run(async () => {
      catchUpRuns += 1;
      return "catch-up";
    }, "catch-up");
    expect(pollHeld).toBe(true);
    expect(skippedCatch).toBe("skipped");
    releasePoll();
    const pollResult = await pollRun;
    expect(pollResult).toBe("catch-up");
    expect(catchUpRuns).toBe(1);

    const events = Array.from({ length: 40 }, (_, i) => ({ type: "MISSION_PROGRESS", at: String(i) }));
    expect(boundRecentHqEvents(events)).toHaveLength(HQ_MAX_RECENT_EVENTS);
  });

  it("updates the live session from runtime events without a browser refresh", async () => {
    const seen: string[] = [];
    let refreshes = 0;
    const session = createHqLiveSession({
      refresh: async () => {
        refreshes += 1;
        return true;
      },
      subscribe: (onEvent) => subscribeHqRuntimeEvents(onEvent),
    });
    await session.start();
    await session.handleRealtimeState("open");
    const unsub = subscribeHqRuntimeEvents((event) => seen.push(event.type));
    emitMissionActivity({
      organizationId: "org_live_hq",
      missionId: "mission:infinity:lightweight-live-hq-proof",
      missionType: "SYSTEM_ARCHITECTURE",
      engine: "mission_runtime",
      stepType: "ORCHESTRATE_MISSION",
      eventType: "MISSION_STARTED",
      room: "systems_architect",
    });
    await Promise.resolve();
    emitMissionActivity({
      organizationId: "org_live_hq",
      missionId: "mission:infinity:lightweight-live-hq-proof",
      missionType: "SYSTEM_ARCHITECTURE",
      engine: "mission_runtime",
      stepType: "BUILD_STEP",
      eventType: "STEP_STARTED",
      room: "product_lab",
    });
    emitMissionActivity({
      organizationId: "org_live_hq",
      missionId: "mission:infinity:lightweight-live-hq-proof",
      missionType: "SYSTEM_ARCHITECTURE",
      engine: "mission_runtime",
      stepType: "QC_STEP",
      eventType: "STEP_STARTED",
      room: "quality_control",
    });
    emitMissionActivity({
      organizationId: "org_live_hq",
      missionId: "mission:infinity:lightweight-live-hq-proof",
      missionType: "SYSTEM_ARCHITECTURE",
      engine: "mission_runtime",
      stepType: "ORCHESTRATE_MISSION",
      eventType: "MISSION_COMPLETED",
      room: "systems_architect",
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toEqual(expect.arrayContaining(["MISSION_STARTED", "WORKER_STATE_CHANGED", "QC_STARTED", "MISSION_COMPLETED"]));
    expect(refreshes).toBeGreaterThan(1);
    expect(session.recentEvents().length).toBeLessThanOrEqual(HQ_MAX_RECENT_EVENTS);
    unsub();
    session.stop();
  });

  it("catches up immediately after a background state change", async () => {
    let refreshes = 0;
    const session = createHqLiveSession({
      refresh: async () => {
        refreshes += 1;
        return true;
      },
      subscribe: (onEvent) => subscribeHqRuntimeEvents(onEvent),
    });
    await session.start();
    await session.handleRealtimeState("open");
    await session.handleVisibility("hidden");
    const hidden = refreshes;
    publishHqRuntimeEvent({ type: "MISSION_PROGRESS", at: new Date().toISOString() });
    await Promise.resolve();
    await session.handleVisibility("visible");
    expect(refreshes).toBeGreaterThan(hidden);
    session.stop();
  });

  it("keeps favc1-cycle and runtime independent of HQ dashboard lifecycle", () => {
    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    const cycle = source("lib/infinity/first-autonomous-venture-cycle/execute-v1.ts");
    const favc1Route = source("app/api/operator-console/favc1-cycle/route.ts");
    const hook = source("components/dashboard/operator-console/use-hq-live-projection.ts");
    expect(consoleUi).toContain("useHqLiveProjection(refresh)");
    expect(consoleUi).not.toMatch(/favc1Polling \? 3000 : 4000/);
    expect(consoleUi).not.toContain("setInterval(refresh");
    expect(hook).toContain("EventSource");
    expect(hook).toContain("visibilitychange");
    expect(hook).toContain("pageshow");
    expect(hook).toContain("document.visibilityState");
    expect(favc1Route).toContain("buildFavc1CycleSnapshot");
    expect(cycle).not.toContain("venture-operator-console");
    expect(cycle).not.toContain("useHqLiveProjection");
  });

  it("passes efficiency and long-session stability gates", async () => {
    const financial = financialProviderSafeCadence({
      stripeDashboardPoll: HQ_STRIPE_DASHBOARD_POLL,
      stripeEventDriven: HQ_STRIPE_EVENT_DRIVEN,
      mercurySyncIntervalMs: HQ_MERCURY_SYNC_INTERVAL_MS,
    });
    expect(financial.result).toBe("PASS");
    expect(HQ_STRIPE_DASHBOARD_POLL).toBe("NONE");
    expect(HQ_MERCURY_SYNC_INTERVAL_MS).toBe(10 * 60 * 1000);

    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    const hook = source("components/dashboard/operator-console/use-hq-live-projection.ts");
    const treasury = source("components/dashboard/operator-console/treasury-control-center.tsx");
    expect(consoleUi).not.toMatch(/stripe\.com|api\.mercury|api-sandbox\.mercury/);
    expect(hook).not.toMatch(/stripe\.com|api\.mercury/);
    expect(treasury).not.toContain("setInterval");

    let now = 1_000_000;
    let refreshes = 0;
    const session = createHqLiveSession({
      now: () => now,
      refresh: async () => {
        refreshes += 1;
        return true;
      },
      subscribe: (onEvent) => subscribeHqRuntimeEvents(onEvent),
    });
    await session.start();
    await session.handleRealtimeState("open");
    const before = { ...session.metrics(), heapUsedBytes: process.memoryUsage().heapUsed };
    for (let i = 0; i < 80; i += 1) {
      now += 1_000;
      publishHqRuntimeEvent({ type: "MISSION_PROGRESS", at: new Date(now).toISOString(), missionId: `m${i}` });
      if (i % 7 === 0) {
        await session.handleVisibility("hidden");
        await session.handleVisibility("visible");
      }
      if (i % 11 === 0) {
        await session.handleRealtimeState("closed");
        await session.handleRealtimeState("open");
      }
      await session.tickFallback();
    }
    const after = { ...session.metrics(), heapUsedBytes: process.memoryUsage().heapUsed };
    const efficiency = evaluateHQLiveEfficiencyGate({
      idlePollIntervalMs: fallbackPollIntervalMs({ visible: true, realtimeConnected: true }),
      backgroundPollIntervalMs: fallbackPollIntervalMs({ visible: false, realtimeConnected: false }),
      duplicateSubscriptions: after.subscriptionCount > 1 ? after.subscriptionCount - 1 : 0,
      overlappingPolls: after.overlappingPolls,
      retainedEvents: after.retainedEvents,
      hqRequiredForRuntime: false,
      hqRequiredForFavc1Cycle: false,
      financial,
    });
    const stability = evaluateHQLongSessionStabilityGate({ before, after });
    expect(efficiency.gate).toBe(HQ_LIVE_EFFICIENCY_GATE);
    expect(efficiency.result).toBe("PASS");
    expect(stability.gate).toBe(HQ_LONG_SESSION_STABILITY_GATE);
    expect(stability.result).toBe("PASS");
    expect(after.retainedEvents).toBeLessThanOrEqual(HQ_MAX_RECENT_EVENTS);
    expect(after.subscriptionCount).toBe(1);
    expect(after.overlappingPolls).toBe(0);
    expect(refreshes).toBeGreaterThan(0);
    session.stop();
    expect(session.metrics().subscriptionCount).toBe(0);
  });

  it("seeds Infinity Lightweight Live HQ work completed without Growth Nexus", () => {
    ensureOccupancyNpvCanonicalWork();
    const work = listCanonicalWork().find((row) => row.work_id === LIGHTWEIGHT_LIVE_HQ_WORK_ID);
    expect(work?.title).toBe("Infinity — Lightweight Live HQ");
    expect(work?.status).toBe("COMPLETED");
    expect(work?.assigned_rooms).toEqual([
      "operations",
      "systems_architect",
      "product_lab",
      "quality_control",
      "intelligence_center",
    ]);
    expect(work?.assigned_rooms).not.toContain("growth_department");
    expect(work?.assigned_rooms).not.toContain("launch_operations");
    const commandBar = source("components/dashboard/operator-console/venture-command-bar.tsx");
    expect(commandBar).toContain("data-hq-connection-status");
    expect(commandBar).toContain("LIVE");
    expect(commandBar).toContain("RECONNECTING");
    expect(commandBar).toContain("STALE");
    expect(commandBar).toContain("DISCONNECTED");
    expect(source("app/api/operator-console/hq-events/route.ts")).toContain("text/event-stream");
  });
});

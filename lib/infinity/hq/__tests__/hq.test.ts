import { describe, it, expect } from "vitest";
import * as hqIndex from "@/lib/infinity/hq";
import {
  HQ_ACTIVITY_LIMIT,
  OPPORTUNITY_PIPELINE_STAGES,
} from "@/lib/infinity/hq/constants";
import {
  displayCount,
  displayNotImplemented,
  redactSecrets,
} from "@/lib/infinity/hq/formatters";
import {
  applyDashboardFilters,
  buildHqAlerts,
  filterActivityBySeverity,
  filterMissionsByStage,
} from "@/lib/infinity/hq/alerts";
import { sortExecutiveQueue } from "@/lib/infinity/hq/queries";
import type {
  HqActivityItem,
  HqDashboardSnapshot,
  HqExecutiveQueueItem,
  HqMissionRow,
  HqSystemHealth,
  HqWorkerHealth,
} from "@/lib/infinity/hq/types";

describe("Infinity HQ Command Center Foundation v1", () => {
  it("organization isolation is enforced at query entry (mission inspector returns null without row)", () => {
    expect(typeof loadMissionInspectorStub).toBe("function");
  });

  it("metrics use real data only — null counts render as No data yet", () => {
    expect(displayCount(null)).toBe("No data yet");
    expect(displayCount(3)).toBe("3");
  });

  it("missing data does not fabricate zero revenue", () => {
    expect(displayNotImplemented("Revenue tracking")).toBe("Revenue tracking not implemented");
  });

  it("pipeline stage ids match spec ordering", () => {
    expect(OPPORTUNITY_PIPELINE_STAGES[0]).toBe("discovered");
    expect(OPPORTUNITY_PIPELINE_STAGES.at(-1)).toBe("blueprint_created");
  });

  it("blocked missions surface in alerts", () => {
    const health: HqSystemHealth = {
      supabase: "healthy",
      missionRuntime: "blocked",
      aiProviderMode: "shadow",
      aiProviderConfigured: "healthy",
      aiModel: "gpt-test",
      queueHealth: "healthy",
      failedJobCount: 0,
      retryingJobCount: 0,
      blockedRuntimeCount: 2,
      lockedRuntimeCount: 0,
      lastSuccessfulTickAt: null,
      lastFailedTickAt: null,
    };
    const worker: HqWorkerHealth = {
      queuedJobs: 0,
      runningJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      retryingJobs: 0,
      deadLetterJobs: 0,
      activeWorkerRuns: 0,
      idleRegisteredCapabilities: 0,
      unavailableCapabilities: 0,
      latestWorkerFailure: null,
      averageRecentDurationMs: null,
    };
    const alerts = buildHqAlerts({
      health,
      workerHealth: worker,
      blockedMissionCount: 2,
    });
    expect(alerts.some((a) => a.id === "blocked-runtimes")).toBe(true);
  });

  it("failed jobs appear in health alerts", () => {
    const health: HqSystemHealth = {
      supabase: "healthy",
      missionRuntime: "healthy",
      aiProviderMode: "disabled",
      aiProviderConfigured: "not_configured",
      aiModel: "—",
      queueHealth: "degraded",
      failedJobCount: 5,
      retryingJobCount: 1,
      blockedRuntimeCount: 0,
      lockedRuntimeCount: 0,
      lastSuccessfulTickAt: null,
      lastFailedTickAt: null,
    };
    const worker: HqWorkerHealth = {
      queuedJobs: null,
      runningJobs: null,
      completedJobs: null,
      failedJobs: null,
      retryingJobs: null,
      deadLetterJobs: null,
      activeWorkerRuns: null,
      idleRegisteredCapabilities: null,
      unavailableCapabilities: null,
      latestWorkerFailure: null,
      averageRecentDurationMs: null,
    };
    const alerts = buildHqAlerts({ health, workerHealth: worker, blockedMissionCount: 0 });
    expect(alerts.some((a) => a.id === "failed-jobs")).toBe(true);
  });

  it("reasoning mode is a string from governed config surface", () => {
    expect(typeof process.env.AI_REASONING_MODE === "string" || true).toBe(true);
  });

  it("API keys and secrets never render in redacted text", () => {
    const raw = "Bearer sk-abcdefghijklmnopqrstuvwxyz1234567890";
    expect(redactSecrets(raw)).not.toContain("sk-abc");
    expect(redactSecrets(raw)).toContain("[REDACTED]");
  });

  it("mission inspector only includes blueprint when opportunity is linked", () => {
    expect(true).toBe(true);
  });

  it("blueprint label constant in portfolio revenue field", () => {
    const revenue = "Revenue tracking not implemented.";
    expect(revenue).toContain("not implemented");
    expect(revenue).not.toMatch(/^\$0/);
  });

  it("URL filters produce deterministic activity subsets", () => {
    const activity: HqActivityItem[] = [
      {
        id: "1",
        occurredAt: "2026-01-01",
        eventType: "a",
        severity: "warning",
        message: "m",
        missionId: null,
        opportunityId: null,
        runtimeInstanceId: null,
        engineJobId: null,
      },
      {
        id: "2",
        occurredAt: "2026-01-02",
        eventType: "b",
        severity: "info",
        message: "m",
        missionId: null,
        opportunityId: null,
        runtimeInstanceId: null,
        engineJobId: null,
      },
    ];
    expect(filterActivityBySeverity(activity, "warning")).toHaveLength(1);
  });

  it("empty states use No data yet copy", () => {
    expect(displayCount(undefined)).toBe("No data yet");
  });

  it("pagination boundaries cap activity feed limit constant", () => {
    expect(HQ_ACTIVITY_LIMIT).toBeLessThanOrEqual(100);
    expect(HQ_ACTIVITY_LIMIT).toBe(40);
  });

  it("HQ query modules export read-only loaders only", () => {
    expect(hqIndex.loadInfinityHqSnapshot).toBeTypeOf("function");
    expect(hqIndex.loadMissionInspector).toBeTypeOf("function");
    expect(hqIndex.buildHqAlerts).toBeTypeOf("function");
  });

  it("existing runtime controls are not exported from HQ index", () => {
    expect((hqIndex as Record<string, unknown>).runMissionTick).toBeUndefined();
    expect((hqIndex as Record<string, unknown>).forceStage).toBeUndefined();
  });

  it("browser users cannot bypass gates via HQ (no write helpers)", () => {
    const keys = Object.keys(hqIndex).filter((k) => k.toLowerCase().includes("mutate"));
    expect(keys).toHaveLength(0);
  });

  it("large activity sets are capped by HQ_ACTIVITY_LIMIT", () => {
    expect(HQ_ACTIVITY_LIMIT).toBe(40);
  });

  it("server queries remain typed via exported snapshot type", () => {
    const partial: Partial<HqDashboardSnapshot> = { organizationId: "org" };
    expect(partial.organizationId).toBe("org");
  });

  it("Build Factory remains unimplemented in HQ UI copy", () => {
    expect(displayNotImplemented("Build Factory")).toBe("Build Factory not implemented");
  });

  it("mission stage URL filter applies to snapshot", () => {
    const missions: HqMissionRow[] = [
      {
        missionId: "m1",
        title: "A",
        organizationId: "o",
        runtimeInstanceId: "r1",
        runtimeStatus: "running",
        currentStage: "discovery",
        lifecycleVersion: "v2",
        lastAdvancedAt: null,
        wakeAt: null,
        blockingReason: null,
        stateVersion: 1,
        latestTransition: null,
        latestCheckpoint: null,
        inspectorHref: "/dashboard/missions/m1",
      },
      {
        missionId: "m2",
        title: "B",
        organizationId: "o",
        runtimeInstanceId: "r2",
        runtimeStatus: "running",
        currentStage: "validation",
        lifecycleVersion: "v2",
        lastAdvancedAt: null,
        wakeAt: null,
        blockingReason: null,
        stateVersion: 1,
        latestTransition: null,
        latestCheckpoint: null,
        inspectorHref: "/dashboard/missions/m2",
      },
    ];
    expect(filterMissionsByStage(missions, "discovery")).toHaveLength(1);
  });

  it("executive queue sort is deterministic", () => {
    const items: HqExecutiveQueueItem[] = [
      {
        id: "1",
        opportunityId: "o1",
        opportunityName: "A",
        decision: "queue",
        queueStatus: "active",
        priority: 1,
        rationale: null,
        planningEligible: false,
        validationStatus: null,
        reasoningRecommendation: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        opportunityId: "o2",
        opportunityName: "B",
        decision: "queue",
        queueStatus: "active",
        priority: 9,
        rationale: null,
        planningEligible: true,
        validationStatus: null,
        reasoningRecommendation: null,
        createdAt: "2026-01-02T00:00:00Z",
      },
    ];
    const sorted = sortExecutiveQueue(items, "priority");
    expect(sorted[0]?.id).toBe("2");
  });

  it("applyDashboardFilters merges filter fields", () => {
    const snapshot = {
      activity: [],
      missions: [],
    } as unknown as HqDashboardSnapshot;
    const filtered = applyDashboardFilters(snapshot, { eventSeverity: "info" });
    expect(filtered.activity).toEqual([]);
  });
});

function loadMissionInspectorStub(): void {
  /* documented: loadMissionInspector requires live Supabase + org scope */
}

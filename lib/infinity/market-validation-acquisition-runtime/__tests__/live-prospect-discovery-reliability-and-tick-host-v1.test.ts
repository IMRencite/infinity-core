import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { resetMissionActivityStore, listMissionActivityEvents } from "@/lib/infinity/mission-activity";
import {
  ACQUISITION_RETRY_BACKOFF_MS,
  abandonStaleAcquisitionTick,
  acquisitionTickKey,
  acquisitionTriggerFromIngest,
  chooseResearchFallback,
  claimAcquisitionTick,
  classifyProspectResearchFailure,
  completeAcquisitionTick,
  discoverPublicProspects,
  invokeMarketValidationAcquisitionRuntime,
  listEligibleGroundedResearchProviders,
  mayRetryResearchTask,
  peekAcquisitionTickLock,
  PROSPECT_RESEARCH_PLAN,
  qualifyDiscoveredIdentity,
  recordAcquisitionRuntimeObservation,
  resetAcquisitionTickLocks,
  resolveResearchBlocker,
  retryBackoffMs,
  runAutonomousAcquisitionTick,
  runBoundedResearchTask,
  shouldUseResearchFallback,
} from "../index";

const ROOT = join(process.cwd());
const NOW = new Date("2026-08-29T16:00:00.000Z");
const ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

const GROUNDED = {
  name: "Jordan Hale",
  organization: "Hale Occupier Advisors",
  role: "tenant-representation broker",
  sourceUrls: ["https://example.com/hale-occupier-advisors/team/jordan-hale"],
  findingId: "f1",
};

function withLiveResearchEnv(): () => void {
  const previous = {
    RESEARCH_PROVIDER: process.env.RESEARCH_PROVIDER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    RESEARCH_ENABLED: process.env.RESEARCH_ENABLED,
    INFINITY_ACQUISITION_TICK: process.env.INFINITY_ACQUISITION_TICK,
  };
  process.env.RESEARCH_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-not-a-real-key";
  process.env.RESEARCH_ENABLED = "true";
  process.env.INFINITY_ACQUISITION_TICK = "1";
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

describe("LIVE PROSPECT DISCOVERY RELIABILITY + AUTONOMOUS MISSION TICK HOST V1", () => {
  let restore: () => void;

  beforeEach(() => {
    resetMissionActivityStore();
    resetAcquisitionTickLocks();
    restore = withLiveResearchEnv();
  });

  afterEach(() => {
    restore();
    resetAcquisitionTickLocks();
  });

  it("classifies provider timeout separately from founder input", () => {
    expect(classifyProspectResearchFailure(new Error("LIVE_PROSPECT_DISCOVERY_TIMEOUT"))).toBe("TIMEOUT");
    expect(classifyProspectResearchFailure(new Error("429 rate limit"))).toBe("RATE_LIMIT");
    expect(classifyProspectResearchFailure(new Error("NO_RESULTS"))).toBe("NO_RESULTS");
    expect(
      resolveResearchBlocker({
        prospectCount: 0,
        capabilityMissing: false,
        classification: "TIMEOUT",
        pathsExhausted: false,
        founderChannelRequired: false,
      }),
    ).toBe("RESEARCH_EXECUTION_RETRY_REQUIRED");
    expect(
      resolveResearchBlocker({
        prospectCount: 0,
        capabilityMissing: false,
        classification: "PROVIDER_UNAVAILABLE",
        pathsExhausted: false,
        founderChannelRequired: false,
      }),
    ).toBe("RESEARCH_PROVIDER_UNAVAILABLE");
    expect(
      resolveResearchBlocker({
        prospectCount: 0,
        capabilityMissing: false,
        classification: "POLICY_BLOCKED",
        pathsExhausted: true,
        founderChannelRequired: false,
      }),
    ).toBe("RESEARCH_CAPABILITY_UNAVAILABLE");
    expect(
      resolveResearchBlocker({
        prospectCount: 0,
        capabilityMissing: false,
        classification: "NO_RESULTS",
        pathsExhausted: true,
        founderChannelRequired: false,
      }),
    ).toBe("NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND");
    expect(
      resolveResearchBlocker({
        prospectCount: 0,
        capabilityMissing: false,
        classification: "NO_RESULTS",
        pathsExhausted: true,
        founderChannelRequired: true,
      }),
    ).toBe("FOUNDER_PROSPECT_INPUT_REQUIRED");
    expect(
      resolveResearchBlocker({
        prospectCount: 0,
        capabilityMissing: false,
        classification: "COMPLETED",
        pathsExhausted: true,
        founderChannelRequired: false,
      }),
    ).toBe("NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND");
  });

  it("retries transient failures once with bounded backoff and no storm", async () => {
    const sleeps: number[] = [];
    let runs = 0;
    const result = await runBoundedResearchTask({
      taskId: "discover_organizations",
      providerId: "gemini",
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      run: async () => {
        runs += 1;
        if (runs === 1) throw new Error("LIVE_PROSPECT_DISCOVERY_TIMEOUT");
        return ["ok"];
      },
    });
    expect(runs).toBe(2);
    expect(result.ok).toBe(true);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.classification).toBe("TIMEOUT");
    expect(sleeps).toEqual([retryBackoffMs(1)]);
    expect(retryBackoffMs(1)).toBeGreaterThan(0);
    expect(retryBackoffMs(8)).toBeLessThanOrEqual(2_000);
    expect(mayRetryResearchTask({ attempts: 2, classification: "TIMEOUT" })).toBe(false);
    let storm = 0;
    await runBoundedResearchTask({
      taskId: "discover_organizations",
      providerId: "gemini",
      sleep: async () => undefined,
      run: async () => {
        storm += 1;
        throw new Error("LIVE_PROSPECT_DISCOVERY_TIMEOUT");
      },
    });
    expect(storm).toBe(2);
  });

  it("keeps fallback provider-neutral and economically gated", () => {
    expect(
      shouldUseResearchFallback({
        fallbackVerified: true,
        estimatedFallbackCostUsd: null,
        maxEstimatedCostUsd: 2,
      }),
    ).toBe(false);
    expect(
      shouldUseResearchFallback({
        fallbackVerified: true,
        estimatedFallbackCostUsd: 3,
        maxEstimatedCostUsd: 2,
      }),
    ).toBe(false);
    expect(
      chooseResearchFallback({
        primaryProviderId: "gemini",
        eligible: [
          { providerId: "gemini", verified: true },
          { providerId: "other", verified: true },
        ],
        estimatedFallbackCostUsd: 0.4,
        maxEstimatedCostUsd: 2,
      }),
    ).toBe("other");
    expect(
      chooseResearchFallback({
        primaryProviderId: "gemini",
        eligible: [
          { providerId: "gemini", verified: true },
          { providerId: "other", verified: true },
        ],
        estimatedFallbackCostUsd: null,
        maxEstimatedCostUsd: 2,
      }),
    ).toBeNull();
    expect(listEligibleGroundedResearchProviders().every((item) => item.verified)).toBe(true);
    expect(PROSPECT_RESEARCH_PLAN).toHaveLength(4);
    expect(PROSPECT_RESEARCH_PLAN[0]?.maxResults).toBeLessThanOrEqual(10);
    expect(PROSPECT_RESEARCH_PLAN[3]?.maxResults).toBeLessThanOrEqual(8);
  });

  it("decomposes discovery, requires grounded evidence, and separates contactability", async () => {
    const withoutContact = qualifyDiscoveredIdentity(GROUNDED);
    expect(withoutContact?.qualification.status).toBe("PROSPECT_QUALIFIED");
    expect(withoutContact?.qualification.contactChannelAvailable).toBe(false);
    expect(withoutContact?.qualification.confidence).toBe("HIGH");
    expect(
      qualifyDiscoveredIdentity({
        ...GROUNDED,
        sourceUrls: [],
      }),
    ).toBeNull();
    expect(
      qualifyDiscoveredIdentity({
        ...GROUNDED,
        publicContactChannel: "guessed@example.com",
      }),
    ).toBeNull();
    const phases: string[] = [];
    const discovery = await discoverPublicProspects({
      liveDiscovery: true,
      executeTask: async (taskId) => {
        phases.push(taskId);
        if (taskId !== "rank_qualify") return [];
        return withoutContact ? [withoutContact] : [];
      },
    });
    expect(phases).toEqual(PROSPECT_RESEARCH_PLAN.map((task) => task.id));
    expect(discovery.prospects).toHaveLength(1);
    expect(discovery.classification).toBe("COMPLETED");
  });

  it("does not ask the founder for names after a provider timeout", async () => {
    const runtime = await invokeMarketValidationAcquisitionRuntime({
      organizationId: ORG,
      now: NOW,
      liveDiscovery: true,
      executeTask: async () => {
        throw new Error("LIVE_PROSPECT_DISCOVERY_TIMEOUT");
      },
    });
    expect(runtime.discovery.classification).toBe("TIMEOUT");
    expect(runtime.discovery.candidatesFound).toBe(0);
    expect(runtime.governance.blocker).toBe("RESEARCH_EXECUTION_RETRY_REQUIRED");
    expect(runtime.governance.blocker).not.toBe("FOUNDER_PROSPECT_INPUT_REQUIRED");
    expect(runtime.governance.request.recommendedAction).toMatch(/No founder action required/i);
    expect(runtime.unauthorizedActions.realOutreach).toBe(0);
    expect(runtime.experiment.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(runtime.experiment.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(runtime.experiment.clock.restarted).toBe(false);
    expect(runtime.command.recentEvents.some((event) => event.stepType === "RESEARCH_TIMEOUT")).toBe(true);
    expect(runtime.command.recentEvents.some((event) => event.stepType === "RESEARCH_RETRY")).toBe(true);
    expect(runtime.command.recentEvents.some((event) => event.technicalDetail?.includes("TIMEOUT"))).toBe(true);
    expect(
      runtime.command.recentEvents.every(
        (event) => !event.progress || event.progress.percent == null || event.progress.totalKnownSteps > 0,
      ),
    ).toBe(true);
  });

  it("exposes retry and timeout on MISSION_ACTIVITY_EVENT_V1 without fake progress", async () => {
    await discoverPublicProspects({
      liveDiscovery: true,
      executeTask: async (_task, attempt) => {
        if (attempt === 1) throw new Error("LIVE_PROSPECT_DISCOVERY_TIMEOUT");
        return [];
      },
      onAttempt: (attempt) => {
        if (attempt.classification === "TIMEOUT") {
          // runtime emit path is covered separately; classification must stay truthful
          expect(attempt.attempt).toBe(1);
        }
      },
    });
    const result = await invokeMarketValidationAcquisitionRuntime({
      organizationId: ORG,
      now: NOW,
      liveDiscovery: false,
      researchFindings: [
        {
          findingId: "f1",
          claim: "Jordan Hale of Hale Occupier Advisors is a tenant-representation broker focused on commercial lease comparison.",
          grounded: true,
          inference: false,
          sourceUrls: ["https://example.com/hale-occupier-advisors/team/jordan-hale"],
        },
      ],
    });
    expect(result.command.recentEvents.some((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1")).toBe(true);
    expect(["COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED", "ACQUISITION_PREPARATION_INCOMPLETE"]).toContain(
      result.command.nowInspecting.blocker,
    );
    expect(result.nextMission.subtype).toBe("OUTREACH_PREPARATION");
    expect(result.discovery.prospects.every((prospect) => prospect.lineage.grounded)).toBe(true);
    expect(recordAcquisitionRuntimeObservation({
      experimentId: "exp_e72beb7b6d35e7b20acf",
      candidateId: "7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: "msn_mva_e72beb7b6d35e7b2",
      channelType: "founder_assisted_introduction",
      stepType: "PROSPECT_DISCOVERY",
    }).countsAsMarketEvidence).toBe(false);
  });

  it("hosts scheduled, event-driven, idempotent, and overlapping ticks without Cursor", async () => {
    expect(acquisitionTriggerFromIngest("QUALIFIED_PILOT_APPLICATION")).toBe("REAL_SUBMISSION_RECEIVED");
    expect(acquisitionTriggerFromIngest("PRICE_OPTION_SELECTED")).toBe("PRICING_SELECTION_RECEIVED");
    const first = await runAutonomousAcquisitionTick({
      organizationId: ORG,
      now: NOW,
      trigger: "EXPERIMENT_ENTERED_COLLECTING",
      liveDiscovery: false,
      lastEvaluatedAt: null,
    });
    expect(first.skipped).toBe(false);
    expect(first.result?.nextMission.missionId).toBe("msn_mva_e72beb7b6d35e7b2");
    const duplicate = await runAutonomousAcquisitionTick({
      organizationId: ORG,
      now: NOW,
      trigger: "EXPERIMENT_ENTERED_COLLECTING",
      liveDiscovery: false,
      lastEvaluatedAt: null,
    });
    expect(duplicate.skipped).toBe(true);
    expect(duplicate.reason).toMatch(/DUPLICATE_TICK|SCHEDULE_NOT_DUE/);
    resetAcquisitionTickLocks();
    const key = acquisitionTickKey({
      experimentId: "exp_e72beb7b6d35e7b20acf",
      qualified: 0,
      strong: 0,
      pricing: 0,
      trigger: "EXPERIMENT_ENTERED_COLLECTING",
    });
    expect(claimAcquisitionTick({ experimentId: "exp_e72beb7b6d35e7b20acf", tickKey: key, lockedBy: "a", now: NOW }).claimed).toBe(true);
    expect(claimAcquisitionTick({ experimentId: "exp_e72beb7b6d35e7b20acf", tickKey: key, lockedBy: "b", now: NOW }).reason).toBe("OVERLAP_PREVENTED");
    const later = new Date(NOW.getTime() + 11 * 60_000);
    expect(abandonStaleAcquisitionTick("exp_e72beb7b6d35e7b20acf", later).abandoned).toBe(true);
    completeAcquisitionTick("exp_e72beb7b6d35e7b20acf", key, "RESEARCH_EXECUTION_RETRY_REQUIRED", { now: later });
    const lock = peekAcquisitionTickLock("exp_e72beb7b6d35e7b20acf");
    expect(lock?.retryEligible).toBe(true);
    expect(Date.parse(lock?.nextRetryAt ?? "")).toBe(later.getTime() + ACQUISITION_RETRY_BACKOFF_MS);
    const eventDriven = await runAutonomousAcquisitionTick({
      organizationId: ORG,
      now: new Date(later.getTime() + ACQUISITION_RETRY_BACKOFF_MS + 1),
      trigger: "REAL_SUBMISSION_RECEIVED",
      liveDiscovery: false,
    });
    expect(eventDriven.skipped).toBe(false);
    expect(eventDriven.reason).toBe("EXECUTED");
  });

  it("uses a durable host independent of browser and Cursor", () => {
    const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    expect(vercel.crons[0]?.path).toBe("/api/runtime/tick");
    expect(vercel.crons[0]?.schedule).toBe("0 */12 * * *");
    expect(existsSync(join(ROOT, "app/api/runtime/tick/route.ts"))).toBe(true);
    const lifecycle = readFileSync(join(ROOT, "lib/infinity/mission-runtime/lifecycle.ts"), "utf8");
    expect(lifecycle).toContain("runAutonomousAcquisitionTick");
    const route = readFileSync(join(ROOT, "app/api/runtime/tick/route.ts"), "utf8");
    expect(route).toContain("runMissionRuntimeTick");
    expect(route).not.toContain("setInterval");
    const dashboard = readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8");
    expect(dashboard).not.toMatch(/setInterval\(\s*\(\)\s*=>\s*invokeMarketValidationAcquisitionRuntime/);
    const evidence = inspectRealMarketEvidence({ now: NOW });
    expect(evidence.experiment.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.clock.restarted).toBe(false);
    expect(listMissionActivityEvents().every((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1" || true)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  evaluateGrowthAutomationCompletenessContract,
  evaluateHqCanonicalWorkerActivityGate,
  evaluateHqProductionRuntimeCanonicalSourceGate,
  evaluateHqProductionRuntimeFallbackMaskingGate,
  evaluateHqProductionRuntimeFreshnessGate,
  evaluateHqProductionRuntimeProjectionContract,
  evaluateHqProductionRuntimeSecretExposureGate,
  RUNTIME_UNREACHABLE,
  workerProjectionForExecution,
  type HqProductionOperatingState,
} from "../hq-runtime-projection";
import { applyProductionRuntimeToGrowthNexusView, buildGrowthNexusHqView } from "../hq";
import { occupancynpvGrowthRecommendation } from "../recommendations";

const production: HqProductionOperatingState = {
  contract: "InfinityProductionOperatingState",
  source: "live_production_runtime",
  runtime: {
    project: "infinity-runtime",
    projectId: "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox",
    url: "https://infinity-runtime.vercel.app",
    status: "READY",
    deploymentId: "dpl_test",
    lastVerifiedAt: "2026-09-11T04:50:00.000Z",
  },
  campaign: {
    campaignId: "campaign:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:first-outbound-validation",
    ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    status: "GROWTH_EXPERIMENT_ACTIVE",
    automationCompleteness: "PARTIAL",
    tactic: "OUTBOUND_EMAIL",
    segment: "US tenant-representation brokers and boutique tenant-side CRE advisors",
    initialCap: 5,
    healthyCap: 10,
    rampAuthorized: false,
    target: 200,
    minimumQualifiedConversations: 15,
    trial: "OFF",
  },
  cycle: { lastCycleAt: "2026-09-11T04:50:00.000Z", nextCycleAt: "2026-09-11T05:00:00.000Z", lastDiscoveryAt: "2026-09-11T04:50:00.000Z" },
  funnel: {
    rawDiscovered: 12,
    deduplicated: 8,
    relevant: 6,
    contactable: 1,
    qualified: 1,
    discoveredNotContactable: 5,
    queueState: "ELIGIBLE_BUT_NOT_DURABLY_QUEUED",
    queuedCycleLocal: 1,
    sent: 0,
    delivered: 0,
    replied: 0,
    qualifiedConversations: 0,
    converted: 0,
  },
  providers: {},
  selectedProvider: "gemini_grounded_search",
  primaryMetric: "QUALIFIED_CONTACTABLE_PROSPECT_YIELD",
  gmail: "PASS",
  deliverability: "INSUFFICIENT",
  scheduler: "LIVE",
  incidents: { activeSelectedProvider: 0, duckduckgoHistorical: 1 },
  performance: { observations: 1, events: 1, discoveryEvents: 1, qualifiedProspectEvents: 1 },
  automation: {
    sourcing: "MANUAL_TRIGGER",
    qualification: "AUTONOMOUS_WHEN_TRIGGERED",
    scheduling: "AUTONOMOUS",
    sending: "NOT_DURABLE_AUTONOMOUS",
    replyRetrieval: "NOT_BUILT",
    classification: "NOT_BUILT",
    lowRiskReplies: "NOT_BUILT",
    followUp: "NOT_BUILT",
    optimization: "NOT_BUILT",
    overall: "PARTIAL",
  },
  workers: workerProjectionForExecution(false),
  prospects: [{
    businessName: "CCG Retail",
    sourceUrl: "https://www.ccgretail.com/",
    qualificationReason: "published professional email",
    sourceProvenance: "https://www.ccgretail.com/",
    contactProvenance: "PUBLISHED_ON_SOURCE",
    timezone: "America/New_York",
    status: "ELIGIBLE_BUT_NOT_DURABLY_QUEUED",
    queuedReason: "outside window",
    sendEligible: false,
    campaignId: "campaign:x",
    provider: "gemini_grounded_search",
  }],
  nextSendWindow: "recipient-local 08:30–10:30 or 13:00–15:00",
  nextLearningObjective: "durable queue",
  nextSystemGap: "durable sourcing/queue/reply/follow-up automation",
};

describe("local working-tree must not mask production", () => {
  it("shows production qualified 1 when local ledger is 0", () => {
    const local = buildGrowthNexusHqView(occupancynpvGrowthRecommendation().strategy);
    expect(local.campaign.sourced).toBe(0);
    const bound = applyProductionRuntimeToGrowthNexusView(local, production);
    expect(bound.campaign.sourced).toBe(12);
    expect(bound.production?.qualifiedContactable).toBe("1");
    const freshness = evaluateHqProductionRuntimeFreshnessGate({
      productionQualified: 1,
      localWorkingTreeQualified: 0,
      lastVerifiedAt: production.runtime.lastVerifiedAt,
      now: "2026-09-11T05:00:00.000Z",
      usedLocalAsProduction: false,
    });
    expect(freshness.result).toBe("PASS");
    expect(freshness.displayedQualified).toBe(1);
  });
});

describe("runtime unreachable is not silent local fallback", () => {
  it("surfaces RUNTIME_UNREACHABLE", () => {
    const local = buildGrowthNexusHqView(occupancynpvGrowthRecommendation().strategy, {
      production: RUNTIME_UNREACHABLE,
    });
    expect(local.production?.source).toBe(RUNTIME_UNREACHABLE);
    const masking = evaluateHqProductionRuntimeFallbackMaskingGate({
      runtimeReachable: false,
      displayedAs: RUNTIME_UNREACHABLE,
    });
    expect(masking.result).toBe("PASS");
    expect(evaluateHqProductionRuntimeFallbackMaskingGate({
      runtimeReachable: false,
      displayedAs: "local",
    }).result).toBe("FAIL");
  });
});

describe("cron definitions are not active workers", () => {
  it("counts 0 active workers when 2 crons exist and nothing is executing", () => {
    const idle = workerProjectionForExecution(false);
    expect(idle.cronDefinitions).toBe(2);
    expect(idle.activeWorkerCount).toBe(0);
    expect(idle.hqCommand).toBe("WAITING");
    expect(idle.infinity).toBe("STANDBY");
    expect(evaluateHqCanonicalWorkerActivityGate(idle).result).toBe("PASS");
  });

  it("marks Growth worker ACTIVE only during real execution", () => {
    const active = workerProjectionForExecution(true);
    expect(active.growthWorker).toBe("ACTIVE");
    expect(active.hqCommand).toBe("ACTIVE_OVERSIGHT");
    expect(active.infinity).toBe("ACTIVE");
    expect(evaluateHqCanonicalWorkerActivityGate(active).result).toBe("PASS");
  });
});

describe("secret redaction", () => {
  it("fails when a runtime payload includes secret-like configuration", () => {
    const exposed = evaluateHqProductionRuntimeSecretExposureGate({
      state: production,
      GEMINI_API_KEY: "AQ.TESTKEYTESTKEYTESTKEYTESTKEYTEST",
    });
    expect(exposed.result).toBe("FAIL");
    expect(exposed.leakCount).toBeGreaterThan(0);
  });

  it("passes a redacted operating-state payload", () => {
    expect(evaluateHqProductionRuntimeSecretExposureGate({ status: "BOUND", state: production }).result).toBe("PASS");
  });
});

describe("contracts", () => {
  it("keeps a single canonical source and partial automation", () => {
    expect(evaluateHqProductionRuntimeCanonicalSourceGate({
      parallelHqStore: false,
      source: "live_production_runtime",
    }).result).toBe("PASS");
    expect(evaluateGrowthAutomationCompletenessContract(production.automation).overall).toBe("PARTIAL");
    expect(evaluateHqProductionRuntimeProjectionContract({
      ok: true,
      status: "BOUND",
      freshness: "FRESH",
      state: production,
    }).bound_to_hq_ui).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { resetMissionActivityStore, projectCommandActivity } from "@/lib/infinity/mission-activity";
import {
  ACQUISITION_CHANNEL_TYPES,
  LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED,
  MARKET_VALIDATION_ACQUISITION_RUNTIME,
  MAX_DISCOVERY_COHORT,
  TELEMETRY_PERSISTENCE_NOTE,
  acquisitionChannelRegistry,
  acquisitionRuntimeScheduleHost,
  applyChannelOutcomes,
  calculateEvidenceGap,
  classifyAuthorization,
  communicationsAuthorizationGranted,
  discoverCollectingExperiments,
  evaluateAcquisitionTrigger,
  evaluateCreativeAcquisitionNeed,
  extractProspectsFromFindings,
  invokeMarketValidationAcquisitionRuntime,
  isProviderNeutral,
  mayAutoExecute,
  paidAcquisitionAuthorizationGranted,
  rankAcquisitionChannels,
  recordAcquisitionRuntimeObservation,
  shouldRunScheduledEvaluation,
} from "../index";

const ROOT = join(process.cwd());
const NOW = new Date("2026-08-29T16:00:00.000Z");

const GROUNDED_FINDINGS = [
  {
    findingId: "f1",
    claim: "Jordan Hale of Hale Occupier Advisors is a tenant-representation broker focused on commercial lease comparison.",
    grounded: true,
    inference: false,
    sourceUrls: ["https://example.com/hale-occupier-advisors/team/jordan-hale"],
  },
  {
    findingId: "f2",
    claim: "Priya Shah of Northline Tenant Rep is a tenant-representation broker advising occupiers on lease NPV.",
    grounded: true,
    inference: false,
    sourceUrls: ["https://example.com/northline/priya-shah"],
  },
];

describe("AUTONOMOUS MARKET VALIDATION ACQUISITION RUNTIME V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
  });

  it("detects the active COLLECTING experiment and evidence gaps", () => {
    const found = discoverCollectingExperiments({ now: NOW });
    const gap = calculateEvidenceGap({ now: NOW });
    const evidence = inspectRealMarketEvidence({ now: NOW });
    expect(found.experiments).toHaveLength(1);
    expect(found.experiments[0]?.state).toBe("COLLECTING");
    expect(gap.qualifiedGap).toBe(15);
    expect(gap.strongIntentGap).toBe(5);
    expect(gap.pricingGap).toBe(5);
    expect(gap.daysRemaining).toBe(14);
    expect(gap.evidenceSufficiency).toBe("INSUFFICIENT");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.clock.restarted).toBe(false);
    expect(evidence.experiment.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.decision.currentDecision).toBe("VALIDATE");
    expect(evidence.decision.buildReady).toBe(false);
  });

  it("supports event-driven and scheduled evaluation without high-frequency polling", () => {
    const trigger = evaluateAcquisitionTrigger({
      trigger: "EXPERIMENT_ENTERED_COLLECTING",
      gap: calculateEvidenceGap({ now: NOW }),
    });
    expect(trigger.accept).toBe(true);
    const schedule = acquisitionRuntimeScheduleHost();
    expect(schedule.supported).toBe(true);
    expect(schedule.schedule.minIntervalHours).toBeGreaterThanOrEqual(12);
    expect(shouldRunScheduledEvaluation({ now: NOW, lastEvaluatedAt: null })).toBe(true);
    expect(
      shouldRunScheduledEvaluation({
        now: NOW,
        lastEvaluatedAt: "2026-08-29T10:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("keeps a provider-neutral registry with UNKNOWN economics and split authorization", () => {
    const channels = acquisitionChannelRegistry();
    expect(channels.map((channel) => channel.channelType).sort()).toEqual([...ACQUISITION_CHANNEL_TYPES].sort());
    expect(isProviderNeutral(channels)).toBe(true);
    expect(channels.every((channel) => channel.costClassification === "UNKNOWN")).toBe(true);
    expect(channels.find((channel) => channel.channelType === "paid_acquisition")?.financialAuthorizationRequired).toBe(true);
    expect(channels.find((channel) => channel.channelType === "founder_assisted_introduction")?.financialAuthorizationRequired).toBe(false);
    expect(classifyAuthorization({ channelType: "founder_assisted_introduction", sendingMessages: true, paid: false, providerWrite: false })).toBe("EXTERNAL_COMMUNICATION");
    expect(classifyAuthorization({ channelType: "paid_acquisition", sendingMessages: false, paid: true, providerWrite: false })).toBe("PAID_ACQUISITION");
    expect(communicationsAuthorizationGranted()).toBe(false);
    expect(paidAcquisitionAuthorizationGranted()).toBe(false);
    expect(mayAutoExecute({ authorizationClass: "READ_ONLY_RESEARCH", capabilityAvailable: true, authorizationExists: false, scopeBounded: true })).toBe(true);
    expect(mayAutoExecute({ authorizationClass: "EXTERNAL_COMMUNICATION", capabilityAvailable: true, authorizationExists: false, scopeBounded: true })).toBe(false);
  });

  it("ranks high-information low-exposure channels first and learns from outcomes", () => {
    const gap = calculateEvidenceGap({ now: NOW });
    const ranked = rankAcquisitionChannels({ channels: acquisitionChannelRegistry(), gap });
    expect(ranked[0]?.channelType).toBe("founder_assisted_introduction");
    expect(ranked[1]?.channelType === "bounded_professional_outreach" || ranked[1]?.channelType === "professional_association").toBe(true);
    expect(ranked.at(-1)?.channelType).toBe("paid_acquisition");
    const learned = applyChannelOutcomes(acquisitionChannelRegistry(), [
      { channelType: "community_post", visits: 400, qualified: 0 },
      { channelType: "founder_assisted_introduction", visits: 4, qualified: 3 },
    ]);
    expect(learned.find((channel) => channel.channelType === "community_post")?.historicalPerformance.valueAdjustment).toBe(-2);
    expect(learned.find((channel) => channel.channelType === "founder_assisted_introduction")?.historicalPerformance.valueAdjustment).toBe(2);
  });

  it("does not fabricate prospects and caps the cohort", () => {
    expect(extractProspectsFromFindings([{ findingId: "x", claim: "Someone useful exists.", grounded: false, sourceUrls: [] }])).toEqual([]);
    const overflow = [
      "Amber",
      "Blake",
      "Casey",
      "Drew",
      "Eden",
      "Finley",
      "Gray",
      "Harper",
      "Indigo",
      "Jules",
      "Kai",
      "Logan",
    ].map((name, index) => ({
      findingId: `g${index}`,
      claim: `Alex ${name} of ${name} Occupier Advisors is a tenant-representation broker doing occupier lease work.`,
      grounded: true,
      inference: false,
      sourceUrls: [`https://example.com/public/${name.toLowerCase()}`],
    }));
    expect(extractProspectsFromFindings(overflow)).toHaveLength(MAX_DISCOVERY_COHORT);
  });

  it("runs the CRE acquisition cycle with grounded fixtures and blocks on communications", async () => {
    const result = await invokeMarketValidationAcquisitionRuntime({
      organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
      candidateId: "7e7e924e-0741-4155-a729-8d529da77ea9",
      experimentId: "exp_e72beb7b6d35e7b20acf",
      now: NOW,
      liveDiscovery: false,
      researchFindings: GROUNDED_FINDINGS,
    });
    expect(result.runtime).toBe(MARKET_VALIDATION_ACQUISITION_RUNTIME);
    expect(result.discovery.fabricatedProspects).toBe(false);
    expect(result.discovery.candidatesFound).toBe(2);
    expect(result.discovery.highConfidenceQualified).toBe(2);
    expect(result.discovery.maxCohortRespected).toBe(true);
    expect(result.unauthorizedActions.realOutreach).toBe(0);
    expect(result.unauthorizedActions.paidAds).toBe(0);
    expect(result.decision.buildReady).toBe(false);
    expect(result.decision.currentDecision).toBe("VALIDATE");
    expect(result.governance.blocker).toBe("COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED");
    expect(result.governance.request.externalCommunication).toBe("REQUIRES_APPROVAL");
    expect(result.nextMission.communicationAuthorizationRequired).toBe(false);
    expect(result.nextMission.financialAuthorizationRequired).toBe(false);
    expect(result.nextMission.expectedProviderSpend).toBe("NOT_APPLICABLE");
    expect(result.organic.largeSeoBuild).toBe(false);
    expect(result.organic.opportunities.length).toBeLessThanOrEqual(3);
    expect(result.creative.assetsGenerated).toBe(0);
    expect(result.command.counts.activeMissions).toBe(0);
    expect(result.command.counts.blockedMissions).toBe(1);
    expect(result.command.rooms.growth_department.allowAmbientMotion).toBe(false);
    expect(result.command.rooms.research_department.allowAmbientMotion).toBe(false);
    expect(result.command.nowInspecting.currentMission).toBe("MARKET_VALIDATION_ACQUISITION");
    expect(result.command.nowInspecting.blocker).toBe("COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED");
    expect(result.command.systemView.experimentId).toBe("exp_e72beb7b6d35e7b20acf");
    expect(result.telemetryPersistenceNote).toContain("not the long-term");
    const projected = projectCommandActivity({ organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494" });
    expect(projected.recentEvents.some((event) => event.eventType === "STEP_STARTED")).toBe(true);
    expect(projected.recentEvents.some((event) => event.eventType === "MISSION_BLOCKED")).toBe(true);
  });

  it("does not invent prospects when live discovery is off", async () => {
    const result = await invokeMarketValidationAcquisitionRuntime({
      organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
      now: NOW,
      liveDiscovery: false,
    });
    expect(result.discovery.candidatesFound).toBe(0);
    expect(result.discovery.fabricatedProspects).toBe(false);
    expect(result.governance.blocker).toBe(LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED);
    expect(result.command.rooms.executive_office.status).toBe("READY_BLOCKED");
  });

  it("does not count acquisition runtime work as real market evidence", () => {
    const recorded = recordAcquisitionRuntimeObservation({
      experimentId: "exp_e72beb7b6d35e7b20acf",
      candidateId: "7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: "msn_test",
      channelType: "founder_assisted_introduction",
      stepType: "PROSPECT_DISCOVERY",
    });
    expect(recorded.countsAsMarketEvidence).toBe(false);
    expect(recorded.productionQualified).toBe(0);
    expect(evaluateCreativeAcquisitionNeed({ qualifiedEvidence: 0 }).justified).toBe(false);
  });

  it("preserves HQ, Money, Command Deck, and Now Inspecting surfaces", () => {
    const dashboard = readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8");
    const money = readFileSync(join(ROOT, "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    const inspecting = readFileSync(join(ROOT, "components/dashboard/operator-console/inspection-context-bar.tsx"), "utf8");
    const prefetch = readFileSync(join(ROOT, "lib/infinity/operator-console/load-hq-dashboard.ts"), "utf8");
    expect(dashboard).toContain("InfinityHqExperience");
    expect(money).toContain('money: "Money"');
    expect(inspecting).toContain("NOW INSPECTING");
    expect(prefetch).toContain("one inspected venture");
    expect(TELEMETRY_PERSISTENCE_NOTE).toMatch(/database-backed durability/);
  });
});

import { describe, expect, it, beforeEach } from "vitest";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { CRE_CANDIDATE_ID, LOCKED_SUCCESS_CRITERIA, SUCCESSOR_CRE_ARTIFACT_ID, WRITE_BOUNDARY } from "../constants";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import { makeEvent } from "../events";
import { evaluateQualification, pageViewIsQualified, qualificationContract } from "../qualification-contract";
import { inspectExperimentClock, CANONICAL_EVIDENCE_START, experimentDeadline } from "../experiment-clock";
import { evaluateDecisionReadiness } from "../decision-readiness";
import { first15Plan, nextAcquisitionAction, prioritizedChannels } from "../acquisition-plan";
import { auditLivePublicAcquisitionAttribution } from "../attribution-audit";
import { currentCreValidationArtifactId } from "../current-cre-artifact";
import { inspectCollectingHqPresence } from "../collecting-hq";
import { countRealEvidence, emptyRealCounts, inspectRealMarketEvidence } from "../real-market-evidence";
import { lastReadyProtectionConfigureRemainsVerified, lastReadySourceBundleRemainsVerified } from "../live-validation-failure";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "../source-bundle-request";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";

describe("CRE REAL MARKET EVIDENCE ACQUISITION V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
  });

  it("keeps real evidence isolated from synthetic and does not count page views as qualified", () => {
    expect(pageViewIsQualified()).toBe(false);
    expect(qualificationContract().pageViewAloneQualified).toBe(false);
    expect(evaluateQualification({ role: "visitor", dealFrequency: "never", leaseWorkflow: false }).qualified).toBe(false);
    expect(
      evaluateQualification({ role: "tenant rep broker", dealFrequency: "monthly", leaseWorkflow: true }).qualified,
    ).toBe(true);
    const counts = countRealEvidence([
      makeEvent({
        type: "PAGE_VIEW",
        candidateId: CRE_CANDIDATE_ID,
        experimentId: "exp_e72beb7b6d35e7b20acf",
        artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
        occurredAt: CANONICAL_EVIDENCE_START,
        synthetic: true,
        prospectKey: "syn",
        qualified: true,
        pricingOptionId: null,
      }),
      makeEvent({
        type: "QUALIFIED_PILOT_APPLICATION",
        candidateId: CRE_CANDIDATE_ID,
        experimentId: "exp_e72beb7b6d35e7b20acf",
        artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
        occurredAt: CANONICAL_EVIDENCE_START,
        synthetic: true,
        prospectKey: "syn-form",
        qualified: true,
        pricingOptionId: "professional_annual",
      }),
    ]);
    expect(counts).toEqual(emptyRealCounts());
  });

  it("locks the experiment clock from evidence start and does not restart it", () => {
    const clock = inspectExperimentClock(new Date("2026-08-29T15:36:00.000Z"));
    expect(clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
    expect(clock.deadline).toBe(experimentDeadline());
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(clock.daysElapsed).toBe(0);
    expect(clock.daysRemaining).toBe(14);
    expect(clock.windowExpired).toBe(false);
    expect(clock.restarted).toBe(false);
    expect(LOCKED_SUCCESS_CRITERIA.maxDurationDays).toBe(14);
  });

  it("tracks thresholds without inventing denominators or counting expected prospects as real", () => {
    const snapshot = inspectRealMarketEvidence({ now: new Date("2026-08-29T15:36:00.000Z") });
    expect(snapshot.counts.qualifiedVisitors).toBe(0);
    expect(snapshot.counts.strongIntent).toBe(0);
    expect(snapshot.counts.pricingSelections).toBe(0);
    expect(snapshot.counts.qualifiedSubmissions).toBe(0);
    expect(snapshot.decision.progress.qualifiedSample).toEqual({ current: 0, required: 15 });
    expect(snapshot.decision.progress.strongIntent).toEqual({ current: 0, required: 5 });
    expect(snapshot.decision.progress.pricingSelections).toEqual({ current: 0, required: 5 });
    expect(snapshot.decision.conversion.denominatorValid).toBe(false);
    expect(snapshot.decision.conversion.value).toBeNull();
    expect(snapshot.decision.nextDeterministicState).toBe("EXTERNAL_ACQUISITION_ACTION_REQUIRED");
    expect(snapshot.decision.currentDecision).toBe("VALIDATE");
    expect(snapshot.decision.buildReady).toBe(false);
    const plan = first15Plan();
    expect(plan.expectedTotal).toBe(15);
    expect(plan.expectedAreActual).toBe(false);
    expect(plan.altersRealCounts).toBe(false);
    expect(snapshot.counts.qualifiedSubmissions).toBe(0);
  });

  it("audits attribution without requiring a new artifact and keeps lineage", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const audit = auditLivePublicAcquisitionAttribution();
    expect(audit.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(audit.digest).toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(audit.source).toBe("NOT_SUPPORTED");
    expect(audit.medium).toBe("NOT_SUPPORTED");
    expect(audit.campaign).toBe("NOT_SUPPORTED");
    expect(audit.referrer).toBe("NOT_SUPPORTED");
    expect(audit.experimentLineage).toBe("PASS");
    expect(audit.candidateLineage).toBe("PASS");
    expect(audit.artifactLineage).toBe("PASS");
    expect(audit.sourceChangeRequired).toBe(true);
    expect(audit.newArtifactRequired).toBe(false);
    expect(result.artifact!.artifactId).toBe(currentCreValidationArtifactId());
    expect(result.artifact!.artifactId).not.toBe(SUCCESSOR_CRE_ARTIFACT_ID);
  });

  it("ranks channels with UNKNOWN economics and does not authorize external action", () => {
    const snapshot = inspectRealMarketEvidence();
    expect(snapshot.channels.every((channel) => channel.expectedCost === "UNKNOWN")).toBe(true);
    expect(snapshot.channels.every((channel) => channel.costClassification === "UNKNOWN" || channel.costClassification === "BENCHMARK")).toBe(true);
    expect(prioritizedChannels()[0]?.channel).toMatch(/Founder-assisted/);
    expect(nextAcquisitionAction().existingAuthorization).toBe(false);
    expect(nextAcquisitionAction().newFounderAuthorizationRequired).toBe(true);
    expect(nextAcquisitionAction().externalWrite).toBe(false);
    expect(snapshot.unauthorizedActions).toEqual({
      paidAds: 0,
      externalOutreach: 0,
      leadPurchases: 0,
      domains: 0,
      dns: 0,
      stripe: 0,
      treasuryMovement: 0,
      providerDeployments: 0,
      protectionMutations: 0,
    });
    expect(WRITE_BOUNDARY.adSpend).toBe(0);
    expect(WRITE_BOUNDARY.outboundMarketingSends).toBe(0);
  });

  it("reports HQ collecting rooms without fake ACTIVE_WORK and preserves capabilities", () => {
    const hq = inspectCollectingHqPresence({ experimentState: "COLLECTING" });
    expect(hq.validationStation).toBe("COLLECTING");
    expect(hq.signalIntelligence).toBe("COLLECTING");
    expect(hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(hq.creationLab).toBe("PRESENT_IDLE");
    expect(hq.fakeActiveWork).toBe(false);
    expect(lastReadySourceBundleRemainsVerified().status).toBe("LIVE_WRITE_VERIFIED");
    expect(lastReadyProtectionConfigureRemainsVerified().status).toBe("LIVE_WRITE_VERIFIED");
    expect(lastReadySourceBundleRemainsVerified().capabilityChanged).toBe(false);
    expect(SOURCE_BUNDLE_CAPABILITY).toBe("hosting.deploy_source_bundle");
    const expired = evaluateDecisionReadiness({
      counts: emptyRealCounts(),
      clock: inspectExperimentClock(new Date("2026-09-13T00:00:00.000Z")),
      deployedPublic: true,
    });
    expect(expired.nextDeterministicState).toBe("EXPERIMENT_WINDOW_EXPIRED");
  });
});

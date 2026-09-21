import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import {
  auditCommunicationCapabilities,
  deliveryIsQualifiedEvidence,
  evaluateContactGovernance,
  executableCommunicationCapability,
  firstCohortReady,
  outreachAttemptIsQualifiedEvidence,
  resolvePreparationBlocker,
  siteVisitIsPricingIntent,
  siteVisitIsStrongIntent,
} from "@/lib/infinity/market-validation-acquisition-runtime";
import type { DiscoveredProspect } from "@/lib/infinity/market-validation-acquisition-runtime/types";
import { resetPublicIngestRuntime, handlePublicValidationIngest } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";
import { qualifyProspect } from "../form";
import { evaluateQualification, pageViewIsQualified } from "../qualification-contract";
import { countRealEvidence, emptyRealCounts } from "../real-market-evidence";
import { makeEvent } from "../events";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "../experiment-clock";
import {
  CRE_CANDIDATE_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  DEPLOYED_SEO_GEO_SUCCESSOR_URL,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import { inspectCreAcquisitionFirstHandoff, REAL_PROSPECT_COHORT_NOT_READY } from "../cre-acquisition-first-handoff";
import { executeCreAcquisitionFirstHandoffMission } from "../cre-first-prospect-handoff-mission";
import { verifyActiveValidationDestinationReadOnly } from "../cre-active-validation-destination";
import {
  promptAloneDoesNotCreateProspect,
  verifyCalebStruewingKnownProspect,
} from "../cre-known-prospect-verification";
import { lookupPersistedProspect, resetPersistedAcquisitionProspects } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import { LIVE_VALIDATION_PAGE } from "@/lib/infinity/market-validation-acquisition-runtime/outreach-package";
import { resetCommunicationProviderRuntime } from "@/lib/infinity/communication-provider";

const NOW = new Date("2026-09-02T05:10:00.000Z");

function groundedProspect(name: string, organization: string, url: string): DiscoveredProspect {
  return {
    prospectId: `prs_test_${name.replace(/\s+/g, "_").toLowerCase()}`,
    name,
    organization,
    publicRole: "tenant-representation broker",
    publicProfileUrl: url,
    publicContactChannel: url,
    persona: "tenant_rep_broker",
    qualification: {
      contractId: "cre_lease_npv_qualified_prospect_v1",
      qualified: true,
      reason: "Qualified CRE prospect.",
      highConfidence: true,
      status: "PROSPECT_QUALIFIED",
      contactChannelAvailable: true,
      confidence: "HIGH",
    },
    lineage: { sourceUrls: [url], findingId: null, grounded: true, fabricated: false },
    contactability: {
      status: "PUBLIC_PROFESSIONAL_PROFILE",
      channel: url,
      sourceUrl: url,
      scope: "DIRECT_CONTACT",
      observedAt: NOW.toISOString(),
    },
  };
}

describe("CRE MARKET VALIDATION ACQUISITION READINESS + FIRST REAL PROSPECT HANDOFF V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicIngestRuntime();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  });

  it("reuses MarketValidationAcquisitionRuntime channels and keeps paid acquisition blocked", () => {
    const snapshot = inspectCreAcquisitionFirstHandoff({ now: NOW });
    expect(snapshot.runtime).toBe("MarketValidationAcquisitionRuntime");
    expect(snapshot.acquisitionRuntime.marketValidationAcquisitionRuntime).toBe("PASS");
    const types = snapshot.acquisitionRuntime.existingChannels.map((row) => row.channelType);
    expect(types).toEqual([
      "founder_assisted_introduction",
      "bounded_professional_outreach",
      "professional_association",
      "bounded_directory_cohort",
      "community_post",
      "professional_social_post",
      "organic_growth_limited",
      "paid_acquisition",
    ]);
    expect(snapshot.acquisitionRuntime.existingChannels.find((row) => row.channelType === "paid_acquisition")?.verification).toBe(
      "NOT_READY",
    );
    expect(snapshot.channel.selected).not.toBe("paid_acquisition");
    expect(snapshot.channel.expectedProviderCostPerContact).toBe("UNKNOWN");
  });

  it("does not treat the prompt as Caleb evidence and does not invent a 3-5 cohort", () => {
    expect(lookupPersistedProspect({ name: "Caleb Struewing", organization: "JLL" })).toBeNull();
    expect(promptAloneDoesNotCreateProspect()).toBeNull();
    const known = verifyCalebStruewingKnownProspect();
    expect(known.persisted).toBe("NO");
    expect(known.promptUsedAsEvidence).toBe(false);
    expect(known.synthetic).toBe("NO");
    expect(known.qualification).toBe("PASS");
    expect(known.sourceLineage).toContain("jll.com");
    const snapshot = inspectCreAcquisitionFirstHandoff({ now: NOW });
    expect(snapshot.cohort.size).toBeLessThan(3);
    expect(firstCohortReady(snapshot.cohort.size)).toBe(false);
    expect(snapshot.nextBlocker).toBe(REAL_PROSPECT_COHORT_NOT_READY);
    expect(snapshot.result).toBe("NO — CRE MARKET VALIDATION CANNOT YET ACQUIRE TRACEABLE REAL EVIDENCE");
    expect(snapshot.outreach.messagesSent).toBe(0);
    expect(snapshot.authorizationPackage.authorizedForSend).toBe(false);
    expect(snapshot.authorizationPackage.executed).toBe(false);
  });

  it("rejects residential and generic real-estate roles", () => {
    expect(qualifyProspect({ role: "residential realtor", dealFrequency: "weekly", leaseWorkflow: false }).qualified).toBe(
      false,
    );
    expect(evaluateQualification({ role: "home stager", dealFrequency: "monthly", leaseWorkflow: true }).qualified).toBe(
      false,
    );
    expect(
      evaluateQualification({ role: "tenant rep broker", dealFrequency: "monthly", leaseWorkflow: true }).qualified,
    ).toBe(true);
  });

  it("keeps synthetic, outreach, delivery, and visits out of real thresholds", () => {
    expect(pageViewIsQualified()).toBe(false);
    expect(outreachAttemptIsQualifiedEvidence()).toBe(false);
    expect(deliveryIsQualifiedEvidence()).toBe(false);
    expect(siteVisitIsStrongIntent()).toBe(false);
    expect(siteVisitIsPricingIntent()).toBe(false);
    const counts = countRealEvidence([
      makeEvent({
        type: "PAGE_VIEW",
        candidateId: CRE_CANDIDATE_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
        occurredAt: CANONICAL_EVIDENCE_START,
        synthetic: true,
        prospectKey: "playwright",
        qualified: true,
        pricingOptionId: "professional_annual",
      }),
      makeEvent({
        type: "QUALIFIED_PILOT_APPLICATION",
        candidateId: CRE_CANDIDATE_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
        occurredAt: CANONICAL_EVIDENCE_START,
        synthetic: true,
        prospectKey: "fixture@broker.example",
        qualified: true,
        pricingOptionId: "per_deal",
      }),
    ]);
    expect(counts).toEqual(emptyRealCounts());
    const snapshot = inspectCreAcquisitionFirstHandoff({ now: NOW });
    expect(snapshot.experiment.qualified).toBe(0);
    expect(snapshot.experiment.strongIntent).toBe(0);
    expect(snapshot.experiment.pricing).toBe(0);
    expect(snapshot.evidenceContract.syntheticIsolation).toBe("PASS");
  });

  it("rejects arbitrary experiment IDs and does not count synthetic ingest as production", () => {
    const snapshot = inspectCreAcquisitionFirstHandoff({ now: NOW });
    expect(snapshot.ingest.publicIngest).toBe("PASS");
    expect(snapshot.ingest.arbitraryExperimentRejection).toBe("PASS");
    expect(snapshot.ingest.candidateAttribution).toBe("PASS");
    expect(snapshot.ingest.artifactAttribution).toBe("PASS");
    expect(snapshot.ingest.syntheticExclusion).toBe("PASS");
    const rejected = handlePublicValidationIngest({
      experimentId: "exp_not_this_one",
      body: { kind: "event", type: "PAGE_VIEW", synthetic: false },
      byteLength: 48,
      clientKey: "handoff-arbitrary-direct",
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.error).toBe("unknown_experiment");
  });

  it("enforces contact governance: identity, duplicate, cooldown, opt-out, deadline, and ceiling", () => {
    const contact = {
      status: "DIRECT_PUBLIC_BUSINESS_EMAIL" as const,
      channel: "office@example.com",
      sourceUrl: "https://example.com/contact",
      scope: "ORGANIZATION_LEVEL_CONTACT" as const,
      observedAt: NOW.toISOString(),
    };
    const base = {
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      prospectId: "prs_gov",
      name: "Jordan Hale",
      organization: "Hale Occupier Advisors",
      qualified: true,
      synthetic: false,
      optedOut: false,
      duplicate: false,
      cooldownUntil: null,
      activeInOtherCohort: false,
      contactability: contact,
      attempts: 0,
      now: NOW,
    };
    expect(evaluateContactGovernance(base).allowed).toBe(true);
    expect(evaluateContactGovernance({ ...base, name: "" }).realIdentity).toBe("FAIL");
    expect(evaluateContactGovernance({ ...base, duplicate: true }).duplicate).toBe("FAIL");
    expect(evaluateContactGovernance({ ...base, optedOut: true }).optOut).toBe("FAIL");
    expect(evaluateContactGovernance({ ...base, cooldownUntil: "2026-09-20T00:00:00.000Z" }).cooldown).toBe("FAIL");
    expect(evaluateContactGovernance({ ...base, now: new Date("2026-09-13T00:00:00.000Z") }).deadline).toBe("FAIL");
    expect(evaluateContactGovernance({ ...base, attempts: 1 }).attemptCeiling).toBe("FAIL");
    const over = inspectCreAcquisitionFirstHandoff({
      now: NOW,
      extraProspects: [
        groundedProspect("A One", "Firm A", "https://example.com/team/a"),
        groundedProspect("B Two", "Firm B", "https://example.com/team/b"),
        groundedProspect("C Three", "Firm C", "https://example.com/team/c"),
        groundedProspect("D Four", "Firm D", "https://example.com/team/d"),
        groundedProspect("E Five", "Firm E", "https://example.com/team/e"),
        groundedProspect("F Six", "Firm F", "https://example.com/team/f"),
      ],
    });
    expect(over.cohort.size).toBeLessThanOrEqual(5);
    expect(over.cohort.ceiling).toBe("PASS");
  });

  it("blocks send when the communication provider is unverified", () => {
    expect(executableCommunicationCapability()).toBeNull();
    expect(auditCommunicationCapabilities().find((row) => row.capability === "communication.email.send")?.verificationState).toBe(
      "UNVERIFIED",
    );
    expect(auditCommunicationCapabilities().every((row) => row.verificationState !== "LIVE_WRITE_VERIFIED")).toBe(true);
    expect(auditCommunicationCapabilities().every((row) => row.codingAgentCredentialAccess === false)).toBe(true);
    expect(
      resolvePreparationBlocker({
        highConfidence: 3,
        actionable: 3,
        drafts: 3,
        pathsExhausted: true,
      }),
    ).toBe("COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED");
    const snapshot = inspectCreAcquisitionFirstHandoff({ now: NOW });
    expect(snapshot.communication.liveWriteVerified).toBe("NO");
    expect(snapshot.communication.authorizedForSend).toBe("NO");
    expect(snapshot.communication.blocker).toBe("COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED");
    expect(LIVE_VALIDATION_PAGE).toBe(DEPLOYED_SEO_GEO_SUCCESSOR_URL);
    expect(snapshot.outreach.landingUrl).toBe(DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL);
    expect(snapshot.outreach.firstTouch?.pricingSurvey).toBe(false);
    expect(snapshot.outreach.firstTouch?.fabricatedTraction).toBe(false);
  });

  it("verifies the active destination from HTML without submitting evidence", async () => {
    const html = (path: string) =>
      `<html><body>
        <p>${LOCKED_CRE_EXPERIMENT_ID}</p>
        <p>${CRE_CANDIDATE_ID}</p>
        <p>${PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID}</p>
        ${path === "/early-access" ? `<form><input name="workEmail" /><input name="role" /><input name="company" /><input name="dealFrequency" /><input name="preferredPricing" /><input name="pilotInterest" /></form>` : `<h1>CRE Lease NPV</h1><p>early access pilot</p>`}
        <script>const VALIDATION_INGEST_PATH="/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest"</script>
      </body></html>`;
    const audit = await verifyActiveValidationDestinationReadOnly({
      origin: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
      fetchImpl: async (url) => {
        const path = new URL(String(url)).pathname;
        return new Response(html(path), { status: 200, headers: { "content-type": "text/html" } });
      },
    });
    expect(audit.homepage).toBe("PASS");
    expect(audit.earlyAccess).toBe("PASS");
    expect(audit.candidateLineage).toBe("PASS");
    expect(audit.experimentLineage).toBe("PASS");
    expect(audit.artifactLineage).toBe("PASS");
    expect(audit.formAttribution).toBe("PASS");
    expect(audit.ingestAttribution).toBe("PASS");
    expect(audit.mutations).toBe(0);
    expect(audit.submissions).toBe(0);
  });

  it("runs HQ with Command, Growth Nexus, Validation Station, and Signal Intelligence active; depot and lab idle", async () => {
    expect(workerRoleForStep("ORCHESTRATE_CRE_ACQUISITION_HANDOFF", "mission_runtime")).toBe("Command");
    expect(roomForStep("OUTREACH_PREPARATION", "organic_growth")).toBe("growth_department");
    expect(roomForStep("PUBLIC_INGEST_VALIDATION", "market_validation")).toBe("quality_control");
    expect(roomForStep("PERFORMANCE_HANDOFF", "performance_intelligence")).toBe("intelligence_center");
    const run = await executeCreAcquisitionFirstHandoffMission({ now: NOW, liveHttp: false });
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.growthNexus).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.signalIntelligence).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.creationLabIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(run.hq.creationLab).toBe("PRESENT_IDLE");
    expect(run.externalActions.emails).toBe(0);
    expect(run.externalActions.messages).toBe(0);
    expect(run.externalActions.deployments).toBe(0);
    expect(run.handoff.performance.countsAsMarketEvidence).toBe(false);
    expect(inspectExperimentClock(NOW).restarted).toBe(false);
  });
});

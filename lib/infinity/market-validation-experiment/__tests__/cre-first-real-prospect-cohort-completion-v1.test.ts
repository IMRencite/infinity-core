import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import {
  acceptPublishedProfessionalEmail,
  auditCommunicationCapabilities,
  executableCommunicationCapability,
  evaluateContactGovernance,
  firstCohortReady,
  persistVerifiedProspect,
  rejectGuessedEmailPermutation,
  resetPersistedAcquisitionProspects,
} from "@/lib/infinity/market-validation-acquisition-runtime";
import { resetPublicIngestRuntime } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";
import { countRealEvidence, emptyRealCounts, inspectRealMarketEvidence } from "../real-market-evidence";
import { makeEvent } from "../events";
import { CANONICAL_EVIDENCE_START } from "../experiment-clock";
import {
  CRE_CANDIDATE_ID,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import { completeFirstRealCreProspectCohort } from "../cre-first-real-cohort-completion";
import { executeCreFirstRealCohortCompletionMission } from "../cre-first-real-cohort-completion-mission";
import { inspectCreAcquisitionFirstHandoff } from "../cre-acquisition-first-handoff";
import { FIRST_REAL_COHORT_ID } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import { resetCommunicationProviderRuntime } from "@/lib/infinity/communication-provider";

const NOW = new Date("2026-09-02T05:27:00.000Z");

describe("CRE FIRST REAL PROSPECT COHORT COMPLETION V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicIngestRuntime();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  });

  it("completes a 3–5 real cohort, preserves Caleb, and does not count research as evidence", () => {
    const before = inspectRealMarketEvidence({ now: NOW }).counts;
    const completed = completeFirstRealCreProspectCohort();
    expect(completed.predecessorPreserved).toBe(true);
    expect(completed.previousSize).toBe(1);
    expect(completed.prospects.some((item) => item.prospectId === "prs_089dad6786418f4b")).toBe(true);
    expect(completed.size).toBeGreaterThanOrEqual(3);
    expect(completed.size).toBeLessThanOrEqual(5);
    expect(completed.ready).toBe(true);
    expect(firstCohortReady(completed.size)).toBe(true);
    expect(completed.prospects.every((item) => item.synthetic === false && item.qualified)).toBe(true);
    expect(new Set(completed.prospects.map((item) => item.organization)).size).toBe(completed.size);
    expect(completed.authorizationPackage.maxInitialSends).toBe(completed.size);
    expect(completed.authorizationPackage.maxSendAttempts).toBe(completed.size);
    expect(completed.authorizationPackage.authorizedForSend).toBe(false);
    expect(completed.authorizationPackage.communicationProvider).toBe("NONE");
    expect(completed.paidDataUsed).toBe(false);
    expect(completed.guessedEmails).toBe(0);
    const after = inspectRealMarketEvidence({ now: NOW }).counts;
    expect(before).toEqual(emptyRealCounts());
    expect(after).toEqual(emptyRealCounts());
    expect(completed.evidenceUnchanged).toBe(true);
    const synthetic = countRealEvidence([
      makeEvent({
        type: "QUALIFIED_PILOT_APPLICATION",
        candidateId: CRE_CANDIDATE_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
        occurredAt: CANONICAL_EVIDENCE_START,
        synthetic: true,
        prospectKey: "cohort-prep",
        qualified: true,
        pricingOptionId: null,
      }),
    ]);
    expect(synthetic).toEqual(emptyRealCounts());
  });

  it("rejects synthetic, duplicate, guessed email, opt-out, cooldown, and identity uncertainty", () => {
    completeFirstRealCreProspectCohort();
    const base = completeFirstRealCreProspectCohort().prospects[0];
    expect(base).toBeTruthy();
    expect(
      persistVerifiedProspect({
        ...base!,
        prospectId: "prs_synthetic",
        name: "Fake Broker",
        synthetic: true,
      }).reason,
    ).toBe("SYNTHETIC_REJECTED");
    expect(
      persistVerifiedProspect({
        ...base!,
        prospectId: "prs_dup",
        name: base!.name,
        organization: base!.organization,
      }).reason,
    ).toBe("DUPLICATE_REJECTED");
    expect(
      persistVerifiedProspect({
        ...base!,
        prospectId: "prs_anon",
        name: "",
        organization: "",
      }).reason,
    ).toBe("IDENTITY_UNCERTAINTY");
    expect(
      persistVerifiedProspect({
        ...base!,
        prospectId: "prs_guess",
        name: "Jordan Hale",
        organization: "Hale Occupier Advisors",
        email: "jhale@haleoccupier.com",
        emailSource: "https://example.com/team/jordan-hale",
        sourceEvidence: "Jordan Hale tenant representation. No email published.",
        sourceUrls: ["https://example.com/team/jordan-hale"],
      }).reason,
    ).toBe("UNSUPPORTED_CONTACT_REJECTED");
    expect(rejectGuessedEmailPermutation("first.last@jll.com", "Caleb Struewing tenant representation")).toBe(true);
    expect(
      acceptPublishedProfessionalEmail({
        email: "mvizzone@tenantadvisors.com",
        sourceUrl: "https://tenantadvisors.com/michael-vizzone/",
        sourceText: "Mike specializes in tenant representation. mvizzone@tenantadvisors.com",
        name: "Michael Vizzone",
      }).accepted,
    ).toBe(true);
    const contact = {
      status: "DIRECT_PUBLIC_BUSINESS_EMAIL" as const,
      channel: "mvizzone@tenantadvisors.com",
      sourceUrl: "https://tenantadvisors.com/michael-vizzone/",
      scope: "DIRECT_CONTACT" as const,
      observedAt: NOW.toISOString(),
    };
    expect(
      evaluateContactGovernance({
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        prospectId: "prs_gov",
        name: "Michael Vizzone",
        organization: "Tenant Advisors",
        qualified: true,
        synthetic: false,
        optedOut: true,
        duplicate: false,
        cooldownUntil: null,
        activeInOtherCohort: false,
        contactability: contact,
        attempts: 0,
        now: NOW,
      }).optOut,
    ).toBe("FAIL");
    expect(
      evaluateContactGovernance({
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        prospectId: "prs_gov",
        name: "Michael Vizzone",
        organization: "Tenant Advisors",
        qualified: true,
        synthetic: false,
        optedOut: false,
        duplicate: false,
        cooldownUntil: "2026-09-20T00:00:00.000Z",
        activeInOtherCohort: false,
        contactability: contact,
        attempts: 0,
        now: NOW,
      }).cooldown,
    ).toBe("FAIL");
    expect(firstCohortReady(2)).toBe(false);
    expect(firstCohortReady(6)).toBe(false);
  });

  it("keeps communication unverified and updates the future-send package to the actual cohort size", () => {
    const completed = completeFirstRealCreProspectCohort();
    expect(executableCommunicationCapability()).toBeNull();
    expect(auditCommunicationCapabilities().find((row) => row.capability === "communication.email.send")?.verificationState).toBe(
      "UNVERIFIED",
    );
    expect(
      auditCommunicationCapabilities()
        .filter((row) => row.capability !== "communication.email.send")
        .every((row) => row.verificationState === "UNAVAILABLE"),
    ).toBe(true);
    const snapshot = inspectCreAcquisitionFirstHandoff({ now: NOW });
    expect(snapshot.cohort.cohortId).toBe(FIRST_REAL_COHORT_ID);
    expect(snapshot.cohort.size).toBe(completed.size);
    expect(snapshot.cohort.ready).toBe(true);
    expect(snapshot.nextBlocker).toBe("COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED");
    expect(snapshot.communication.authorizedForSend).toBe("NO");
    expect(snapshot.authorizationPackage.maxInitialSends).toBe(completed.size);
    expect(snapshot.authorizationPackage.landingUrl).toBe(DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL);
    expect(snapshot.outreach.messagesSent).toBe(0);
    expect(snapshot.experiment.qualified).toBe(0);
  });

  it("runs HQ with Command, Growth Nexus, Research Grid, and Validation Station; depot and lab idle", async () => {
    expect(roomForStep("PUBLIC_PAGE_FETCH", "grounded_research")).toBe("research_department");
    expect(roomForStep("PROSPECT_GOVERNANCE", "market_validation")).toBe("quality_control");
    expect(roomForStep("OUTREACH_PREPARATION", "organic_growth")).toBe("growth_department");
    const run = await executeCreFirstRealCohortCompletionMission();
    expect(run.ready).toBe(true);
    expect(run.size).toBeGreaterThanOrEqual(3);
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.growthNexus).toBe("PASS");
    expect(run.hq.researchGrid).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.creationLabIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.evidence.qualified).toBe(0);
    expect(run.evidence.changedByCohortPreparation).toBe(false);
  });
});

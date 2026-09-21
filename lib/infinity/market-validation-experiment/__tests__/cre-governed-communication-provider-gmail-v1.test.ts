import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import { resetCommunicationProviderRuntime } from "@/lib/infinity/communication-provider";
import {
  auditCommunicationCapabilities,
  executableCommunicationCapability,
  outreachAttemptIsQualifiedEvidence,
  resetPersistedAcquisitionProspects,
} from "@/lib/infinity/market-validation-acquisition-runtime";
import { emailOpenIsStrongIntent } from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import { resetPublicIngestRuntime } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { LOCKED_CRE_EXPERIMENT_ID } from "../constants";
import { completeFirstRealCreProspectCohort } from "../cre-first-real-cohort-completion";
import { inspectCreCommunicationProviderFoundation } from "../cre-communication-provider-foundation";
import { executeCreCommunicationProviderFoundationMission } from "../cre-communication-provider-foundation-mission";

const NOW = new Date("2026-09-02T13:44:00.000Z");

describe("CRE GOVERNED COMMUNICATION PROVIDER + GMAIL LIVE CAPABILITY VERIFICATION V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicIngestRuntime();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    completeFirstRealCreProspectCohort();
  });

  it("registers a global email-send architecture without contacting the CRE cohort", async () => {
    const before = inspectRealMarketEvidence({ now: NOW }).counts;
    const foundation = await inspectCreCommunicationProviderFoundation({ now: NOW });
    expect(foundation.architecture.capability).toBe("communication.email.send");
    expect(foundation.architecture.global).toBe("YES");
    expect(foundation.architecture.creSpecific).toBe("NO");
    expect(foundation.gmail.implemented).toBe("YES");
    expect(foundation.gmail.providerNeutralDomain).toBe("PASS");
    expect(foundation.connection.connected).toBe("NO");
    expect(foundation.capability.liveWriteVerified).toBe("NO");
    expect(foundation.capability.writeVerification).toBe("NOT_RUN");
    expect(foundation.writeTarget.target).toBe("NONE");
    expect(foundation.writeTarget.writePerformed).toBe("NO");
    expect(foundation.externalActions.prospectEmails).toBe(0);
    expect(foundation.externalActions.providerVerificationEmails).toBe(0);
    expect(foundation.cohort.size).toBe(4);
    expect(foundation.cohort.preserved).toBe("YES");
    expect(foundation.experiment.state).toBe("COLLECTING");
    expect(foundation.experiment.clockRestarted).toBe("NO");
    expect(foundation.experiment.qualified).toBe(0);
    expect(foundation.nextBlocker).toBe("GMAIL_PROVIDER_CONNECTION_REQUIRED");
    expect(foundation.result).toBe("PARTIAL — GMAIL ARCHITECTURE READY BUT PROVIDER CONNECTION IS REQUIRED");
    expect(executableCommunicationCapability()).toBeNull();
    expect(auditCommunicationCapabilities().find((row) => row.capability === "communication.email.send")?.verificationState).toBe(
      "UNVERIFIED",
    );
    expect(outreachAttemptIsQualifiedEvidence()).toBe(false);
    expect(emailOpenIsStrongIntent()).toBe(false);
    expect(inspectRealMarketEvidence({ now: NOW }).counts).toEqual(before);
  });

  it("runs HQ with Command, Systems Architect, Growth Nexus, and Validation Station; depot and lab idle", async () => {
    expect(roomForStep("COMMUNICATION_ARCHITECTURE", "venture_systems_architecture")).toBe("systems_architect");
    expect(roomForStep("ACQUISITION_REQUIREMENT_BIND", "organic_growth")).toBe("growth_department");
    expect(roomForStep("PROVIDER_CONNECTION_VERIFICATION", "market_validation")).toBe("quality_control");
    const run = await executeCreCommunicationProviderFoundationMission({ now: NOW });
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.systemsArchitect).toBe("PASS");
    expect(run.hq.growthNexus).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.creationLabIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.externalActions.prospectEmails).toBe(0);
    expect(run.capability.liveWriteVerified).toBe("NO");
  });
});

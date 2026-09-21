import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listCommunicationAttempts,
  providerAcceptedIsDelivered,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { rejectGuessedEmailPermutation } from "@/lib/infinity/market-validation-acquisition-runtime/email-verification";
import {
  emailOpenIsStrongIntent,
  outreachAttemptIsQualifiedEvidence,
  siteVisitIsPricingIntent,
} from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import {
  evaluateConsultativeMessageQuality,
  generateConsultativeWave1Message,
} from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";
import { FIRST_OUTREACH_COOLDOWN_MS } from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import {
  evaluateFreshPublicSourceVerification,
  isFirstPartyProfessionalHost,
  reverifyPersistedProspect,
  verifyProspectFromHistoricalRecordAlone,
} from "@/lib/infinity/market-validation-acquisition-runtime/fresh-contact-verification";
import { resetPersistedAcquisitionProspects } from "@/lib/infinity/market-validation-acquisition-runtime";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "../constants";
import { completeFirstRealCreProspectCohort } from "../cre-first-real-cohort-completion";
import {
  CRE_WAVE_1_V3_MISSION,
  CRE_WAVE_1_V3_MISSION_ID,
  createWave1SimulationFetch,
  executeCreWave1BoundedSendMission,
} from "../cre-wave-1-bounded-send-mission";
import { executeCreWave1BoundedSend, resetCreWave1Runtime } from "../cre-wave-1-bounded-send";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { resetPublicIngestRuntime } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";

const NOW = new Date("2026-09-02T17:00:00.000Z");

function liveFetch(): typeof fetch {
  const bios = createWave1SimulationFetch();
  return async (input) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return new Response(JSON.stringify({ access_token: "test-access-token-value" }), { status: 200 });
    }
    if (/messages\/send/i.test(url)) {
      const id = `msg_${Math.random().toString(16).slice(2, 10)}`;
      return new Response(JSON.stringify({ id, threadId: id }), { status: 200 });
    }
    return bios(input);
  };
}

describe("CRE WAVE 1 CANONICAL RESUME + CONSULTATIVE SEND V3", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicIngestRuntime();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    resetCreWave1Runtime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    completeFirstRealCreProspectCohort();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    vi.unstubAllEnvs();
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id-value");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret-value");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-value");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinitemediaresources@gmail.com");
  });

  it("requires canonical Mission Runtime and LIVE_WRITE_VERIFIED", async () => {
    expect(instrumentedRuntimeRegistry().runtimes.CreBoundedOutreachRuntime.usesMissionWrapper).toBe(true);
    setEmailSendCapabilityStateForTest("READ_ONLY_VERIFIED");
    const blocked = await executeCreWave1BoundedSend({
      now: NOW,
      fetchImpl: createWave1SimulationFetch(),
      sendAuthorized: true,
      providerWrite: true,
      hydrateCapability: false,
    });
    expect(blocked.liveWriteVerified).toBe("FAIL");
    expect(blocked.sendAttempts).toBe(0);
    expect(blocked.prospectEmails).toBe(0);
  });

  it("treats historical data as insufficient and blocks inferred, stale, mismatched, suppressed, cooldown, and duplicate sends", () => {
    const cohort = completeFirstRealCreProspectCohort().prospects;
    const caleb = cohort.find((row) => row.prospectId === "prs_089dad6786418f4b")!;
    const historical = verifyProspectFromHistoricalRecordAlone(caleb);
    expect(historical.sendEligibility).toBe("BLOCK");
    expect(historical.blockReason).toBe("HISTORICAL_RECORD_INSUFFICIENT");
    expect(isFirstPartyProfessionalHost("https://www.zoominfo.com/p/caleb")).toBe(false);
    expect(rejectGuessedEmailPermutation("caleb.struewing@jll.com", "Contact the Columbus office")).toBe(true);
    const stale = evaluateFreshPublicSourceVerification({
      prospect: caleb,
      sourceUrl: caleb.sourceUrls[0],
      sourceText: `${caleb.name} ${caleb.organization} formerly tenant representation 2018 left the firm`,
      fetched: true,
    });
    expect(stale.sendEligibility).toBe("BLOCK");
    const persona = evaluateFreshPublicSourceVerification({
      prospect: caleb,
      sourceUrl: caleb.sourceUrls[0],
      sourceText: `${caleb.name} ${caleb.organization} ${caleb.email} investment sales only 2026`,
      fetched: true,
    });
    expect(["NOT_QUALIFIED", "UNCERTAIN"]).toContain(persona.roleEligibility);
    expect(persona.sendEligibility).toBe("BLOCK");
    const suppressed = evaluateFreshPublicSourceVerification({
      prospect: caleb,
      sourceUrl: caleb.sourceUrls[0],
      sourceText: `${caleb.name} ${caleb.organization} tenant representation ${caleb.email} 2026`,
      fetched: true,
      suppressed: true,
    });
    expect(suppressed.blockReason).toBe("SUPPRESSED");
    const cooldown = evaluateFreshPublicSourceVerification({
      prospect: caleb,
      sourceUrl: caleb.sourceUrls[0],
      sourceText: `${caleb.name} ${caleb.organization} tenant representation ${caleb.email} 2026`,
      fetched: true,
      cooldownActive: true,
    });
    expect(cooldown.blockReason).toBe("COOLDOWN");
    const duplicate = evaluateFreshPublicSourceVerification({
      prospect: caleb,
      sourceUrl: caleb.sourceUrls[0],
      sourceText: `${caleb.name} ${caleb.organization} tenant representation ${caleb.email} 2026`,
      fetched: true,
      existingSuccessfulSend: true,
    });
    expect(duplicate.blockReason).toBe("DUPLICATE_INITIAL_SEND");
  });

  it("may use a later first-party source when the first page lacks an explicit email", async () => {
    const ben = completeFirstRealCreProspectCohort().prospects.find((row) => row.prospectId === "prs_0ec2773f4c21713c")!;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("BIO_BKuhn")) {
        return new Response(`${ben.name} ${ben.organization} tenant representation occupier ${ben.email} 2026`, {
          status: 200,
        });
      }
      return new Response(`${ben.name} ${ben.organization} tenant representation occupier 2026`, { status: 200 });
    };
    const record = await reverifyPersistedProspect({ prospect: ben, fetchImpl, now: NOW });
    expect(record.sendEligibility).toBe("SEND");
    expect(record.verifiedProfessionalEmail).toBe(ben.email);
    expect(record.sourceUrl).toContain("BIO_BKuhn");
    expect(record.firstParty).toBe("YES");
  });

  it("requires first-party explicit email and consultative quality before send", () => {
    const cohort = completeFirstRealCreProspectCohort().prospects;
    const caleb = cohort.find((row) => row.prospectId === "prs_089dad6786418f4b")!;
    const ok = evaluateFreshPublicSourceVerification({
      prospect: caleb,
      sourceUrl: caleb.sourceUrls[0],
      sourceText: `${caleb.name} ${caleb.organization} tenant representation occupier lease comparison ${caleb.email} 2026`,
      fetched: true,
    });
    expect(ok.sendEligibility).toBe("SEND");
    const message = generateConsultativeWave1Message({ prospect: caleb, verification: ok });
    const quality = evaluateConsultativeMessageQuality({ message, verification: ok });
    expect(message.includesValidationUrl).toBe(false);
    expect(message.productPositionedAsCrm).toBe(false);
    expect(quality.consultative).toBe("PASS");
    expect(quality.questionLed).toBe("PASS");
    expect(quality.lowPressure).toBe("PASS");
    expect(quality.currentProcessDiscovery).toBe("PASS");
    expect(quality.prematurePitch).toBe("NO");
    expect(quality.problemAssumption).toBe("NO");
    expect(quality.fabricatedPain).toBe("NO");
    expect(quality.manipulativePressure).toBe("NO");
    expect(quality.unsupportedClaimsCount).toBe(0);
    expect(quality.qualityGate).toBe("PASS");
    expect(message.strategy.conversationStage).toBe("OPEN_CONTEXT+CURRENT_PROCESS");
  });

  it("runs V3 through Mission Runtime, sends at most 4, persists cooldown and conversation metadata, and does not treat send as evidence", async () => {
    const before = inspectRealMarketEvidence({ now: NOW }).counts;
    const run = await executeCreWave1BoundedSendMission({
      now: NOW,
      fetchImpl: liveFetch(),
      providerWrite: true,
      sendAuthorized: true,
      hydrateCapability: false,
      liveSourceFetch: true,
      phaseMs: 0,
      missionId: CRE_WAVE_1_V3_MISSION_ID,
      missionType: CRE_WAVE_1_V3_MISSION,
      source: "cre_wave_1_canonical_send_v3",
    });
    expect(run.mission).toBe(CRE_WAVE_1_V3_MISSION);
    expect(run.missionId).toBe(CRE_WAVE_1_V3_MISSION_ID);
    expect(run.sendAttempts).toBeLessThanOrEqual(4);
    expect(run.replacements).toBe(0);
    expect(run.automaticRetries).toBe(0);
    expect(run.followUpAuthorized).toBe("NO");
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.growthNexus).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).latestCompleted?.missionType).toBe(CRE_WAVE_1_V3_MISSION);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(providerAcceptedIsDelivered()).toBe(false);
    expect(outreachAttemptIsQualifiedEvidence()).toBe(false);
    expect(emailOpenIsStrongIntent()).toBe(false);
    expect(siteVisitIsPricingIntent()).toBe(false);
    expect(inspectRealMarketEvidence({ now: NOW }).counts).toEqual(before);
    expect(run.cooldownRecords).toBe(run.providerAccepted);
    expect(FIRST_OUTREACH_COOLDOWN_MS).toBe(14 * 86_400_000);
    expect(run.conversationMetadata.strategyProfilePersisted).toBe("PASS");
    expect(run.conversationMetadata.conversationStagePersisted).toBe("PASS");
    expect(run.conversationMetadata.questionObjectivePersisted).toBe("PASS");
    expect(run.conversationMetadata.pricingStageReached).toBe("NO");
    expect(run.providerAccepted).toBeGreaterThan(0);
    const replay = await executeCreWave1BoundedSend({
      now: NOW,
      fetchImpl: liveFetch(),
      sendAuthorized: true,
      providerWrite: true,
      hydrateCapability: false,
    });
    expect(replay.sendAttempts).toBe(0);
    expect(listCommunicationAttempts().filter((row) => row.prospectId && row.state === "PROVIDER_ACCEPTED").length).toBe(
      run.providerAccepted,
    );
    expect(run.providerAccepted).toBeLessThanOrEqual(4);
  });

  it("stops after a provider-wide failure and never replaces prospects", async () => {
    const failFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
        return new Response(JSON.stringify({ access_token: "test-access-token-value" }), { status: 200 });
      }
      if (/messages\/send/i.test(url)) {
        return new Response(JSON.stringify({ error: { message: "invalid credentials" } }), { status: 401 });
      }
      return createWave1SimulationFetch()(input);
    };
    const run = await executeCreWave1BoundedSend({
      now: NOW,
      fetchImpl: failFetch,
      sendAuthorized: true,
      providerWrite: true,
      hydrateCapability: false,
    });
    expect(run.replacements).toBe(0);
    expect(run.cohort.expanded).toBe("NO");
    expect(run.automaticRetries).toBe(0);
    expect(run.sendAttempts).toBe(1);
    expect(run.providerAccepted).toBe(0);
    expect(run.providerFailed).toBe(1);
  });
});

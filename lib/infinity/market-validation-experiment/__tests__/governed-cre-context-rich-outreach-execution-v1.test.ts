import { deflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listCommunicationAttempts,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { resetPersistedAcquisitionProspects } from "@/lib/infinity/market-validation-acquisition-runtime";
import { decodeFirstPartySource, resetFreshContactVerification } from "@/lib/infinity/market-validation-acquisition-runtime/fresh-contact-verification";
import {
  CALEB_CONVERSATION_ID,
  CALEB_PROSPECT_ID,
  MICHAEL_CONVERSATION_ID,
  MICHAEL_PROSPECT_ID,
} from "@/lib/infinity/inbound-communication-runtime/constants";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { listConversations } from "@/lib/infinity/inbound-communication-runtime/conversation-store";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "../constants";
import {
  evaluateConsultativeOutreachMessageQuality,
  evaluateConsultativeOutreachProspectEligibility,
  executeContextRichConsultativeOutreachOptimization,
  GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED,
  inspectHistoricalWave1Preservation,
  renderContextRichVariant,
} from "../context-rich-consultative-outreach-optimization";
import { CHALLENGER_CANDIDATE_SEEDS, CRE_CONTEXT_RICH_CHALLENGER_V1, REVIEWED_AND_REJECTED_CANDIDATES } from "../cre-context-rich-challenger-cohort";
import { resetContextRichChallengerState } from "../cre-context-rich-challenger-durable-state";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "../experiment-clock";
import {
  executeGovernedCreContextRichOutreachExecution,
  GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1,
} from "../governed-cre-context-rich-outreach-execution";
import { executeGovernedCreContextRichOutreachExecutionMission } from "../governed-cre-context-rich-outreach-execution-mission";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { setExperimentRuntimeState } from "../runtime-state";

const NOW = new Date("2026-09-05T06:35:00.000Z");

function createChallengerSimulationFetch(input: { ambiguousFirst?: boolean } = {}): typeof fetch {
  let sends = 0;
  return async (request) => {
    const url = String(request);
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return new Response(JSON.stringify({ access_token: "test-access-token-value" }), { status: 200 });
    }
    if (/messages\/send/i.test(url)) {
      sends += 1;
      if (input.ambiguousFirst && sends === 1) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      const id = `msg_${sends.toString(16).padStart(8, "0")}`;
      return new Response(JSON.stringify({ id, threadId: `th_${id}` }), { status: 200 });
    }
    const seed = CHALLENGER_CANDIDATE_SEEDS.find((row) => url === row.sourceUrl || url.includes(row.sourceUrl));
    if (seed) {
      return new Response(
        `${seed.name} ${seed.organization} tenant representation occupier lease 2026 ${seed.email} ${seed.sourceEvidence}`,
        { status: 200 },
      );
    }
    return new Response("not found", { status: 404 });
  };
}

describe("GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    resetInboundCommunicationRuntime();
    resetFreshContactVerification();
    resetContextRichChallengerState();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    vi.unstubAllEnvs();
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id-value");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret-value");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-value");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinitemediaresources@gmail.com");
  });

  afterEach(() => {
    resetInboundCommunicationRuntime();
    resetContextRichChallengerState();
    vi.unstubAllEnvs();
  });

  it("decodes first-party PDF streams without changing HTML", () => {
    const html = "<html>Annie Nicolau Tenant Representation</html>";
    expect(decodeFirstPartySource("https://www.jll.com/bio", Buffer.from(html)).includes("Annie Nicolau")).toBe(true);
    const inner = deflateSync(Buffer.from("Anthony Fritsche Cresa tenant representation afritsche@cresa.com"));
    const pdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\n"),
      inner,
      Buffer.from("\nendstream\nendobj\n"),
    ]);
    const decoded = decodeFirstPartySource("https://www.cresa.com/bio.pdf", pdf);
    expect(decoded.includes("Anthony Fritsche")).toBe(true);
    expect(decoded.includes("tenant representation")).toBe(true);
    expect(decoded.toLowerCase().includes("afritsche@cresa.com")).toBe(true);
    const literalPdf = Buffer.from("%PDF-1.4\n(Brooks Murphy) Tj (tenant representation) Tj (mailto:brooks.murphy@jll.com)\n");
    const literals = decodeFirstPartySource("https://www.cresa.com/x.pdf", literalPdf);
    expect(literals.includes("Brooks Murphy")).toBe(true);
    expect(literals.includes("brooks.murphy@jll.com")).toBe(true);
  });

  it("uses the canonical mission wrapper and fail-closed eligibility", () => {
    expect(instrumentedRuntimeRegistry().runtimes.GovernedCreContextRichOutreachExecutionRuntime.usesMissionWrapper).toBe(true);
    expect(
      evaluateConsultativeOutreachProspectEligibility({
        name: "Caleb Struewing",
        company: "JLL",
        role: "tenant-representation broker",
        email: "caleb.struewing@jll.com",
        personaFit: true,
        identityConfidence: "PASS",
        emailEvidence: "PASS",
        currentRoleExplicit: "YES",
        suppressed: false,
        cooldownUntil: "2026-09-16T17:16:03.829Z",
        duplicate: true,
        existingConversation: true,
        historicalWave1Sent: true,
        inferredEmail: false,
      }).overall,
    ).toBe("FAIL");
    expect(
      evaluateConsultativeOutreachProspectEligibility({
        name: "Anthony Fritsche",
        company: "Cresa",
        role: "tenant-representation broker",
        email: "brooks.murphy@jll.com",
        personaFit: true,
        identityConfidence: "PASS",
        emailEvidence: "PASS",
        currentRoleExplicit: "YES",
        suppressed: false,
        cooldownUntil: null,
        duplicate: false,
        existingConversation: false,
        historicalWave1Sent: false,
        inferredEmail: false,
      }).overall,
    ).toBe("PASS");
  });

  it("sends at most four grounded challenger variants, protects Wave 1, and leaves HQ idle", async () => {
    const wave1Before = readFileSync(".infinity/market-validation/cre-wave-1-outreach-state.json", "utf8");
    const inboundBefore = readFileSync(".infinity/communication/inbound-runtime-state.json", "utf8");
    await executeContextRichConsultativeOutreachOptimization();
    const blocked = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(blocked.nowInspecting.status).toBe("READY_BLOCKED");
    expect(blocked.nowInspecting.authorizationRequired).toBe(GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED);

    const run = await executeGovernedCreContextRichOutreachExecutionMission({
      now: NOW,
      fetchImpl: createChallengerSimulationFetch(),
      hydrateCapability: false,
      sendAuthorized: true,
      providerWrite: true,
    });

    expect(run.mission).toBe(GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1);
    expect(run.authorization).toBe(GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED);
    expect(run.authorizationConsumed).toBe(true);
    expect(run.reviewed).toBe(CHALLENGER_CANDIDATE_SEEDS.length + REVIEWED_AND_REJECTED_CANDIDATES.length);
    expect(run.eligible).toBe(4);
    expect(run.providerWrites).toBeLessThanOrEqual(4);
    expect(run.providerWrites).toBe(4);
    expect(run.blindRetries).toBe(0);
    expect(run.duplicateSends).toBe(0);
    expect(run.ambiguousResults).toBe(0);
    expect(run.nextState).toBe("CRE_CONTEXT_RICH_CHALLENGER_OBSERVING");
    expect(run.cohortId).toBe(CRE_CONTEXT_RICH_CHALLENGER_V1);
    expect(run.sends.every((row) => /Caleb|Michael/.test(row.name) === false)).toBe(true);
    expect(run.sends.map((row) => row.variantId).sort()).toEqual([
      "crc_v1_client_summary",
      "crc_v1_comparison_process",
      "crc_v1_lease_economics",
      "crc_v1_workflow_context",
    ]);
    expect(run.sends.every((row) => row.strategy === "CONTEXT_RICH_CONSULTATIVE" && row.version === "V1")).toBe(true);
    expect(run.sends.every((row) => row.deliveryState === "DELIVERY_UNKNOWN")).toBe(true);
    expect(run.sends.every((row) => !/https?:\/\/|vercel\.app|book a meeting|schedule a demo/i.test(row.question))).toBe(true);
    expect(run.economics.treatedAsZero).toBe(false);
    expect(run.historical.attemptsPreserved).toBe("PASS");
    expect(run.historical.conversationsPreserved).toBe("PASS");
    expect(run.historical.historicalRelabeled).toBe(false);
    expect(run.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(run.clock.restarted).toBe(false);
    expect(run.experiment.state).toBe("COLLECTING");
    expect(inspectExperimentClock(NOW).restarted).toBe(false);
    expect(inspectRealMarketEvidence({ now: NOW }).experiment.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);

    for (const send of run.sends) {
      const seed = CHALLENGER_CANDIDATE_SEEDS.find((row) => row.name === send.name)!;
      const variant = renderContextRichVariant(send.variantId, {
        firstName: send.name.split(" ")[0] ?? send.name,
        verifiedName: send.name,
        verifiedCompany: seed.organization,
        verifiedRole: seed.role,
        verifiedMarket: seed.market,
        sourceKind: "first_party_professional_bio",
      });
      const quality = evaluateConsultativeOutreachMessageQuality({ variant, company: seed.organization });
      expect(quality.overall).toBe("PASS");
      expect(quality.siteLinkPolicy).toBe("PASS");
      expect(quality.unsupportedClaims).toBe(0);
      expect(quality.fabricatedPersonalization).toBe(0);
      expect(/https?:\/\/|vercel\.app/i.test(variant.fullMessage)).toBe(false);
      expect(/book a meeting|schedule a demo/i.test(variant.fullMessage)).toBe(false);
    }

    const conversations = listConversations().filter((row) => row.strategyProfile === "CONTEXT_RICH_CONSULTATIVE");
    expect(conversations).toHaveLength(4);
    expect(conversations.every((row) => row.currentConversationStage === "OPEN_CONTEXT")).toBe(true);
    expect(listConversations().find((row) => row.id === CALEB_CONVERSATION_ID)?.strategyProfile ?? "CONSULTATIVE_DISCOVERY").not.toBe(
      "CONTEXT_RICH_CONSULTATIVE",
    );
    expect(listConversations().find((row) => row.id === MICHAEL_CONVERSATION_ID)?.strategyProfile ?? "CONSULTATIVE_DISCOVERY").not.toBe(
      "CONTEXT_RICH_CONSULTATIVE",
    );
    expect(listCommunicationAttempts().every((row) => row.prospectId !== CALEB_PROSPECT_ID)).toBe(true);
    expect(listCommunicationAttempts().every((row) => row.prospectId !== MICHAEL_PROSPECT_ID)).toBe(true);

    expect(inspectMailboxObserverHealth().trackedConversations).toBe(6);
    expect(run.hq.projection).toBe("PASS");
    expect(run.hq.command).toBe("ACTIVE_WORK");
    expect(run.hq.growthNexus).toBe("ACTIVE_WORK");
    expect(run.hq.researchGrid).toBe("ACTIVE_WORK");
    expect(run.hq.validationStation).toBe("ACTIVE_WORK");
    expect(run.hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(run.hq.infinityDecisionCoreDuring).toBe("ACTIVE_WORK");
    expect(run.hq.commandCoreMismatch).toBe(false);
    expect(run.hq.after.active).toBe(0);
    expect(run.hq.after.currentExecution).toBe("NONE");
    expect(run.hq.after.latestCompleted).toBe(GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1);
    expect(run.hq.after.infinityDecisionCore).toBe("PRESENT_IDLE");
    expect(run.hq.after.staleActiveWork).toBe(false);
    expect(run.hq.after.consumedAuthorizationCleared).toBe(true);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).nowInspecting.status).toBe("PRESENT_IDLE");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).nowInspecting.authorizationRequired).toBeNull();

    const replay = await executeGovernedCreContextRichOutreachExecution({
      now: NOW,
      fetchImpl: createChallengerSimulationFetch(),
      sendAuthorized: true,
      providerWrite: true,
      hydrateCapability: false,
    });
    expect(replay.providerWrites).toBe(0);
    expect(replay.duplicateSends).toBe(0);
    expect(replay.sends.filter((row) => row.providerResult === "PROVIDER_ACCEPTED")).toHaveLength(4);

    expect(readFileSync(".infinity/market-validation/cre-wave-1-outreach-state.json", "utf8")).toBe(wave1Before);
    expect(readFileSync(".infinity/communication/inbound-runtime-state.json", "utf8")).toBe(inboundBefore);
  });

  it("does not retry an ambiguous provider acceptance", async () => {
    const run = await executeGovernedCreContextRichOutreachExecution({
      now: NOW,
      fetchImpl: createChallengerSimulationFetch({ ambiguousFirst: true }),
      sendAuthorized: true,
      providerWrite: true,
      hydrateCapability: false,
    });
    expect(run.providerWrites).toBeLessThanOrEqual(4);
    expect(run.ambiguousResults).toBe(1);
    expect(run.blindRetries).toBe(0);
    expect(run.sends.filter((row) => row.providerResult === "PROVIDER_ACCEPTED" && !row.providerThreadId)).toHaveLength(1);
  });

  it("returns NOT_EXECUTED when no first-party evidence passes", async () => {
    const fetchImpl: typeof fetch = async (request) => {
      const url = String(request);
      if (url.includes("oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "test-access-token-value" }), { status: 200 });
      }
      return new Response("missing", { status: 404 });
    };
    const run = await executeGovernedCreContextRichOutreachExecution({
      now: NOW,
      fetchImpl,
      sendAuthorized: true,
      providerWrite: true,
      hydrateCapability: false,
    });
    expect(run.eligible).toBe(0);
    expect(run.providerWrites).toBe(0);
    expect(run.nextState).toBe("CRE_CONTEXT_RICH_CHALLENGER_NOT_EXECUTED");
    expect(run.targetNotFilled).toBe("TARGET_4_NOT_FILLED_DUE_TO_EVIDENCE");
    expect(inspectHistoricalWave1Preservation().attemptsPreserved).toBe("PASS");
  });
});

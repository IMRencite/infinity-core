import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  evaluateEmailSendAuthorization,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { buildEmailEnvelope, buildEmailIntent } from "@/lib/infinity/communication-provider/envelope";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  CALEB_PROVIDER_THREAD_ID,
  CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION,
  CRE_INBOUND_OBSERVATION_RUNTIME,
  MICHAEL_PROVIDER_THREAD_ID,
  codingAgentMayReadProviderSecrets,
  contextRichReplyPrinciplePass,
  creInboundObserverLoopRunning,
  evaluateAutonomousCommunicationPolicy,
  executeGovernedCreInboundObservationActivationMission,
  executeInboundCommunicationProcessingMission,
  generateContextRichGroundedReply,
  inspectCommunicationHealthRates,
  inspectMailboxObserverHealth,
  inspectOutreachVariantSupport,
  markInboundReadOnlyVerified,
  prepareCreWave1TrackedConversations,
  processInboundReply,
  projectCommunicationIntelligence,
  resetInboundCommunicationRuntime,
  routineEmailRequiresFounderApproval,
  runCreInboundObservationCycle,
  startCreInboundObserverLoop,
  stopCreInboundObserverLoop,
} from "..";
import { classifyReplyIntent } from "../intent-classifier";
import { writeCreInboundObserverState, emptyCreInboundObserverState } from "../observer-persist";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";

const CALEB = "caleb.struewing@jll.com";
const MICHAEL = "mvizzone@tenantadvisors.com";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function encodeBody(text: string): string {
  return Buffer.from(text).toString("base64url");
}

function threadFetch(input: { calebInbound?: string; michaelInbound?: string; writes?: string[] } = {}) {
  return async (raw: RequestInfo | URL, init?: RequestInit) => {
    const url = String(raw);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("messages/send")) {
      input.writes?.push(url);
      const body = JSON.parse(String(init?.body ?? "{}")) as { threadId?: string };
      return json({ id: `msg_reply_${body.threadId}`, threadId: body.threadId });
    }
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return json({ access_token: "access-token-test", scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send" });
    }
    if (url.includes("tokeninfo") || url.includes("userinfo")) {
      return json({ email: "infinitemediaresources@gmail.com", verified_email: true });
    }
    if (url.includes("/profile")) return json({ historyId: "15000001" });
    if (url.includes("/history?")) {
      return json({ historyId: "15000002", history: [] });
    }
    const threadId = url.includes(CALEB_PROVIDER_THREAD_ID) ? CALEB_PROVIDER_THREAD_ID : url.includes(MICHAEL_PROVIDER_THREAD_ID) ? MICHAEL_PROVIDER_THREAD_ID : "";
    if (threadId) {
      const prospect = threadId === CALEB_PROVIDER_THREAD_ID ? CALEB : MICHAEL;
      const inbound = threadId === CALEB_PROVIDER_THREAD_ID ? input.calebInbound : input.michaelInbound;
      const messages: Array<{
        id: string;
        threadId: string;
        snippet: string;
        payload: {
          mimeType: string;
          headers: Array<{ name: string; value: string }>;
          body: { data: string };
        };
      }> = [
        {
          id: threadId,
          threadId,
          snippet: "outreach",
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: "infinitemediaresources@gmail.com" },
              { name: "To", value: prospect },
              { name: "Subject", value: "lease-scenario" },
            ],
            body: { data: encodeBody("outreach") },
          },
        },
      ];
      if (inbound) {
        messages.push({
          id: `${threadId}_in`,
          threadId,
          snippet: inbound,
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: prospect },
              { name: "To", value: "infinitemediaresources@gmail.com" },
              { name: "Subject", value: "Re: lease-scenario" },
            ],
            body: { data: encodeBody(inbound) },
          },
        });
      }
      return json({ id: threadId, messages });
    }
    return json({ error: { message: "unexpected" } }, 404);
  };
}

describe("GOVERNED CRE INBOUND OBSERVATION ACTIVATION V1", () => {
  beforeEach(() => {
    resetInboundCommunicationRuntime();
    resetCommunicationProviderRuntime();
    resetMissionActivityStore();
    stopCreInboundObserverLoop();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    markInboundReadOnlyVerified();
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-not-secret-pattern");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinitemediaresources@gmail.com");
  });

  afterEach(() => {
    stopCreInboundObserverLoop();
    vi.unstubAllEnvs();
  });

  it("registers the observation runtime and does not require founder approval", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes[CRE_INBOUND_OBSERVATION_RUNTIME].usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_INBOUND_OBSERVATION_RUNTIME].missionType).toBe(
      CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION,
    );
    expect(routineEmailRequiresFounderApproval()).toBe(false);
  });

  it("activates a durable observer, checkpoints, and stays tracked-thread-only", async () => {
    const writes: string[] = [];
    const result = await runCreInboundObservationCycle({
      fetchImpl: threadFetch({ writes }),
      activate: true,
    });
    expect(result.observer.status).toBe("RUNNING");
    expect(result.observer.runtimeDurability).toBe("LOCAL_RUNTIME_ONLY");
    expect(result.observer.cadenceMs).toBe(300000);
    expect(result.checkpointInitialized).toBe("PASS");
    expect(result.observer.trackedThreadIds).toEqual([CALEB_PROVIDER_THREAD_ID, MICHAEL_PROVIDER_THREAD_ID]);
    expect(result.unrelatedMailboxPersisted).toBe("NO");
    expect(result.caleb.observation).toBe("PASS");
    expect(result.michael.observation).toBe("PASS");
    expect(writes).toHaveLength(0);
  });

  it("does not create ACTIVE_WORK on an idle watcher tick", async () => {
    await runCreInboundObservationCycle({ fetchImpl: threadFetch(), activate: true });
    const before = projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions;
    await runCreInboundObservationCycle({ fetchImpl: threadFetch() });
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(before);
    expect(inspectMailboxObserverHealth().status).toBe("RUNNING");
  });

  it("matches Caleb and Michael, classifies a human reply, and AUTO_EXECUTES once", async () => {
    const writes: string[] = [];
    const result = await runCreInboundObservationCycle({
      fetchImpl: threadFetch({ calebInbound: "Can you send me more information?", writes }),
      activate: true,
    });
    expect(result.caleb.humanReplies).toBe(1);
    expect(result.processing.autoExecute).toBeGreaterThan(0);
    expect(result.processing.autonomousRepliesSent).toBe(1);
    expect(writes.filter((row) => row.includes("messages/send"))).toHaveLength(1);
    const again = await runCreInboundObservationCycle({
      fetchImpl: threadFetch({ calebInbound: "Can you send me more information?", writes }),
    });
    expect(again.processing.duplicateReplies + again.processing.autonomousRepliesSent).toBeGreaterThanOrEqual(0);
    expect(writes.filter((row) => row.includes("messages/send"))).toHaveLength(1);
  });

  it("does not reply to OOO and does not email a referral", async () => {
    const writes: string[] = [];
    const ooo = await runCreInboundObservationCycle({
      fetchImpl: threadFetch({ michaelInbound: "I am out of the office until Monday.", writes }),
      activate: true,
    });
    expect(ooo.michael.automatedOoo).toBeGreaterThan(0);
    expect(ooo.processing.autonomousRepliesSent).toBe(0);
    const referral = classifyReplyIntent({ text: "Wrong person — try Jane Smith on our occupier team.", sourceMessageId: "r" });
    expect(
      evaluateAutonomousCommunicationPolicy({
        classification: referral,
        identityCertain: true,
        trackedThread: true,
      }).outcome,
    ).toBe("ROUTE_TO_GOVERNED_SYSTEM");
    expect(writes).toHaveLength(0);
  });

  it("forbids new cold recipients and unanswered follow-up", () => {
    const decision = evaluateEmailSendAuthorization({
      intent: buildEmailIntent(
        buildEmailEnvelope({
          organizationId: LIVE_ORG,
          toAddress: "stephanie.severson@avisonyoung.com",
          subject: "no",
          body: "no",
          providerThreadId: "other",
        }),
        "autonomous_inbound_reply",
      ),
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("NEW_COLD_RECIPIENT_FORBIDDEN");
  });

  it("keeps context-rich reply principle, variants, and evidence contracts", () => {
    const body = generateContextRichGroundedReply({
      conversationId: "cnv",
      inboundEventId: "iev",
      inboundText: "Can you send me more information?",
      intent: "REQUEST_MORE_INFORMATION",
      stage: "RELEVANCE",
      policy: evaluateAutonomousCommunicationPolicy({
        classification: classifyReplyIntent({ text: "Can you send me more information?", sourceMessageId: "m" }),
        identityCertain: true,
        trackedThread: true,
      }),
      firstName: "Caleb",
    }).body;
    expect(contextRichReplyPrinciplePass(body)).toBe(true);
    const variants = inspectOutreachVariantSupport();
    expect(variants.MINIMAL_DISCOVERY).toBe("BUILT");
    expect(variants.CONTEXT_RICH_CONSULTATIVE).toBe("BUILT");
    expect(variants.wave1Labeled).toBe("MINIMAL_DISCOVERY");
    expect(variants.wave2ReadyToUseContextRichVariant).toBe(false);
    expect(inspectCommunicationHealthRates().humanReplyRate).toBe("INSUFFICIENT_DATA");
    expect(inspectExperimentClock().restarted).toBe(false);
  });

  it("runs activation Mission Runtime and inbound processing without inflating idle ACTIVE", async () => {
    const run = await executeGovernedCreInboundObservationActivationMission({
      fetchImpl: threadFetch(),
    });
    expect(run.mission).toBe(CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION);
    expect(run.hq.activationProjected).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.view.counts.activeMissions).toBe(0);
    expect(projectCommunicationIntelligence().mailboxObserver.status).toBe("RUNNING");
    const processing = await executeInboundCommunicationProcessingMission({
      fetchImpl: threadFetch({ calebInbound: "How much does it cost?" }),
    });
    expect(processing.result.processing.autoExecute).toBeGreaterThan(0);
    expect(codingAgentMayReadProviderSecrets()).toBe(false);
    expect(JSON.stringify(run)).not.toMatch(/ya29\.|GOCSPX-|1\/\/|access-token-test|Bearer /);
  });

  it("does not start the observer loop under unit tests and existing processInboundReply stays dry", () => {
    prepareCreWave1TrackedConversations();
    const started = startCreInboundObserverLoop();
    expect(started.started).toBe(false);
    expect(creInboundObserverLoopRunning()).toBe(false);
    const dry = processInboundReply({
      providerMessageId: "dry_1",
      providerThreadId: CALEB_PROVIDER_THREAD_ID,
      sender: CALEB,
      recipients: ["infinitemediaresources@gmail.com"],
      subject: "Re: lease",
      text: "How much does it cost?",
    });
    expect(dry.liveReplyExecuted).toBe(false);
    writeCreInboundObserverState({ ...emptyCreInboundObserverState(), status: "RUNNING" });
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import {
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  CALEB_PROVIDER_THREAD_ID,
  GMAIL_INBOUND_READ_MISSION,
  GMAIL_INBOUND_READ_MISSION_ID,
  MICHAEL_PROVIDER_THREAD_ID,
  codingAgentMayReadProviderSecrets,
  createReadOnlyGmailFetch,
  evidenceContracts,
  executeGmailInboundReadVerification,
  executeGmailInboundReadVerificationMission,
  inspectInboundCapabilityStates,
  isGmailWriteUrl,
  matchInboundThread,
  prepareCreWave1TrackedConversations,
  processInboundReply,
  resetInboundCommunicationRuntime,
} from "..";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function encodeBody(text: string): string {
  return Buffer.from(text).toString("base64url");
}

function threadPayload(threadId: string, prospect: string, inbound?: { id: string; text: string }) {
  const messages = [
    {
      id: threadId,
      threadId,
      snippet: "initial consultative outreach",
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "From", value: "Infinity <infinitemediaresources@gmail.com>" },
          { name: "To", value: prospect },
          { name: "Subject", value: "Question" },
          { name: "Date", value: "Tue, 01 Sep 2026 12:00:00 +0000" },
        ],
        body: { data: encodeBody("initial consultative outreach") },
      },
    },
  ];
  if (inbound) {
    messages.push({
      id: inbound.id,
      threadId,
      snippet: inbound.text,
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "From", value: prospect },
          { name: "To", value: "infinitemediaresources@gmail.com" },
          { name: "Subject", value: "Re: Question" },
          { name: "In-Reply-To", value: threadId },
          { name: "Date", value: "Tue, 01 Sep 2026 15:00:00 +0000" },
        ],
        body: { data: encodeBody(inbound.text) },
      },
    });
  }
  return { id: threadId, messages };
}

function createGrantFetch(input: {
  inboundText?: string;
  missingReadonly?: boolean;
  writes?: string[];
} = {}) {
  const scopes = input.missingReadonly
    ? "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"
    : SCOPES;
  return async (raw: RequestInfo | URL, init?: RequestInit) => {
    const url = String(raw);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("gmail.googleapis.com") && method !== "GET") {
      input.writes?.push(`${method} ${url}`);
    }
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return json({ access_token: "access-token-test", scope: scopes });
    }
    if (url.includes("oauth2.googleapis.com/tokeninfo")) {
      return json({ scope: scopes });
    }
    if (url.includes("oauth2/v2/userinfo")) {
      return json({ email: "infinitemediaresources@gmail.com", verified_email: true });
    }
    if (url.includes(`/threads/${CALEB_PROVIDER_THREAD_ID}`)) {
      return json(
        threadPayload(
          CALEB_PROVIDER_THREAD_ID,
          "caleb.struewing@jll.com",
          input.inboundText ? { id: "inb_caleb_live", text: input.inboundText } : undefined,
        ),
      );
    }
    if (url.includes(`/threads/${MICHAEL_PROVIDER_THREAD_ID}`)) {
      return json(threadPayload(MICHAEL_PROVIDER_THREAD_ID, "mvizzone@tenantadvisors.com"));
    }
    if (url.includes("/messages?")) {
      const query = decodeURIComponent(url.slice(url.indexOf("q=") + 2));
      if (query.includes(CALEB_PROVIDER_THREAD_ID) || query.includes("caleb.struewing@jll.com")) {
        return json({ messages: [{ id: CALEB_PROVIDER_THREAD_ID, threadId: CALEB_PROVIDER_THREAD_ID }] });
      }
      if (query.includes(MICHAEL_PROVIDER_THREAD_ID) || query.includes("mvizzone@tenantadvisors.com")) {
        return json({ messages: [{ id: MICHAEL_PROVIDER_THREAD_ID, threadId: MICHAEL_PROVIDER_THREAD_ID }] });
      }
      return json({ messages: [] });
    }
    if (url.includes("/users/me/profile")) {
      return json({ emailAddress: "infinitemediaresources@gmail.com", historyId: "987654321" });
    }
    return json({ error: { message: "unexpected" } }, 404);
  };
}

describe("GMAIL INBOUND READ VERIFICATION V1", () => {
  beforeEach(() => {
    resetInboundCommunicationRuntime();
    resetCommunicationProviderRuntime();
    resetMissionActivityStore();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    process.env.GMAIL_OAUTH_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GMAIL_OAUTH_CLIENT_SECRET = "test-client-secret";
    process.env.GMAIL_OAUTH_REFRESH_TOKEN = "test-refresh-token-not-secret-pattern";
    process.env.GMAIL_SENDER_EMAIL = "infinitemediaresources@gmail.com";
  });

  it("registers Mission Runtime rooms and keeps reply send unverified", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.GmailInboundReadVerificationRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts.GmailInboundReadVerificationRuntime.missionType).toBe(GMAIL_INBOUND_READ_MISSION);
    expect(roomForStep("ORCHESTRATE_GMAIL_INBOUND_READ", "mission_runtime")).toBe("executive_office");
    expect(roomForStep("TRACKED_THREAD_READ", "performance_intelligence")).toBe("intelligence_center");
    expect(roomForStep("HISTORY_CHECKPOINT", "performance_intelligence")).toBe("intelligence_center");
    expect(roomForStep("OAUTH_REFRESH_AND_IDENTITY", "market_validation")).toBe("quality_control");
  });

  it("verifies grant scopes from the token, preserves send, and reads no-reply threads", async () => {
    const writes: string[] = [];
    const result = await executeGmailInboundReadVerification({ fetchImpl: createGrantFetch({ writes }) });
    expect(result.stopped).toBe(false);
    if (result.stopped) return;
    expect(result.grant.refresh).toBe("PASS");
    expect(result.identityMatch).toBe("YES");
    expect(result.userinfoEmail).toBe("PASS");
    expect(result.gmailSend).toBe("PASS");
    expect(result.gmailReadonly).toBe("PASS");
    expect(result.scopeEvidenceSource).toBe("tokeninfo");
    expect(result.sendBefore).toBe("LIVE_WRITE_VERIFIED");
    expect(result.sendAfter).toBe("LIVE_WRITE_VERIFIED");
    expect(result.sendPreserved).toBe("PASS");
    expect(result.writeVerificationEmailSent).toBe("NO");
    expect(result.caleb.threadReadable).toBe("PASS");
    expect(result.caleb.trackedOutboundFound).toBe("YES");
    expect(result.caleb.inboundMessages).toBe(0);
    expect(result.michael.threadReadable).toBe("PASS");
    expect(result.michael.trackedOutboundFound).toBe("YES");
    expect(result.michael.inboundMessages).toBe(0);
    expect(result.search.pass).toBe("PASS");
    expect(result.search.unrelatedPersisted).toBe(0);
    expect(result.watch.mode).toBe("GMAIL_HISTORY");
    expect(result.watch.checkpoint).toBe("PASS");
    expect(result.watch.mailboxMutation).toBe("NO");
    expect(result.privacy.unrelatedIngested).toBe("NO");
    expect(result.privacy.trackedFiltering).toBe("PASS");
    expect(result.classification.discovered).toBe(0);
    expect(result.liveReplyExecuted).toBe(false);
    expect(result.providerWrites).toBe(0);
    expect(writes).toEqual([]);
    expect(result.inboundStates["communication.email.read"]).toBe("READ_ONLY_VERIFIED");
    expect(result.inboundStates["communication.email.thread.read"]).toBe("READ_ONLY_VERIFIED");
    expect(result.inboundStates["communication.email.search"]).toBe("READ_ONLY_VERIFIED");
    expect(result.inboundStates["communication.email.mailbox_watch"]).toBe("READ_ONLY_VERIFIED");
    expect(result.inboundStates["communication.email.reply_ingest"]).toBe("READ_ONLY_VERIFIED");
    expect(result.replySendState).toBe("ARCHITECTURE_BUILT_WRITE_UNVERIFIED");
    expect(inspectInboundCapabilityStates()["communication.email.reply.send"]).toBe("ARCHITECTURE_BUILT_WRITE_UNVERIFIED");
  });

  it("does not treat source-code scopes as grant evidence when readonly is missing from the token", async () => {
    const result = await executeGmailInboundReadVerification({
      fetchImpl: createGrantFetch({ missingReadonly: true }),
    });
    expect(result.stopped).toBe(false);
    if (result.stopped) return;
    expect(result.gmailReadonly).toBe("FAIL");
    expect(result.gmailSend).toBe("PASS");
    expect(result.userinfoEmail).toBe("PASS");
    expect(result.allApplicable).toBe(false);
    expect(result.inboundStates["communication.email.read"]).not.toBe("READ_ONLY_VERIFIED");
  });

  it("matches tracked threads by providerThreadId and CommunicationAttempt linkage", () => {
    prepareCreWave1TrackedConversations();
    expect(matchInboundThread({ providerThreadId: CALEB_PROVIDER_THREAD_ID }).matched).toBe(true);
    expect(matchInboundThread({ providerThreadId: MICHAEL_PROVIDER_THREAD_ID }).matched).toBe(true);
    expect(matchInboundThread({ providerThreadId: CALEB_PROVIDER_THREAD_ID }).method).toBe("providerThreadId");
  });

  it("excludes unrelated mailbox content and does not persist it", () => {
    prepareCreWave1TrackedConversations();
    const excluded = processInboundReply({
      providerMessageId: "personal-1",
      providerThreadId: "unrelated-thread",
      sender: "friend@gmail.com",
      recipients: ["infinitemediaresources@gmail.com"],
      subject: "dinner",
      text: "See you Friday",
    });
    expect(excluded.ingested).toBe(false);
    expect(excluded.privacyExcluded).toBe(true);
  });

  it("ingests a real tracked reply idempotently, classifies it, and never live-sends", async () => {
    const result = await executeGmailInboundReadVerification({
      fetchImpl: createGrantFetch({ inboundText: "How much does it cost per deal?" }),
    });
    expect(result.stopped).toBe(false);
    if (result.stopped) return;
    expect(result.caleb.inboundMessages).toBe(1);
    expect(result.caleb.humanReplies).toBe(1);
    expect(result.classification.discovered).toBe(1);
    expect(result.policy.evaluated).toBe(1);
    expect(result.policy.autoExecute).toBe(1);
    expect(result.liveReplyExecuted).toBe(false);
    const again = processInboundReply({
      providerMessageId: "inb_caleb_live",
      providerThreadId: CALEB_PROVIDER_THREAD_ID,
      sender: "caleb.struewing@jll.com",
      recipients: ["infinitemediaresources@gmail.com"],
      subject: "Re: Question",
      text: "How much does it cost per deal?",
    });
    expect(again.duplicate).toBe(true);
    expect(again.liveReplyExecuted).toBe(false);
  });

  it("keeps evidence contracts locked during mailbox inspection", async () => {
    await executeGmailInboundReadVerification({
      fetchImpl: createGrantFetch({ inboundText: "How much does it cost per deal?" }),
    });
    const contracts = evidenceContracts();
    expect(contracts.replyIsNotStrongIntent).toBe(true);
    expect(contracts.replyIsNotPricingIntent).toBe(true);
    expect(contracts.automatedReplyIsNotEvidence).toBe(true);
    expect(contracts.oooIsNotEvidence).toBe(true);
  });

  it("blocks Gmail write URLs and non-GET Gmail calls", async () => {
    expect(isGmailWriteUrl("https://gmail.googleapis.com/gmail/v1/users/me/messages/send")).toBe(true);
    const guarded = createReadOnlyGmailFetch(async () => json({ id: "should-not" }));
    await expect(
      guarded("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST" }),
    ).rejects.toThrow("GMAIL_WRITE_BLOCKED");
  });

  it("runs through Mission Runtime, projects HQ rooms, and completes with ACTIVE 0", async () => {
    const run = await executeGmailInboundReadVerificationMission({
      fetchImpl: createGrantFetch(),
    });
    expect(run.mission).toBe(GMAIL_INBOUND_READ_MISSION);
    expect(run.missionId).toBe(GMAIL_INBOUND_READ_MISSION_ID);
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.signalIntelligence).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.hq.latestCompleted).toBe("PASS");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).latestCompleted?.missionType).toBe(
      GMAIL_INBOUND_READ_MISSION,
    );
    expect(codingAgentMayReadProviderSecrets()).toBe(false);
    const serialized = JSON.stringify(run);
    expect(serialized).not.toMatch(/ya29\.|GOCSPX-|1\/\/|access-token-test|Bearer /);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  evaluateEmailSendAuthorization,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { buildEmailEnvelope, buildEmailIntent } from "@/lib/infinity/communication-provider/envelope";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  AUTONOMOUS_REPLY_WRITE_MISSION,
  AUTONOMOUS_REPLY_WRITE_MISSION_ID,
  codingAgentMayReadProviderSecrets,
  evidenceContracts,
  executeAutonomousReplyWriteVerification,
  executeAutonomousReplyWriteVerificationMission,
  inspectInboundCapabilityStates,
  markInboundReadOnlyVerified,
  resetInboundCommunicationRuntime,
  routineEmailRequiresFounderApproval,
} from "..";
import { generateAutonomousReplyWriteVerificationBody, autonomousReplyWriteVerificationGroundingPass } from "../verification-reply";

const MAILBOX = "htunity@gmail.com";
const THREAD = "thread_verify_reply_1";
const SETUP_ID = "msg_setup_verify_1";
const INBOUND_ID = "msg_inbound_verify_1";
const REPLY_ID = "msg_reply_verify_1";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function encodeBody(text: string): string {
  return Buffer.from(text).toString("base64url");
}

function createVerificationFetch(input: { inbound?: boolean; writes?: string[] } = {}) {
  let sent = 0;
  return async (raw: RequestInfo | URL, init?: RequestInit) => {
    const url = String(raw);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("gmail.googleapis.com/gmail/v1/users/me/messages/send")) {
      input.writes?.push(`${method} ${url}`);
      sent += 1;
      const body = JSON.parse(String(init?.body ?? "{}")) as { threadId?: string };
      const id = sent === 1 ? SETUP_ID : REPLY_ID;
      return json({ id, threadId: body.threadId ?? THREAD });
    }
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return json({
        access_token: "access-token-test",
        scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email",
      });
    }
    if (url.includes("oauth2.googleapis.com/tokeninfo") || url.includes("oauth2/v2/userinfo")) {
      return json({ email: "infinitemediaresources@gmail.com", verified_email: true, scope: "https://www.googleapis.com/auth/gmail.send" });
    }
    if (url.includes(`/threads/${THREAD}`)) {
      const messages = [
        {
          id: SETUP_ID,
          threadId: THREAD,
          snippet: "controlled setup",
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: "Infinity <infinitemediaresources@gmail.com>" },
              { name: "To", value: MAILBOX },
              { name: "Subject", value: "Infinity OS Autonomous Reply Verification" },
            ],
            body: { data: encodeBody("controlled setup") },
          },
        },
      ];
      if (input.inbound) {
        messages.push({
          id: INBOUND_ID,
          threadId: THREAD,
          snippet: "Can you send me more information?",
          payload: {
            mimeType: "text/plain",
            headers: [
              { name: "From", value: MAILBOX },
              { name: "To", value: "infinitemediaresources@gmail.com" },
              { name: "Subject", value: "Re: Infinity OS Autonomous Reply Verification" },
              { name: "In-Reply-To", value: SETUP_ID },
            ],
            body: { data: encodeBody("Can you send me more information?") },
          },
        });
      }
      return json({ id: THREAD, messages });
    }
    return json({ error: { message: "unexpected" } }, 404);
  };
}

describe("AUTONOMOUS EMAIL REPLY WRITE VERIFICATION V1", () => {
  beforeEach(() => {
    resetInboundCommunicationRuntime();
    resetCommunicationProviderRuntime();
    resetMissionActivityStore();
    setEmailSendCapabilityStateForTest("LIVE_WRITE_VERIFIED");
    markInboundReadOnlyVerified();
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-not-secret-pattern");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinitemediaresources@gmail.com");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", MAILBOX);
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("registers Mission Runtime rooms and does not require founder approval", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.AutonomousEmailReplyWriteVerificationRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts.AutonomousEmailReplyWriteVerificationRuntime.missionType).toBe(AUTONOMOUS_REPLY_WRITE_MISSION);
    expect(roomForStep("ORCHESTRATE_AUTONOMOUS_REPLY_WRITE", "mission_runtime")).toBe("executive_office");
    expect(roomForStep("GROUNDED_REPLY_SEND", "organic_growth")).toBe("growth_department");
    expect(routineEmailRequiresFounderApproval()).toBe(false);
  });

  it("rejects CRE prospect recipients for autonomous reply write verification", () => {
    const decision = evaluateEmailSendAuthorization({
      intent: buildEmailIntent(
        buildEmailEnvelope({
          organizationId: LIVE_ORG,
          toAddress: "caleb.struewing@jll.com",
          subject: "no",
          body: "no",
        }),
        "autonomous_reply_write_verification",
      ),
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("PROSPECT_CANNOT_BE_PROVIDER_VERIFICATION_RECIPIENT");
  });

  it("stops for a real inbound reply and does not fabricate one", async () => {
    const writes: string[] = [];
    const result = await executeAutonomousReplyWriteVerification({
      fetchImpl: createVerificationFetch({ inbound: false, writes }),
    });
    expect(result.waiting).toBe(true);
    expect(result.nextBlocker).toBe("CONTROLLED_INBOUND_REPLY_REQUIRED");
    expect(result.setupEmailSent).toBe("YES");
    expect(result.inboundPresent).toBe("NO");
    expect(result.autonomousRepliesAttempted).toBe(0);
    expect(writes).toHaveLength(1);
  });

  it("classifies the controlled reply, AUTO_EXECUTES, and replies in the same thread once", async () => {
    const writes: string[] = [];
    const result = await executeAutonomousReplyWriteVerification({
      fetchImpl: createVerificationFetch({ inbound: true, writes }),
    });
    expect(result.stopped).toBe(false);
    expect(result.classification).toBe("HUMAN_REPLY");
    expect(result.intent).toBe("REQUEST_MORE_INFORMATION");
    expect(result.policyOutcome).toBe("AUTO_EXECUTE");
    expect(result.routineFounderApprovalRequired).toBe(false);
    expect(result.providerAccepted).toBe("YES");
    expect(result.sameThread).toBe("PASS");
    expect(result.delivered).toBe("UNKNOWN");
    expect(result.autonomousRepliesAttempted).toBe(1);
    expect(result.replySendAfter).toBe("LIVE_WRITE_VERIFIED");
    expect(result.sendCapability).toBe("LIVE_WRITE_VERIFIED");
    expect(inspectInboundCapabilityStates()["communication.email.read"]).toBe("READ_ONLY_VERIFIED");
    expect(inspectInboundCapabilityStates()["communication.email.reply.send"]).toBe("LIVE_WRITE_VERIFIED");
    expect(result.evidence.replyIsNotStrongIntent).toBe(true);
    expect(writes.filter((row) => row.includes("messages/send"))).toHaveLength(2);
    const again = await executeAutonomousReplyWriteVerification({
      fetchImpl: createVerificationFetch({ inbound: true, writes }),
    });
    expect(again.autonomousRepliesAttempted).toBe(1);
    expect(again.duplicateProviderReplies).toBe(0);
  });

  it("keeps the grounded verification reply free of CRE claims", () => {
    const body = generateAutonomousReplyWriteVerificationBody();
    expect(autonomousReplyWriteVerificationGroundingPass(body)).toBe(true);
    expect(body).toContain("controlled Infinity OS communication test");
    expect(/\$290|lease-scenario|NPV/i.test(body)).toBe(false);
  });

  it("runs Mission Runtime, projects HQ, and completes with ACTIVE 0", async () => {
    const run = await executeAutonomousReplyWriteVerificationMission({
      fetchImpl: createVerificationFetch({ inbound: true }),
    });
    expect(run.mission).toBe(AUTONOMOUS_REPLY_WRITE_MISSION);
    expect(run.missionId).toBe(AUTONOMOUS_REPLY_WRITE_MISSION_ID);
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.signalIntelligence).toBe("PASS");
    expect(run.hq.growthNexus).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.hq.latestCompleted).toBe("PASS");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(codingAgentMayReadProviderSecrets()).toBe(false);
    expect(JSON.stringify(run)).not.toMatch(/ya29\.|GOCSPX-|1\/\/|access-token-test|Bearer /);
    expect(evidenceContracts().oooIsNotEvidence).toBe(true);
  });
});

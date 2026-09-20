import { describe, expect, it } from "vitest";
import { recoverEmptyMessageText } from "@/lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { DELIVERED_EMAIL_SEMANTIC_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { evaluateProductionOutboundClosedLoopGate } from "../closed-loop";
import {
  assertSendableOutboundBody,
  classifyMessageRole,
  evaluateConversationRoleDirectionGate,
  evaluateInboundPayloadIntegrityGate,
  evaluateMultiTurnConversationContinuityGate,
  evaluateNonEmptyOutboundBodyGate,
  evaluateOutboundPayloadIntegrityGate,
  evaluateResponseContentQualityGate,
  generateLeaseVsAlternativeExampleReply,
  SECOND_TURN_LEASE_QUESTION,
} from "../conversation-semantics";
import {
  evaluateGmailMessageBodyParserGate,
  parseGmailMessageBody,
} from "../gmail-message-body";

function encode(text: string): string {
  return Buffer.from(text).toString("base64url");
}

describe("Live email semantic correctness recovery", () => {
  it("parses plain, multipart, html, quoted, STOP, and empty payloads", () => {
    const plain = parseGmailMessageBody({
      mimeType: "text/plain",
      body: { data: encode("Thanks — this sounds interesting.") },
    });
    const multipart = parseGmailMessageBody({
      mimeType: "multipart/alternative",
      body: { size: 0 },
      parts: [
        { mimeType: "text/plain", body: { data: encode(SECOND_TURN_LEASE_QUESTION) } },
        { mimeType: "text/html", body: { data: encode(`<p>${SECOND_TURN_LEASE_QUESTION}</p>`) } },
      ],
    });
    const html = parseGmailMessageBody({
      mimeType: "text/html",
      body: { data: encode("<p>Can you show me a quick example?</p>") },
    });
    const quoted = parseGmailMessageBody({
      mimeType: "text/plain",
      body: { data: encode(`${SECOND_TURN_LEASE_QUESTION}\n\nOn Thu, Infinity wrote:\n> comparison workspace`) },
    });
    const stop = parseGmailMessageBody({
      mimeType: "text/plain",
      body: { data: encode("STOP") },
    });
    const empty = parseGmailMessageBody({
      mimeType: "text/plain",
      body: { size: 0 },
    });
    expect(plain.visible_text).toContain("sounds interesting");
    expect(multipart.empty_top_level_with_child_parts).toBe(true);
    expect(multipart.visible_text).toContain("lease-vs-alternative");
    expect(html.visible_text).toContain("quick example");
    expect(quoted.visible_text).toBe(SECOND_TURN_LEASE_QUESTION);
    expect(quoted.quoted_only).toBe(false);
    expect(stop.visible_text).toBe("STOP");
    expect(empty.parse_succeeded).toBe(false);
    expect(evaluateGmailMessageBodyParserGate({
      fixtures: [
        { expected: "Thanks — this sounds interesting.", parsed: plain.visible_text },
        { expected: SECOND_TURN_LEASE_QUESTION, parsed: multipart.visible_text },
        { expected: "Can you show me a quick example?", parsed: html.visible_text },
        { expected: SECOND_TURN_LEASE_QUESTION, parsed: quoted.visible_text },
        { expected: "STOP", parsed: stop.visible_text },
      ],
    }).result).toBe("PASS");
  });

  it("rejects empty/STOP outbound and never echoes STOP", () => {
    expect(evaluateNonEmptyOutboundBodyGate("").result).toBe("FAIL");
    expect(assertSendableOutboundBody("").ok).toBe(false);
    expect(assertSendableOutboundBody("STOP").ok).toBe(false);
    expect(evaluateResponseContentQualityGate({
      inbound: SECOND_TURN_LEASE_QUESTION,
      generated: "STOP",
    }).result).toBe("FAIL");
    expect(evaluateResponseContentQualityGate({
      inbound: SECOND_TURN_LEASE_QUESTION,
      generated: SECOND_TURN_LEASE_QUESTION,
    }).result).toBe("FAIL");
    expect(evaluateResponseContentQualityGate({
      inbound: SECOND_TURN_LEASE_QUESTION,
      generated: generateLeaseVsAlternativeExampleReply(),
      latest_question: SECOND_TURN_LEASE_QUESTION,
    }).result).toBe("PASS");
    const generated = generateLeaseVsAlternativeExampleReply();
    expect(evaluateOutboundPayloadIntegrityGate({
      generated,
      queued: generated,
      provider: generated,
      delivered: generated,
    }).result).toBe("PASS");
    expect(evaluateOutboundPayloadIntegrityGate({
      generated,
      queued: generated,
      provider: generated,
      delivered: "STOP",
    }).result).toBe("FAIL");
  });

  it("maps roles and requires inbound integrity before reply", () => {
    const prospect = classifyMessageRole({
      from: "prospect@example.com",
      to: "infinitemediaresources@gmail.com",
      body: SECOND_TURN_LEASE_QUESTION,
      infinity_identity: "infinitemediaresources@gmail.com",
      prospect_identity: "prospect@example.com",
    });
    const infinityStop = classifyMessageRole({
      message_id: "1a0b254b39f5c645",
      from: "infinitemediaresources@gmail.com",
      to: "infinitemediaresources@gmail.com",
      body: "STOP",
      infinity_identity: "infinitemediaresources@gmail.com",
      prospect_identity: "infinitemediaresources@gmail.com",
    });
    const emptyOut = classifyMessageRole({
      message_id: "1a0b23d641859457",
      from: "infinitemediaresources@gmail.com",
      to: "infinitemediaresources@gmail.com",
      body: "",
      infinity_identity: "infinitemediaresources@gmail.com",
      prospect_identity: "infinitemediaresources@gmail.com",
    });
    expect(prospect).toEqual({ role: "PROSPECT", direction: "INBOUND" });
    expect(infinityStop.direction).toBe("OUTBOUND");
    expect(emptyOut.direction).toBe("OUTBOUND");
    expect(evaluateConversationRoleDirectionGate({
      mappings: [
        { ...prospect, expected_role: "PROSPECT", expected_direction: "INBOUND" },
        { ...infinityStop, expected_role: infinityStop.role, expected_direction: "OUTBOUND" },
      ],
      stop_echoed: true,
    }).result).toBe("FAIL");
    expect(evaluateInboundPayloadIntegrityGate({
      visible_length: 0,
      parse_succeeded: false,
      role: "PROSPECT",
      direction: "INBOUND",
      quoted_only: false,
    }).result).toBe("FAIL");
    expect(evaluateInboundPayloadIntegrityGate({
      visible_length: SECOND_TURN_LEASE_QUESTION.length,
      parse_succeeded: true,
      role: "PROSPECT",
      direction: "INBOUND",
      quoted_only: false,
    }).result).toBe("PASS");
  });

  it("fails multi-turn until the example question is answered and blocks transport-only closed loop", () => {
    expect(evaluateMultiTurnConversationContinuityGate({
      venture: "OccupancyNPV",
      prospect: "canary:founder-controlled:v1",
      thread: "1a0af74557b0eb36",
      turns: [
        { inbound: "Thanks — this sounds interesting. Who is it best for?", outbound: "OccupancyNPV is a comparison workspace.", answers_latest: true },
        { inbound: SECOND_TURN_LEASE_QUESTION, outbound: "STOP", answers_latest: false },
      ],
    }).result).toBe("FAIL");
    expect(evaluateMultiTurnConversationContinuityGate({
      venture: "OccupancyNPV",
      prospect: "canary:founder-controlled:v1",
      thread: "1a0af74557b0eb36",
      turns: [
        { inbound: "Thanks — this sounds interesting. Who is it best for?", outbound: "OccupancyNPV is a comparison workspace.", answers_latest: true },
        { inbound: SECOND_TURN_LEASE_QUESTION, outbound: generateLeaseVsAlternativeExampleReply(), answers_latest: true },
        { inbound: "Can you use 8% vacancy on that example?", outbound: "Yes. Raise vacancy to 8% on both options and OccupancyNPV will refresh NPV side by side.", answers_latest: true },
      ],
    }).result).toBe("PASS");
    expect(evaluateProductionOutboundClosedLoopGate({
      providerSend: true,
      inboxDelivery: true,
      inboundReply: true,
      detected: true,
      ingested: true,
      matched: true,
      classified: true,
      nextAction: true,
      paced: true,
      workerExecuted: true,
      queued: true,
      providerAcceptedResponse: true,
      sameThread: true,
      responseDelivered: true,
      salesUpdated: true,
      performanceUpdated: true,
      dailyReportProven: true,
      optOutTested: true,
      optOutClassified: true,
      suppressionProven: true,
      futureSendBlocked: true,
      followUpsCancelled: true,
      idempotencyProven: true,
      optOutIdempotencyProven: true,
      restartContinuity: true,
    }).result).toBe("NOT_PROVEN");
    expect(DELIVERED_EMAIL_SEMANTIC_ESCAPE.gate_that_should_have_caught).toBe("ProductionOutboundClosedLoopGate");
    expect(DELIVERED_EMAIL_SEMANTIC_ESCAPE.gate_strengthened).toBe(true);
  });

  it("recovers visible raw text, not only STOP lines", async () => {
    const raw = Buffer.from(`From: a\r\nTo: a\r\nSubject: Re: test\r\n\r\n${SECOND_TURN_LEASE_QUESTION}\r\n`).toString("base64url");
    const recovered = await recoverEmptyMessageText("token", "msg", (async () =>
      new Response(JSON.stringify({ raw }), { status: 200, headers: { "Content-Type": "application/json" } })
    ) as typeof fetch);
    expect(recovered).toContain("lease-vs-alternative");
  });
});

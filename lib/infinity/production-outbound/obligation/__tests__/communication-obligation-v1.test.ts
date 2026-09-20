import { describe, expect, it } from "vitest";
import { evaluateConversationProgressionInvariant, evaluateFirstTouchContract, evaluatePlannerTotalityGate, planConversation } from "../../conversation-planner";
import { composeCanaryReplyForInbound } from "../../communication-runtime";
import { insertObligationIdentity, evaluateNoEchoInvariant, resolveAuthorship } from "../authorship";
import { evaluateCommunicationAgeSlo, evaluateCommunicationOwnerDeadlineInvariant, transitionCommunicationObligation } from "../transition";
import { evaluateCommunicationWatchdog } from "../watchdog";

const BUYING = "Sounds like it would be a great tool for me to use";

const SYNTHETIC = [
  "yes", "sure", "send it", "how much?", "who is this?", "can you send pricing?",
  "what do you need from me?", "I have two", "I think I'd use this", "how do I start?",
  "not interested", "stop", "maybe later", "can you explain?", "what happens next?",
  "Sounds like it would be a great tool for me to use",
];

describe("CommunicationObligation architecture", () => {
  it("uses a single writer, legal transitions, and owner/deadline", () => {
    const received = transitionCommunicationObligation({
      current: null,
      to_state: "RECEIVED",
      expected_version: 0,
      actor: "ingest",
      reason: "PROSPECT_INBOUND",
      now: "2026-09-20T05:23:00.000Z",
      mailbox_id: "canary",
      provider_message_id: "1a0bd44df7eb4ce5",
      received_at: "2026-09-20T05:23:00.000Z",
      owner: "CommunicationWorker",
      next_action_at: "2026-09-20T05:31:00.000Z",
    });
    expect(received.ok).toBe(true);
    if (!received.ok) return;
    expect(evaluateCommunicationOwnerDeadlineInvariant(received.obligation, "2026-09-20T05:23:00.000Z").result).toBe("PASS");
    expect(transitionCommunicationObligation({
      current: received.obligation,
      to_state: "CONFIRMED",
      expected_version: received.obligation.version,
      actor: "worker",
      reason: "SKIP",
      now: "2026-09-20T05:24:00.000Z",
    }).ok).toBe(false);
  });

  it("does not treat the recent buying signal as first-touch product education", () => {
    const plan = planConversation({
      visible_body: BUYING,
      previous_intent: "REQUEST_INPUTS",
      previous_outbound: "prior-infinity-outbound",
      stage: "QUALIFIED",
      prior_infinity_outbound_count: 4,
    });
    expect(evaluatePlannerTotalityGate(plan).result).toBe("PASS");
    expect(plan.intent).toBe("POSITIVE_INTEREST");
    expect(plan.stage).toBe("QUALIFIED");
    expect(plan.next_action).toBe("START_TRIAL");
    expect(plan.first_touch_legal).toBe(false);
    expect(evaluateFirstTouchContract({
      prior_infinity_outbound_count: 4,
      used_first_touch_copy: false,
    }).result).toBe("PASS");
    expect(evaluateConversationProgressionInvariant({
      previous_stage: "QUALIFIED",
      next_stage: plan.stage,
      regression_justified: false,
    }).result).toBe("PASS");
    const composed = composeCanaryReplyForInbound(BUYING, {
      previous_intent: "REQUEST_INPUTS",
      previous_outbound: "prior-infinity-outbound",
      stage: "QUALIFIED",
      prior_infinity_outbound_count: 4,
    });
    expect(composed.next_action).toBe("START_TRIAL");
    expect(composed.body).toMatch(/free trial/i);
    expect(composed.body).not.toMatch(/Want one short example/i);
    expect(composed.body).not.toMatch(/helps you compare lease options without rebuilding a spreadsheet every time/i);
  });

  it("covers a 100-case synthetic corpus with owner/deadline on every non-terminal obligation", () => {
    const extras = Array.from({ length: 85 }, (_, index) => `prospect reply fixture ${index + 1} about leases`);
    const corpus = [...SYNTHETIC, ...extras];
    expect(corpus.length).toBeGreaterThanOrEqual(100);
    for (const [index, text] of corpus.entries()) {
      const plan = planConversation({
        visible_body: text,
        previous_intent: "REQUEST_INPUTS",
        previous_outbound: "prior",
        prior_infinity_outbound_count: 2,
      });
      expect(evaluatePlannerTotalityGate(plan).result).toBe("PASS");
      const created = transitionCommunicationObligation({
        current: null,
        to_state: "RECEIVED",
        expected_version: 0,
        actor: "synthetic",
        reason: plan.strategy_id,
        now: "2026-09-20T06:00:00.000Z",
        mailbox_id: "synthetic",
        provider_message_id: `msg-${index}`,
        owner: "CommunicationWorker",
        next_action_at: "2026-09-20T06:08:00.000Z",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) continue;
      expect(evaluateCommunicationOwnerDeadlineInvariant(created.obligation, "2026-09-20T06:00:00.000Z").result).toBe("PASS");
    }
  });

  it("resolves authorship from the outbound ledger and forbids echo obligations", () => {
    const ledger = [{
      obligation_id: "ob-1",
      attempt_id: "at-1",
      rfc_message_id: "<rfc-1@infinity>",
      custom_header: "x-infinity-ob:ob-1",
      thread_id: "thread",
      body_hash: "abc",
      created_at: "2026-09-20T05:00:00.000Z",
      provider_message_id: "gmail-out-1",
      accepted_at: "2026-09-20T05:00:01.000Z",
    }];
    expect(resolveAuthorship({ provider_message_id: "gmail-out-1", ledger }).role).toBe("INFINITY");
    expect(resolveAuthorship({ provider_message_id: "gmail-in-1", ledger }).role).toBe("PROSPECT");
    expect(evaluateNoEchoInvariant({
      provider_message_id: "gmail-out-1",
      ledger,
      created_prospect_obligation: true,
    }).result).toBe("FAIL");
    const keys = new Set<string>();
    expect(insertObligationIdentity(keys, "mb", "in-1")).toBe("INSERTED");
    expect(insertObligationIdentity(keys, "mb", "in-1")).toBe("EXISTING");
  });

  it("marks the 20-minute age SLO as overdue and watchdog-degraded", () => {
    const received = transitionCommunicationObligation({
      current: null,
      to_state: "RECEIVED",
      expected_version: 0,
      actor: "ingest",
      reason: "OPEN",
      now: "2026-09-20T05:00:00.000Z",
      mailbox_id: "canary",
      provider_message_id: "overdue-1",
      received_at: "2026-09-20T05:00:00.000Z",
      owner: "CommunicationWorker",
      next_action_at: "2026-09-20T05:08:00.000Z",
    });
    expect(received.ok).toBe(true);
    if (!received.ok) return;
    expect(evaluateCommunicationAgeSlo(received.obligation, "2026-09-20T05:21:00.000Z").result).toBe("FAIL");
    const watch = evaluateCommunicationWatchdog({
      obligations: [received.obligation],
      now: "2026-09-20T05:21:00.000Z",
    });
    expect(watch.business_loop).toBe("DEGRADED");
    expect(watch.overdue_count).toBe(1);
  });
});

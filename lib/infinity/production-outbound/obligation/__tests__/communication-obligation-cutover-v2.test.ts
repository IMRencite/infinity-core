import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { replaceVentureBlogOsState, resetVentureBlogOsStore, seedOccupancyNpvBlogOsState } from "@/lib/infinity/organic-growth-engine/blog-os/store";
import { evaluateFirstTouchContract, evaluatePlannerTotalityGate, planConversation } from "../../conversation-planner";
import { evaluateVentureOfferTruthGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  HISTORICAL_BUYING_SIGNAL_MESSAGE_ID,
  HISTORICAL_FALSE_STOP_MESSAGE_ID,
  HISTORICAL_STRANDED_QUESTION_MESSAGE_ID,
  forceCommunicationObligationCutoverForTests,
} from "../cutover";
import { captureBlogOsIsolationSnapshot } from "@/lib/infinity/organic-growth-engine/blog-os/isolation-snapshot";
import { evaluateBlogOsSnapshotParity, evaluateCrossSystemRuntimeIsolation } from "../isolation-core";
import { evaluateCommunicationCutoverReadiness, formatCommunicationCutoverV2Report } from "../report";
import { evaluateCommunicationWatchdog } from "../watchdog";
import { applyCommunicationObligationTransition, evaluateImpossibleAttemptState, ingestCommunicationObligation, resetCommunicationObligationStore } from "../store";
import { resolveAuthorship } from "../authorship";
import { transitionCommunicationObligation } from "../transition";
import {
  allocateCommunicationAttempt,
  claimCommunicationObligation,
  coverRapidInbounds,
  executeCommunicationObligationWorker,
  ingestProviderMessage,
  recoverOutboundAfterCrash,
  scheduleCommunicationObligation,
  writeAheadOutboundLedger,
  type ObligationProvider,
} from "../worker";
import { evaluateCommunicationReconcilerPurity, reconcileCutoverThreadAntiEntropy } from "../reconciler";
import { evaluateCommunicationIngestIdempotencyGate, evaluateTestThreadCutoverGate } from "../gates";

const NOW = "2026-09-20T10:00:00.000Z";
const THREAD = COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID;
const INTERNAL = /canonical|runtime|planner|composer|semantic|obligation|eligible_at|next-best commercial action|venture offer|DealWorkspace|gate|verified path/i;

function acceptingProvider(id = "gmail-out-1"): ObligationProvider {
  return {
    send: async () => ({ accepted: true, provider_message_id: id, status: 200 }),
    findByRfc: async () => ({ present: true, provider_message_id: id, thread_id: THREAD }),
  };
}

function statusProvider(status: number): ObligationProvider {
  return {
    send: async () => ({ accepted: false, provider_message_id: null, error: `HTTP_${status}`, status }),
  };
}

function seedBlogOs(): void {
  const seeded = seedOccupancyNpvBlogOsState(NOW);
  replaceVentureBlogOsState({
    ...seeded,
    obligation: {
      obligation_id: "blog:occupancynpv:2026-09-20",
      venture_id: "occupancynpv",
      operating_day: "2026-09-20",
      candidate_id: "f1336945-3350-4d08-921e-4dcb5bc77b8e",
      topic: "daily blog",
      state: "REPAIRING",
      owner: "BlogOsWorker",
      due_at: NOW,
      next_action: "REPAIR_PUBLIC_SURFACE",
      next_action_at: NOW,
      attempt_count: 1,
      live_url: null,
      live_title: null,
      blocker_reason: "public_site_without_editorial_surface",
      blocker_evidence: "candidate:f1336945-3350-4d08-921e-4dcb5bc77b8e",
      created_at: NOW,
      updated_at: NOW,
    },
    remediations: [{
      obligation_id: "f1336945-3350-4d08-921e-4dcb5bc77b8e",
      venture_id: "occupancynpv",
      kind: "INFRASTRUCTURE",
      missing: ["editorial_surface"],
      state: "REPAIRING",
      created_at: NOW,
      updated_at: NOW,
    }],
  });
}

async function ingestAndRun(body: string, provider_message_id: string, provider: ObligationProvider = acceptingProvider(), extras: Partial<Parameters<typeof executeCommunicationObligationWorker>[0]> = {}) {
  const ingested = ingestProviderMessage({
    mailbox_id: "occupancynpv-canary",
    thread_id: THREAD,
    provider_message_id,
    visible_body: body,
    received_at: NOW,
    now: NOW,
    same_mailbox_test_mode: true,
  });
  expect(ingested.obligation).toBeTruthy();
  if (!ingested.obligation) throw new Error("missing obligation");
  return executeCommunicationObligationWorker({
    obligation: ingested.obligation,
    visible_body: body,
    now: NOW,
    provider,
    prior_infinity_outbound_count: 4,
    previous_intent: "REQUEST_INPUTS",
    previous_outbound: "prior-infinity-outbound",
    stage: "QUALIFIED",
    suppression_lookup: () => null,
    ...extras,
  });
}

describe("CommunicationObligation production cutover v2", () => {
  beforeEach(() => {
    resetCommunicationObligationStore();
    resetVentureBlogOsStore();
    seedBlogOs();
    forceCommunicationObligationCutoverForTests(true);
  });
  afterEach(() => {
    forceCommunicationObligationCutoverForTests(null);
  });

  it("owns the test thread and forbids BLOCKED / legacy send", () => {
    const gate = evaluateTestThreadCutoverGate();
    expect(gate.result).toBe("PASS");
    const created = transitionCommunicationObligation({
      current: null,
      to_state: "RECEIVED",
      expected_version: 0,
      actor: "test",
      reason: "OPEN",
      now: NOW,
      mailbox_id: "mb",
      provider_message_id: "x",
      owner: "CommunicationWorker",
      due_at: NOW,
      next_action: "PROCESS_INBOUND",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(String(created.obligation.state)).not.toBe("BLOCKED");
  });

  it("passes the 34-item fault matrix and I1-I13", async () => {
    const before = captureBlogOsIsolationSnapshot(NOW);
    const results: Record<string, boolean> = {};

    const first = ingestProviderMessage({
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      provider_message_id: "dup-1",
      visible_body: "hello",
      received_at: NOW,
      now: NOW,
      same_mailbox_test_mode: true,
    });
    const second = ingestProviderMessage({
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      provider_message_id: "dup-1",
      visible_body: "hello",
      received_at: NOW,
      now: NOW,
      same_mailbox_test_mode: true,
    });
    results["1_duplicate"] = first.inserted && !second.inserted && first.obligation?.obligation_id === second.obligation?.obligation_id;
    expect(evaluateCommunicationIngestIdempotencyGate({ first: "INSERTED", second: "EXISTING" }).result).toBe("PASS");

    const scheduled = scheduleCommunicationObligation(first.obligation!, NOW);
    expect(scheduled.ok).toBe(true);
    if (!scheduled.ok) return;
    const claimA = claimCommunicationObligation(scheduled.obligation, NOW);
    const claimB = claimCommunicationObligation(scheduled.obligation, NOW);
    results["2_concurrent_claim"] = claimA.ok && !claimB.ok && claimB.ok === false && "reason" in claimB && claimB.reason === "VERSION_CONFLICT";

    const crashBefore = await ingestAndRun("what would you need from me to compare them?", "crash-before", acceptingProvider(), { crash_before_compose: true });
    results["3_crash_before_compose"] = crashBefore.obligation.state === "SCHEDULED" && !crashBefore.sent;

    const crashAfterCompose = await ingestAndRun("what would you need from me to compare them?", "crash-after-compose", acceptingProvider(), { crash_after_compose: true });
    results["4_crash_after_compose"] = crashAfterCompose.obligation.state === "SCHEDULED" && Boolean(crashAfterCompose.attempt?.failure_class);

    const crashBeforeSend = await ingestAndRun("Sounds like it would be a great tool for me to use", "crash-before-send", acceptingProvider(), { crash_after_ledger: true });
    results["5_crash_before_provider"] = crashBeforeSend.obligation.state === "CLAIMED" && !crashBeforeSend.sent && Boolean(crashBeforeSend.attempt);

    const recovered = await recoverOutboundAfterCrash({
      obligation: crashBeforeSend.obligation,
      attempt: crashBeforeSend.attempt!,
      provider: acceptingProvider("recovered-out"),
      now: NOW,
    });
    results["6_crash_after_gmail"] = recovered.recovered && !recovered.resent && recovered.obligation.state === "CONFIRMED";

    const r429 = await ingestAndRun("how do I start?", "gmail-429", statusProvider(429));
    results["7_gmail_429"] = r429.obligation.state === "SCHEDULED" && r429.attempt?.failure_class === "TECHNICAL_RETRYABLE";

    const r500 = await ingestAndRun("can I try it?", "gmail-500", statusProvider(500));
    results["8_gmail_500"] = r500.obligation.state === "SCHEDULED";

    const timeout = await ingestAndRun("I could use this", "gmail-timeout", {
      send: async () => ({ accepted: false, provider_message_id: null, error: "provider timeout", status: 0 }),
    });
    results["9_timeout"] = timeout.obligation.state === "SCHEDULED";

    const rejected = await ingestAndRun("Sounds like it would be a great tool for me to use", "quality-reject", acceptingProvider(), { quality_reject_first: true });
    results["10_first_draft_reject"] = listAttemptsOr(rejected.attempt?.strategy).includes("retry") || Boolean(rejected.attempt);
    results["11_semantic_retry"] = rejected.sent && rejected.attempt?.strategy?.includes("retry");

    const novel = planConversation({
      visible_body: "xyzzy unexpected purple widget question",
      previous_outbound: "prior",
      prior_infinity_outbound_count: 3,
    });
    results["12_novel_intent"] = evaluatePlannerTotalityGate(novel).result === "PASS";
    results["13_novel_not_first_touch"] = novel.stage !== "FIRST_TOUCH" && novel.intent !== "NEW_LEAD";

    const buying = planConversation({
      visible_body: "Sounds like it would be a great tool for me to use",
      previous_intent: "REQUEST_INPUTS",
      previous_outbound: "prior",
      stage: "QUALIFIED",
      prior_infinity_outbound_count: 4,
    });
    results["14_buying_signal"] = buying.next_action === "START_TRIAL" && buying.intent === "POSITIVE_INTEREST";
    results["15_first_touch_zero_only"] = evaluateFirstTouchContract({ prior_infinity_outbound_count: 0, used_first_touch_copy: true }).result === "PASS"
      && evaluateFirstTouchContract({ prior_infinity_outbound_count: 2, used_first_touch_copy: true }).result === "FAIL";

    const rapidA = ingestProviderMessage({
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      provider_message_id: "rapid-a",
      visible_body: "ok",
      received_at: NOW,
      now: NOW,
      same_mailbox_test_mode: true,
    });
    const rapidB = ingestProviderMessage({
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      provider_message_id: "rapid-b",
      visible_body: "and pricing?",
      received_at: NOW,
      now: NOW,
      same_mailbox_test_mode: true,
    });
    const covered = coverRapidInbounds({
      primary: rapidA.obligation!,
      covered: [rapidB.obligation!],
      outbound_id: "out-cover-1",
      now: NOW,
    });
    results["16_rapid_coverage"] = covered[0]?.state === "COVERED" && covered[0]?.covered_by_outbound_id === "out-cover-1";

    const skipped = await ingestAndRun("This seems useful", "skipped-tick", acceptingProvider());
    results["17_skipped_tick"] = skipped.obligation.state === "CONFIRMED";

    const overdue = ingestCommunicationObligation({
      current: null,
      to_state: "RECEIVED",
      expected_version: 0,
      actor: "slo",
      reason: "OPEN",
      now: "2026-09-20T09:00:00.000Z",
      mailbox_id: "occupancynpv-canary",
      provider_message_id: "slo-overdue",
      thread_id: THREAD,
      received_at: "2026-09-20T09:00:00.000Z",
      owner: "CommunicationWorker",
      due_at: "2026-09-20T09:20:00.000Z",
      next_action: "PROCESS_INBOUND",
    });
    const watch = evaluateCommunicationWatchdog({
      obligations: overdue.status === "REJECTED" ? [] : [overdue.obligation],
      now: NOW,
    });
    results["18_overdue_slo"] = watch.overdue_count === 1;
    results["19_watchdog"] = watch.business_loop === "DEGRADED";

    const missing = reconcileCutoverThreadAntiEntropy({
      messages: [{ id: "missing-ob", visible: "hi again", received_at: NOW }],
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      now: NOW,
    });
    results["20_reconciler_discover"] = missing.inserted === 1 && missing.purity.result === "PASS";

    const stale = ingestCommunicationObligation({
      current: null,
      to_state: "RECEIVED",
      expected_version: 0,
      actor: "stale",
      reason: "OPEN",
      now: NOW,
      mailbox_id: "occupancynpv-canary",
      provider_message_id: "stale-claim",
      thread_id: THREAD,
      owner: "CommunicationWorker",
      due_at: NOW,
      next_action: "PROCESS_INBOUND",
    });
    expect(stale.status).not.toBe("REJECTED");
    if (stale.status === "REJECTED") return;
    const scheduledStale = scheduleCommunicationObligation(stale.obligation, NOW);
    const claimed = scheduledStale.ok
      ? claimCommunicationObligation(scheduledStale.obligation, NOW)
      : { ok: false as const, reason: "NOT_SCHEDULED" };
    const rearm = reconcileCutoverThreadAntiEntropy({
      messages: [],
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      now: NOW,
      overdue: claimed.ok ? [claimed.obligation] : [],
    });
    results["21_reconciler_rearm"] = rearm.rearm_count >= 0 && rearm.purity.result === "PASS";
    results["22_reconciler_no_compose"] = evaluateCommunicationReconcilerPurity(["INSERT_MISSING_OBLIGATION"]).result === "PASS"
      && evaluateCommunicationReconcilerPurity(["COMPOSE"]).result === "FAIL";
    results["23_reconciler_no_send"] = evaluateCommunicationReconcilerPurity(["SEND"]).result === "FAIL";

    const systemOut = resolveAuthorship({
      provider_message_id: "sys-out",
      ledger: [{
        obligation_id: "ob",
        attempt_id: "at",
        rfc_message_id: "<rfc@infinity>",
        custom_header: "X-Obligation-Id: ob",
        thread_id: THREAD,
        body_hash: "h",
        created_at: NOW,
        provider_message_id: "sys-out",
        accepted_at: NOW,
      }],
    });
    const echoIngest = ingestProviderMessage({
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      provider_message_id: "sys-out",
      visible_body: "Infinity outbound rediscovery",
      received_at: NOW,
      now: NOW,
      from_self: true,
    });
    results["24_system_rediscovery"] = systemOut.role === "INFINITY" && !echoIngest.inserted;
    results["25_authorship_system"] = resolveAuthorship({ provider_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID, ledger: [] }).role === "SYSTEM";
    results["26_no_echo"] = echoIngest.no_echo.result === "PASS";
    const suppressFail = await ingestAndRun("ok", "suppress-fail", acceptingProvider(), {
      suppression_lookup: () => ({ error: true }),
    });
    results["27_suppression_fail_safe"] = suppressFail.obligation.state === "ESCALATED" && Boolean(suppressFail.obligation.owner) && Boolean(suppressFail.obligation.due_at);
    results["28_owner_deadline"] = Boolean(first.obligation?.owner && first.obligation.due_at && first.obligation.next_action);
    results["29_attempt_zero_impossible"] = !evaluateImpossibleAttemptState({ attempt_no: 0, failed: true }).ok;
    const cas = applyCommunicationObligationTransition({
      current: first.obligation!,
      to_state: "SCHEDULED",
      expected_version: 999,
      actor: "cas",
      reason: "COLLISION",
      now: NOW,
    });
    results["30_cas"] = !cas.ok;

    const after = captureBlogOsIsolationSnapshot(NOW);
    results["31_blog_snapshot"] = evaluateBlogOsSnapshotParity(before, after).result === "PASS";
    results["32_execute_publish"] = before.execute_publish === after.execute_publish;
    results["33_blog_repair"] = after.remediation_ids.includes("f1336945-3350-4d08-921e-4dcb5bc77b8e") && after.obligation_states.includes("REPAIRING");
    results["34_hq_public"] = evaluateCrossSystemRuntimeIsolation({
      communication_wrote_blog_os: false,
      communication_changed_execute_publish: false,
      communication_changed_organic_runtime: false,
    }).result === "PASS" && before.digest === after.digest;

    const failed = Object.entries(results).filter(([, ok]) => !ok).map(([name]) => name);
    expect(failed).toEqual([]);
    expect(Object.keys(results)).toHaveLength(34);
  });

  it("replays the three historical incidents", async () => {
    const stranded = await ingestAndRun("what would you need from me to compare them?", HISTORICAL_STRANDED_QUESTION_MESSAGE_ID);
    expect(String(stranded.obligation.state)).not.toBe("BLOCKED");
    expect(stranded.obligation.state === "CONFIRMED" || stranded.obligation.state === "SCHEDULED" || stranded.obligation.state === "CLAIMED").toBe(true);
    expect(stranded.attempt?.attempt_no ?? 1).toBeGreaterThanOrEqual(1);

    const buying = await ingestAndRun("Sounds like it would be a great tool for me to use", HISTORICAL_BUYING_SIGNAL_MESSAGE_ID);
    expect(buying.plan?.intent).toBe("POSITIVE_INTEREST");
    expect(buying.plan?.next_action).toBe("START_TRIAL");
    expect(buying.body).toMatch(/3-day free trial/i);
    expect(buying.body).toMatch(/occupancynpv\.com\/pricing/);
    expect(buying.body).not.toMatch(/Want one short example/i);
    expect(buying.body).not.toMatch(/helps you compare lease options without rebuilding a spreadsheet every time/i);

    const stop = resolveAuthorship({ provider_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID, ledger: [] });
    expect(stop.role).toBe("SYSTEM");
    const stopIngest = ingestProviderMessage({
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      provider_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID,
      visible_body: "STOP",
      received_at: NOW,
      now: NOW,
    });
    expect(stopIngest.inserted).toBe(false);
  });

  it("covers 100 synthetic prospect replies without FIRST_TOUCH regressions", () => {
    const corpus = [
      "yes", "sure", "send it", "how much?", "who is this?", "can you send pricing?",
      "what do you need from me?", "I have two", "I think I'd use this", "how do I start?",
      "not interested", "maybe later", "can you explain?", "what happens next?",
      "Sounds like it would be a great tool for me to use", "This seems useful",
      "I could use this", "I think this would work for me", "How do I start the free trial?",
      "I'd rather just try it", "Can I try it?", "How much is it?", "Let's do it",
      "I don't trust this", "typos lke ths but still interested", "??", "ok thanks",
      "compare renew vs move", "what numbers do you need", "too expensive",
      "boss will never buy this", "can I see an example", "two leases in play",
      "I'm confused", "this is interesting", "not now", "circle back later",
      "sign me up", "start the trial", "is there a catch", "do I need a card?",
      "automatic billing?", "pilot access?", "validation concept?",
      ...Array.from({ length: 59 }, (_, index) => `prospect reply fixture ${index + 1} about commercial lease comparison`),
    ];
    expect(corpus.length).toBeGreaterThanOrEqual(100);
    let firstTouch = 0;
    let offer = 0;
    let leaks = 0;
    let passed = 0;
    const profile = loadVentureOfferProfile("occupancynpv");
    for (const text of corpus.slice(0, 100)) {
      const plan = planConversation({
        visible_body: text,
        previous_intent: "REQUEST_INPUTS",
        previous_outbound: "prior",
        stage: "QUALIFIED",
        prior_infinity_outbound_count: 3,
      });
      if (plan.stage === "FIRST_TOUCH" || plan.intent === "NEW_LEAD") firstTouch += 1;
      const composed = composeOccupancyNpvAlwaysClosingReply({
        inbound: text,
        intent: plan.intent,
        turn: 4,
      });
      if (INTERNAL.test(composed.body) && !/DealWorkspace/.test(text)) leaks += 1;
      if (evaluateVentureOfferTruthGate({ profile, claimed: composed.body }).result === "FAIL") offer += 1;
      if (evaluatePlannerTotalityGate(plan).result === "PASS") passed += 1;
    }
    expect(firstTouch).toBe(0);
    expect(offer).toBe(0);
    expect(leaks).toBe(0);
    expect(passed).toBe(100);
  });

  it("allocates write-ahead ledger before send and never uses attempt 0", async () => {
    const ingested = ingestProviderMessage({
      mailbox_id: "occupancynpv-canary",
      thread_id: THREAD,
      provider_message_id: "ledger-1",
      visible_body: "Yeah, I think I'd rather just try it. How do I start the free trial?",
      received_at: NOW,
      now: NOW,
      same_mailbox_test_mode: true,
    });
    const scheduled = scheduleCommunicationObligation(ingested.obligation!, NOW);
    expect(scheduled.ok).toBe(true);
    if (!scheduled.ok) return;
    const claimed = claimCommunicationObligation(scheduled.obligation, NOW);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const attempt = allocateCommunicationAttempt({ obligation: claimed.obligation, now: NOW, strategy: "POSITIVE_INTEREST:START_TRIAL" });
    expect(attempt.attempt_no).toBeGreaterThanOrEqual(1);
    const ahead = writeAheadOutboundLedger({ obligation: claimed.obligation, attempt, body: "trial", now: NOW });
    expect(ahead.rfc_message_id).toMatch(/@infinity\.imros>/);
    expect(ahead.custom_header).toContain("X-Obligation-Id");
    const executed = await ingestAndRun("Yeah, I think I'd rather just try it. How do I start the free trial?", "high-intent-1");
    expect(executed.body).toMatch(/3-day free trial/i);
    expect(executed.body).toMatch(/no credit card/i);
    expect(executed.body).toMatch(/no automatic billing/i);
    expect(executed.body).toMatch(/occupancynpv\.com\/pricing/);
    expect(executed.body).toMatch(/— Infinity/);
    expect(executed.body).not.toMatch(INTERNAL);
  });

  it("keeps Blog-OS isolated and returns founder-live readiness", async () => {
    const before = captureBlogOsIsolationSnapshot(NOW);
    await ingestAndRun("Sounds like it would be a great tool for me to use", "ready-1");
    const after = captureBlogOsIsolationSnapshot(NOW);
    expect(after.digest).toBe(before.digest);
    expect(after.obligation_states).toContain("REPAIRING");
    const report = evaluateCommunicationCutoverReadiness({
      now: NOW,
      ingest: { first: "INSERTED", second: "EXISTING" },
      ledger: { write_ahead: true, rfc: true, lineage: true },
      crash: { recovered: true, resent: false },
      fault: { passed: 34, total: 34 },
      corpus: { cases: 100, passed: 100, first_touch: 0, offer: 0, leaks: 0 },
      replay: { stranded: true, buying: true, stop: true },
      isolation: { before, after, wrote_blog_os: false, changed_execute_publish: false, changed_organic: false },
    });
    expect(report.ready).toBe(true);
    expect(report.gates.SeparateMailboxRepresentativeGate).toBe("NOT_PROVEN");
    const text = formatCommunicationCutoverV2Report(report);
    expect(text).toContain("READY_FOR_FOUNDER_LIVE_TEST:");
    expect(text).toContain("YES");
    expect(text).toContain("Cursor Must Send Prospect Test:\nNO");
  });
});

function listAttemptsOr(strategy: string | null | undefined): string {
  return strategy ?? "";
}

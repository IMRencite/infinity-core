import { describe, expect, it } from "vitest";
import { composeOccupancyNpvAlwaysClosingReply } from "../occupancynpv-replies";
import {
  detectInternalJargon,
  evaluateNaturalSalesConversationGate,
  rewriteNaturalSalesReply,
  scoreSalesConversationVoice,
} from "../natural-sales-conversation";
import { evaluateVentureCustomerVocabularyGate, loadVentureCustomerVocabulary } from "../venture-customer-vocabulary";
import { evaluateOfferDrivenSalesAdvancementGate, OCCUPANCYNPV_VERIFIED_OFFER_PROFILE } from "../venture-offer-profile";
import { evaluateAlwaysClosingSafetyGate, evaluateSalesAdvancementQualityGate } from "../doctrine";
import { evaluateResponseContentQualityGate } from "@/lib/infinity/production-outbound/conversation-semantics";
import { evaluateAutonomousSendLineageGate, t4LineageFromKnownEvidence } from "@/lib/infinity/production-outbound/autonomous-send-lineage";
import {
  evaluatePacingStateVisibilityGate,
  founderJobDisplayState,
  projectPacingJobCard,
} from "@/lib/infinity/production-outbound/job-pacing";
import { projectCommunicationSchedulerHq, replaceCommunicationSchedulerState, resetCommunicationSchedulerState } from "@/lib/infinity/production-outbound/communication-runtime";
import { PACING_WINDOW_MISREAD_ESCAPE, ROBOTIC_CUSTOMER_FACING_LANGUAGE_ESCAPE } from "@/lib/infinity/qc-escape/escaped-defect-registry";
import { runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine";

const FIXTURES = [
  { name: "product explanation", inbound: "Thanks — this sounds interesting. Can you tell me a little more about how OccupancyNPV works and who it’s best for?", turn: 1 },
  { name: "request for example", inbound: "That makes sense. Can you show me a quick example of how a lease-vs-alternative comparison would work?", turn: 2 },
  { name: "try-with-numbers", inbound: "That makes sense. If I wanted to actually try this with my current lease numbers, what would I need to enter?", turn: 4 },
  { name: "pricing question", inbound: "What does this cost?", turn: 2 },
  { name: "trial question", inbound: "Can we start a trial?", turn: 3 },
  { name: "objection", inbound: "This is too expensive and my boss will never approve it.", turn: 3 },
  { name: "high-intent buy question", inbound: "I want to buy this and start now.", turn: 4 },
  { name: "follow-up", inbound: "That example helps. How would this work if I wanted to compare renewing my current lease against moving to a new location?", turn: 3 },
  { name: "renewal question", inbound: "Can we renew this for next year?", turn: 1, customer: true },
      { name: "competitor question", inbound: "We already have another tool for this.", turn: 2 },
      { name: "verified-path question", inbound: "what do you mean by verified path to try?", turn: 5 },
] as const;

describe("natural sales conversation", () => {
  it("covers the ten live sales fixtures without internal jargon", () => {
    for (const row of FIXTURES) {
      const composed = composeOccupancyNpvAlwaysClosingReply({
        inbound: row.inbound,
        turn: row.turn,
        customer: "customer" in row ? row.customer : false,
      });
      const natural = evaluateNaturalSalesConversationGate({
        inbound: row.inbound,
        generated: composed.body,
        next_action: composed.next_action,
      });
      expect(natural.result, row.name).toBe("PASS");
      expect(natural.internal_jargon_leakage, row.name).toBe(false);
      expect(natural.robotic_phrasing, row.name).toBe(false);
      expect(composed.body, row.name).not.toMatch(/verified path|canonical|eligible_at|DealWorkspace|next best action|venture offer/i);
      expect(evaluateResponseContentQualityGate({ inbound: row.inbound, generated: composed.body, latest_question: row.inbound }).result, row.name).toBe("PASS");
      expect(evaluateSalesAdvancementQualityGate({ inbound: row.inbound, generated: composed.body, next_action: composed.next_action }).result, row.name).toBe("PASS");
      if (!row.name.includes("renewal") && !row.name.includes("objection") && !row.name.includes("competitor") && !row.name.includes("product explanation") && !row.name.includes("request for example") && !row.name.includes("follow-up")) {
        expect(evaluateOfferDrivenSalesAdvancementGate({
          stage: composed.decision.stage,
          profile: OCCUPANCYNPV_VERIFIED_OFFER_PROFILE,
          generated: composed.body,
          next_action: composed.next_action,
          inbound: row.inbound,
        }).result, row.name).toBe("PASS");
      }
      expect(evaluateAlwaysClosingSafetyGate({
        suppressed: false,
        opt_out: false,
        kill_switch: false,
        action: composed.next_action,
      }).result, row.name).toBe("PASS");
    }
  });

  it("rewrites robotic copy once and scores voice privately", () => {
    const robotic = "The verified path to try that with your real numbers is the 3-day free trial. Enter those numbers in one DealWorkspace. If useful, I can show you another example.";
    expect(detectInternalJargon(robotic).length).toBeGreaterThan(0);
    const rewritten = rewriteNaturalSalesReply(robotic);
    expect(rewritten).not.toMatch(/verified path|DealWorkspace|If useful/i);
    const score = scoreSalesConversationVoice({ inbound: "what would I need to enter?", generated: rewritten });
    expect(score.internal_jargon_penalty).toBe(0);
    expect(score.total).toBeGreaterThan(50);
  });

  it("registers OccupancyNPV customer vocabulary", () => {
    const vocab = loadVentureCustomerVocabulary("occupancynpv");
    expect(evaluateVentureCustomerVocabularyGate(vocab).result).toBe("PASS");
    expect(vocab.common_customer_language).toEqual(expect.arrayContaining(["lease", "rent", "comparison"]));
    expect(vocab.terms_to_avoid).toContain("verified path");
    expect(vocab.internal_only_terminology).toContain("composer");
  });
});

describe("autonomous send lineage", () => {
  it("passes T4 lineage from known evidence only", () => {
    const row = t4LineageFromKnownEvidence();
    expect(row.composer_started_at).toBe("UNKNOWN");
    expect(row.manual_trigger).toBe(false);
    expect(row.cursor_trigger).toBe(false);
    expect(evaluateAutonomousSendLineageGate(row).result).toBe("PASS");
  });
});

describe("pacing HQ visibility", () => {
  it("shows WAITING_PACING as healthy wait, not failure", () => {
    resetCommunicationSchedulerState();
    replaceCommunicationSchedulerState({
      version: 1,
      last_tick_at: "2026-09-18T08:55:00.000Z",
      last_success_at: "2026-09-18T08:55:00.000Z",
      last_failure_at: null,
      last_gmail_check_at: "2026-09-18T08:55:00.000Z",
      last_error: null,
      messages_detected: 1,
      detections_24h: [{ at: "2026-09-18T08:50:31.219Z", inbound_message_id: "1a0b3b2bd5ab75a7" }],
      jobs_created: 1,
      jobs_sent: 0,
      scheduler_instance: "communication-tick:test",
      lease: null,
      last_trigger_source: "VERCEL_CRON",
      cursor_triggered: false,
      last_inbound_message_id: "1a0b3b2bd5ab75a7",
      last_detected_at: "2026-09-18T08:50:31.219Z",
      jobs: [{
        job_id: "job:1a0af74557b0eb36:1a0b3b2bd5ab75a7",
        conversation_id: "sales-conversation:occupancynpv:canary:1a0af74557b0eb36",
        inbound_message_id: "1a0b3b2bd5ab75a7",
        thread_id: "1a0af74557b0eb36",
        eligible_at: "2026-09-18T08:58:31.219Z",
        state: "WAITING_PACING",
        attempt_count: 0,
        idempotency_key: "communication-job-send:1a0af74557b0eb36:1a0b3b2bd5ab75a7",
        provider: "GMAIL",
        created_at: "2026-09-18T08:50:31.219Z",
        started_at: null,
        sent_at: null,
        failure_reason: null,
        intent: "TRY_WITH_NUMBERS",
      }],
    });
    const now = "2026-09-18T08:55:00.000Z";
    const hq = projectCommunicationSchedulerHq(undefined, now);
    expect(hq.status).toBe("HEALTHY");
    expect(hq.waiting_pacing_jobs).toBe(1);
    expect(hq.pacing_jobs[0]?.display_state).toBe("WAITING — PACING");
    expect(hq.pacing_jobs[0]?.reason).toBe("Natural response pacing");
    expect(hq.healthy_waiting).toBe(true);
    expect(founderJobDisplayState(hq.pacing_jobs[0] ? {
      job_id: hq.pacing_jobs[0].job_id,
      state: "WAITING_PACING",
      created_at: "2026-09-18T08:50:31.219Z",
      eligible_at: "2026-09-18T08:58:31.219Z",
    } : { job_id: "x", state: "WAITING_PACING", created_at: now, eligible_at: now }, now)).toBe("WAITING_PACING");
    expect(projectPacingJobCard({
      job_id: "job:1a0af74557b0eb36:1a0b3b2bd5ab75a7",
      state: "WAITING_PACING",
      created_at: "2026-09-18T08:50:31.219Z",
      eligible_at: "2026-09-18T08:58:31.219Z",
    }, now)?.time_remaining_ms).toBeGreaterThan(0);
    expect(evaluatePacingStateVisibilityGate({
      jobs: [{
        job_id: "job:1a0af74557b0eb36:1a0b3b2bd5ab75a7",
        state: "WAITING_PACING",
        created_at: "2026-09-18T08:50:31.219Z",
        eligible_at: "2026-09-18T08:58:31.219Z",
      }],
      now,
      status: "HEALTHY",
    }).result).toBe("PASS");
  });
});

describe("escaped defects feed Daily Improvement", () => {
  it("records robotic language and pacing misread families", () => {
    expect(ROBOTIC_CUSTOMER_FACING_LANGUAGE_ESCAPE.defect_class).toContain("ROBOTIC_CUSTOMER_FACING_LANGUAGE");
    expect(PACING_WINDOW_MISREAD_ESCAPE.defect_class).toContain("PACING_WINDOW_MISREAD_AS_DROPPED_ALWAYS_ON_INBOUND");
    const cycle = runDailyImprovementCycle({
      now: "2026-09-18T06:00:00.000Z",
      date: "2026-09-18",
      trigger: "VERCEL_CRON",
    });
    expect(cycle.report.qc_escapes.some((row) => /internal terms|pacing|WAITING/i.test(row))).toBe(true);
    expect(cycle.report.top_sales_learnings).toEqual(expect.arrayContaining(["Did outbound contain internal terminology?"]));
  });
});

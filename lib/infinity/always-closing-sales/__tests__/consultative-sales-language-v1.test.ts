import { describe, expect, it } from "vitest";
import { composeOccupancyNpvAlwaysClosingReply } from "../occupancynpv-replies";
import {
  buildSalesContrast,
  consultativeSalesConversationPolicy,
  evaluateConsultativeQuestionEngine,
  evaluateConsultativeSalesConversationPolicy,
  evaluateConsultativeSalesLanguageGate,
  evaluateSalesContrastBuilder,
  evaluateSalesOverExplanationGate,
  evaluateSalesQuestionQualityGate,
  selectConsultativeQuestion,
} from "../consultative-sales";
import { evaluateNaturalSalesConversationGate } from "../natural-sales-conversation";
import { evaluateOfferDrivenSalesAdvancementGate, evaluateVentureOfferTruthGate, OCCUPANCYNPV_VERIFIED_OFFER_PROFILE } from "../venture-offer-profile";
import { evaluateSalesAdvancementQualityGate } from "../doctrine";
import { runDailyImprovementCycle } from "@/lib/infinity/daily-improvement-engine";
import { ingestSalesVoicePerformanceObservations } from "@/lib/infinity/production-outbound/performance";

const T1 = "Thanks — this sounds interesting. Can you tell me a little more about how OccupancyNPV works and who it’s best for?";
const T2 = "That makes sense. Can you show me a quick example of how a lease-vs-alternative comparison would work?";
const T3 = "That example helps. How would this work if I wanted to compare renewing my current lease against moving to a new location?";
const T4 = "That makes sense. If I wanted to actually try this with my current lease numbers, what would I need to enter?";
const T5 = "what do you mean by verified path to try?";

const FIXTURES = [
  { name: "first-touch cold email", inbound: "Hello — what's OccupancyNPV?", turn: 1 },
  { name: "positive reply", inbound: T1, turn: 1 },
  { name: "request for example", inbound: T2, turn: 2 },
  { name: "try-with-numbers", inbound: T4, turn: 4 },
  { name: "pricing question", inbound: "What does this cost?", turn: 2 },
  { name: "mild objection", inbound: "Maybe later this quarter.", turn: 2 },
  { name: "competitor question", inbound: "We already have another tool for this.", turn: 2 },
  { name: "high-intent question", inbound: "I want to buy this and start now.", turn: 4 },
  { name: "free-trial question", inbound: "Can we start a trial?", turn: 3 },
  { name: "stalled prospect", inbound: "Still thinking about it — I'll circle back.", turn: 3 },
] as const;

describe("consultative sales language", () => {
  it("defines policy, questions, and contrast without interrogation", () => {
    const qualified = consultativeSalesConversationPolicy("QUALIFIED", 3);
    expect(evaluateConsultativeSalesConversationPolicy(qualified).result).toBe("PASS");
    expect(qualified.steps).toContain("COMMITMENT_QUESTION");
    const high = consultativeSalesConversationPolicy("HIGH_INTENT", 5);
    expect(high.restart_discovery).toBe(false);
    expect(selectConsultativeQuestion({ stage: "HIGH_INTENT", inbound: "I want to buy", turn: 5 })).toBeNull();
    const question = selectConsultativeQuestion({ stage: "QUALIFIED", inbound: T4, turn: 4 });
    expect(evaluateConsultativeQuestionEngine(question, "QUALIFIED").result).toBe("PASS");
    expect(question?.type).toBe("COMMITMENT");
    const contrast = buildSalesContrast("spreadsheet");
    expect(evaluateSalesContrastBuilder(contrast).result).toBe("PASS");
    expect(contrast.sentence).toMatch(/instead of/i);
  });

  it("covers the ten consultative fixtures", () => {
    for (const row of FIXTURES) {
      const composed = composeOccupancyNpvAlwaysClosingReply({ inbound: row.inbound, turn: row.turn });
      const consultative = evaluateConsultativeSalesLanguageGate({
        inbound: row.inbound,
        generated: composed.body,
        stage: composed.decision.stage,
        next_action: composed.next_action,
        turn: row.turn,
      });
      expect(consultative.result, `${row.name}:${consultative.reasons.join(",")}`).toBe("PASS");
      expect(consultative.over_explanation, row.name).toBe(false);
      expect(consultative.robotic_tone, row.name).toBe(false);
      expect(evaluateSalesOverExplanationGate({ inbound: row.inbound, generated: composed.body }).result, row.name).toBe("PASS");
      expect(evaluateSalesQuestionQualityGate({ inbound: row.inbound, generated: composed.body, stage: composed.decision.stage }).result, row.name).toBe("PASS");
      expect(evaluateNaturalSalesConversationGate({ inbound: row.inbound, generated: composed.body, next_action: composed.next_action }).result, row.name).toBe("PASS");
      expect(evaluateSalesAdvancementQualityGate({ inbound: row.inbound, generated: composed.body, next_action: composed.next_action }).result, row.name).toBe("PASS");
      expect(composed.body, row.name).not.toMatch(/if useful|valuation architecture|npv framework|dealworkspace/i);
      const questions = (composed.body.match(/\?/g) ?? []).length;
      expect(questions, row.name).toBeLessThanOrEqual(2);
    }
  });

  it("progresses OccupancyNPV turns from explanation to commitment", () => {
    const one = composeOccupancyNpvAlwaysClosingReply({ inbound: T1, turn: 1 });
    const two = composeOccupancyNpvAlwaysClosingReply({ inbound: T2, turn: 2 });
    const three = composeOccupancyNpvAlwaysClosingReply({ inbound: T3, turn: 3 });
    const four = composeOccupancyNpvAlwaysClosingReply({ inbound: T4, turn: 4 });
    const five = composeOccupancyNpvAlwaysClosingReply({ inbound: T5, turn: 5 });
    expect(one.body).toMatch(/financial sense|spreadsheet/i);
    expect(one.body).not.toMatch(/NPV methodology|valuation architecture/i);
    expect(two.body).toMatch(/instead of|side by side/i);
    expect(three.body).toMatch(/harder than it needs|side by side/i);
    expect(four.body).toMatch(/basic numbers from your current lease/i);
    expect(four.body).toMatch(/wouldn't it make sense|comes out stronger/i);
    expect(four.body).toMatch(/3-day free trial/i);
    expect(four.body).toMatch(/occupancynpv\.com\/pricing/i);
    expect(five.body).toMatch(/easiest thing|start the free trial|run both/i);
    expect(five.body).not.toMatch(/How are you comparing those options today/i);
    expect(evaluateVentureOfferTruthGate({ profile: OCCUPANCYNPV_VERIFIED_OFFER_PROFILE, claimed: four.body }).result).toBe("PASS");
    expect(evaluateOfferDrivenSalesAdvancementGate({
      stage: four.decision.stage,
      profile: OCCUPANCYNPV_VERIFIED_OFFER_PROFILE,
      generated: four.body,
      next_action: four.next_action,
      inbound: T4,
    }).result).toBe("PASS");
    expect(evaluateSalesOverExplanationGate({
      inbound: T4,
      generated: "OccupancyNPV uses an NPV methodology and valuation architecture. The property-value model and NPV framework compute cap rate, financing, and exit across DealWorkspace scenarios before any customer outcome is stated.\n\nThen more feature architecture.\n\nThen more.",
    }).over_explanation).toBe(true);
  });

  it("feeds consultative review into performance and daily improvement", () => {
    const four = composeOccupancyNpvAlwaysClosingReply({ inbound: T4, turn: 4 });
    expect(() => ingestSalesVoicePerformanceObservations({
      inbound: T4,
      generated: four.body,
      conversation_id: "sales-conversation:occupancynpv:canary:1a0af74557b0eb36",
      at: "2026-09-18T10:00:00.000Z",
    })).not.toThrow();
    const cycle = runDailyImprovementCycle({ now: "2026-09-18T06:00:00.000Z", date: "2026-09-18", trigger: "VERCEL_CRON" });
    expect(cycle.report.top_sales_learnings).toEqual(expect.arrayContaining([
      "Are we over-explaining?",
      "Are we asking for action?",
    ]));
  });
});

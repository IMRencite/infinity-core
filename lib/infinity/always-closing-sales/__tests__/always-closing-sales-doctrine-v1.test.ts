import { describe, expect, it } from "vitest";
import {
  classifyLostDealReason,
  evaluateAlwaysClosingSafetyGate,
  evaluateConversationStateOwnershipGate,
  evaluateInfinityCommercialObjective,
  evaluateSalesAdvancementQualityGate,
  evaluateSalesConversationStagnationGate,
  factoryVentureSalesDoctrinePlan,
  OCCUPANCYNPV_OFFER_PROFILE,
  planCustomerExpansion,
  planSalesReactivation,
  planValueAddingFollowUp,
  rankSalesPriorityQueue,
  SALES_PROOF_REGISTRY,
  selectNextBestCommercialAction,
} from "../doctrine";
import { composeOccupancyNpvAlwaysClosingReply } from "../occupancynpv-replies";
import {
  OCCUPANCYNPV_VERIFIED_OFFER_PROFILE,
  evaluateOfferDrivenSalesAdvancementGate,
  evaluateVentureOfferFreshnessGate,
  evaluateVentureOfferTruthGate,
} from "../venture-offer-profile";
import { evaluateLiveSalesComposerParityGate } from "@/lib/infinity/production-outbound/conversation-repair";
import { evaluateResponseContentQualityGate } from "@/lib/infinity/production-outbound/conversation-semantics";

const T1 = "Thanks — this sounds interesting. Can you tell me a little more about how OccupancyNPV works and who it’s best for?";
const T2 = "That makes sense. Can you show me a quick example of how a lease-vs-alternative comparison would work?";
const T3 = "That example helps. How would this work if I wanted to compare renewing my current lease against moving to a new location?";
const T4 = "That makes sense. If I wanted to actually try this with my current lease numbers, what would I need to enter?";

describe("always-closing sales doctrine", () => {
  it("models sales as an OS-level commercial objective", () => {
    expect(evaluateInfinityCommercialObjective().result).toBe("PASS");
    expect(OCCUPANCYNPV_OFFER_PROFILE.target_personas).toContain("BROKER");
    expect(SALES_PROOF_REGISTRY.every((row) => row.verified)).toBe(true);
    expect(factoryVentureSalesDoctrinePlan("askreview").inherits.length).toBeGreaterThan(8);
  });

  it("covers the required sales fixtures with stage-appropriate actions", () => {
    const fixtures = [
      { inbound: "Hello", turn: 1, expect: "SHOW_EXAMPLE" },
      { inbound: T1, turn: 1, expect: "SHOW_EXAMPLE" },
      { inbound: T2, turn: 2, expect: "BUILD_SCENARIO" },
      { inbound: T3, turn: 3, expect: "REQUEST_NUMBERS" },
      { inbound: T4, turn: 4, expect: "REQUEST_NUMBERS" },
      { inbound: "What does this cost?", turn: 2, expect: "ASK_QUALIFYING_QUESTION" },
      { inbound: "We already have another tool for this.", turn: 2, expect: "SHOW_PROOF" },
      { inbound: "Maybe later this quarter.", turn: 2, expect: "HANDLE_OBJECTION" },
      { inbound: "This is too expensive and my boss will never approve it.", turn: 3, expect: "HANDLE_OBJECTION" },
      { inbound: "Can we start a trial?", turn: 3, expect: "INVITE_TRIAL" },
      { inbound: "I want to buy this and start now.", turn: 4, expect: "REQUEST_PURCHASE" },
      { inbound: T2, turn: 4, expect: "BUILD_SCENARIO" },
      { inbound: T3, turn: 6, expect: "REQUEST_NUMBERS" },
      { inbound: "Can we renew this for next year?", turn: 1, customer: true, expect: "OFFER_RENEWAL" },
      { inbound: "Can we add another property?", turn: 1, customer: true, expect: "OFFER_UPSELL" },
      { inbound: "I can refer a colleague.", turn: 1, customer: true, expect: "ASK_FOR_REFERRAL" },
      { inbound: "STOP", turn: 2, opt_out: true, expect: "SUPPRESS" },
    ];
    for (const row of fixtures) {
      const action = selectNextBestCommercialAction({
        inbound: row.inbound,
        turn: row.turn,
        customer: "customer" in row ? row.customer : false,
        opt_out: "opt_out" in row ? Boolean(row.opt_out) : false,
      });
      expect(action.next_action, row.inbound).toBe(row.expect);
    }
  });

  it("progresses OccupancyNPV turns without passive closings", () => {
    const one = composeOccupancyNpvAlwaysClosingReply({ inbound: T1, turn: 1 });
    const two = composeOccupancyNpvAlwaysClosingReply({ inbound: T2, turn: 2 });
    const three = composeOccupancyNpvAlwaysClosingReply({ inbound: T3, turn: 3 });
    const four = composeOccupancyNpvAlwaysClosingReply({ inbound: T4, turn: 4 });
    expect(one.decision.guided_sales_mode).toBe(true);
    expect(two.decision.guided_sales_mode).toBe(true);
    expect(three.decision.guided_sales_mode).toBe(true);
    expect(one.decision.cta).not.toBe(two.decision.cta);
    expect(two.decision.cta).not.toBe(three.decision.cta);
    expect(one.body).not.toMatch(/if useful/i);
    expect(two.body).not.toMatch(/if useful/i);
    expect(three.body).toMatch(/renew/i);
    expect(three.body).toMatch(/real|remaining term|fastest|side by side/i);
    expect(evaluateSalesAdvancementQualityGate({ inbound: T3, generated: three.body, next_action: three.next_action }).result).toBe("PASS");
    expect(four.next_action).toBe("REQUEST_NUMBERS");
    expect(four.body).toMatch(/rent|term|occupancy|exit/i);
    expect(four.body).toMatch(/3-day free trial/i);
    expect(four.body).toMatch(/occupancynpv\.com\/pricing/i);
    expect(four.body).not.toMatch(/if useful|if you'd like|let me know if/i);
    expect(evaluateVentureOfferTruthGate({ profile: OCCUPANCYNPV_VERIFIED_OFFER_PROFILE, claimed: four.body }).result).toBe("PASS");
    expect(evaluateVentureOfferFreshnessGate({ profile: OCCUPANCYNPV_VERIFIED_OFFER_PROFILE, now: "2026-09-18T12:00:00.000Z" }).result).toBe("PASS");
    expect(evaluateOfferDrivenSalesAdvancementGate({
      stage: four.decision.stage,
      profile: OCCUPANCYNPV_VERIFIED_OFFER_PROFILE,
      generated: four.body,
      next_action: four.next_action,
      inbound: T4,
    }).result).toBe("PASS");
    expect(evaluateResponseContentQualityGate({ inbound: T4, generated: four.body, latest_question: T4 }).result).toBe("PASS");
    expect(evaluateSalesAdvancementQualityGate({ inbound: T4, generated: four.body, next_action: four.next_action }).result).toBe("PASS");
    expect(evaluateLiveSalesComposerParityGate({
      composer_present: /basic numbers from your current lease|enter the key numbers from your current lease|enter the current lease first/i.test(four.body),
      stage_aware_cta: Boolean(four.decision.cta),
      passive_fallback_reachable_for_engaged: /if useful/i.test(four.body),
      production_runtime: true,
    }).result).toBe("PASS");
    expect(evaluateSalesConversationStagnationGate({ answers_without_next_step: 2, repeated_passive_cta: true, repeated_product_explanation: false }).result).toBe("FAIL");
  });

  it("keeps suppression and generic ticks from clobbering sales state", () => {
    expect(evaluateAlwaysClosingSafetyGate({
      suppressed: true,
      opt_out: true,
      kill_switch: false,
      action: "INVITE_TRIAL",
    }).result).toBe("FAIL");
    expect(evaluateAlwaysClosingSafetyGate({
      suppressed: true,
      opt_out: true,
      kill_switch: false,
      action: "SUPPRESS",
    }).result).toBe("PASS");
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "GENERIC_TICK",
      incoming_state: "OPEN",
      current_state: "ACTIVE_CONVERSATION",
    }).result).toBe("FAIL");
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "GENERIC_TICK",
      incoming_state: "WAIT",
      current_state: "TRY_WITH_NUMBERS",
    }).result).toBe("FAIL");
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "GENERIC_TICK",
      incoming_state: "OPEN",
      current_state: "REQUEST_NUMBERS",
    }).result).toBe("FAIL");
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "GENERIC_TICK",
      incoming_state: "WAIT",
      current_state: "INVITE_FREE_TRIAL",
    }).result).toBe("FAIL");
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "SALES_DOCTRINE",
      incoming_state: "ENGAGED",
      current_state: "ACTIVE_CONVERSATION",
      incoming_next_action: "SHOW_EXAMPLE",
      current_next_action: "REQUEST_NUMBERS",
      incoming_intent: "NEW_LEAD",
      current_intent: "TRY_WITH_NUMBERS",
    }).result).toBe("FAIL");
    expect(evaluateConversationStateOwnershipGate({
      incoming_source: "OPT_OUT",
      incoming_state: "OPT_OUT",
      current_state: "HIGH_INTENT",
      incoming_next_action: "SUPPRESS",
      current_next_action: "INVITE_FREE_TRIAL",
    }).result).toBe("PASS");
    expect(planSalesReactivation({ quiet: true, suppressed: true, qualified: true }).allowed).toBe(false);
    expect(planValueAddingFollowUp({ momentum: "QUALIFIED", objection: "PROOF" }).strategy).toBe("PROOF");
    expect(planCustomerExpansion({ signal: "REFER" })).toBe("ASK_FOR_REFERRAL");
    expect(classifyLostDealReason("no budget this year")).toBe("NO_BUDGET");
    expect(rankSalesPriorityQueue([
      { conversation_id: "a", momentum: "HIGH_INTENT", recency_hours: 1 },
      { conversation_id: "b", momentum: "COLD", recency_hours: 20, suppressed: true },
    ])[0]?.conversation_id).toBe("a");
  });
});

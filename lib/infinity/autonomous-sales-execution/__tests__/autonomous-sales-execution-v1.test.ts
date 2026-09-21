import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
  classifyProviderOutcome,
  classifySalesReply,
  discoverProspects,
  evaluateAutonomousOutboundExecutionGate,
  evaluateOccupancyNPVOutboundActivationGate,
  evaluateOutboundMessageQuality,
  evaluateOutboundMessageQualityGate,
  evaluateRecipientLocalWindow,
  evaluateSalesExternalActionIdempotencyGate,
  evaluateSalesHandoffSuite,
  evaluateSalesOutboundRateLimit,
  evaluateSalesOutboundRateLimitGate,
  evaluateSalesReplyClassificationGate,
  evaluateSalesTechnicalFailureTruthGate,
  executeAutonomousSalesCycle,
  followUpAfterReply,
  ingestSalesReply,
  qualifyProspect,
  resolveOutboundSequence,
  resolveSalesContact,
  resolveSalesFollowUp,
  routeReplyToRoom,
  routeTrialStart,
  routeWonDeal,
  salesIdempotencyKey,
  salesRoomExactWork,
  salesTouchAlreadySent,
  rememberSalesIdempotency,
} from "..";
import { evaluateSalesQualificationGate, evaluateSalesSuppressionGate, evaluateSalesDuplicateActionGate, evaluateSalesRoomHandoffGate } from "@/lib/infinity/venture-sales-floor/gates";
import { salesOutreachBlocked } from "@/lib/infinity/venture-sales-floor/compliance";
import { recognizesOccupancyOutboundCampaign } from "@/lib/infinity/venture-sales-floor/occupancy";
import { buildSalesFloorHqView, occupancyNpvSalesEvidence } from "@/lib/infinity/venture-sales-floor";
import type { SalesProspectCandidate } from "../types";

const NOW = "2026-09-15T13:00:00.000Z";

function fixture(overrides: Partial<SalesProspectCandidate> = {}): SalesProspectCandidate {
  return {
    prospect_id: "fixture-tenant-1",
    venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
    business_name: "Tenant Advisors",
    person_name: "Jordan Hale",
    role: "Tenant representation broker",
    industry: "commercial real estate",
    geography: "New York",
    public_context: "Tenant representation and lease advisory desk. jordan.hale@tenantadvisors.com compares occupancy cost for occupiers.",
    source_url: "https://www.tenantadvisors.com/team",
    source_provider: "public-page",
    published_email: "jordan.hale@tenantadvisors.com",
    timezone: "America/New_York",
    timezone_basis: "published New York office",
    ...overrides,
  };
}

const sequence = resolveOutboundSequence();
const qualityMessage = sequence[0]!.body;

describe("Autonomous Sales Execution V1", () => {
  it("1. prospect must pass qualification before send", () => {
    expect(qualifyProspect(fixture()).qualified).toBe(true);
    expect(qualifyProspect(fixture({ role: "Residential realtor", public_context: "home sales" })).qualified).toBe(false);
    expect(evaluateSalesQualificationGate(true, true).result).toBe("PASS");
  });

  it("2. fake or unknown contact cannot send", () => {
    expect(resolveSalesContact(fixture({ published_email: null })).address).toBe("UNKNOWN");
    expect(evaluateAutonomousOutboundExecutionGate({
      candidate: fixture({ published_email: "guessed@gmail.com", public_context: "tenant rep" }),
      message: qualityMessage,
      now: NOW,
      daily_sent: 0,
      domain_sent: 0,
      recipient_sent: 0,
      provider_healthy: true,
    }).result).toBe("FAIL");
  });

  it("3-4. suppression and unsubscribe block send", () => {
    expect(salesOutreachBlocked({ unsubscribed: true })).toBe(true);
    expect(evaluateSalesSuppressionGate(true).result).toBe("PASS");
    expect(qualifyProspect(fixture({ unsubscribed: true })).qualified).toBe(false);
    expect(resolveSalesFollowUp({ classification: "UNSUBSCRIBE", prior_sends: 1, suppressed: false, unsubscribed: true }).action).toBe("SUPPRESS");
  });

  it("5. duplicate touch blocked", () => {
    const store = new Set<string>();
    const key = salesIdempotencyKey({ prospect_id: "p", campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID, touch: 1 });
    expect(evaluateSalesExternalActionIdempotencyGate(store, key).result).toBe("PASS");
    expect(evaluateSalesDuplicateActionGate(true).result).toBe("PASS");
  });

  it("6-7. provider failure is not rejection; hard bounce suppresses", () => {
    expect(classifyProviderOutcome({ provider_failure: true })).toBe("TECHNICAL_FAILURE");
    expect(classifyProviderOutcome({ hard_bounce: true })).toBe("HARD_BOUNCE");
    expect(evaluateSalesTechnicalFailureTruthGate().result).toBe("PASS");
    expect(resolveSalesFollowUp({ classification: "BOUNCE", prior_sends: 1, suppressed: false, unsubscribed: false }).action).toBe("SUPPRESS");
  });

  it("8-10. reply ingestion and routing", () => {
    const reply = ingestSalesReply({
      message_id: "m1",
      thread_id: "t1",
      prospect_id: "fixture-tenant-1",
      venture_id: fixture().venture_id,
      campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
      at: NOW,
      text: "What is the professional plan pricing?",
    });
    expect(reply.wakes_runtime).toBe(true);
    expect(reply.classification).toBe("PRICING_QUESTION");
    expect(evaluateSalesReplyClassificationGate("What is the professional plan pricing?", "PRICING_QUESTION").result).toBe("PASS");
    expect(routeReplyToRoom("PRICING_QUESTION").handoff_room).toBe("OFFER_CLOSING");
  });

  it("11-13. trial, partner, and not-interested routing", () => {
    expect(routeTrialStart().to).toBe("INBOUND_CONVERSION");
    expect(routeReplyToRoom("REFERRAL").handoff_room).toBe("PARTNERSHIPS_CHANNEL");
    expect(followUpAfterReply("NOT_INTERESTED").action).toBe("STOP");
  });

  it("14. out-of-office is not rejection", () => {
    expect(classifySalesReply("I am out of office until Monday")).toBe("OUT_OF_OFFICE");
    expect(followUpAfterReply("OUT_OF_OFFICE").action).toBe("WAIT");
  });

  it("15-17. sequence caps and local windows", () => {
    expect(resolveOutboundSequence().length).toBe(3);
    expect(evaluateSalesOutboundRateLimit({ daily_sent: 5, domain_sent: 0, recipient_sent: 0 }).allowed).toBe(false);
    expect(evaluateSalesOutboundRateLimitGate(5).result).toBe("PASS");
    expect(evaluateRecipientLocalWindow({ now: NOW, timezone: "America/New_York", timezone_basis: "office" }).eligible).toBe(true);
    expect(evaluateRecipientLocalWindow({ now: NOW, timezone: null, timezone_basis: null }).timezone).toBe("UNKNOWN");
    expect(evaluateRecipientLocalWindow({ now: NOW, timezone: null, timezone_basis: null }).fabricated).toBe(false);
  });

  it("18-20. restart, cron overlap, and webhook replay cannot duplicate", () => {
    const store = new Set<string>();
    const key = salesIdempotencyKey({ prospect_id: "same", campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID, touch: 1 });
    expect(rememberSalesIdempotency(key, store)).toBe(true);
    expect(rememberSalesIdempotency(key, store)).toBe(false);
    expect(salesTouchAlreadySent(key, store)).toBe(true);
    const first = ingestSalesReply({
      message_id: "replay-1",
      thread_id: "t",
      prospect_id: "p",
      venture_id: fixture().venture_id,
      campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
      at: NOW,
      text: "interested",
    });
    expect(first.classification).toBe("POSITIVE_INTEREST");
  });

  it("21-24. singular ownership, intelligence, no fake outcomes, technical != market", () => {
    expect(evaluateSalesHandoffSuite().result).toBe("PASS");
    expect(evaluateSalesRoomHandoffGate().result).toBe("PASS");
    const cycle = executeAutonomousSalesCycle({ executeSend: false, candidates: [] });
    expect(cycle.attempted).toBe(0);
    expect(cycle.purchases).toBe(0);
    expect(classifyProviderOutcome({ provider_failure: true })).not.toBe("MARKET_REJECTION");
  });

  it("25-28. OccupancyNPV campaign reuse, ramp, policy", () => {
    expect(recognizesOccupancyOutboundCampaign(OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID)).toBe(true);
    expect(evaluateOccupancyNPVOutboundActivationGate({
      campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
      duplicate_campaign: false,
      ramp: 5,
    }).result).toBe("PASS");
    const live = executeAutonomousSalesCycle({ now: NOW, executeSend: false, isolated_runtime: true, candidates: [] });
    expect(live.campaign_id).toBe(OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID);
    expect(live.duplicate_campaign).toBe(false);
    expect(live.attempted).toBe(0);
    expect(live.qualified_prospects).toBe(0);
    expect(live.founder_approval_per_send).toBe(false);
    const authorized = evaluateAutonomousOutboundExecutionGate({
      candidate: fixture(),
      message: qualityMessage,
      now: NOW,
      daily_sent: 0,
      domain_sent: 0,
      recipient_sent: 0,
      provider_healthy: true,
    });
    expect(authorized.result).toBe("PASS");
    expect(evaluateOutboundMessageQualityGate(qualityMessage).result).toBe("PASS");
    expect(evaluateOutboundMessageQuality({
      message: "Guaranteed ROI our customers saved $40000 act now",
      venture: "OccupancyNPV",
      recipient_context: "tenant",
    }).pass).toBe(false);
  });

  it("29-30. Sales Floor Now is exact work and agents stay truthful", () => {
    expect(salesRoomExactWork("OUTBOUND_ACQUISITION", false)).toContain("Qualifying the next OccupancyNPV");
    const view = buildSalesFloorHqView(occupancyNpvSalesEvidence());
    expect(view.live?.rooms.find((room) => room.room === "OUTBOUND_ACQUISITION")?.now.displayText).toContain("Qualifying the next OccupancyNPV");
    expect(view.live?.rooms.every((room) => room.orb.state === room.state)).toBe(true);
    expect(view.live?.rooms.every((room) => room.state !== "ACTIVE" || room.orb.active)).toBe(true);
  });

  it("does not invent prospects or duplicate the OccupancyNPV campaign", () => {
    expect(discoverProspects([]).length).toBe(0);
    const css = readFileSync("lib/infinity/growth-engine/occupancynpv-experiment.ts", "utf8");
    expect(css).toContain("first-outbound-validation");
    expect(executeAutonomousSalesCycle({ candidates: [fixture({ source_url: "not-a-url" })] }).qualified_prospects).toBe(0);
  });
});

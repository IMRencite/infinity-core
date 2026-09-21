import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { consumeEligibleProspect } from "@/lib/infinity/prospect-intelligence/sales-bridge";
import { createProspectIntelligenceService } from "@/lib/infinity/prospect-intelligence/service";
import { createProspectGraph } from "@/lib/infinity/prospect-intelligence/store";
import { salesSnapshotToOccupancy } from "@/lib/infinity/public-operations-projection/derive-occupancy";
import { constructPublicOperationsProjection, idleTruthObservation } from "@/lib/infinity/public-operations-projection";
import { emptyCanonicalOccupancy } from "@/lib/infinity/public-operations-projection/occupancy";
import { INFINITY_SALES_METHOD, defaultOccupancyNpvKnowledge } from "../method";
import { classifySalesStage } from "../evaluate";
import {
  DEFAULT_AGENT_ID,
  consumeProspectContext,
  planCoaching,
  planGuidedActions,
  recordFollowUpPattern,
  recordSalesInteraction,
  recommendedFollowUpHours,
  runSimulation,
  suppressionOverridesTraining,
} from "../engine";
import { executeSalesLearningTick } from "../cycle";
import { projectSalesLearningHq } from "../hq";
import { projectPublicSalesLearning } from "../public";
import {
  evaluateInfinitySalesMethodAdherenceGate,
  evaluateSalesCoachingEvidenceGate,
  evaluateSalesTrainingPrivacyGate,
} from "../gates";
import { salesLearningToPerformanceObservations } from "../performance";
import { emptySalesLearningState, resetSalesLearningState } from "../store";
import { loadProspectSalesContext } from "../context";
import type { SalesLearningState } from "../types";

const NOW = "2026-09-16T08:00:00.000Z";

function poorPriceTurns() {
  return [
    { actor: "PROSPECT" as const, action: "object", text: "This is too expensive", at: NOW },
    { actor: "AGENT" as const, action: "discount", text: "I can lower the price right now", at: NOW },
  ];
}

describe("Sales Learning & Coaching Engine V1", () => {
  let state: SalesLearningState;

  beforeEach(() => {
    state = emptySalesLearningState();
    resetSalesLearningState(state);
  });

  afterEach(() => {
    resetSalesLearningState();
  });

  it("defines an original versioned Infinity Sales Method", () => {
    expect(INFINITY_SALES_METHOD.version).toBe("v1.0");
    expect(INFINITY_SALES_METHOD.identity).toContain("autonomous venture operating system");
    expect(INFINITY_SALES_METHOD.process).toContain("DISCOVER");
    expect(INFINITY_SALES_METHOD.forbidden).toContain("copying proprietary third-party scripts");
    expect(JSON.stringify(INFINITY_SALES_METHOD)).not.toMatch(/NEPQ|Cardone|Straight Line/);
    const pack = defaultOccupancyNpvKnowledge();
    expect(pack.venture_id).toBe("occupancynpv");
    expect(pack.version).toBe("Venture Sales Pack v1");
    expect(pack.approved_claims.length).toBeGreaterThan(0);
    expect(pack.objections.some((row) => row.class === "PRICE")).toBe(true);
    expect(state.knowledge.occupancynpv?.pricing_rules.join(" ")).toMatch(/do not invent discounts/i);
  });

  it("persists interaction observations separate from inference", () => {
    const observation = recordSalesInteraction(state, {
      prospect_id: "p-1",
      now: NOW,
      turns: poorPriceTurns(),
      questions: [],
      objections: ["PRICE"],
      outcome: "stalled",
    });
    expect(observation.privacy_classification).toBe("INTERNAL_ONLY");
    expect(observation.inference_separated).toBe(true);
    expect(observation.objections).toContain("PRICE");
    expect(state.observations).toHaveLength(1);
    expect(classifySalesStage(observation).stage).toBe("OBJECTION");
  });

  it("evaluates skills independently with retained evidence", () => {
    recordSalesInteraction(state, { prospect_id: "p-1", now: NOW, turns: poorPriceTurns(), objections: ["PRICE"], outcome: "stalled" });
    recordSalesInteraction(state, { prospect_id: "p-2", now: NOW, turns: poorPriceTurns(), objections: ["PRICE"], outcome: "stalled" });
    const profile = state.profiles[DEFAULT_AGENT_ID]!;
    expect(profile.dimensions.OBJECTION_RESOLUTION.state).toBe("DEVELOPING");
    expect(profile.dimensions.OBJECTION_RESOLUTION.evidence.length).toBeGreaterThan(0);
    expect(profile.dimensions.COMPLIANCE.state).not.toBe("DEVELOPING");
    expect(profile.dimensions.OBJECTION_RESOLUTION.sample_size).toBeGreaterThan(1);
  });

  it("assigns evidence-backed coaching and keeps a durable training queue", () => {
    recordSalesInteraction(state, { prospect_id: "p-1", now: NOW, turns: poorPriceTurns(), objections: ["PRICE"], outcome: "stalled" });
    const assignments = planCoaching(state, NOW);
    expect(assignments[0]?.evidence.length).toBeGreaterThan(0);
    expect(assignments[0]?.skill).toBe("OBJECTION_RESOLUTION");
    expect(state.queue[0]?.state).toBe("QUEUED");
    const snap = JSON.parse(JSON.stringify(state)) as SalesLearningState;
    const restored = emptySalesLearningState();
    restored.queue.push(...snap.queue);
    expect(restored.queue[0]?.assignment_id).toBe(state.queue[0]?.assignment_id);
    expect(evaluateSalesCoachingEvidenceGate(state).result).toBe("PASS");
  });

  it("runs and scores simulations", () => {
    const fail = runSimulation(state, { scenario_id: "price-sensitive-owner", actions: ["discount"], now: NOW });
    const pass = runSimulation(state, {
      scenario_id: "price-sensitive-owner",
      actions: ["clarify_objection", "isolate_objection", "respond_objection"],
      now: "2026-09-16T08:05:00.000Z",
    });
    expect(fail.result).toBe("FAIL");
    expect(pass.result).toBe("PASS");
    expect(state.simulations).toHaveLength(2);
  });

  it("classifies objections and records follow-up learning", () => {
    recordSalesInteraction(state, { prospect_id: "p-1", now: NOW, turns: poorPriceTurns(), objections: ["This costs too much"], outcome: "stalled" });
    recordFollowUpPattern(state, { interval_hours: 4, style: "instant", response: false, meeting: false, complaint: true });
    recordFollowUpPattern(state, { interval_hours: 72, style: "paced", response: true, meeting: true, complaint: false });
    expect(state.objection_patterns[0]?.class).toBe("PRICE");
    expect(recommendedFollowUpHours(state, "FOLLOW_UP", "LOW")).toBe(72);
  });

  it("consumes Prospect Intelligence context and skips known questions", () => {
    const used = consumeProspectContext({
      identity: "Alex Rivera",
      organization: "Harborline Operations LLC",
      role: "owner",
      business_context: "property management",
      known_signals: ["owner"],
      venture_matches: ["occupancynpv:HIGH"],
      previous_interactions: [],
      known_objections: ["PRICE"],
      communication_eligibility: ["EMAIL:email_allowed"],
      suppressed: false,
    });
    expect(used.skip_questions).toContain("what is your name");
    expect(used.used.some((row) => row.includes("Harborline"))).toBe(true);
    const graph = createProspectGraph();
    const service = createProspectIntelligenceService(graph);
    service.setEligibility({ consumer: "prospect_intelligence" }, {
      eligibility_id: "e1",
      entity_id: "ent-1",
      channel: "EMAIL",
      status: "email_allowed",
      reason: "published",
      updated_at: NOW,
    });
    const context = loadProspectSalesContext({ graph, entity_id: "ent-1" });
    expect(context.suppressed).toBe(false);
    expect(context.communication_eligibility[0]).toContain("email_allowed");
  });

  it("emits Performance Intelligence observations for coaching and simulations", () => {
    recordSalesInteraction(state, { prospect_id: "p-1", now: NOW, turns: poorPriceTurns(), objections: ["PRICE"], outcome: "stalled" });
    planCoaching(state, NOW);
    runSimulation(state, { scenario_id: "price-sensitive-owner", actions: ["discount"], now: NOW, assignment_id: state.assignments[0]?.assignment_id });
    const observations = salesLearningToPerformanceObservations(state);
    expect(observations.some((row) => row.rawMetric === "coaching_assignment")).toBe(true);
    expect(observations.some((row) => row.dimensions.engine === "sales_learning")).toBe(true);
  });

  it("keeps Always-On Sales capacity while training and blocks suppressed outreach", () => {
    recordSalesInteraction(state, { prospect_id: "p-1", now: NOW, turns: poorPriceTurns(), objections: ["PRICE"], outcome: "stalled" });
    const tick = executeSalesLearningTick({
      state,
      now: NOW,
      ready_inventory: 12,
      qualified_pipeline: 4,
      run_simulations: true,
    });
    expect(tick.selling_continued).toBe(true);
    expect(state.capacity.selling_capacity).toBeGreaterThan(0);
    const planned = planGuidedActions(state, { suppressed: true, skill: "CLOSING" });
    expect(suppressionOverridesTraining({ suppressed: true, planned_actions: planned })).toEqual(["stop_outreach"]);
    const graph = createProspectGraph();
    const service = createProspectIntelligenceService(graph);
    service.setEligibility({ consumer: "sales_outbound_runtime" }, {
      eligibility_id: "e-sup",
      entity_id: "ent-sup",
      channel: "EMAIL",
      status: "opted_out",
      reason: "STOP",
      updated_at: NOW,
    });
    expect(consumeEligibleProspect({
      service,
      entity_id: "ent-sup",
      venture_id: "occupancynpv",
      now: NOW,
      outbound_capacity: true,
    }).reason).toBe("SUPPRESSED");
  });

  it("projects HQ training activity and sanitized public state", () => {
    recordSalesInteraction(state, { prospect_id: "p-1", now: NOW, turns: poorPriceTurns(), objections: ["PRICE"], outcome: "stalled" });
    const tick = executeSalesLearningTick({ state, now: NOW, run_simulations: true, qualified_pipeline: 1 });
    const hq = projectSalesLearningHq(state);
    const pub = projectPublicSalesLearning(tick);
    expect(hq.metrics.some((row) => row.label === "Active Coaching Assignments")).toBe(true);
    expect(hq.metrics.some((row) => row.label === "Agents Selling")).toBe(true);
    expect(hq.metrics.some((row) => row.label === "Agents Training")).toBe(true);
    expect(hq.agents.some((row) => row.role === "Coaching")).toBe(true);
    expect(JSON.stringify(pub)).not.toMatch(/too expensive|discount|p-1|DEVELOPING|@/);
    expect(evaluateSalesTrainingPrivacyGate(JSON.stringify(pub)).result).toBe("PASS");
    const occupancy = salesSnapshotToOccupancy({ training_active: true, qualified_prospects: 1 });
    expect(occupancy.status).toBe("ACTIVE");
    expect(occupancy.sending).toBe(false);
    const projection = constructPublicOperationsProjection({
      ...idleTruthObservation(),
      occupancy: emptyCanonicalOccupancy(NOW, "ACTIVE"),
    });
    expect(evaluateSalesTrainingPrivacyGate(JSON.stringify(projection.public_sales_rooms)).result).toBe("PASS");
  });

  it("detects method adherence failures without requiring a robotic script", () => {
    const observation = recordSalesInteraction(state, {
      prospect_id: "p-pitch",
      now: NOW,
      turns: [
        { actor: "AGENT", action: "pitch", text: "Buy OccupancyNPV today", at: NOW },
        { actor: "AGENT", action: "ask_close", text: "Can you start now?", at: NOW },
      ],
      questions: [],
      outcome: "no_progress",
      invented_problem: true,
      unsupported_claim: true,
    });
    expect(evaluateInfinitySalesMethodAdherenceGate(observation).result).toBe("FAIL");
    expect(observation.pitched_before_discovery).toBe(true);
    expect(observation.skipped_qualification).toBe(true);
  });
});

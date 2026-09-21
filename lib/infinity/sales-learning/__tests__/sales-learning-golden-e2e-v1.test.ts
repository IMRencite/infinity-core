import { beforeEach, describe, expect, it } from "vitest";
import { consumeEligibleProspect } from "@/lib/infinity/prospect-intelligence/sales-bridge";
import { createProspectIntelligenceService } from "@/lib/infinity/prospect-intelligence/service";
import { createProspectGraph } from "@/lib/infinity/prospect-intelligence/store";
import {
  evaluateSalesCoachingEvidenceGate,
  evaluateSalesContinuousLearningGate,
  evaluateSalesTrainingPrivacyGate,
} from "../gates";
import {
  DEFAULT_AGENT_ID,
  activeGuidance,
  planCoaching,
  planGuidedActions,
  recordFollowUpPattern,
  recordSalesInteraction,
  runSimulation,
  suppressionOverridesTraining,
  validateTraining,
} from "../engine";
import { executeSalesLearningTick } from "../cycle";
import { projectPublicSalesLearning } from "../public";
import { emptySalesLearningState, resetSalesLearningState } from "../store";
import type { SalesLearningState } from "../types";

const NOW = "2026-09-16T09:00:00.000Z";

describe("Sales Learning golden e2e", () => {
  let state: SalesLearningState;

  beforeEach(() => {
    state = emptySalesLearningState();
    resetSalesLearningState(state);
  });

  it("improves price objection handling through failed, developing, and validated simulations", () => {
    for (const id of ["a", "b", "c", "d"]) {
      recordSalesInteraction(state, {
        prospect_id: `price-${id}`,
        now: NOW,
        turns: [
          { actor: "PROSPECT", action: "object", text: "The price is too high", at: NOW },
          { actor: "AGENT", action: "discount", text: "I can discount this immediately", at: NOW },
        ],
        objections: ["PRICE"],
        outcome: "no_progress",
      });
    }
    const assignments = planCoaching(state, NOW);
    const assignment = assignments.find((row) => row.skill === "OBJECTION_RESOLUTION") ?? assignments[0]!;
    expect(assignment.evidence.length).toBeGreaterThan(0);
    const first = runSimulation(state, { scenario_id: assignment.scenario_id, assignment_id: assignment.assignment_id, actions: ["discount"], now: NOW });
    expect(first.result).toBe("FAIL");
    const second = runSimulation(state, {
      scenario_id: assignment.scenario_id,
      assignment_id: assignment.assignment_id,
      actions: ["clarify_objection", "respond_objection"],
      now: "2026-09-16T09:10:00.000Z",
    });
    expect(second.result).toBe("DEVELOPING");
    expect(validateTraining(state, { assignment_id: assignment.assignment_id, now: "2026-09-16T09:10:00.000Z" })).toBeNull();
    const third = runSimulation(state, {
      scenario_id: assignment.scenario_id,
      assignment_id: assignment.assignment_id,
      actions: ["clarify_objection", "isolate_objection", "respond_objection"],
      now: "2026-09-16T09:20:00.000Z",
    });
    expect(third.result).toBe("PASS");
    const guidance = validateTraining(state, { assignment_id: assignment.assignment_id, now: "2026-09-16T09:20:00.000Z" });
    expect(guidance?.promotion).toBe("VERIFIED_GUIDANCE");
    expect(state.profiles[DEFAULT_AGENT_ID]?.dimensions.OBJECTION_RESOLUTION.state).not.toBe("DEVELOPING");
    const next = planGuidedActions(state, { skill: "OBJECTION_RESOLUTION" });
    expect(next.slice(0, 2)).toEqual(["clarify_objection", "isolate_objection"]);
    expect(next.includes("discount")).toBe(false);
    const improved = recordSalesInteraction(state, {
      prospect_id: "price-future",
      now: "2026-09-16T09:30:00.000Z",
      turns: next.map((action) => ({ actor: "AGENT" as const, action, text: action, at: NOW })),
      objections: ["PRICE"],
      outcome: "advanced",
      guidance_version_ids: activeGuidance(state, "OBJECTION_RESOLUTION").map((row) => `${row.guidance_id}:${row.version}`),
    });
    expect(improved.guidance_version_ids.length).toBeGreaterThan(0);
    expect(state.profiles[DEFAULT_AGENT_ID]?.dimensions.OBJECTION_RESOLUTION.trend).toBe("UP");
    expect(evaluateSalesContinuousLearningGate(state).result).toBe("PASS");
    expect(evaluateSalesCoachingEvidenceGate(state).result).toBe("PASS");
  });

  it("corrects pitching before discovery and uses discovery first afterward", () => {
    for (const id of ["1", "2", "3"]) {
      recordSalesInteraction(state, {
        prospect_id: `pitch-${id}`,
        now: NOW,
        turns: [
          { actor: "AGENT", action: "pitch", text: "Our offer is ready for you", at: NOW },
          { actor: "AGENT", action: "present_offer", text: "Start OccupancyNPV now", at: NOW },
        ],
        questions: [],
        outcome: "no_discovery",
      });
    }
    const assignment = planCoaching(state, NOW).find((row) => row.skill === "DISCOVERY")!;
    runSimulation(state, { scenario_id: assignment.scenario_id, assignment_id: assignment.assignment_id, actions: ["pitch"], now: NOW });
    runSimulation(state, {
      scenario_id: assignment.scenario_id,
      assignment_id: assignment.assignment_id,
      actions: ["ask_discovery", "ask_problem"],
      now: "2026-09-16T09:15:00.000Z",
    });
    expect(validateTraining(state, { assignment_id: assignment.assignment_id, now: "2026-09-16T09:15:00.000Z" })?.skill).toBe("DISCOVERY");
    const next = planGuidedActions(state, { skill: "DISCOVERY" });
    expect(next[0]).toBe("ask_discovery");
    expect(next.includes("pitch")).toBe(false);
    const future = recordSalesInteraction(state, {
      prospect_id: "pitch-future",
      now: "2026-09-16T09:40:00.000Z",
      turns: [
        { actor: "AGENT", action: "ask_discovery", text: "What occupancy decision is active this quarter?", at: NOW },
        { actor: "AGENT", action: "ask_problem", text: "What happens if vacancy stays unresolved?", at: NOW },
        { actor: "AGENT", action: "align_venture", text: "OccupancyNPV can quantify that decision", at: NOW },
      ],
      questions: ["What occupancy decision is active this quarter?", "What happens if vacancy stays unresolved?"],
      outcome: "discovered",
      used_known_context: true,
    });
    expect(future.pitched_before_discovery).toBe(false);
    expect(future.stage === "DISCOVERY" || future.stage === "PROBLEM" || future.stage === "VENTURE_ALIGNMENT").toBe(true);
  });

  it("turns weak follow-up performance into validated paced follow-up guidance", () => {
    for (const id of ["f1", "f2", "f3"]) {
      recordSalesInteraction(state, {
        prospect_id: id,
        now: NOW,
        turns: [
          { actor: "AGENT", action: "instant_reply", text: "Just bumping this", at: NOW },
          { actor: "AGENT", action: "follow_up", text: "Any news?", at: NOW },
        ],
        outcome: "no_meeting",
      });
    }
    recordFollowUpPattern(state, { interval_hours: 1, style: "instant", response: false, meeting: false, complaint: true });
    const tick = executeSalesLearningTick({
      state,
      now: NOW,
      run_simulations: false,
      ready_inventory: 0,
      qualified_pipeline: 0,
    });
    const assignment = state.assignments.find((row) => row.skill === "FOLLOW_UP") ?? planCoaching(state, NOW).find((row) => row.skill === "FOLLOW_UP")!;
    runSimulation(state, { scenario_id: assignment.scenario_id, assignment_id: assignment.assignment_id, actions: ["instant_reply"], now: NOW });
    runSimulation(state, {
      scenario_id: assignment.scenario_id,
      assignment_id: assignment.assignment_id,
      actions: ["follow_up", "schedule_next"],
      now: "2026-09-16T09:25:00.000Z",
    });
    expect(validateTraining(state, { assignment_id: assignment.assignment_id, now: "2026-09-16T09:25:00.000Z" })?.constraints).toContain("paced_follow_up");
    expect(planGuidedActions(state, { skill: "FOLLOW_UP" })).toEqual(expect.arrayContaining(["follow_up", "schedule_next"]));
    expect(tick.selling_continued).toBe(true);
  });

  it("lets suppression override active closing training", () => {
    recordSalesInteraction(state, {
      prospect_id: "close-1",
      now: NOW,
      turns: [{ actor: "AGENT", action: "ask_close", text: "Can you start today?", at: NOW }],
      outcome: "unqualified_close",
    });
    planCoaching(state, NOW);
    const guided = planGuidedActions(state, { skill: "CLOSING", suppressed: true });
    expect(suppressionOverridesTraining({ suppressed: true, planned_actions: guided })).toEqual(["stop_outreach"]);
    const graph = createProspectGraph();
    const service = createProspectIntelligenceService(graph);
    service.setEligibility({ consumer: "sales_outbound_runtime" }, {
      eligibility_id: "stop",
      entity_id: "ent-stop",
      channel: "EMAIL",
      status: "opted_out",
      reason: "STOP",
      updated_at: NOW,
    });
    expect(consumeEligibleProspect({
      service,
      entity_id: "ent-stop",
      venture_id: "occupancynpv",
      now: NOW,
      outbound_capacity: true,
    }).consumed).toBe(false);
    expect(evaluateSalesTrainingPrivacyGate(JSON.stringify(projectPublicSalesLearning({
      activity: "ACTIVE",
      generic_activity: "Running sales training",
      training_active: true,
      selling_continued: true,
      assignments_created: 1,
      simulations_run: 1,
      observations: 1,
    }))).result).toBe("PASS");
  });
});

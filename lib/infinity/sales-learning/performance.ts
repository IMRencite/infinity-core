import type { SalesLearningState } from "./types";

export function salesLearningToPerformanceObservations(state: SalesLearningState) {
  return [
    ...state.assignments.map((row) => ({
      observationId: row.assignment_id,
      sourceId: "internal_infinity",
      ventureId: "occupancynpv",
      sourceReference: row.agent_id,
      idempotencyKey: `sales-learning:assignment:${row.assignment_id}`,
      observedAt: row.created_at,
      rawMetric: "coaching_assignment",
      rawValue: 1,
      rawUnit: "count",
      dimensions: { skill: row.skill, engine: "sales_learning" },
      provenance: { engine: "sales_learning_coaching_engine_v1" },
      synthetic: false,
    })),
    ...state.simulations.map((row) => ({
      observationId: row.simulation_id,
      sourceId: "internal_infinity",
      ventureId: "occupancynpv",
      sourceReference: row.agent_id,
      idempotencyKey: `sales-learning:simulation:${row.simulation_id}`,
      observedAt: row.completed_at,
      rawMetric: `simulation_${row.result.toLowerCase()}`,
      rawValue: row.score,
      rawUnit: "score",
      dimensions: { mode: row.mode, result: row.result, engine: "sales_learning" },
      provenance: { engine: "sales_learning_coaching_engine_v1" },
      synthetic: true,
    })),
    ...state.guidance.filter((row) => row.promotion === "VERIFIED_GUIDANCE" && row.validated_at).map((row) => ({
      observationId: `${row.guidance_id}:${row.version}`,
      sourceId: "internal_infinity",
      ventureId: "occupancynpv",
      sourceReference: row.scope,
      idempotencyKey: `sales-learning:guidance:${row.guidance_id}:${row.version}`,
      observedAt: row.validated_at!,
      rawMetric: "validated_coaching_intervention",
      rawValue: 1,
      rawUnit: "count",
      dimensions: { skill: row.skill ?? "METHOD", engine: "sales_learning" },
      provenance: { engine: "sales_learning_coaching_engine_v1" },
      synthetic: false,
    })),
  ];
}

export function followUpLearningFromPerformance(input: {
  stage: string;
  objection?: string;
  meeting_rate?: number;
  unsubscribe_rate?: number;
}): { needs_coaching: boolean; skill: "FOLLOW_UP"; reason: string } {
  const meetings = input.meeting_rate ?? 0;
  const complaints = input.unsubscribe_rate ?? 0;
  return {
    needs_coaching: meetings < 0.15 || complaints > 0,
    skill: "FOLLOW_UP",
    reason: complaints > 0
      ? "follow-up produced unsubscribe or complaint evidence"
      : `follow-up meeting rate ${meetings} is below the working threshold`,
  };
}

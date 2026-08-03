/**
 * Planner module entry point. Future planner implementations (including AI planners)
 * must route plan creation and execution through these gated helpers.
 */
export {
  PLANNER_GATE_EXEMPT_CAPABILITY_PREFIXES,
  PlannerGatingError,
  assertOpportunityApprovedForPlanning,
  assertPlannerMayExecute,
  assertPlannerMayExecuteEngineJob,
  assertPlannerMayExecutePlanStep,
  extractOpportunityIdFromConstraints,
  extractOpportunityIdFromJobPayload,
  isPlannerGateExemptCapability,
} from "../planner-gating";

export { createPlanFromDecision } from "../planner";
export { createEvaluationPlanFromDecision } from "../planner-evaluation";
export { createValidationPlanFromDecision } from "../planner-validation";
export { createInitiativePlanningRecordFromDecision } from "../planner-initiative";

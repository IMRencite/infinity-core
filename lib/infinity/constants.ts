export const DISCOVERY_CAPABILITY_KEY = "discovery.scan";

export const DISCOVERY_ENGINE_NAME = "discovery_engine";

export const DECISION_EVALUATE_CAPABILITY_KEY = "decision.evaluate_opportunity";

export const DECISION_ENGINE_NAME = "decision_engine";

export const ALLOCATION_ENGINE_NAME = "allocation_engine";

export const VALIDATION_CAPABILITY_KEY = "validation.run";

export const VALIDATION_ENGINE_NAME = "validation_engine";

export const EXECUTIVE_EVALUATE_CAPABILITY_KEY = "executive.evaluate_opportunity";

export const EXECUTIVE_ENGINE_NAME = "executive_engine";

export const REASONING_ADVISORY_CAPABILITY_KEY = "reasoning.execute_advisory";

export const REASONING_ENGINE_NAME = "reasoning_engine";

export const PLANNER_INITIATIVE_GATE_CAPABILITY_KEY = "planner.initiative_gate";

export const COMMAND_DECISION_REQUEST_INITIATIVE_PLANNING =
  "request_initiative_planning_record";

export const COMMAND_DECISION_OUTCOME_INITIATIVE_PLANNING =
  "record_validated_initiative_planning";

export const COMMAND_DECISION_OUTCOME_DISCOVERY = "run_discovery_scan";

export const COMMAND_DECISION_REQUEST_DISCOVERY = "request_discovery";

export const COMMAND_DECISION_REQUEST_EVALUATION = "request_opportunity_evaluation";

export const COMMAND_DECISION_OUTCOME_EVALUATION = "evaluate_opportunity";

export const COMMAND_DECISION_REQUEST_VALIDATION = "request_opportunity_validation";

export const COMMAND_DECISION_OUTCOME_VALIDATION = "run_opportunity_validation";

export const COMMAND_DECISION_REQUEST_EXECUTIVE = "request_executive_evaluation";

export const COMMAND_DECISION_OUTCOME_EXECUTIVE = "run_executive_evaluation";

export const PENDING_JOB_STATUSES = ["queued", "running", "waiting"] as const;

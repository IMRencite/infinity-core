export const LAUNCH_GATEWAY_POLICY_VERSION = "launch_gateway_policy_v1";
export const LAUNCH_PLAN_SCHEMA_VERSION = "launch_plan_v1";
export const MOCK_PROVIDER_KEY = "mock.infinity_v1";

export const EXTERNAL_ACTIONS_LIVE_ENV = "EXTERNAL_ACTIONS_LIVE_ENABLED";

export const EXTERNAL_ACTION_EXECUTION_STATUSES = [
  "requested",
  "policy_review",
  "blocked",
  "awaiting_approval",
  "approved",
  "simulation_ready",
  "simulating",
  "simulated",
  "execution_ready",
  "executing",
  "succeeded",
  "failed",
  "rollback_requested",
  "rolled_back",
  "cancelled",
  "superseded",
] as const;

export type ExternalActionExecutionStatus =
  (typeof EXTERNAL_ACTION_EXECUTION_STATUSES)[number];

export const SIDE_EFFECT_CLASSES = [
  "read_only",
  "reversible_internal",
  "reversible_external",
  "external_account_change",
  "public_publish",
  "financial",
  "legal_identity",
  "irreversible_or_high_risk",
] as const;

export type SideEffectClass = (typeof SIDE_EFFECT_CLASSES)[number];

export const RISK_CLASSES = ["low", "moderate", "high", "critical"] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];

export const POLICY_OUTCOMES = [
  "allow_simulation",
  "requires_approval",
  "blocked",
  "execution_eligible",
] as const;

export type PolicyOutcome = (typeof POLICY_OUTCOMES)[number];

export const LAUNCH_READINESS_LABELS = [
  "internally_ready",
  "launch_plan_ready",
  "awaiting_external_approval",
  "launch_simulation_complete",
  "externally_launchable",
] as const;

export const LAUNCH_GATEWAY_EVENTS = {
  externalActionRequested: "external_action.requested",
  externalActionClassified: "external_action.classified",
  externalActionPolicyEvaluated: "external_action.policy_evaluated",
  externalActionAuthorizationEvaluated: "external_action.authorization_evaluated",
  externalActionAutoAuthorized: "external_action.auto_authorized",
  externalActionHumanApprovalRequired: "external_action.human_approval_required",
  externalActionAuthorizationBlocked: "external_action.authorization_blocked",
  externalActionAuthorizationInvalidated: "external_action.authorization_invalidated",
  externalActionBlocked: "external_action.blocked",
  externalActionAwaitingApproval: "external_action.awaiting_approval",
  externalActionApproved: "external_action.approved",
  externalActionSimulationStarted: "external_action.simulation_started",
  externalActionSimulated: "external_action.simulated",
  externalActionExecutionReady: "external_action.execution_ready",
  externalActionExecutionStarted: "external_action.execution_started",
  externalActionSucceeded: "external_action.succeeded",
  externalActionFailed: "external_action.failed",
  externalActionRollbackRequested: "external_action.rollback_requested",
  externalActionRolledBack: "external_action.rolled_back",
  launchPlanCreated: "launch.plan_created",
  launchSimulationStarted: "launch.simulation_started",
  launchSimulationCompleted: "launch.simulation_completed",
  launchBlocked: "launch.blocked",
  launchAwaitingApproval: "launch.awaiting_approval",
} as const;

export const LAUNCH_GENERATE_PLAN_CAPABILITY = "launch.generate_plan";
export const LAUNCH_SIMULATE_ACTION_CAPABILITY = "launch.simulate_external_action";
export const LAUNCH_EXECUTE_ACTION_CAPABILITY = "launch.execute_external_action";
export { LAUNCH_EVALUATE_AUTHORIZATION_CAPABILITY } from "./autonomous-authorization/constants";

export const LAUNCH_GATEWAY_SIMULATION_LABEL =
  "SIMULATION ONLY — live external execution disabled in Launch Gateway v1.";

export const EXTERNAL_WORKER_PERMISSIONS = [
  "network.read",
  "network.write",
  "publish.website",
  "domain.register",
  "repository.create",
  "email.send",
  "payment.configure",
  "purchase",
  "social.publish",
] as const;

export type ExternalWorkerPermission = (typeof EXTERNAL_WORKER_PERMISSIONS)[number];

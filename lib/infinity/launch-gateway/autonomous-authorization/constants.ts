export const AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY = "autonomous_external_action_policy_v1";
export const AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION = "autonomous_external_action_policy_v1";
export const ORGANIZATION_EXTERNAL_AUTONOMY_POLICY_VERSION = "organization_external_autonomy_v1";

export const AUTHORIZATION_SOURCES = [
  "autonomous_policy",
  "human",
  "system_test",
  "denied",
] as const;

export type AuthorizationSource = (typeof AUTHORIZATION_SOURCES)[number];

export const POLICY_DECISIONS = [
  "AUTO_AUTHORIZE",
  "REQUIRE_HUMAN_APPROVAL",
  "BLOCK",
] as const;

export type PolicyDecision = (typeof POLICY_DECISIONS)[number];

export const AUTONOMOUS_ELIGIBLE_ACTION_TYPES = [
  "repository.create",
  "repository.push",
  "hosting.create_project",
  "hosting.deploy",
  "hosting.verify_deployment",
] as const;

export type AutonomousEligibleActionType = (typeof AUTONOMOUS_ELIGIBLE_ACTION_TYPES)[number];

export const AUTONOMOUS_ACTION_RISK: Record<AutonomousEligibleActionType, string> = {
  "repository.create": "moderate",
  "repository.push": "moderate",
  "hosting.create_project": "moderate",
  "hosting.deploy": "moderate",
  "hosting.verify_deployment": "low",
};

export const AUTONOMOUS_EXTERNAL_MAX_ACTION_COST_ENV = "AUTONOMOUS_EXTERNAL_MAX_ACTION_COST_USD";
export const AUTONOMOUS_EXTERNAL_MAX_DAILY_COST_ENV = "AUTONOMOUS_EXTERNAL_MAX_DAILY_COST_USD";
export const AUTONOMOUS_EXTERNAL_MAX_VENTURE_COST_ENV = "AUTONOMOUS_EXTERNAL_MAX_VENTURE_COST_USD";
export const AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV = "AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID";

export const LAUNCH_EVALUATE_AUTHORIZATION_CAPABILITY = "launch.evaluate_external_authorization";

export function parseAutonomousCostEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

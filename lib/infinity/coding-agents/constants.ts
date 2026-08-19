export const CODING_AGENTS_VERSION = "coding_agent_adapter_v1";

export const CODING_AGENT_PROVIDERS = ["infinity_native", "cursor", "mock_cursor"] as const;
export type CodingAgentProviderId = (typeof CODING_AGENT_PROVIDERS)[number];

export const CODING_CAPABILITIES = [
  "INSPECT_REPOSITORY",
  "CREATE_PROJECT",
  "IMPLEMENT_FEATURE",
  "MODIFY_MULTIPLE_FILES",
  "RUN_COMMANDS",
  "RUN_TESTS",
  "DEBUG_FAILURE",
  "REFACTOR",
  "REVIEW_CODE",
  "PRODUCE_DIFF",
  "RESUME_TASK",
  "LARGE_REPOSITORY_EXECUTION",
  "CREATE_BRANCH",
  "COMMIT_CHANGES",
] as const;
export type CodingCapability = (typeof CODING_CAPABILITIES)[number];

export const CURSOR_EXECUTION_MODES = ["CURSOR_CLI", "CURSOR_CLOUD_AGENT"] as const;
export type CursorExecutionMode = (typeof CURSOR_EXECUTION_MODES)[number];

export const PROVIDER_AVAILABILITY = [
  "AVAILABLE",
  "NOT_CONFIGURED",
  "UNAVAILABLE",
  "DEGRADED",
] as const;
export type ProviderAvailability = (typeof PROVIDER_AVAILABILITY)[number];

export const ROUTER_OUTCOMES = ["INFINITY_NATIVE", "CURSOR", "MULTI_AGENT", "DEFER", "BLOCK"] as const;
export type CodingRouterOutcome = (typeof ROUTER_OUTCOMES)[number];

export const CODING_TASK_TYPES = [
  "CREATE_PROJECT",
  "IMPLEMENT_FEATURE",
  "MODIFY_MULTIPLE_FILES",
  "REFACTOR",
  "DEBUG_FAILURE",
  "RUN_TESTS",
  "REPAIR",
  "REVIEW_CODE",
  "INSPECT_REPOSITORY",
] as const;
export type CanonicalCodingTaskType = (typeof CODING_TASK_TYPES)[number];

export const CODING_TASK_STATUSES = [
  "PENDING",
  "ROUTED",
  "RUNNING",
  "PROVIDER_COMPLETED",
  "QA_RUNNING",
  "ACCEPTED",
  "FAILED",
  "BLOCKED",
  "DEFERRED",
] as const;
export type CanonicalCodingTaskStatus = (typeof CODING_TASK_STATUSES)[number];

export const CODING_FAILURE_CODES = [
  "NOT_CONFIGURED",
  "UNSUPPORTED_CAPABILITY",
  "AUTH_FAILED",
  "RATE_LIMITED",
  "TIMEOUT",
  "WORKSPACE_VIOLATION",
  "COMMAND_POLICY_VIOLATION",
  "QA_FAILED",
  "BUILD_FAILED",
  "COST_DENIED",
  "PROVIDER_UNAVAILABLE",
] as const;
export type CodingFailureCode = (typeof CODING_FAILURE_CODES)[number];

export const NETWORK_POLICIES = [
  "NONE",
  "PACKAGE_REGISTRY_ONLY",
  "DOCUMENTATION_READ",
  "GENERAL_READ",
  "GOVERNED",
] as const;
export type NetworkPolicy = (typeof NETWORK_POLICIES)[number];

export const SECURITY_LEVELS = ["standard", "sensitive", "maintenance"] as const;
export type CodingSecurityLevel = (typeof SECURITY_LEVELS)[number];

export const DEFAULT_FORBIDDEN_PATHS = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "secrets/",
  "financial/",
  "banking/",
  "payment-credentials/",
  "deployment-credentials/",
] as const;

export const BLOCKED_COMMAND_PATTERNS = [
  /vercel\s+deploy\s+--prod/i,
  /wrangler\s+deploy/i,
  /dnsutil|nsupdate|route53/i,
  /stripe\s+(products|prices|payment)/i,
  /mercury|ramp/i,
  /gcloud\s+dns/i,
  /aws\s+route53/i,
  /terraform\s+apply/i,
  /kubectl\s+apply/i,
] as const;

export const BLOCKED_MUTATION_COMMANDS = [
  /git\s+push\s+.*--force/i,
  /git\s+push\s+.*-f\b/i,
  /git\s+merge\s+.*(main|master|production)/i,
] as const;

export const MAX_REPAIR_ATTEMPTS = 2;

export const NATIVE_CAPABILITIES: CodingCapability[] = [
  "INSPECT_REPOSITORY",
  "CREATE_PROJECT",
  "IMPLEMENT_FEATURE",
  "MODIFY_MULTIPLE_FILES",
  "RUN_COMMANDS",
  "RUN_TESTS",
  "DEBUG_FAILURE",
  "REFACTOR",
  "REVIEW_CODE",
  "PRODUCE_DIFF",
];

export const CURSOR_CAPABILITIES: CodingCapability[] = [
  "INSPECT_REPOSITORY",
  "CREATE_PROJECT",
  "IMPLEMENT_FEATURE",
  "MODIFY_MULTIPLE_FILES",
  "RUN_COMMANDS",
  "RUN_TESTS",
  "DEBUG_FAILURE",
  "REFACTOR",
  "REVIEW_CODE",
  "PRODUCE_DIFF",
  "RESUME_TASK",
  "LARGE_REPOSITORY_EXECUTION",
  "CREATE_BRANCH",
  "COMMIT_CHANGES",
];

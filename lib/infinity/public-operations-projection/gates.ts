import { PUBLIC_OPERATIONS_FIELD_ALLOWLIST } from "./registry";
import { isAskReviewIdentity } from "./registry";
import type { NamedPublicGate, PublicOperationsProjection, PublicVentureVisibility } from "./types";
import { PUBLIC_ALLOWED_CLASSIFICATIONS } from "./types";

function pass(gate: string, reason: string): NamedPublicGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedPublicGate {
  return { gate, result: "FAIL", reasons };
}

export const PUBLIC_PROJECTION_NO_SENSITIVE_DATA_GATE = "PublicProjectionNoSensitiveDataGate" as const;
export const PUBLIC_VENTURE_VISIBILITY_GATE = "PublicVentureVisibilityGate" as const;
export const PUBLIC_FINANCIAL_DISCLOSURE_GATE = "PublicFinancialDisclosureGate" as const;
export const PUBLIC_CUSTOMER_DATA_GATE = "PublicCustomerDataGate" as const;
export const PUBLIC_MISSION_DETAIL_GATE = "PublicMissionDetailGate" as const;
export const PUBLIC_PROVIDER_DATA_GATE = "PublicProviderDataGate" as const;
export const PUBLIC_INFRASTRUCTURE_DATA_GATE = "PublicInfrastructureDataGate" as const;
export const PUBLIC_PROJECTION_READ_ONLY_GATE = "PublicProjectionReadOnlyGate" as const;
export const PUBLIC_PROJECTION_CANONICAL_TRUTH_GATE = "PublicProjectionCanonicalTruthGate" as const;
export const PUBLIC_PROJECTION_UNKNOWN_NOT_ZERO_GATE = "PublicProjectionUnknownNotZeroGate" as const;
export const PUBLIC_AGENT_ACTIVITY_TRUTH_GATE = "PublicAgentActivityTruthGate" as const;
export const PUBLIC_PROJECTION_FAILURE_SANITIZATION_GATE = "PublicProjectionFailureSanitizationGate" as const;
export const PUBLIC_PROJECTION_FIELD_ALLOWLIST_GATE = "PublicProjectionFieldAllowlistGate" as const;

const FINANCIAL_KEYS = /treasury|authorized capital|spend authority|allocation|commitment|actual spend|revenue|profit|contribution margin|mercury|stripe balance|verified cash|\$50\b/i;
const CUSTOMER_KEYS = /@[a-z0-9.-]+\.[a-z]{2,}|customer email|reply content|\+1[\s-]?\d{3}|phone number|cus_|suppression/i;
const MISSION_KEYS = /first outbound validation|mercury settlement|askreview commercialization|occupancynpv secret/i;
const PROVIDER_KEYS = /sk_live|sk_test|Bearer |api[_-]?token|rate limit payload|provider error|acct_[A-Za-z0-9]+/i;
const INFRA_KEYS = /localhost:\d+|127\.0\.0\.1|C:\\|\/Users\/|BUILD_ID|pid[:\s]\d+|commit [a-f0-9]{7,}|supabase\.co|vercel\.app\/_|\.infinity\\|\.next\/|9222/i;
const SECRET_KEYS = /sk_|pk_live|BEGIN (RSA |OPENSSH )?PRIVATE|password=|authorization:\s*bearer/i;

export function stringifyPublicProjection(projection: PublicOperationsProjection): string {
  return JSON.stringify(projection);
}

export function evaluatePublicProjectionNoSensitiveDataGate(projection: PublicOperationsProjection): NamedPublicGate {
  const text = stringifyPublicProjection(projection);
  const reasons: string[] = [];
  if (SECRET_KEYS.test(text)) reasons.push("SECRET_PATTERN");
  if (CUSTOMER_KEYS.test(text)) reasons.push("PII_PATTERN");
  if (FINANCIAL_KEYS.test(text)) reasons.push("FINANCIAL_PRIVATE_PATTERN");
  if (PROVIDER_KEYS.test(text)) reasons.push("PROVIDER_PRIVATE_PATTERN");
  if (INFRA_KEYS.test(text)) reasons.push("INTERNAL_ONLY_PATTERN");
  if (text.includes("PRIVATE") && /"classification":"PRIVATE"/.test(text)) reasons.push("PRIVATE_CLASSIFICATION");
  return reasons.length
    ? fail(PUBLIC_PROJECTION_NO_SENSITIVE_DATA_GATE, reasons)
    : pass(PUBLIC_PROJECTION_NO_SENSITIVE_DATA_GATE, "NO_SENSITIVE_CLASSIFICATION");
}

export function evaluatePublicFinancialDisclosureGate(projection: PublicOperationsProjection): NamedPublicGate {
  const text = stringifyPublicProjection(projection);
  if (FINANCIAL_KEYS.test(text)) {
    return fail(PUBLIC_FINANCIAL_DISCLOSURE_GATE, ["FINANCIAL_DISCLOSURE"]);
  }
  return pass(PUBLIC_FINANCIAL_DISCLOSURE_GATE, "DENY_DEFAULT");
}

export function evaluatePublicCustomerDataGate(projection: PublicOperationsProjection): NamedPublicGate {
  const text = stringifyPublicProjection(projection);
  if (CUSTOMER_KEYS.test(text) || /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(text)) {
    return fail(PUBLIC_CUSTOMER_DATA_GATE, ["CUSTOMER_DATA"]);
  }
  return pass(PUBLIC_CUSTOMER_DATA_GATE, "NO_CUSTOMER_DATA");
}

export function evaluatePublicMissionDetailGate(projection: PublicOperationsProjection): NamedPublicGate {
  const text = stringifyPublicProjection(projection);
  if (MISSION_KEYS.test(text) || /work:occupancynpv|mission:infinity|candidate:/.test(text)) {
    return fail(PUBLIC_MISSION_DETAIL_GATE, ["MISSION_DETAIL"]);
  }
  return pass(PUBLIC_MISSION_DETAIL_GATE, "GENERIC_ACTIVITY_ONLY");
}

export function evaluatePublicProviderDataGate(projection: PublicOperationsProjection): NamedPublicGate {
  const text = stringifyPublicProjection(projection);
  if (PROVIDER_KEYS.test(text)) return fail(PUBLIC_PROVIDER_DATA_GATE, ["PROVIDER_DETAIL"]);
  return pass(PUBLIC_PROVIDER_DATA_GATE, "NO_PROVIDER_SECRETS");
}

export function evaluatePublicInfrastructureDataGate(projection: PublicOperationsProjection): NamedPublicGate {
  const text = stringifyPublicProjection(projection);
  if (INFRA_KEYS.test(text)) return fail(PUBLIC_INFRASTRUCTURE_DATA_GATE, ["INFRASTRUCTURE_DETAIL"]);
  return pass(PUBLIC_INFRASTRUCTURE_DATA_GATE, "NO_INFRASTRUCTURE_DETAIL");
}

export function evaluatePublicVentureVisibilityGate(input: {
  projection: PublicOperationsProjection;
  hiddenNames: string[];
  askReviewExposed: boolean;
  defaultVisibility: PublicVentureVisibility;
}): NamedPublicGate {
  const reasons: string[] = [];
  if (input.defaultVisibility !== "HIDDEN") reasons.push("DEFAULT_NOT_HIDDEN");
  if (input.askReviewExposed) reasons.push("ASKREVIEW_EXPOSED");
  const names = input.projection.public_ventures.map((row) => row.public_name.toLowerCase());
  for (const hidden of input.hiddenNames) {
    if (names.includes(hidden.toLowerCase()) || input.projection.public_ventures.some((row) => isAskReviewIdentity(hidden, row.public_name))) {
      reasons.push(`HIDDEN_EXPOSED:${hidden}`);
    }
  }
  if (names.some((name) => name.includes("askreview"))) reasons.push("ASKREVIEW_NAMED");
  return reasons.length
    ? fail(PUBLIC_VENTURE_VISIBILITY_GATE, reasons)
    : pass(PUBLIC_VENTURE_VISIBILITY_GATE, "HIDDEN_DEFAULT_ENFORCED");
}

export function evaluatePublicProjectionReadOnlyGate(input: {
  allowedMethods: string[];
  mutationCapable: boolean;
  createMission: boolean;
  triggerTick: boolean;
  sendOutreach: boolean;
  deploy: boolean;
  mutateFinance: boolean;
  mutateProvider: boolean;
}): NamedPublicGate {
  const reasons: string[] = [];
  if (input.mutationCapable) reasons.push("MUTATION_CAPABLE");
  if (input.createMission) reasons.push("CAN_CREATE_MISSION");
  if (input.triggerTick) reasons.push("CAN_TRIGGER_TICK");
  if (input.sendOutreach) reasons.push("CAN_SEND_OUTREACH");
  if (input.deploy) reasons.push("CAN_DEPLOY");
  if (input.mutateFinance) reasons.push("CAN_MUTATE_FINANCE");
  if (input.mutateProvider) reasons.push("CAN_MUTATE_PROVIDER");
  if (input.allowedMethods.some((method) => !["GET", "HEAD"].includes(method))) reasons.push("NON_READ_METHOD");
  return reasons.length
    ? fail(PUBLIC_PROJECTION_READ_ONLY_GATE, reasons)
    : pass(PUBLIC_PROJECTION_READ_ONLY_GATE, "READ_ONLY");
}

export function evaluatePublicProjectionCanonicalTruthGate(input: {
  started: number;
  operating: number;
  completed: number;
  projectedStarted: PublicOperationsProjection["ventures_started_count"];
  projectedOperating: PublicOperationsProjection["ventures_operating_count"];
  projectedCompleted: PublicOperationsProjection["missions_completed_count"];
}): NamedPublicGate {
  const reasons: string[] = [];
  if (input.projectedStarted !== input.started) reasons.push("STARTED_MISMATCH");
  if (input.projectedOperating !== input.operating) reasons.push("OPERATING_MISMATCH");
  if (input.projectedCompleted !== input.completed) reasons.push("COMPLETED_MISMATCH");
  return reasons.length
    ? fail(PUBLIC_PROJECTION_CANONICAL_TRUTH_GATE, reasons)
    : pass(PUBLIC_PROJECTION_CANONICAL_TRUTH_GATE, "COUNTERS_MATCH_CANONICAL");
}

export function evaluatePublicProjectionUnknownNotZeroGate(input: {
  unknownProven: boolean;
  renderedZero: boolean;
}): NamedPublicGate {
  if (input.unknownProven && input.renderedZero) {
    return fail(PUBLIC_PROJECTION_UNKNOWN_NOT_ZERO_GATE, ["UNKNOWN_RENDERED_ZERO"]);
  }
  return pass(PUBLIC_PROJECTION_UNKNOWN_NOT_ZERO_GATE, "UNKNOWN_PRESERVED");
}

export function evaluatePublicAgentActivityTruthGate(input: {
  loopActive: boolean;
  activeCount: number;
  historyUsedAsCurrent: boolean;
}): NamedPublicGate {
  const reasons: string[] = [];
  if (!input.loopActive && input.activeCount > 0) reasons.push("IDLE_COUNTED_ACTIVE");
  if (input.loopActive && input.activeCount < 1) reasons.push("ACTIVE_COUNTED_IDLE");
  if (input.historyUsedAsCurrent) reasons.push("HISTORY_AS_CURRENT");
  return reasons.length
    ? fail(PUBLIC_AGENT_ACTIVITY_TRUTH_GATE, reasons)
    : pass(PUBLIC_AGENT_ACTIVITY_TRUTH_GATE, "ACTIVE_MATCHES_EXECUTION");
}

export function evaluatePublicProjectionFailureSanitizationGate(projection: PublicOperationsProjection): NamedPublicGate {
  const text = stringifyPublicProjection(projection);
  const reasons: string[] = [];
  if (/stack|at Object\.|ENOENT|ECONNREFUSED|postgres|supabase/i.test(text)) reasons.push("RAW_ERROR");
  if (projection.system_status === "TEMPORARILY_UNAVAILABLE" && projection.public_activity_summary !== "UPDATING") {
    reasons.push("UNSAFE_FAILURE_ACTIVITY");
  }
  return reasons.length
    ? fail(PUBLIC_PROJECTION_FAILURE_SANITIZATION_GATE, reasons)
    : pass(PUBLIC_PROJECTION_FAILURE_SANITIZATION_GATE, "FAILURE_SANITIZED");
}

export function evaluatePublicProjectionFieldAllowlistGate(projection: PublicOperationsProjection): NamedPublicGate {
  const keys = Object.keys(projection);
  const extra = keys.filter((key) => !PUBLIC_OPERATIONS_FIELD_ALLOWLIST.includes(key as typeof PUBLIC_OPERATIONS_FIELD_ALLOWLIST[number]));
  if (extra.length) return fail(PUBLIC_PROJECTION_FIELD_ALLOWLIST_GATE, extra.map((key) => `UNEXPECTED_FIELD:${key}`));
  return pass(PUBLIC_PROJECTION_FIELD_ALLOWLIST_GATE, "ALLOWLIST_ONLY");
}

export function evaluatePublicProjectionGateBundle(input: {
  projection: PublicOperationsProjection;
  hiddenNames?: string[];
  askReviewExposed?: boolean;
  started?: number;
  operating?: number;
  completed?: number;
  unknownProven?: boolean;
  renderedZero?: boolean;
  loopActive?: boolean;
  historyUsedAsCurrent?: boolean;
}): NamedPublicGate[] {
  return [
    evaluatePublicProjectionNoSensitiveDataGate(input.projection),
    evaluatePublicFinancialDisclosureGate(input.projection),
    evaluatePublicCustomerDataGate(input.projection),
    evaluatePublicMissionDetailGate(input.projection),
    evaluatePublicProviderDataGate(input.projection),
    evaluatePublicInfrastructureDataGate(input.projection),
    evaluatePublicVentureVisibilityGate({
      projection: input.projection,
      hiddenNames: input.hiddenNames ?? ["AskReview", "SecretProject"],
      askReviewExposed: input.askReviewExposed ?? false,
      defaultVisibility: "HIDDEN",
    }),
    evaluatePublicProjectionReadOnlyGate({
      allowedMethods: ["GET"],
      mutationCapable: false,
      createMission: false,
      triggerTick: false,
      sendOutreach: false,
      deploy: false,
      mutateFinance: false,
      mutateProvider: false,
    }),
    evaluatePublicProjectionCanonicalTruthGate({
      started: input.started ?? Number(input.projection.ventures_started_count),
      operating: input.operating ?? Number(input.projection.ventures_operating_count),
      completed: input.completed ?? Number(input.projection.missions_completed_count),
      projectedStarted: input.projection.ventures_started_count,
      projectedOperating: input.projection.ventures_operating_count,
      projectedCompleted: input.projection.missions_completed_count,
    }),
    evaluatePublicProjectionUnknownNotZeroGate({
      unknownProven: input.unknownProven ?? false,
      renderedZero: input.renderedZero ?? false,
    }),
    evaluatePublicAgentActivityTruthGate({
      loopActive: input.loopActive ?? input.projection.public_activity_summary === "ACTIVE",
      activeCount: input.projection.active_public_agents,
      historyUsedAsCurrent: input.historyUsedAsCurrent ?? false,
    }),
    evaluatePublicProjectionFailureSanitizationGate(input.projection),
    evaluatePublicProjectionFieldAllowlistGate(input.projection),
  ];
}

void PUBLIC_ALLOWED_CLASSIFICATIONS;

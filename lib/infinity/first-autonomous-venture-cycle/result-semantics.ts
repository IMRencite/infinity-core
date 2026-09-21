import type { RunOpportunityScannerOutput } from "@/lib/infinity/opportunity-scanner/types";

export type Favc1CycleLevel =
  | "LEVEL_0_SYSTEM_FAILURE"
  | "INFRASTRUCTURE_BLOCKED"
  | "NO_GO_MARKET_DECISION"
  | "LEVEL_1"
  | "LEVEL_2"
  | "LEVEL_3"
  | "LEVEL_4";

export type Favc1OutcomeKind =
  | "CLOSED_LOOP_VERIFIED"
  | "BUSINESS_NO_GO"
  | "SYSTEM_FAILURE"
  | "INFRASTRUCTURE_BLOCKED";

const INFRASTRUCTURE_SCANNER_FAILURES = new Set([
  "infrastructure_blocked",
  "timeout",
]);

const SYSTEM_SCANNER_FAILURES = new Set([
  "scanner_unavailable",
  "schema_validation_failure",
  "grounding_unavailable",
  "persistence_failure",
  "budget_exceeded",
]);

export function mapScannerFailureToCycleLevel(
  failureClassification: string,
): Extract<Favc1CycleLevel, "LEVEL_0_SYSTEM_FAILURE" | "INFRASTRUCTURE_BLOCKED"> {
  if (INFRASTRUCTURE_SCANNER_FAILURES.has(failureClassification)) {
    return "INFRASTRUCTURE_BLOCKED";
  }
  if (SYSTEM_SCANNER_FAILURES.has(failureClassification)) {
    return "LEVEL_0_SYSTEM_FAILURE";
  }
  return "LEVEL_0_SYSTEM_FAILURE";
}

export function classifyFavc1Outcome(input: {
  ok: boolean;
  level: Favc1CycleLevel;
  closedLoopProven: boolean;
}): Favc1OutcomeKind {
  if (input.level === "INFRASTRUCTURE_BLOCKED") return "INFRASTRUCTURE_BLOCKED";
  if (input.level === "LEVEL_0_SYSTEM_FAILURE") return "SYSTEM_FAILURE";
  if (input.ok && input.closedLoopProven && input.level === "LEVEL_4") {
    return "CLOSED_LOOP_VERIFIED";
  }
  if (input.level === "NO_GO_MARKET_DECISION") return "BUSINESS_NO_GO";
  return "SYSTEM_FAILURE";
}

export function isTechnicalFavc1Failure(level: Favc1CycleLevel): boolean {
  return level === "LEVEL_0_SYSTEM_FAILURE" || level === "INFRASTRUCTURE_BLOCKED";
}

export function scannerFailureMessage(output: Extract<RunOpportunityScannerOutput, { ok: false }>): string {
  const code = output.failureClassification;
  return output.message ? `[${code}] ${output.message}` : `[${code}] Opportunity discovery failed`;
}

export function mapMarketRejectionReason(_reason: string): Favc1CycleLevel {
  return "NO_GO_MARKET_DECISION";
}

import {
  ATTEMPT_RESULTS,
  CURRENT_MILESTONE_HEALTH_GATE,
  EXECUTION_ATTEMPT_CONTRACT,
  EXECUTION_RESULT_LINEAGE_GATE,
  STALE_FAILURE_PROJECTION_GATE,
  SUPERSEDED_EXECUTION_ATTEMPT_CONTRACT,
  SUPERSEDED_EXECUTION_ATTEMPT_GATE,
  type ExecutionAttemptRecord,
  type MilestoneRunHistory,
  type NamedGateResult,
} from "./types";

function fail(gate: string, reasons: string[]): NamedGateResult {
  return { gate, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateExecutionAttemptContract(row: ExecutionAttemptRecord): NamedGateResult {
  const reasons: string[] = [];
  if (row.contract !== EXECUTION_ATTEMPT_CONTRACT) reasons.push("CONTRACT_MISMATCH");
  if (!row.attempt_id) reasons.push("ATTEMPT_ID_MISSING");
  if (!row.mission_id) reasons.push("MISSION_ID_MISSING");
  if (!row.step_id) reasons.push("STEP_ID_MISSING");
  if (!row.started_at) reasons.push("STARTED_AT_MISSING");
  if (!row.execution_context_id) reasons.push("EXECUTION_CONTEXT_MISSING");
  if (!row.input_version) reasons.push("INPUT_VERSION_MISSING");
  if (!ATTEMPT_RESULTS.includes(row.result)) reasons.push("RESULT_INVALID");
  if (!Array.isArray(row.evidence)) reasons.push("EVIDENCE_MISSING");
  return fail(EXECUTION_ATTEMPT_CONTRACT, reasons);
}

export function evaluateSupersededExecutionAttemptContract(row: ExecutionAttemptRecord): NamedGateResult {
  const reasons: string[] = [];
  if (row.result !== "SUPERSEDED") reasons.push("NOT_SUPERSEDED");
  if (!row.superseded_by) reasons.push("SUPERSEDED_BY_MISSING");
  if (!row.repair_reference) reasons.push("REPAIR_REFERENCE_MISSING");
  if (row.is_current) reasons.push("SUPERSEDED_MARKED_CURRENT");
  if (row.is_final) reasons.push("SUPERSEDED_MARKED_FINAL");
  return fail(SUPERSEDED_EXECUTION_ATTEMPT_CONTRACT, reasons);
}

export function canSupersedeFailure(input: {
  failed: ExecutionAttemptRecord;
  repairChangedRootCause: boolean;
  rerun: ExecutionAttemptRecord;
}): boolean {
  if (input.failed.result !== "FAIL" && input.failed.result !== "SUPERSEDED") return false;
  if (!input.repairChangedRootCause) return false;
  if (input.rerun.result !== "PASS") return false;
  if (input.rerun.step_id !== input.failed.step_id || input.rerun.mission_id !== input.failed.mission_id) return false;
  if (input.rerun.started_at <= input.failed.started_at) return false;
  if (!input.rerun.input_version || input.rerun.input_version < input.failed.input_version) return false;
  if (!input.failed.repair_reference && !input.rerun.repair_reference) return false;
  return true;
}

export function evaluateSupersededExecutionAttemptGate(input: {
  failed: ExecutionAttemptRecord;
  repairChangedRootCause: boolean;
  rerun: ExecutionAttemptRecord;
}): NamedGateResult {
  const reasons: string[] = [];
  if (!canSupersedeFailure(input)) reasons.push("SUPERSEDE_PRECONDITIONS_UNMET");
  if (input.failed.result === "SUPERSEDED" && input.failed.superseded_by !== input.rerun.attempt_id) {
    reasons.push("SUPERSEDE_LINEAGE_MISSING");
  }
  if (input.rerun.result === "PASS" && input.failed.is_current) reasons.push("FAILED_ATTEMPT_STILL_CURRENT");
  return fail(SUPERSEDED_EXECUTION_ATTEMPT_GATE, reasons);
}

export function projectCurrentExecutionResult(attempts: ExecutionAttemptRecord[]): MilestoneRunHistory {
  const sorted = [...attempts].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const current = [...sorted].reverse().find((row) => row.is_current && row.result !== "RUNNING")
    ?? [...sorted].reverse().find((row) => row.is_final)
    ?? sorted[sorted.length - 1]
    ?? null;
  const unresolved = sorted.filter((row) => row.result === "FAIL" && row.is_current && !row.superseded_by);
  const currentResult = current?.result === "SUPERSEDED" ? "FAIL" : current?.result ?? "NONE";
  return {
    mission_id: current?.mission_id ?? sorted[0]?.mission_id ?? "UNKNOWN",
    current,
    history: sorted,
    current_result: currentResult,
    current_headline: currentResult === "PASS"
      ? "Resolved after repair"
      : currentResult === "FAIL"
        ? "FAIL"
        : currentResult,
    superseded_count: sorted.filter((row) => row.result === "SUPERSEDED").length,
    unresolved_failures: unresolved.length,
  };
}

export function evaluateCurrentMilestoneHealthGate(history: MilestoneRunHistory): NamedGateResult {
  const reasons: string[] = [];
  if (history.unresolved_failures > 0) reasons.push(`UNRESOLVED_FAILURES:${history.unresolved_failures}`);
  if (history.current_result === "FAIL") reasons.push("CURRENT_RESULT_FAIL");
  if (history.current?.result === "SUPERSEDED") reasons.push("CURRENT_POINTS_AT_SUPERSEDED");
  return fail(CURRENT_MILESTONE_HEALTH_GATE, reasons);
}

export function evaluateStaleFailureProjectionGate(input: {
  history: MilestoneRunHistory;
  projectedCurrent: "PASS" | "FAIL" | "BLOCKED" | string;
}): NamedGateResult {
  const reasons: string[] = [];
  if (input.history.current_result === "PASS" && input.projectedCurrent === "FAIL") {
    reasons.push("STALE_FAILURE_SHOWN_AS_CURRENT");
  }
  if (input.history.current_result === "FAIL" && input.projectedCurrent === "PASS") {
    reasons.push("OLD_PASS_HIDING_NEWER_FAIL");
  }
  return fail(STALE_FAILURE_PROJECTION_GATE, reasons);
}

export function evaluateExecutionResultLineageGate(attempts: ExecutionAttemptRecord[]): NamedGateResult {
  const reasons: string[] = [];
  for (const row of attempts) {
    if (row.result === "SUPERSEDED" && !row.superseded_by) reasons.push(`SUPERSEDED_WITHOUT_SUCCESSOR:${row.attempt_id}`);
    if (row.result === "SUPERSEDED" && row.is_current) reasons.push(`SUPERSEDED_MARKED_CURRENT:${row.attempt_id}`);
    if (row.result === "PASS" && row.is_current === false && attempts.every((other) => other.started_at <= row.started_at || other.result !== "FAIL")) {
      /* older PASS may sit in history */
    }
  }
  const newest = [...attempts].sort((a, b) => a.started_at.localeCompare(b.started_at)).at(-1);
  if (newest?.result === "FAIL" && attempts.some((row) => row.result === "PASS" && row.is_current && row.started_at < newest.started_at)) {
    reasons.push("OLD_PASS_HIDING_NEWER_FAIL");
  }
  return fail(EXECUTION_RESULT_LINEAGE_GATE, reasons);
}

export function supersededAttemptContractName(): typeof SUPERSEDED_EXECUTION_ATTEMPT_CONTRACT {
  return SUPERSEDED_EXECUTION_ATTEMPT_CONTRACT;
}

export function historicalFailureIsActiveIncident(attempt: ExecutionAttemptRecord): boolean {
  return attempt.result === "FAIL" && attempt.is_current && !attempt.superseded_by;
}

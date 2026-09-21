import { historicalFailureIsActiveIncident, projectCurrentExecutionResult } from "./gates";
import type { ExecutionAttemptRecord, MilestoneRunHistory } from "./types";

export type ExecutionResultHqProjection = {
  current_status: string;
  historical_failed_attempt_visible: boolean;
  successful_rerun_visible: boolean;
  resolved_superseded_visible: boolean;
  operations_blocked_by_historical_failure: boolean;
  history: Array<{ attempt_id: string; result: string; headline: string }>;
};

export function projectExecutionResultHq(attempts: ExecutionAttemptRecord[]): ExecutionResultHqProjection & {
  milestone: MilestoneRunHistory;
} {
  const milestone = projectCurrentExecutionResult(attempts);
  return {
    milestone,
    current_status: milestone.current_headline,
    historical_failed_attempt_visible: milestone.history.some((row) => row.result === "FAIL" || row.result === "SUPERSEDED"),
    successful_rerun_visible: milestone.history.some((row) => row.result === "PASS"),
    resolved_superseded_visible: milestone.superseded_count > 0 && milestone.current_result === "PASS",
    operations_blocked_by_historical_failure: milestone.history.some(historicalFailureIsActiveIncident) && milestone.current_result !== "PASS",
    history: milestone.history.map((row) => ({
      attempt_id: row.attempt_id,
      result: row.result,
      headline: row.result === "SUPERSEDED" ? "Attempt FAIL · SUPERSEDED" : `Attempt ${row.result}`,
    })),
  };
}

import { RUNTIME_REGRESSION_RECURRENCE_GATE } from "./contract";

export type DefectHistoryState = "OPEN" | "RESOLVED" | "REGRESSION_REOPENED";

export type RuntimeDefectRecord = {
  defect_id: string;
  prior_state: DefectHistoryState;
  current_founder_or_served_fail: boolean;
  current_verification_pass: boolean;
};

export function evaluateRuntimeRegressionRecurrenceGate(record: RuntimeDefectRecord): {
  gate: string;
  result: "PASS" | "FAIL";
  state: DefectHistoryState;
  reasons: string[];
} {
  if (record.prior_state === "RESOLVED" && record.current_founder_or_served_fail) {
    return {
      gate: RUNTIME_REGRESSION_RECURRENCE_GATE,
      result: "FAIL",
      state: "REGRESSION_REOPENED",
      reasons: ["PREVIOUS_PASS_DOES_NOT_OVERRIDE_CURRENT_FOUNDER_FAILURE"],
    };
  }
  if (record.current_founder_or_served_fail) {
    return {
      gate: RUNTIME_REGRESSION_RECURRENCE_GATE,
      result: "FAIL",
      state: "OPEN",
      reasons: ["CURRENT_HEALTH_FAIL"],
    };
  }
  if (!record.current_verification_pass) {
    return {
      gate: RUNTIME_REGRESSION_RECURRENCE_GATE,
      result: "FAIL",
      state: record.prior_state === "RESOLVED" ? "REGRESSION_REOPENED" : "OPEN",
      reasons: ["CURRENT_VERIFICATION_INCOMPLETE"],
    };
  }
  return {
    gate: RUNTIME_REGRESSION_RECURRENCE_GATE,
    result: "PASS",
    state: "RESOLVED",
    reasons: [],
  };
}

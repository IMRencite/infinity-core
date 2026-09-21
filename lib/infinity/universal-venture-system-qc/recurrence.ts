import { evaluateRuntimeRegressionRecurrenceGate } from "@/lib/infinity/customer-facing-browser-qc/recurrence";
import type { QcStatus } from "./contract";

export function evaluateFounderPhysicalContradiction(input: {
  automation_result: "PASS" | "FAIL";
  founder_observes_failure: boolean;
}): {
  current: "FAIL" | "PASS";
  automation_historical: "PASS" | "FAIL";
  automation_is_current_truth: false | true;
} {
  if (input.founder_observes_failure) {
    const recurrence = evaluateRuntimeRegressionRecurrenceGate({
      defect_id: "founder-physical-contradiction",
      prior_state: input.automation_result === "PASS" ? "RESOLVED" : "OPEN",
      current_founder_or_served_fail: true,
      current_verification_pass: false,
    });
    return {
      current: "FAIL",
      automation_historical: input.automation_result,
      automation_is_current_truth: false,
      ...recurrence,
    };
  }
  return {
    current: input.automation_result,
    automation_historical: input.automation_result,
    automation_is_current_truth: true,
  };
}

export function higherEvidenceWins<T extends { level: string }>(
  rows: readonly T[],
  precedence: readonly string[],
): T | null {
  for (const level of precedence) {
    const match = rows.find((row) => row.level === level);
    if (match) return match;
  }
  return rows[0] ?? null;
}

export function statusFromGate(result: "PASS" | "FAIL" | "UNKNOWN" | "STALE" | "PARTIAL"): QcStatus {
  return result;
}

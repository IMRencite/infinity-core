export type QcResult = "PASS" | "FAIL" | "INCOMPLETE";
export type QcProcessTermination =
  | "NONE"
  | "MANUAL_AFTER_PROOF"
  | "TERMINATED_BEFORE_PROOF"
  | "CRASH";

export type QcProcessRecord = {
  qc_result: QcResult;
  process_termination: QcProcessTermination;
  proof_emitted: boolean;
};

export function classifyQcTermination(input: {
  proof_emitted: boolean;
  proof_result?: "PASS" | "FAIL";
  terminated: boolean;
  intentional?: boolean;
}): QcProcessRecord {
  if (!input.proof_emitted) {
    return {
      qc_result: "INCOMPLETE",
      process_termination: input.terminated ? "TERMINATED_BEFORE_PROOF" : "NONE",
      proof_emitted: false,
    };
  }
  if (input.proof_result === "FAIL") {
    return {
      qc_result: "FAIL",
      process_termination: input.terminated ? (input.intentional ? "MANUAL_AFTER_PROOF" : "CRASH") : "NONE",
      proof_emitted: true,
    };
  }
  return {
    qc_result: "PASS",
    process_termination: input.terminated && input.intentional ? "MANUAL_AFTER_PROOF" : input.terminated ? "CRASH" : "NONE",
    proof_emitted: true,
  };
}

export const SALES_FLOOR_HQ_VISUAL_QC_RECORD: QcProcessRecord = {
  qc_result: "PASS",
  process_termination: "MANUAL_AFTER_PROOF",
  proof_emitted: true,
};

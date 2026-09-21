import { createHash } from "node:crypto";

export const SECOND_QC_ESCAPE_V3 = "second-qc-escape-v3" as const;
export const SECOND_QC_ESCAPE_V3_REASON = "SEPARATE_DEFECT_PROOF_FROM_PUBLISH_READINESS" as const;

export const SECOND_QC_ESCAPE_V3_CRITERIA = [
  "A. known-bad fixture fails under repaired QC",
  "B. known-good fixture passes",
  "C. all 81 relevant live pages are evaluated",
  "D. no unresolved automated defects remain",
  "E. any automation-incomplete visual cases are surfaced explicitly",
  "F. the required QC version is actually present on the named serving Production artifact",
  "G. founder visual verdict = CLEAR",
] as const;

export function freezeExitConditionV3(frozen_at: string): {
  exit_condition_version: typeof SECOND_QC_ESCAPE_V3;
  criteria: typeof SECOND_QC_ESCAPE_V3_CRITERIA;
  criteria_text: string;
  exit_condition_hash: string;
  frozen_at: string;
  supersedes: "second-qc-escape-v2";
  reason: typeof SECOND_QC_ESCAPE_V3_REASON;
} {
  const criteria_text = SECOND_QC_ESCAPE_V3_CRITERIA.join("\n");
  return {
    exit_condition_version: SECOND_QC_ESCAPE_V3,
    criteria: SECOND_QC_ESCAPE_V3_CRITERIA,
    criteria_text,
    exit_condition_hash: createHash("sha256").update(criteria_text).digest("hex"),
    frozen_at,
    supersedes: "second-qc-escape-v2",
    reason: SECOND_QC_ESCAPE_V3_REASON,
  };
}

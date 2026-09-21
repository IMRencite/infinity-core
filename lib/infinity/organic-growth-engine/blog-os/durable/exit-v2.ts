import { createHash } from "node:crypto";

export const SECOND_QC_ESCAPE_V2 = "second-qc-escape-v2" as const;
export const SECOND_QC_ESCAPE_V2_REASON = "SERVING_QC_IDENTITY_REQUIREMENT_ADDED" as const;

export const SECOND_QC_ESCAPE_V2_CRITERIA = [
  "1. known-bad fixture rejected",
  "2. known-good fixture accepted",
  "3. live canary accepted",
  "4. full shared-component automated sweep passes",
  "5. human visual residual approved",
  "6. PRE_PUBLISH integration present",
  "7. LIVE_POST_PUBLISH integration present",
  "8. takedown path exercised",
  "9. blog-render-qc-v3 or newer required QC is present in the NAMED SERVING publication deployment",
  "10. serving runtime can report that QC version from code/artifact identity",
  "11. Blog Production Build passes",
  "12. founder approval path is valid",
] as const;

export function freezeExitConditionV2(frozen_at: string): {
  exit_condition_version: typeof SECOND_QC_ESCAPE_V2;
  criteria: typeof SECOND_QC_ESCAPE_V2_CRITERIA;
  criteria_text: string;
  exit_condition_hash: string;
  frozen_at: string;
  replaces: "second-qc-escape-v1";
  reason: typeof SECOND_QC_ESCAPE_V2_REASON;
} {
  const criteria_text = SECOND_QC_ESCAPE_V2_CRITERIA.join("\n");
  return {
    exit_condition_version: SECOND_QC_ESCAPE_V2,
    criteria: SECOND_QC_ESCAPE_V2_CRITERIA,
    criteria_text,
    exit_condition_hash: createHash("sha256").update(criteria_text).digest("hex"),
    frozen_at,
    replaces: "second-qc-escape-v1",
    reason: SECOND_QC_ESCAPE_V2_REASON,
  };
}

/**
 * VERIFIED_COMMITTED_PRODUCTION_FIX_V1 — operational policy (no new infrastructure).
 * Reversible, no-spend, in-scope venture/runtime fixes deploy same-session after gates PASS.
 */
export const VERIFIED_COMMITTED_FIX_SAME_SESSION_POLICY_ID = "VERIFIED_COMMITTED_PRODUCTION_FIX_V1" as const;

/** Commit exact repaired files before the next full isolated-runtime build iteration. */
export const RUNTIME_FIX_COMMIT_BEFORE_NEXT_DIAGNOSTIC_V1 = "RUNTIME_FIX_COMMIT_BEFORE_NEXT_DIAGNOSTIC_V1" as const;

export function runtimeFixCommitBeforeNextDiagnosticQc(input: {
  required_fixes_committed: boolean;
  no_accumulated_uncommitted_build_repairs: boolean;
}): "PASS" | "FAIL" {
  return input.required_fixes_committed && input.no_accumulated_uncommitted_build_repairs ? "PASS" : "FAIL";
}

export function evaluateVerifiedCommittedFixSameSessionPolicyQc(input: {
  committed_tree_only: boolean;
  required_tests_pass: boolean;
  required_build_pass: boolean;
  required_smoke_pass: boolean;
  reversible: boolean;
  no_spend: boolean;
  no_new_vendor_domain: boolean;
  no_legal_manufacturing: boolean;
}): { gate: string; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.committed_tree_only) reasons.push("committed_tree_only");
  if (!input.required_tests_pass) reasons.push("required_tests_pass");
  if (!input.required_build_pass) reasons.push("required_build_pass");
  if (!input.required_smoke_pass) reasons.push("required_smoke_pass");
  if (!input.reversible) reasons.push("reversible");
  if (!input.no_spend) reasons.push("no_spend");
  if (!input.no_new_vendor_domain) reasons.push("no_new_vendor_domain");
  if (!input.no_legal_manufacturing) reasons.push("no_legal_manufacturing");
  return {
    gate: "VerifiedCommittedFixSameSessionPolicyQc",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

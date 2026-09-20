import type { NamedOutboundLoopGate } from "../closed-loop";

export const UNSAFE_PRE_EPOCH_RUNTIME = "dpl_6dtsxZFscVtDGCKYsW8aKBwpZtNj" as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluatePostCutoverRollbackSafetyGate(input: {
  epoch: "LEGACY" | "OBLIGATION";
  proposed_rollback_deployment: string | null;
  active_obligation_send_ownership: boolean;
  epoch_reverted_first: boolean;
}): NamedOutboundLoopGate {
  if (input.epoch === "LEGACY") {
    return named("PostCutoverRollbackSafetyGate", "PASS", ["PRE_FLIP_ROLLBACK_ALLOWED", "DEFAULT_ROLL_FORWARD"]);
  }
  if (input.proposed_rollback_deployment === UNSAFE_PRE_EPOCH_RUNTIME) {
    return named("PostCutoverRollbackSafetyGate", "FAIL", ["UNSAFE_PRE_EPOCH_RUNTIME", "ROLL_FORWARD_REQUIRED"]);
  }
  if (input.active_obligation_send_ownership && !input.epoch_reverted_first) {
    return named("PostCutoverRollbackSafetyGate", "FAIL", ["OWNERSHIP_STILL_LIVE", "REVERT_EPOCH_FIRST"]);
  }
  return named("PostCutoverRollbackSafetyGate", input.epoch_reverted_first ? "PASS" : "PASS", [
    "DEFAULT_ROLL_FORWARD",
    "EPOCH_REVERT_BEFORE_RUNTIME_ROLLBACK",
  ]);
}

export const POST_CUTOVER_ROLLBACK_POLICY = {
  default: "ROLL_FORWARD" as const,
  old_pre_epoch_runtime_safe_after_flip: false,
  epoch_revert_procedure_exists: true,
  unsafe_runtime: UNSAFE_PRE_EPOCH_RUNTIME,
};

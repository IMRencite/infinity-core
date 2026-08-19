import { MAX_REPAIR_ATTEMPTS } from "./constants";
import type { CodingRouterOutcome } from "./constants";
import type { CodingAgentRun } from "./types";

export type RepairDecision = "CURSOR_RETRY" | "NATIVE_REPAIR" | "INDEPENDENT" | "HOLD" | "FAIL";

export function decideRepair(run: CodingAgentRun): RepairDecision {
  if (run.repairAttempts >= MAX_REPAIR_ATTEMPTS) return "FAIL";
  if (run.failureCode === "WORKSPACE_VIOLATION" || run.failureCode === "COMMAND_POLICY_VIOLATION") return "FAIL";
  if (run.failureCode === "COST_DENIED") return "HOLD";
  if (run.failureCode === "QA_FAILED" && run.provider === "mock_cursor") return "NATIVE_REPAIR";
  if (run.failureCode === "QA_FAILED") return "CURSOR_RETRY";
  if (run.routerOutcome === "MULTI_AGENT") return "INDEPENDENT";
  return "HOLD";
}

export function nextRepairOutcome(decision: RepairDecision): CodingRouterOutcome | null {
  if (decision === "NATIVE_REPAIR") return "INFINITY_NATIVE";
  if (decision === "CURSOR_RETRY") return "CURSOR";
  if (decision === "INDEPENDENT") return "MULTI_AGENT";
  return null;
}

import type { DepartmentUiState } from "../types";
import { deriveUiStateFromEngineStatus } from "../status-derivation";

const RUNNING_STATUSES = new Set([
  "requested",
  "running",
  "researching",
  "analyzing",
  "scoring",
  "ingesting",
  "generating",
  "processing",
  "executing",
  "in_progress",
  "active",
  "building",
  "evaluating",
]);

const COMPLETE_STATUSES = new Set(["completed", "complete", "ready", "succeeded", "success"]);
const FAILED_STATUSES = new Set(["failed", "policy_blocked", "cancelled", "canceled", "error"]);
const BLOCKED_STATUSES = new Set(["blocked", "paused", "suspended"]);

export function mapPersistedRunStatusToUi(status: string | null | undefined): DepartmentUiState {
  if (!status) return "NOT_STARTED";
  const normalized = status.toLowerCase().trim();
  if (RUNNING_STATUSES.has(normalized)) return "RUNNING";
  if (COMPLETE_STATUSES.has(normalized)) return "COMPLETE";
  if (FAILED_STATUSES.has(normalized)) return "FAILED";
  if (BLOCKED_STATUSES.has(normalized)) return "BLOCKED";
  return deriveUiStateFromEngineStatus(status);
}

export function isTerminalUiState(state: DepartmentUiState): boolean {
  return state === "COMPLETE" || state === "FAILED" || state === "SHUTDOWN" || state === "SKIPPED";
}

export function deriveDownstreamRoomState(input: {
  upstreamState: DepartmentUiState;
  upstreamFailed: boolean;
  ownState: DepartmentUiState;
  hasOwnRecords: boolean;
}): DepartmentUiState {
  if (input.ownState === "RUNNING" || input.ownState === "COMPLETE" || input.ownState === "FAILED") {
    return input.ownState;
  }
  if (input.hasOwnRecords) return input.ownState;
  if (input.upstreamFailed) return "BLOCKED";
  if (input.upstreamState === "NOT_STARTED") return "NOT_STARTED";
  if (input.upstreamState === "RUNNING") return "BLOCKED";
  if (input.upstreamState === "COMPLETE") return "NOT_STARTED";
  return "BLOCKED";
}

export function currentStageLabel(input: {
  discoveryState: DepartmentUiState;
  monetizationState: DepartmentUiState;
  selectionState: DepartmentUiState;
  terminalOutcome: string;
}): string {
  if (input.discoveryState === "RUNNING") return "Venture Radar";
  if (input.discoveryState === "FAILED") return "Venture Radar";
  if (input.monetizationState === "RUNNING") return "Profit Lab";
  if (input.monetizationState === "FAILED") return "Profit Lab";
  if (input.selectionState === "RUNNING") return "Blueprint Lab";
  if (input.selectionState === "FAILED") return "Blueprint Lab";
  if (input.terminalOutcome === "RUNNING") return "Autonomous cycle";
  if (input.terminalOutcome === "SYSTEM_FAILURE") return "Cycle interrupted";
  if (input.terminalOutcome === "BUSINESS_NO_GO" || input.terminalOutcome === "NO_GO_MARKET_DECISION") {
    return "Market decision complete";
  }
  if (input.terminalOutcome === "LEVEL_4") return "Mission complete";
  return "Autonomous cycle";
}

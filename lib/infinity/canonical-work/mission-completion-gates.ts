import { codingReadModelFromCapability, projectCodingCapability } from "@/lib/infinity/capability-truth/coding";
import { codingActiveRunCount } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import type { CommandActivityView } from "@/lib/infinity/mission-activity/types";
import { IMPLEMENTATION_WORK_IDLE_AFTER_MS } from "./current-implementation";
import {
  evaluateNamedMissionTerminalCondition,
  isGenericImplementationWork,
  type NamedMissionTerminalDecision,
} from "./mission-completion";
import type { CanonicalActiveWorkProjection, CanonicalWorkExecutionContract } from "./types";

export const CANONICAL_MISSION_COMPLETION_GATE = "CanonicalMissionCompletionGate" as const;
export const ACTIVE_WORK_TERMINAL_STATE_GATE = "ActiveWorkTerminalStateGate" as const;
export const CURRENT_CANONICAL_WORK_RESOLVER_GATE = "CurrentCanonicalWorkResolverGate" as const;
export const EXTERNAL_IMPLEMENTATION_AGENT_EXECUTION_GATE = "ExternalImplementationAgentExecutionGate" as const;
export const ACTIVE_RUN_COUNT_TRUTH_GATE = "ActiveRunCountTruthGate" as const;
export const HQ_NO_REFRESH_COMPLETION_PROPAGATION_GATE = "HQNoRefreshCompletionPropagationGate" as const;

export type NamedMissionGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };

function pass(gate: string, reason: string): NamedMissionGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedMissionGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateCanonicalMissionCompletionGate(input: {
  work: CanonicalWorkExecutionContract;
  decision: NamedMissionTerminalDecision;
  after: CanonicalWorkExecutionContract | null;
}): NamedMissionGate {
  const reasons: string[] = [];
  if (isGenericImplementationWork(input.work)) {
    if (input.decision.should_close) reasons.push("GENERIC_IMPLEMENTATION_CLOSED_BY_NAMED_RESOLVER");
    return reasons.length ? fail(CANONICAL_MISSION_COMPLETION_GATE, reasons) : pass(CANONICAL_MISSION_COMPLETION_GATE, "GENERIC_LEFT_TO_OWN_LIFECYCLE");
  }
  if (input.decision.should_close) {
    if (!input.after) reasons.push("TERMINAL_DECISION_DID_NOT_CLOSE");
    else if (input.after.status === "ACTIVE") reasons.push("CLOSED_WORK_STILL_ACTIVE");
    else if (input.after.work_id !== input.work.work_id) reasons.push("CLOSED_WRONG_WORK");
  }
  return reasons.length
    ? fail(CANONICAL_MISSION_COMPLETION_GATE, reasons)
    : pass(CANONICAL_MISSION_COMPLETION_GATE, input.decision.should_close ? input.decision.kind : "STILL_EXECUTING");
}

export function evaluateActiveWorkTerminalStateGate(input: {
  work: CanonicalWorkExecutionContract | null;
  current: CanonicalActiveWorkProjection;
}): NamedMissionGate {
  const reasons: string[] = [];
  if (input.work && (input.work.status === "COMPLETED" || input.work.status === "FAILED" || input.work.status === "CANCELLED" || input.work.status === "BLOCKED")) {
    if (input.current.work_id === input.work.work_id && input.current.status === "ACTIVE") {
      reasons.push("TERMINAL_WORK_STILL_CURRENT_ACTIVE");
    }
  }
  return reasons.length
    ? fail(ACTIVE_WORK_TERMINAL_STATE_GATE, reasons)
    : pass(ACTIVE_WORK_TERMINAL_STATE_GATE, "ONLY_ACTIVE_EXECUTION_IS_CURRENT");
}

export function evaluateCurrentCanonicalWorkResolverGate(input: {
  current: CanonicalActiveWorkProjection;
  expected_work_id: string | null;
}): NamedMissionGate {
  const actual = input.current.status === "ACTIVE" ? input.current.work_id : null;
  if (actual !== input.expected_work_id) {
    return fail(CURRENT_CANONICAL_WORK_RESOLVER_GATE, [`CURRENT_WORK_MISMATCH:${actual}:${input.expected_work_id}`]);
  }
  return pass(CURRENT_CANONICAL_WORK_RESOLVER_GATE, actual ? "CURRENT_WORK_MATCHES" : "CURRENT_WORK_IDLE");
}

export function evaluateExternalImplementationAgentExecutionGate(input: {
  current: CanonicalActiveWorkProjection;
  agent_status: string;
}): NamedMissionGate {
  const executing =
    input.current.status === "ACTIVE" && input.current.work?.source === "EXTERNAL_IMPLEMENTATION_AGENT";
  if (executing && input.agent_status !== "ACTIVE") {
    return fail(EXTERNAL_IMPLEMENTATION_AGENT_EXECUTION_GATE, ["ACTIVE_WORK_BUT_AGENT_IDLE"]);
  }
  if (!executing && input.agent_status === "ACTIVE") {
    return fail(EXTERNAL_IMPLEMENTATION_AGENT_EXECUTION_GATE, ["AGENT_ACTIVE_WITHOUT_CURRENT_WORK"]);
  }
  if (!executing && input.agent_status !== "PRESENT_IDLE") {
    return fail(EXTERNAL_IMPLEMENTATION_AGENT_EXECUTION_GATE, [`AGENT_NOT_PRESENT_IDLE:${input.agent_status}`]);
  }
  return pass(EXTERNAL_IMPLEMENTATION_AGENT_EXECUTION_GATE, executing ? "AGENT_ACTIVE_FROM_CURRENT_WORK" : "AGENT_PRESENT_IDLE");
}

export function evaluateActiveRunCountTruthGate(input: {
  current: CanonicalActiveWorkProjection;
  active_runs: number;
}): NamedMissionGate {
  const expected =
    input.current.status === "ACTIVE" && input.current.work?.source === "EXTERNAL_IMPLEMENTATION_AGENT" ? 1 : 0;
  if (input.active_runs !== expected) {
    return fail(ACTIVE_RUN_COUNT_TRUTH_GATE, [`ACTIVE_RUNS_MISMATCH:${input.active_runs}:${expected}`]);
  }
  return pass(ACTIVE_RUN_COUNT_TRUTH_GATE, `ACTIVE_RUNS_${expected}`);
}

export function evaluateHQNoRefreshCompletionPropagationGate(input: {
  events: Array<{ type: string }>;
  before_current_id: string | null;
  after_current_id: string | null;
  after_command_status: string | null;
}): NamedMissionGate {
  const reasons: string[] = [];
  if (!input.events.some((event) => event.type === "MISSION_COMPLETED" || event.type === "HQ_SNAPSHOT_INVALIDATED")) {
    reasons.push("NO_COMPLETION_EVENT");
  }
  if (input.before_current_id && input.after_current_id === input.before_current_id) {
    reasons.push("CURRENT_WORK_NOT_INVALIDATED");
  }
  if (input.after_current_id == null && input.after_command_status === "ACTIVE_WORK") {
    reasons.push("COMMAND_STILL_ACTIVE_AFTER_COMPLETION");
  }
  return reasons.length
    ? fail(HQ_NO_REFRESH_COMPLETION_PROPAGATION_GATE, reasons)
    : pass(HQ_NO_REFRESH_COMPLETION_PROPAGATION_GATE, "COMPLETION_BROADCAST_WITHOUT_REFRESH");
}

export function liveCodingFromCurrent(now?: string) {
  const coding = projectCodingCapability(now);
  const model = codingReadModelFromCapability("org", coding);
  return {
    coding,
    model,
    agent_status: model.providers.find((row) => /cursor/i.test(row.provider))?.status ?? "UNKNOWN",
    active_runs: codingActiveRunCount(model),
    connector: coding.connector_status,
  };
}

export function commandIdleAfterCompletion(view: CommandActivityView): boolean {
  return view.nowInspecting.status !== "ACTIVE_WORK" && view.nowInspecting.currentMission == null && view.counts.activeMissions === 0;
}

export function namedMissionDoesNotUseQuietTimer(): boolean {
  return IMPLEMENTATION_WORK_IDLE_AFTER_MS === 15_000;
}

export { evaluateNamedMissionTerminalCondition };

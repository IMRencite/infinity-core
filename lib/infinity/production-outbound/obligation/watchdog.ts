import type { NamedOutboundLoopGate } from "../closed-loop";
import { evaluateCommunicationAgeSlo, evaluateCommunicationOwnerDeadlineInvariant } from "./transition";
import { COMMUNICATION_TERMINAL_STATES, type CommunicationObligation } from "./types";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type CommunicationWatchdogSnapshot = {
  oldest_unresolved_ms: number | null;
  overdue_count: number;
  unowned_count: number;
  expired_lease_count: number;
  escalated_count: number;
  rearm_count: number;
  provider_uncertain_count: number;
  business_loop: "HEALTHY" | "DEGRADED";
  CommunicationWatchdog: NamedOutboundLoopGate;
};

export function evaluateCommunicationWatchdog(input: {
  obligations: CommunicationObligation[];
  now: string;
  expired_lease_count?: number;
  rearm_count?: number;
  provider_uncertain_count?: number;
}): CommunicationWatchdogSnapshot {
  const open = input.obligations.filter((row) => !COMMUNICATION_TERMINAL_STATES.includes(row.state));
  const overdue = open.filter((row) => evaluateCommunicationAgeSlo(row, input.now).result === "FAIL");
  const unowned = open.filter((row) => evaluateCommunicationOwnerDeadlineInvariant(row, input.now).reasons.includes("OWNER_OR_DEADLINE_MISSING"));
  const escalated = open.filter((row) => row.state === "ESCALATED");
  const ages = open.map((row) => Date.parse(input.now) - Date.parse(row.received_at));
  const oldest = ages.length ? Math.max(...ages) : null;
  const degraded = overdue.length > 0 || unowned.length > 0;
  return {
    oldest_unresolved_ms: oldest,
    overdue_count: overdue.length,
    unowned_count: unowned.length,
    expired_lease_count: input.expired_lease_count ?? 0,
    escalated_count: escalated.length,
    rearm_count: input.rearm_count ?? 0,
    provider_uncertain_count: input.provider_uncertain_count ?? 0,
    business_loop: degraded ? "DEGRADED" : "HEALTHY",
    CommunicationWatchdog: named(
      "CommunicationWatchdog",
      degraded ? "FAIL" : "PASS",
      degraded ? ["LIVENESS_VIOLATION"] : ["LIVENESS_OK"],
    ),
  };
}

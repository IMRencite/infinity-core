import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import {
  ORGANIC_TERMINAL_STATES,
  type OrganicTransitionLog,
  type OrganicWorkObligation,
  type OrganicWorkState,
} from "./types";

const LEGAL: Record<OrganicWorkState | "NONE", OrganicWorkState[]> = {
  NONE: ["SELECTED"],
  SELECTED: ["SCHEDULED", "DO_NOT_PUBLISH", "CANCELLED", "SUPERSEDED"],
  SCHEDULED: ["CLAIMED", "CANCELLED", "SUPERSEDED", "ESCALATED", "DO_NOT_PUBLISH"],
  CLAIMED: ["PUBLISHED", "SCHEDULED", "ESCALATED", "DO_NOT_PUBLISH", "CANCELLED"],
  PUBLISHED: ["VERIFIED", "ESCALATED", "SUPERSEDED"],
  VERIFIED: [],
  DO_NOT_PUBLISH: [],
  CANCELLED: [],
  SUPERSEDED: [],
  ESCALATED: ["SCHEDULED", "CANCELLED", "SUPERSEDED"],
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateOrganicWorkLivenessInvariant(obligation: OrganicWorkObligation, now: string): NamedOutboundLoopGate {
  if (ORGANIC_TERMINAL_STATES.includes(obligation.state)) {
    return named("OrganicWorkLivenessInvariant", "PASS", ["TERMINAL"]);
  }
  if (obligation.state === "ESCALATED" && obligation.owner && obligation.due_at) {
    return named("OrganicWorkLivenessInvariant", "PASS", ["ESCALATED_OWNED"]);
  }
  if (!obligation.owner || !(obligation.due_at || obligation.next_action_at)) {
    return named("OrganicWorkLivenessInvariant", "FAIL", ["OWNER_OR_DEADLINE_MISSING"]);
  }
  const deadline = obligation.due_at ?? obligation.next_action_at;
  if (deadline && Date.parse(now) > Date.parse(deadline)) {
    return named("OrganicWorkLivenessInvariant", "FAIL", ["OVERDUE"]);
  }
  return named("OrganicWorkLivenessInvariant", "PASS", ["LIVE"]);
}

export function transitionOrganicWork(input: {
  current: OrganicWorkObligation | null;
  to_state: OrganicWorkState;
  expected_version: number;
  actor: string;
  reason: string;
  evidence_ref?: string | null;
  now: string;
  owner?: string | null;
  due_at?: string | null;
  next_action_at?: string | null;
}): { ok: true; obligation: OrganicWorkObligation; log: OrganicTransitionLog } | { ok: false; reason: string } {
  const from = input.current?.state ?? "NONE";
  if (input.current && input.current.version !== input.expected_version) {
    return { ok: false, reason: "VERSION_CONFLICT" };
  }
  if (!LEGAL[from].includes(input.to_state)) {
    return { ok: false, reason: "ILLEGAL_TRANSITION" };
  }
  const created = input.current?.created_at ?? input.now;
  const obligation: OrganicWorkObligation = {
    obligation_id: input.current?.obligation_id ?? `organic-work:${input.now}`,
    venture_id: input.current?.venture_id ?? "occupancynpv",
    opportunity_id: input.current?.opportunity_id ?? "unknown",
    state: input.to_state,
    version: (input.current?.version ?? 0) + 1,
    owner: input.owner ?? input.current?.owner ?? "OrganicGrowthWorker",
    due_at: input.due_at ?? input.current?.due_at ?? null,
    next_action_at: input.next_action_at ?? input.current?.next_action_at ?? null,
    decision: input.current?.decision ?? "NO_ACTION",
    decision_reason: input.current?.decision_reason ?? input.reason,
    asset_type: input.current?.asset_type ?? "QUESTION_PAGE",
    title: input.current?.title ?? "",
    route: input.current?.route ?? "",
    created_at: created,
    updated_at: input.now,
  };
  if (!ORGANIC_TERMINAL_STATES.includes(obligation.state) && obligation.state !== "ESCALATED") {
    obligation.owner = obligation.owner ?? "OrganicGrowthWorker";
    obligation.next_action_at = obligation.next_action_at ?? input.now;
  }
  return {
    ok: true,
    obligation,
    log: {
      obligation_id: obligation.obligation_id,
      from_state: from,
      to_state: input.to_state,
      expected_version: input.expected_version,
      new_version: obligation.version,
      actor: input.actor,
      reason: input.reason,
      evidence_ref: input.evidence_ref ?? null,
      timestamp: input.now,
    },
  };
}

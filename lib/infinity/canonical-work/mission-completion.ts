import { HQ_CURRENT_IMPLEMENTATION_WORK_ID } from "./current-implementation";
import {
  completeCanonicalWork,
  listActiveCanonicalWork,
  markCanonicalWorkStatus,
} from "./store";
import { CANONICAL_WORK_EXECUTION_CONTRACT, type CanonicalWorkExecutionContract, type CanonicalWorkStatus } from "./types";

export const CANONICAL_MISSION_COMPLETION_RESOLVER = "CanonicalMissionCompletionResolver" as const;
export const OCCUPANCYNPV_SPEND_AUTHORITY_MISSION_ID =
  "work:occupancynpv:governed-venture-spend-authority-v1" as const;
export const OCCUPANCYNPV_FINANCIAL_COMMITMENT_MISSION_ID =
  "work:occupancynpv:venture-financial-commitment-v1" as const;

export const NAMED_MISSION_TERMINAL_STATUSES = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "SUPERSEDED",
] as const;

export type NamedMissionTerminalStatus = (typeof NAMED_MISSION_TERMINAL_STATUSES)[number];

export type MissionTerminalKind =
  | "EXPLICIT_CLOSE"
  | "VERIFIED_MILESTONE"
  | "WORKFLOW_TERMINAL"
  | "NONE";

export type NamedMissionTerminalDecision = {
  should_close: boolean;
  terminal_status: NamedMissionTerminalStatus;
  kind: MissionTerminalKind;
  reason: string;
};

export type VerifiedMissionMilestone = {
  work_id: string;
  milestone_id: string;
  qc_status: "QC_PASS" | "QC_FAIL";
  at: string;
};

export type NamedMissionCloseRecord = {
  work_id: string;
  terminal_status: NamedMissionTerminalStatus;
  reason: string;
  at: string;
};

const milestones = new Map<string, VerifiedMissionMilestone>();
const explicitCloses = new Map<string, NamedMissionCloseRecord>();

export function isGenericImplementationWork(work: Pick<CanonicalWorkExecutionContract, "work_id">): boolean {
  return work.work_id === HQ_CURRENT_IMPLEMENTATION_WORK_ID;
}

export function isNamedCanonicalMission(work: Pick<CanonicalWorkExecutionContract, "work_id">): boolean {
  return !isGenericImplementationWork(work);
}

export function resetCanonicalMissionCompletionState(): void {
  milestones.clear();
  explicitCloses.clear();
}

export function recordVerifiedMissionMilestone(input: VerifiedMissionMilestone): VerifiedMissionMilestone {
  const next = { ...input };
  milestones.set(next.work_id, next);
  return next;
}

export function verifiedMilestoneFor(workId: string): VerifiedMissionMilestone | null {
  return milestones.get(workId) ?? null;
}

export function closeCanonicalNamedMission(input: {
  work_id: string;
  output: string;
  terminal_status?: NamedMissionTerminalStatus;
  reason?: string;
  now?: string;
}): CanonicalWorkExecutionContract | null {
  if (input.work_id === HQ_CURRENT_IMPLEMENTATION_WORK_ID) return null;
  const now = input.now ?? new Date().toISOString();
  const terminal_status = input.terminal_status ?? "COMPLETED";
  explicitCloses.set(input.work_id, {
    work_id: input.work_id,
    terminal_status,
    reason: input.reason ?? "EXPLICIT_CANONICAL_MISSION_CLOSE",
    at: now,
  });
  if (terminal_status === "COMPLETED") {
    return completeCanonicalWork(input.work_id, input.output, now);
  }
  return markCanonicalWorkStatus(input.work_id, terminal_status, {
    updated_at: now,
    completed_at: now,
    latest_output: input.output,
  });
}

function workflowLooksTerminal(work: CanonicalWorkExecutionContract): boolean {
  const transition = work.next_expected_transition ?? "";
  return (
    /WORK_COMPLETES_THEN_IDLE|COMPLETED · floor idle|QC_LOCKED|_LOCKED$/i.test(transition)
    && /COMPLETE|LOCKED|IDLE/i.test(transition)
  );
}

export function evaluateNamedMissionTerminalCondition(
  work: CanonicalWorkExecutionContract,
): NamedMissionTerminalDecision {
  if (isGenericImplementationWork(work)) {
    return { should_close: false, terminal_status: "COMPLETED", kind: "NONE", reason: "GENERIC_IMPLEMENTATION_HAS_OWN_LIFECYCLE" };
  }
  if ((NAMED_MISSION_TERMINAL_STATUSES as readonly string[]).includes(work.status)) {
    return { should_close: false, terminal_status: work.status as NamedMissionTerminalStatus, kind: "NONE", reason: "ALREADY_TERMINAL" };
  }
  if (work.status === "BLOCKED" || work.status === "AUTHORIZATION_REQUIRED" || work.status === "WAITING" || work.status === "QUEUED") {
    return { should_close: false, terminal_status: "COMPLETED", kind: "NONE", reason: "NOT_ACTIVE_EXECUTION" };
  }
  if (work.status !== "ACTIVE") {
    return { should_close: false, terminal_status: "COMPLETED", kind: "NONE", reason: "NOT_ACTIVE" };
  }
  const explicit = explicitCloses.get(work.work_id);
  if (explicit) {
    return {
      should_close: true,
      terminal_status: explicit.terminal_status,
      kind: "EXPLICIT_CLOSE",
      reason: explicit.reason,
    };
  }
  const milestone = milestones.get(work.work_id);
  if (milestone?.qc_status === "QC_PASS") {
    return {
      should_close: true,
      terminal_status: "COMPLETED",
      kind: "VERIFIED_MILESTONE",
      reason: `QC_PASS:${milestone.milestone_id}`,
    };
  }
  if (milestone?.qc_status === "QC_FAIL") {
    return {
      should_close: true,
      terminal_status: "FAILED",
      kind: "VERIFIED_MILESTONE",
      reason: `QC_FAIL:${milestone.milestone_id}`,
    };
  }
  if (work.completed_at && work.status === "ACTIVE") {
    return {
      should_close: true,
      terminal_status: "COMPLETED",
      kind: "WORKFLOW_TERMINAL",
      reason: "COMPLETED_AT_WITHOUT_TERMINAL_STATUS",
    };
  }
  if (workflowLooksTerminal(work) && work.work_id === OCCUPANCYNPV_SPEND_AUTHORITY_MISSION_ID) {
    return {
      should_close: true,
      terminal_status: "COMPLETED",
      kind: "WORKFLOW_TERMINAL",
      reason: "SPEND_AUTHORITY_WORKFLOW_TERMINAL",
    };
  }
  if (workflowLooksTerminal(work) && work.work_id === OCCUPANCYNPV_FINANCIAL_COMMITMENT_MISSION_ID) {
    return {
      should_close: true,
      terminal_status: "COMPLETED",
      kind: "WORKFLOW_TERMINAL",
      reason: "FINANCIAL_COMMITMENT_WORKFLOW_TERMINAL",
    };
  }
  return { should_close: false, terminal_status: "COMPLETED", kind: "NONE", reason: "STILL_EXECUTING" };
}

export function resolveCanonicalMissionCompletions(
  now = new Date().toISOString(),
): CanonicalWorkExecutionContract[] {
  const closed: CanonicalWorkExecutionContract[] = [];
  for (const work of listActiveCanonicalWork()) {
    if (isGenericImplementationWork(work)) continue;
    const decision = evaluateNamedMissionTerminalCondition(work);
    if (!decision.should_close) continue;
    const output = `${work.latest_output} · ${decision.terminal_status} · ${decision.reason}`;
    const next =
      decision.terminal_status === "COMPLETED"
        ? completeCanonicalWork(work.work_id, output, now)
        : markCanonicalWorkStatus(work.work_id, decision.terminal_status, {
            updated_at: now,
            completed_at: now,
            latest_output: output,
            next_expected_transition: "WORK_COMPLETES_THEN_IDLE",
          });
    if (next) closed.push(next);
  }
  return closed;
}

export function ensureVerifiedSpendAuthorityMilestone(now = new Date().toISOString()): VerifiedMissionMilestone {
  return recordVerifiedMissionMilestone({
    work_id: OCCUPANCYNPV_SPEND_AUTHORITY_MISSION_ID,
    milestone_id: "occupancynpv-governed-venture-spend-authority-v1",
    qc_status: "QC_PASS",
    at: now,
  });
}

export function ensureVerifiedCommitmentMilestone(now = new Date().toISOString()): VerifiedMissionMilestone {
  return recordVerifiedMissionMilestone({
    work_id: OCCUPANCYNPV_FINANCIAL_COMMITMENT_MISSION_ID,
    milestone_id: "occupancynpv-venture-financial-commitment-v1",
    qc_status: "QC_PASS",
    at: now,
  });
}

export function namedMissionCompletionContract(): typeof CANONICAL_WORK_EXECUTION_CONTRACT {
  return CANONICAL_WORK_EXECUTION_CONTRACT;
}

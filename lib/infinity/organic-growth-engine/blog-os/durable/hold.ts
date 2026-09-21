import {
  CURRENT_HOLD_ID,
  type CheckResult,
  type DurableBlogHold,
} from "./types";
import { freezeExitConditionV2 } from "./exit-v2";
import { freezeExitConditionV3, SECOND_QC_ESCAPE_V3, SECOND_QC_ESCAPE_V3_CRITERIA } from "./exit-v3";

export const SECOND_QC_ESCAPE_EXIT_CRITERIA = SECOND_QC_ESCAPE_V3_CRITERIA;

let v2Freeze: ReturnType<typeof freezeExitConditionV2> | null = null;
let v3Freeze: ReturnType<typeof freezeExitConditionV3> | null = null;

export function freezeV2Now(now = new Date().toISOString()) {
  if (!v2Freeze) v2Freeze = freezeExitConditionV2(now);
  return v2Freeze;
}

export function freezeV3Now(now = new Date().toISOString()) {
  if (!v3Freeze) v3Freeze = freezeExitConditionV3(now);
  return v3Freeze;
}

export function EXIT_CONDITION_FROZEN_AT(): string {
  return freezeV3Now().frozen_at;
}

export function exitConditionHash(): string {
  return freezeV3Now().exit_condition_hash;
}

export function evidenceIsStale(collected_at: string, frozen_at = freezeV3Now().frozen_at): boolean {
  return Date.parse(collected_at) < Date.parse(frozen_at);
}

export const FOUNDER_VISUAL_QUESTION =
  "Does the repaired a.vg-cta inside .pv-cta-panel treatment resolve the escaped text-over-background and spacing defect across the supplied desktop, tablet, and mobile renders?";

export const ENGINEERING_OWNER = "OrganicRelease" as const;
export const FOUNDER_DECISION_OWNER = "FOUNDER" as const;

const memory = new Map<string, DurableBlogHold>();

export function resetDurableHolds(): void {
  memory.clear();
  v2Freeze = null;
  v3Freeze = null;
}

export function currentSecondQcHold(now = new Date().toISOString()): DurableBlogHold {
  const frozen = freezeV3Now(now);
  return {
    hold_id: CURRENT_HOLD_ID,
    venture_id: "occupancynpv",
    reason: "SECOND_QC_ESCAPE",
    created_at: "2026-09-20T08:34:00.000Z",
    owner: "OrganicRelease",
    engineering_owner: ENGINEERING_OWNER,
    founder_decision_owner: FOUNDER_DECISION_OWNER,
    due_at: "2026-09-22T04:53:00.000Z",
    next_review_at: "2026-09-22T04:53:00.000Z",
    requested_at: null,
    renotify_at: null,
    escalation_count: 0,
    exit_condition_version: SECOND_QC_ESCAPE_V3,
    exit_condition_frozen_at: frozen.frozen_at,
    exit_condition_hash: frozen.exit_condition_hash,
    evidence_required: [...SECOND_QC_ESCAPE_V3_CRITERIA],
    evidence_pack_url: "NOT_EXTERNAL",
    founder_review_status: "NOT_ACTIONABLE_ENGINEERING_BLOCKED",
    resolved_at: null,
  };
}

export function persistDurableHold(hold: DurableBlogHold): DurableBlogHold {
  memory.set(hold.hold_id, hold);
  return hold;
}

export function getDurableHold(hold_id = CURRENT_HOLD_ID): DurableBlogHold | null {
  return memory.get(hold_id) ?? null;
}

export function listDurableHolds(): DurableBlogHold[] {
  return [...memory.values()];
}

export function publicationProhibited(hold: DurableBlogHold | null): boolean {
  return Boolean(hold && !hold.resolved_at);
}

function urlIsLocalOrAgentControlled(url: string): boolean {
  return !url || url === "NOT_EXTERNAL" || /localhost|127\.0\.0\.1/.test(url);
}

export function evaluateHoldActionabilityCheck(hold: DurableBlogHold | null): CheckResult {
  if (!hold) return { check: "HoldActionabilityCheck", result: "FAIL", reasons: ["HOLD_MISSING"] };
  const missing: string[] = [];
  if (!hold.engineering_owner) missing.push("ENGINEERING_OWNER");
  if (hold.founder_decision_owner !== "FOUNDER") missing.push("FOUNDER_DECISION_OWNER");
  if (urlIsLocalOrAgentControlled(hold.evidence_pack_url)) missing.push("LOCALHOST_NOT_EXTERNAL");
  if (!hold.exit_condition_version || !hold.exit_condition_hash) missing.push("EXIT_CONDITION");
  if (!hold.evidence_required.length) missing.push("EVIDENCE_REQUIRED");
  if (!hold.requested_at) missing.push("HUMAN_CLOCK_NOT_STARTED");
  return {
    check: "HoldActionabilityCheck",
    result: missing.length ? "FAIL" : "PASS",
    reasons: missing.length ? missing : ["HOLD_ACTIONABLE"],
  };
}

export function watchHold(hold: DurableBlogHold, now: string): DurableBlogHold {
  if (hold.resolved_at) return hold;
  if (Date.parse(now) <= Date.parse(hold.due_at)) return hold;
  return persistDurableHold({
    ...hold,
    escalation_count: hold.escalation_count + 1,
    next_review_at: now,
  });
}

export function startFounderReviewClock(hold: DurableBlogHold, now: string): DurableBlogHold {
  if (urlIsLocalOrAgentControlled(hold.evidence_pack_url)) {
    return persistDurableHold({
      ...hold,
      requested_at: null,
      founder_review_status: "NOT_ACTIONABLE_ENGINEERING_BLOCKED",
    });
  }
  return persistDurableHold({
    ...hold,
    requested_at: hold.requested_at ?? now,
    founder_review_status: "AWAITING_HUMAN",
    renotify_at: hold.renotify_at ?? now,
  });
}

export function founderMayReview(input: {
  evidence_complete: boolean;
  path_reachable: boolean;
  externally_reachable: boolean;
  agent_cannot_approve: boolean;
}): boolean {
  return input.evidence_complete && input.path_reachable && input.externally_reachable && input.agent_cannot_approve;
}

export function applyFounderHoldDecision(input: {
  hold: DurableBlogHold;
  actor: string;
  decision: "CLEAR" | "KEEP";
  evidence_complete: boolean;
  now: string;
  authentication_method?: string;
}): { hold: DurableBlogHold; accepted: boolean; reason: string } {
  if (input.actor !== "FOUNDER") return { hold: input.hold, accepted: false, reason: "FOUNDER_FACTOR_REQUIRED" };
  if (input.authentication_method === "ENV_TOKEN" || input.authentication_method === "CRON_SECRET") {
    return { hold: input.hold, accepted: false, reason: "AGENT_FORGEABLE_FACTOR" };
  }
  if (input.decision === "CLEAR" && !input.evidence_complete) {
    return { hold: input.hold, accepted: false, reason: "EXIT_CONDITION_UNSATISFIED" };
  }
  const next = persistDurableHold({
    ...input.hold,
    founder_review_status: input.decision,
    resolved_at: null,
  });
  return { hold: next, accepted: true, reason: input.decision === "CLEAR" ? "HUMAN_VISUAL_CONDITION_CLEARED" : "KEEP" };
}

import { AUTONOMOUS_COMMITMENT_CREATION_ENABLED } from "@/lib/infinity/financial-truth/spend-authority";
import { evaluateNoMoneyMovementGate } from "@/lib/infinity/financial-truth/financial-commitment-gates";
import { evaluateCanonicalMissionCompletionGate } from "@/lib/infinity/canonical-work/mission-completion-gates";
import { evaluateHQLiveWorkSurfaceConsistencyGate } from "@/lib/infinity/canonical-work/gates";
import type { AutonomousDecision } from "./types";
import type { AutonomousObservation } from "./observe";
import type { AutonomousLoopPersistedState } from "./types";

export type NamedLoopGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };

function pass(gate: string, reason: string): NamedLoopGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedLoopGate {
  return { gate, result: "FAIL", reasons };
}

export const AUTONOMOUS_OPERATING_LOOP_GATE = "AutonomousOperatingLoopGate" as const;
export const AUTONOMOUS_NEXT_MISSION_GATE = "AutonomousNextMissionGate" as const;
export const AUTONOMOUS_MISSION_DEDUPLICATION_GATE = "AutonomousMissionDeduplicationGate" as const;
export const AUTONOMOUS_LOOP_RUNAWAY_GATE = "AutonomousLoopRunawayGate" as const;
export const AUTONOMOUS_LOOP_RESTART_SAFETY_GATE = "AutonomousLoopRestartSafetyGate" as const;
export const AUTONOMOUS_ACTION_IDEMPOTENCY_GATE = "AutonomousActionIdempotencyGate" as const;
export const WAITING_FOR_EVIDENCE_VALIDITY_GATE = "WaitingForEvidenceValidityGate" as const;
export const NO_BUSYWORK_GATE = "NoBusyworkGate" as const;
export const PROVIDER_FAILURE_BUSINESS_INFERENCE_GATE = "ProviderFailureBusinessInferenceGate" as const;
export const LEARNING_TO_ACTION_GATE = "LearningToActionGate" as const;
export const FINANCIAL_AUTHORITY_BEFORE_ACTION_GATE = "FinancialAuthorityBeforeActionGate" as const;
export const AUTONOMOUS_COMMITMENT_DISABLED_GATE = "AutonomousCommitmentDisabledGate" as const;
export const PAID_ACQUISITION_AUTHORITY_GATE = "PaidAcquisitionAuthorityGate" as const;
export const NO_MONEY_MOVEMENT_LOOP_GATE = "NoMoneyMovementGate" as const;
export const CANONICAL_MISSION_COMPLETION_LOOP_GATE = "CanonicalMissionCompletionGate" as const;
export const HQ_LIVE_WORK_SURFACE_CONSISTENCY_LOOP_GATE = "HQLiveWorkSurfaceConsistencyGate" as const;
export const UNIVERSAL_QC_BEFORE_RELEASE_GATE = "UniversalQCBeforeReleaseGate" as const;

export function evaluateAutonomousOperatingLoopGate(input: {
  statesSupported: string[];
  durable: boolean;
  eventDriven: boolean;
  restartSafe: boolean;
}): NamedLoopGate {
  const reasons: string[] = [];
  if (input.statesSupported.length < 10) reasons.push("MISSING_LOOP_STATES");
  if (!input.durable) reasons.push("SCHEDULER_NOT_DURABLE");
  if (!input.eventDriven) reasons.push("NO_EVENT_WAKEUPS");
  if (!input.restartSafe) reasons.push("NOT_RESTART_SAFE");
  return reasons.length
    ? fail(AUTONOMOUS_OPERATING_LOOP_GATE, reasons)
    : pass(AUTONOMOUS_OPERATING_LOOP_GATE, "DURABLE_EVENT_RESTART_SAFE_LOOP");
}

export function evaluateAutonomousNextMissionGate(decision: AutonomousDecision): NamedLoopGate {
  const reasons: string[] = [];
  if (decision.contract !== "AutonomousNextMissionResolver") reasons.push("MISSING_RESOLVER_CONTRACT");
  if (!decision.reason) reasons.push("MISSING_REASON");
  if (!decision.priority) reasons.push("MISSING_PRIORITY");
  if (decision.outcome === "WAIT_FOR_EVIDENCE" && decision.evidence.every((row) => !/SEND_EXECUTED|DEPLOY|EXPERIMENT/.test(row))) {
    reasons.push("WAIT_WITHOUT_REAL_DEPENDENCY");
  }
  return reasons.length
    ? fail(AUTONOMOUS_NEXT_MISSION_GATE, reasons)
    : pass(AUTONOMOUS_NEXT_MISSION_GATE, decision.outcome);
}

export function evaluateAutonomousMissionDeduplicationGate(input: {
  proposed: string | null;
  active: string[];
  recent: string[];
  created: boolean;
}): NamedLoopGate {
  if (!input.proposed) return pass(AUTONOMOUS_MISSION_DEDUPLICATION_GATE, "NO_MISSION_PROPOSED");
  if (input.active.includes(input.proposed) && input.created) {
    return fail(AUTONOMOUS_MISSION_DEDUPLICATION_GATE, ["DUPLICATE_ACTIVE_MISSION"]);
  }
  if (input.recent.includes(input.proposed) && input.created) {
    return fail(AUTONOMOUS_MISSION_DEDUPLICATION_GATE, ["DUPLICATE_RECENT_MISSION"]);
  }
  return pass(AUTONOMOUS_MISSION_DEDUPLICATION_GATE, input.created ? "UNIQUE_MISSION" : "CREATION_SKIPPED");
}

export function evaluateAutonomousLoopRunawayGate(input: {
  consecutiveFailures: number;
  sameDecisionStreak: number;
  paused: boolean;
}): NamedLoopGate {
  if (input.consecutiveFailures >= 5 && !input.paused) {
    return fail(AUTONOMOUS_LOOP_RUNAWAY_GATE, ["REPEATED_FAILURE_NOT_PAUSED"]);
  }
  if (input.sameDecisionStreak >= 8 && !input.paused) {
    return fail(AUTONOMOUS_LOOP_RUNAWAY_GATE, ["REPEATED_SAME_DECISION_NOT_BOUNDED"]);
  }
  return pass(AUTONOMOUS_LOOP_RUNAWAY_GATE, input.paused ? "PAUSED_AFTER_REPEATED_FAILURE" : "WITHIN_BOUNDS");
}

export function evaluateAutonomousLoopRestartSafetyGate(input: {
  loadedState: boolean;
  duplicateExternalAction: boolean;
}): NamedLoopGate {
  if (!input.loadedState) return fail(AUTONOMOUS_LOOP_RESTART_SAFETY_GATE, ["STATE_NOT_LOADED"]);
  if (input.duplicateExternalAction) return fail(AUTONOMOUS_LOOP_RESTART_SAFETY_GATE, ["RESTART_REPEATED_EXTERNAL_ACTION"]);
  return pass(AUTONOMOUS_LOOP_RESTART_SAFETY_GATE, "RESUME_WITHOUT_DUPLICATE");
}

export function evaluateAutonomousActionIdempotencyGate(input: {
  firstKey: string | null;
  retryKey: string | null;
  firstCount: number;
  retryCount: number;
}): NamedLoopGate {
  const same = Boolean(input.firstKey) && input.firstKey === input.retryKey && input.firstCount === input.retryCount;
  return same
    ? pass(AUTONOMOUS_ACTION_IDEMPOTENCY_GATE, "RETRY_DID_NOT_DUPLICATE")
    : fail(AUTONOMOUS_ACTION_IDEMPOTENCY_GATE, ["RETRY_CREATED_DUPLICATE"]);
}

export function evaluateWaitingForEvidenceValidityGate(input: {
  outcome: string;
  lastActionKind: string | null;
  dependencyKind: string | null;
}): NamedLoopGate {
  if (input.outcome !== "WAIT_FOR_EVIDENCE") {
    return pass(WAITING_FOR_EVIDENCE_VALIDITY_GATE, "NOT_WAITING");
  }
  const valid = Boolean(input.lastActionKind) && Boolean(input.dependencyKind);
  return valid
    ? pass(WAITING_FOR_EVIDENCE_VALIDITY_GATE, input.dependencyKind ?? "DEPENDENCY")
    : fail(WAITING_FOR_EVIDENCE_VALIDITY_GATE, ["WAITING_USED_AS_GENERIC_IDLE"]);
}

export function evaluateNoBusyworkGate(input: {
  outcome: string;
  missionCreated: boolean;
  spendAttempted: boolean;
}): NamedLoopGate {
  if (input.outcome === "NO_ACTION_JUSTIFIED" && (input.missionCreated || input.spendAttempted)) {
    return fail(NO_BUSYWORK_GATE, ["BUSYWORK_CREATED_FROM_IDLE"]);
  }
  return pass(NO_BUSYWORK_GATE, input.outcome === "NO_ACTION_JUSTIFIED" ? "IDLE_IS_SUCCESS" : "ACTION_JUSTIFIED");
}

export function evaluateProviderFailureBusinessInferenceGate(input: {
  failureClass: string;
  inferredMarketRejection: boolean;
}): NamedLoopGate {
  if (input.failureClass === "PROVIDER_FAILURE" && input.inferredMarketRejection) {
    return fail(PROVIDER_FAILURE_BUSINESS_INFERENCE_GATE, ["PROVIDER_FAILURE_TREATED_AS_MARKET_REJECTION"]);
  }
  return pass(PROVIDER_FAILURE_BUSINESS_INFERENCE_GATE, "INFRASTRUCTURE_NOT_MARKET");
}

export function evaluateLearningToActionGate(input: {
  learningRecorded: boolean;
  behaviorChanged: boolean;
}): NamedLoopGate {
  if (input.learningRecorded && !input.behaviorChanged) {
    return fail(LEARNING_TO_ACTION_GATE, ["LEARNING_LOGGED_BUT_IGNORED"]);
  }
  return pass(LEARNING_TO_ACTION_GATE, input.learningRecorded ? "LEARNING_CHANGED_SELECTION" : "NO_LEARNING_YET");
}

export function evaluateFinancialAuthorityBeforeActionGate(input: {
  spendRequired: number;
  remainingAuthority: number;
  spendBecauseAuthorityExists: boolean;
  commitmentCreated: boolean;
}): NamedLoopGate {
  const reasons: string[] = [];
  if (input.spendBecauseAuthorityExists) reasons.push("AUTHORITY_TREATED_AS_COMMAND");
  if (input.spendRequired > input.remainingAuthority) reasons.push("SPEND_EXCEEDS_AUTHORITY");
  if (input.commitmentCreated && !AUTONOMOUS_COMMITMENT_CREATION_ENABLED) {
    reasons.push("AUTONOMOUS_COMMITMENT_CREATED");
  }
  return reasons.length
    ? fail(FINANCIAL_AUTHORITY_BEFORE_ACTION_GATE, reasons)
    : pass(FINANCIAL_AUTHORITY_BEFORE_ACTION_GATE, "AUTHORITY_IS_CONSTRAINT_NOT_COMMAND");
}

export function evaluateAutonomousCommitmentDisabledGate(created: boolean): NamedLoopGate {
  if (created) return fail(AUTONOMOUS_COMMITMENT_DISABLED_GATE, ["AUTONOMOUS_COMMITMENT_CREATED"]);
  if (AUTONOMOUS_COMMITMENT_CREATION_ENABLED) {
    return fail(AUTONOMOUS_COMMITMENT_DISABLED_GATE, ["FLAG_ENABLED"]);
  }
  return pass(AUTONOMOUS_COMMITMENT_DISABLED_GATE, "RECOMMENDED_ONLY");
}

export function evaluatePaidAcquisitionAuthorityLoopGate(input: {
  paidAcquisitionAttempted: boolean;
  paidAcquisitionAuthority: number;
}): NamedLoopGate {
  if (input.paidAcquisitionAttempted || input.paidAcquisitionAuthority !== 0) {
    return fail(PAID_ACQUISITION_AUTHORITY_GATE, ["PAID_ACQUISITION_NOT_BLOCKED"]);
  }
  return pass(PAID_ACQUISITION_AUTHORITY_GATE, "PAID_ACQUISITION_BLOCKED");
}

export function evaluateLoopNoMoneyMovementGate(moneyMoved: boolean): NamedLoopGate {
  void moneyMoved;
  const gate = evaluateNoMoneyMovementGate({
    mercuryWriteAccess: false,
    moneyMovementEnabled: false,
    achEnabled: false,
    wireEnabled: false,
    cardsEnabled: false,
    recipientCreationEnabled: false,
    externalPurchaseEnabled: false,
  });
  return {
    gate: gate.gate,
    result: gate.result === "FAIL" ? "FAIL" : "PASS",
    reasons: gate.reasons,
  };
}

export function evaluateLoopCanonicalMissionCompletionGate(input: Parameters<typeof evaluateCanonicalMissionCompletionGate>[0]): NamedLoopGate {
  return evaluateCanonicalMissionCompletionGate(input);
}

export function evaluateLoopHQLiveWorkSurfaceConsistencyGate(
  input: Parameters<typeof evaluateHQLiveWorkSurfaceConsistencyGate>[0],
): NamedLoopGate {
  return evaluateHQLiveWorkSurfaceConsistencyGate(input);
}

export function evaluateUniversalQCBeforeReleaseGate(input: {
  released: boolean;
  qcPassed: boolean;
}): NamedLoopGate {
  if (input.released && !input.qcPassed) {
    return fail(UNIVERSAL_QC_BEFORE_RELEASE_GATE, ["RELEASED_WITHOUT_QC"]);
  }
  return pass(UNIVERSAL_QC_BEFORE_RELEASE_GATE, input.released ? "QC_PASSED_BEFORE_RELEASE" : "NO_RELEASE");
}

export function evaluateAutonomousLoopSafetyBundle(input: {
  observation: AutonomousObservation;
  decision: AutonomousDecision;
  state: AutonomousLoopPersistedState;
  missionCreated: boolean;
  moneyMoved: boolean;
  commitmentCreated: boolean;
  paidAcquisitionAttempted: boolean;
}): NamedLoopGate[] {
  return [
    evaluateAutonomousNextMissionGate(input.decision),
    evaluateAutonomousMissionDeduplicationGate({
      proposed: input.decision.selected_mission,
      active: input.observation.active_missions.map((row) => row.work_id),
      recent: input.observation.recent_completed.map((row) => row.work_id),
      created: input.missionCreated,
    }),
    evaluateNoBusyworkGate({
      outcome: input.decision.outcome,
      missionCreated: input.missionCreated,
      spendAttempted: input.decision.spend_required > 0,
    }),
    evaluateWaitingForEvidenceValidityGate({
      outcome: input.decision.outcome,
      lastActionKind: input.state.last_action_kind,
      dependencyKind: input.state.waiting_dependency?.kind ?? null,
    }),
    evaluateFinancialAuthorityBeforeActionGate({
      spendRequired: input.decision.spend_required,
      remainingAuthority: input.observation.occupancy?.remaining_spend_authority ?? 0,
      spendBecauseAuthorityExists: false,
      commitmentCreated: input.commitmentCreated,
    }),
    evaluateAutonomousCommitmentDisabledGate(input.commitmentCreated),
    evaluatePaidAcquisitionAuthorityLoopGate({
      paidAcquisitionAttempted: input.paidAcquisitionAttempted,
      paidAcquisitionAuthority: 0,
    }),
    evaluateLoopNoMoneyMovementGate(input.moneyMoved),
  ];
}

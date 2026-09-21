import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { LIVE_CRE_EXPERIMENT_STATE } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { getExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { isActionableContact, type ContactabilityRecord } from "./contactability";

export const FIRST_COHORT_MAX_PROSPECTS = 5 as const;
export const FIRST_COHORT_MIN_PROSPECTS = 3 as const;
export const FIRST_COHORT_MAX_SENDS = 5 as const;
export const FIRST_OUTREACH_COOLDOWN_MS = 14 * 86_400_000;
export const FIRST_OUTREACH_ATTEMPT_CEILING = 1 as const;

export type ContactGovernanceInput = {
  experimentId: string;
  prospectId: string;
  name: string;
  organization: string;
  qualified: boolean;
  synthetic: boolean;
  optedOut: boolean;
  duplicate: boolean;
  cooldownUntil: string | null;
  activeInOtherCohort: boolean;
  contactability: ContactabilityRecord;
  attempts: number;
  now?: Date;
};

export type ContactGovernanceDecision = {
  allowed: boolean;
  reason: string;
  realIdentity: "PASS" | "FAIL";
  qualification: "PASS" | "FAIL";
  validContact: "PASS" | "FAIL";
  optOut: "PASS" | "FAIL";
  duplicate: "PASS" | "FAIL";
  cooldown: "PASS" | "FAIL";
  otherCohort: "PASS" | "FAIL";
  experimentCollecting: "PASS" | "FAIL";
  deadline: "PASS" | "FAIL";
  attemptCeiling: "PASS" | "FAIL";
};

export function lockedExperimentCollectingState(experimentId: string): string {
  if (experimentId !== LOCKED_CRE_EXPERIMENT_ID) {
    return getExperimentRuntimeState(experimentId) ?? "UNKNOWN";
  }
  return getExperimentRuntimeState(experimentId) ?? LIVE_CRE_EXPERIMENT_STATE;
}

export function evaluateContactGovernance(input: ContactGovernanceInput): ContactGovernanceDecision {
  const clock = inspectExperimentClock(input.now);
  const identityOk = Boolean(input.name.trim() && input.organization.trim() && input.prospectId.trim() && !input.synthetic);
  const contactOk = isActionableContact(input.contactability) && Boolean(input.contactability.channel);
  const collecting = lockedExperimentCollectingState(input.experimentId) === "COLLECTING";
  const deadlineOk = !clock.windowExpired && input.experimentId === LOCKED_CRE_EXPERIMENT_ID;
  const cooldownActive =
    Boolean(input.cooldownUntil) && Date.parse(input.cooldownUntil!) > (input.now ?? new Date()).getTime();
  const attemptOk = input.attempts < FIRST_OUTREACH_ATTEMPT_CEILING;
  const gates = {
    realIdentity: (identityOk ? "PASS" : "FAIL") as "PASS" | "FAIL",
    qualification: (input.qualified ? "PASS" : "FAIL") as "PASS" | "FAIL",
    validContact: (contactOk ? "PASS" : "FAIL") as "PASS" | "FAIL",
    optOut: (input.optedOut ? "FAIL" : "PASS") as "PASS" | "FAIL",
    duplicate: (input.duplicate ? "FAIL" : "PASS") as "PASS" | "FAIL",
    cooldown: (cooldownActive ? "FAIL" : "PASS") as "PASS" | "FAIL",
    otherCohort: (input.activeInOtherCohort ? "FAIL" : "PASS") as "PASS" | "FAIL",
    experimentCollecting: (collecting ? "PASS" : "FAIL") as "PASS" | "FAIL",
    deadline: (deadlineOk ? "PASS" : "FAIL") as "PASS" | "FAIL",
    attemptCeiling: (attemptOk ? "PASS" : "FAIL") as "PASS" | "FAIL",
  };
  const failed = Object.entries(gates).find(([, value]) => value === "FAIL");
  return {
    allowed: !failed,
    reason: failed ? failed[0] : "ALLOWED",
    ...gates,
  };
}

export function cohortCeilingRespected(size: number): boolean {
  return size <= FIRST_COHORT_MAX_PROSPECTS;
}

export function firstCohortReady(size: number): boolean {
  return size >= FIRST_COHORT_MIN_PROSPECTS && size <= FIRST_COHORT_MAX_PROSPECTS;
}

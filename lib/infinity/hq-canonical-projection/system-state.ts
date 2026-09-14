import type { HqSystemState } from "./types";

export function deriveHqSystemState(input: {
  activeInteractiveMissions: number;
  blockedMissions: number;
  authorizationRequired: boolean;
  scheduledRuntimeActive: boolean;
  waitingForEvidence: boolean;
  criticalFulfillmentAlert: boolean;
}): HqSystemState {
  if (input.criticalFulfillmentAlert) return "BLOCKED";
  if (input.activeInteractiveMissions > 0 || input.scheduledRuntimeActive) {
    return input.waitingForEvidence ? "WAITING_FOR_EVIDENCE" : "OPERATING";
  }
  if (input.authorizationRequired) return "AUTHORIZATION_REQUIRED";
  if (input.blockedMissions > 0) return "BLOCKED";
  if (input.waitingForEvidence) return "WAITING_FOR_EVIDENCE";
  return "IDLE";
}

export function interactiveMissionIdle(status: string | null | undefined): boolean {
  return status === "PRESENT_IDLE" || status === "EMPTY" || status == null;
}

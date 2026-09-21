import type { OutreachBlocker } from "./acquisition-outreach-gate";

export const MARKET_VALIDATION_ACQUISITION = "MARKET_VALIDATION_ACQUISITION" as const;

export type AcquisitionMissionState = "READY_BLOCKED" | "WAITING" | "ACTIVE_WORK";

export function inspectMarketValidationAcquisitionMission(input: {
  blocker: OutreachBlocker;
  messagesBeingPrepared: boolean;
}): {
  missionType: typeof MARKET_VALIDATION_ACQUISITION;
  missionState: AcquisitionMissionState;
  waitingFor: OutreachBlocker;
  activeWorkTruthful: boolean;
} {
  const executing = input.messagesBeingPrepared && input.blocker === "NONE";
  return {
    missionType: MARKET_VALIDATION_ACQUISITION,
    missionState: executing ? "ACTIVE_WORK" : "READY_BLOCKED",
    waitingFor: input.blocker,
    activeWorkTruthful: !executing,
  };
}

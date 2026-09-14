import { ROOM_ACTIVITY_EMPTY } from "@/lib/infinity/operator-console/room-activity";
import { isLiveExecutionStatus } from "./status";
import type { CommandActivityView } from "./types";

export const HQ_FRONT_MUST_SHOW_LIVE_WORK = true as const;

export function hqLiveRooms(view: CommandActivityView): string[] {
  return Object.entries(view.rooms)
    .filter(([, slice]) => slice.status === "ACTIVE_WORK" || isLiveExecutionStatus(slice.status))
    .map(([room]) => room);
}

export function hqFrontLooksIdleWhileWorking(input: {
  view: CommandActivityView;
  commandNowSentence?: string | null;
}): boolean {
  const live = isLiveExecutionStatus(input.view.nowInspecting.status) || input.view.counts.activeMissions > 0;
  if (!live) return false;
  const sentence = input.commandNowSentence ?? "";
  return sentence === ROOM_ACTIVITY_EMPTY || /no active work is assigned/i.test(sentence);
}

export function evaluateHqFrontLiveWorkVisibility(input: {
  view: CommandActivityView;
  commandNowSentence?: string | null;
}): "PASS" | "FAIL" {
  if (!HQ_FRONT_MUST_SHOW_LIVE_WORK) return "FAIL";
  if (!input.view.nowInspecting.currentMission && input.view.counts.activeMissions > 0) return "FAIL";
  if (hqFrontLooksIdleWhileWorking(input)) return "FAIL";
  if (input.view.nowInspecting.status === "ACTIVE_WORK" && hqLiveRooms(input.view).length === 0) return "FAIL";
  return "PASS";
}

import { projectCurrentWorkNarrative } from "@/lib/infinity/current-work-narrative";
import type { CurrentWorkNarrative } from "@/lib/infinity/current-work-narrative";
import { occupancyNpvAffiliateNow } from "@/lib/infinity/affiliate-referral/occupancy";
import { salesRoomExactWork } from "@/lib/infinity/autonomous-sales-execution/hq";
import { SALES_FLOOR_DEPARTMENT_ID, type SalesRoomId, type SalesRoomState } from "./contract";
import type { SalesFloorHqView, SalesRoomProjection } from "./types";

export function salesRoomCurrentWork(room: SalesRoomProjection, ventureName: string, ventureId: string): CurrentWorkNarrative {
  const copy = roomNarrative(room.room, room.state, ventureName);
  return projectCurrentWorkNarrative({
    ventureId,
    departmentId: SALES_FLOOR_DEPARTMENT_ID,
    roomId: room.room,
    state: room.state,
    action: copy.action,
    object: copy.object,
    purpose: copy.purpose,
    displayText: copy.displayText,
    nextExpectedAction: room.next_action,
    sourceType: "SALES_ROOM",
    sourceId: `sales-room:${room.room}:${room.state}`,
    workerLabel: null,
    workerState: room.state,
  });
}

export function salesFloorCurrentWork(view: SalesFloorHqView): CurrentWorkNarrative {
  return projectCurrentWorkNarrative({
    ventureId: view.venture_id,
    departmentId: SALES_FLOOR_DEPARTMENT_ID,
    roomId: "SALES_FLOOR",
    state: view.status,
    action: "Building",
    object: "universal affiliate-program capability",
    purpose: "every future commercial venture receives Affiliate & Referral by default",
    displayText: "Building the affiliate-program capability that every future commercial venture will receive.",
    nextExpectedAction: view.next_actions[0] ?? "Keep sales rooms evidence-backed",
    sourceType: "SALES_FLOOR",
    sourceId: `sales-floor:${view.venture_id}:${view.status}`,
    workerLabel: null,
    workerState: view.status,
  });
}

export function partnershipsAffiliateNow(): string {
  return occupancyNpvAffiliateNow();
}

function roomNarrative(room: SalesRoomId, state: SalesRoomState, venture: string): {
  action: string;
  object: string;
  purpose: string;
  displayText: string;
} {
  if (room === "OUTBOUND_ACQUISITION") {
    return {
      action: state === "ACTIVE" ? "Sending" : "Qualifying",
      object: `${venture} tenant-rep prospects`,
      purpose: "advance the existing outbound campaign without unauthorized mass outreach",
      displayText: salesRoomExactWork(room, state === "ACTIVE"),
    };
  }
  if (room === "INBOUND_CONVERSION") {
    return {
      action: state === "ACTIVE" ? "Converting" : "Monitoring",
      object: `${venture} trial starts, demo requests, and inbound sales questions`,
      purpose: "respond only to legally available inbound intent",
      displayText: salesRoomExactWork(room, state === "ACTIVE"),
    };
  }
  if (room === "EXPANSION_RETENTION") {
    return {
      action: state === "PRESENT_IDLE" || state === "WAITING" ? "Waiting" : "Monitoring",
      object: `${venture} customer evidence`,
      purpose: "do not treat prospects as customers",
      displayText: salesRoomExactWork(room, false),
    };
  }
  if (room === "PARTNERSHIPS_CHANNEL") {
    return {
      action: "Building",
      object: `${venture} affiliate program`,
      purpose: "prepare qualified recruitment channels without sending outreach",
      displayText: partnershipsAffiliateNow(),
    };
  }
  return {
    action: "Preparing",
    object: `qualified ${venture} commercial intent`,
    purpose: "take ownership only when a qualified opportunity exists",
    displayText: salesRoomExactWork("OFFER_CLOSING", false),
  };
}

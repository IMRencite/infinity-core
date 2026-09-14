import type { RoomPresenceState } from "@/lib/infinity/operator-console/room-presence";
import type { CanonicalCodingTaskStatus } from "../constants";

/** Map a persisted coding run onto existing HQ presence states. Never invents a fake orb. */
export function codingRunPresence(status: CanonicalCodingTaskStatus | null | undefined): RoomPresenceState {
  if (!status) return "EMPTY";
  if (status === "RUNNING" || status === "QA_RUNNING" || status === "ROUTED") return "ACTIVE_WORK";
  if (status === "PENDING" || status === "PROVIDER_COMPLETED" || status === "ACCEPTED" || status === "FAILED" || status === "BLOCKED" || status === "DEFERRED") {
    return "PRESENT_IDLE";
  }
  return "EMPTY";
}

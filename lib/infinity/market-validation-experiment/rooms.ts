import { roomPresenceFromTasks } from "@/lib/infinity/venture-build-orchestration/rooms";
import type { ExecutableTask } from "@/lib/infinity/venture-build-orchestration/types";
import { ROOM_DISPLAY_NAMES } from "@/lib/infinity/operator-console/room-naming";

export const EXPERIMENT_ROOM_LABELS = {
  product_lab: ROOM_DISPLAY_NAMES.product_lab.displayName,
  quality_control: ROOM_DISPLAY_NAMES.quality_control.displayName,
  launch_operations: ROOM_DISPLAY_NAMES.launch_operations.displayName,
  intelligence_center: ROOM_DISPLAY_NAMES.intelligence_center.displayName,
} as const;

export function experimentRoomPresence(tasks: ExecutableTask[]) {
  return roomPresenceFromTasks(tasks).filter((item) =>
    ["product_lab", "quality_control", "launch_operations", "intelligence_center"].includes(item.roomId),
  );
}

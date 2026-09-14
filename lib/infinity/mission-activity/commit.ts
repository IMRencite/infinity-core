import { persistMissionActivityEventBestEffort } from "./persist-engine";
import { persistMissionActivityToDisk } from "./store";
import type { MissionActivityEvent } from "./types";

/**
 * Disk is written synchronously at emit time. Engine persist was previously
 * fire-and-forget (`void`), so a writer process could exit before HQ could
 * query engine_events. Instrumented missions await this after every emit.
 */
export async function commitMissionActivityDurably(event: MissionActivityEvent): Promise<number> {
  persistMissionActivityToDisk();
  return persistMissionActivityEventBestEffort(event);
}

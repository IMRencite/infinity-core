import { resetPublicProjectionCache } from "./cache";
import { deriveCanonicalPublicOccupancy, salesSnapshotToOccupancy } from "./derive-occupancy";
import { persistCanonicalPublicOccupancy } from "./persist-occupancy";
import type { CanonicalOccupancyLevel, CanonicalPublicOccupancy } from "./occupancy";
import type { InternalLoopObservation } from "./types";

export async function publishCanonicalPublicOccupancy(input: {
  now?: string;
  loop?: InternalLoopObservation | null;
  hqRooms?: Record<string, string | null | undefined>;
  prospect?: { activity: CanonicalOccupancyLevel };
  sales?: { status: "ACTIVE" | "MONITORING" | "PRESENT_IDLE" | "WAITING" | "BLOCKED" | "DEGRADED" | "IDLE"; sending?: boolean };
  organic?: { occupancy: CanonicalOccupancyLevel };
}): Promise<CanonicalPublicOccupancy> {
  const occupancy = deriveCanonicalPublicOccupancy({
    now: input.now ?? new Date().toISOString(),
    loop: input.loop,
    hqRooms: input.hqRooms,
    prospect: input.prospect,
    sales: input.sales,
    organic: input.organic,
  });
  await persistCanonicalPublicOccupancy(occupancy);
  resetPublicProjectionCache();
  return occupancy;
}

export { salesSnapshotToOccupancy };

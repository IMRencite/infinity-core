import type { HqRoomArtifactMap } from "@/lib/infinity/operator-console/artifacts/types";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";

export function mergeRoomArtifacts(
  base: HqRoomArtifactMap | undefined,
  extra: HqRoomArtifactMap,
): HqRoomArtifactMap {
  const out: HqRoomArtifactMap = { ...base };
  for (const [roomId, artifacts] of Object.entries(extra)) {
    const key = roomId as DepartmentId;
    out[key] = [...(out[key] ?? []), ...(artifacts ?? [])];
  }
  return out;
}

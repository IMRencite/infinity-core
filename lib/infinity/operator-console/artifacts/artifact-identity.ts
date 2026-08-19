import type { HqRoomArtifactMap, HqWorkArtifact } from "./types";

export type ArtifactIdentityParts = {
  artifactType: string;
  sourceRecordType: string;
  sourceRecordId: string;
  artifactRole?: string | null;
};

/** Stable canonical render identity for HQ artifacts. */
export function buildArtifactRenderId(parts: ArtifactIdentityParts): string {
  const role = parts.artifactRole?.trim();
  if (role) {
    return `${parts.artifactType}:${parts.sourceRecordType}:${parts.sourceRecordId}:${role}`;
  }
  return `${parts.artifactType}:${parts.sourceRecordType}:${parts.sourceRecordId}`;
}

export function artifactRenderId(artifact: HqWorkArtifact): string {
  const role = artifact.metadata.artifactRole?.toString();
  if (role) return buildArtifactRenderId({ ...artifact, artifactRole: role });
  return artifact.id;
}

export type ArtifactUniquenessDiagnostic = {
  renderId: string;
  count: number;
  artifactIds: string[];
  rooms: string[];
};

export function findDuplicateArtifactRenderIds(
  roomArtifacts: HqRoomArtifactMap | Partial<Record<string, HqWorkArtifact[]>>,
): ArtifactUniquenessDiagnostic[] {
  const byRenderId = new Map<string, { artifactIds: string[]; rooms: string[] }>();

  for (const [roomId, artifacts] of Object.entries(roomArtifacts)) {
    for (const artifact of artifacts ?? []) {
      const renderId = artifactRenderId(artifact);
      const entry = byRenderId.get(renderId) ?? { artifactIds: [], rooms: [] };
      entry.artifactIds.push(artifact.id);
      entry.rooms.push(roomId);
      byRenderId.set(renderId, entry);
    }
  }

  return [...byRenderId.entries()]
    .filter(([, entry]) => entry.artifactIds.length > 1)
    .map(([renderId, entry]) => ({
      renderId,
      count: entry.artifactIds.length,
      artifactIds: entry.artifactIds,
      rooms: entry.rooms,
    }));
}

export function assertUniqueHqArtifactIds(
  roomArtifacts: HqRoomArtifactMap | Partial<Record<string, HqWorkArtifact[]>>,
): void {
  const duplicates = findDuplicateArtifactRenderIds(roomArtifacts);
  if (duplicates.length === 0) return;

  const detail = duplicates
    .map(
      (d) =>
        `${d.renderId} (${d.count}x in ${[...new Set(d.rooms)].join(", ")}) ids=${d.artifactIds.join("|")}`,
    )
    .join("; ");

  if (process.env.NODE_ENV !== "production") {
    throw new Error(`HQ artifact render identity collision: ${detail}`);
  }
}

/** Production-safe dedupe: only drop exact semantic duplicates (same render id). */
export function dedupeRoomArtifactsByRenderId(
  roomArtifacts: HqRoomArtifactMap,
): HqRoomArtifactMap {
  const out: HqRoomArtifactMap = {};
  for (const [roomId, artifacts] of Object.entries(roomArtifacts)) {
    const seen = new Set<string>();
    out[roomId as keyof HqRoomArtifactMap] = [];
    for (const artifact of artifacts ?? []) {
      const renderId = artifactRenderId(artifact);
      if (seen.has(renderId)) continue;
      seen.add(renderId);
      out[roomId as keyof HqRoomArtifactMap]!.push(artifact);
    }
  }
  return out;
}

export function indexArtifactsById(
  roomArtifacts: Partial<Record<string, HqWorkArtifact[]>>,
): Map<string, HqWorkArtifact> {
  const map = new Map<string, HqWorkArtifact>();
  for (const artifacts of Object.values(roomArtifacts)) {
    for (const artifact of artifacts ?? []) {
      map.set(artifact.id, artifact);
    }
  }
  return map;
}

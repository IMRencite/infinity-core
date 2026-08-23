import type { HqWorkArtifact } from "./types";
import { colorKeyForLineageId } from "./lineage-palette";
import { readHqCandidateLineageIds } from "../architecture-entity";

export type HqLineageType = "candidate" | "venture";

export type ResolvedArtifactLineage = {
  lineageId: string | null;
  lineageType: HqLineageType | null;
  colorKey: string | null;
  label: string | null;
  index: number | null;
};

export type ArtifactLineageContext = {
  candidateRankById: Map<string, number>;
  candidateTitleById: Map<string, string>;
  selectedCandidateId: string | null;
  ventureIdByCandidateId?: Map<string, string>;
};

const NEUTRAL: ResolvedArtifactLineage = {
  lineageId: null,
  lineageType: null,
  colorKey: null,
  label: null,
  index: null,
};

function rankLabel(index: number | null): string | null {
  if (index == null) return null;
  return `#${index}`;
}

function resolveCandidateId(artifact: HqWorkArtifact, context: ArtifactLineageContext): string | null {
  if (artifact.artifactType === "opportunity_candidate") {
    return artifact.sourceRecordId;
  }

  const lineageIds = readHqCandidateLineageIds(artifact);
  if (lineageIds.length === 1) return lineageIds[0] ?? null;
  if (lineageIds.length > 1) return null;

  const selected = artifact.metadata.selected === true;
  if (selected && context.selectedCandidateId) {
    return context.selectedCandidateId;
  }

  if (
    context.selectedCandidateId &&
    (artifact.artifactType === "validation_evidence" ||
      artifact.artifactType === "validation_experiment" ||
      (artifact.artifactType === "decision" && artifact.roomId === "quality_control") ||
      (artifact.artifactType === "research_packet" && artifact.roomId === "quality_control"))
  ) {
    return context.selectedCandidateId;
  }

  return null;
}

/** Central resolver — canonical linkage only; never infer from titles or array order. */
export function resolveArtifactLineage(
  artifact: HqWorkArtifact,
  context: ArtifactLineageContext,
): ResolvedArtifactLineage {
  if (artifact.artifactType === "research_packet" || artifact.artifactType === "source_cluster") {
    if (artifact.roomId === "research_department") {
      const lineageIds = readHqCandidateLineageIds(artifact);
      if (lineageIds.length !== 1) return NEUTRAL;
    }
  }

  if (artifact.artifactType === "mission") {
    return NEUTRAL;
  }

  const candidateId = resolveCandidateId(artifact, context);
  if (!candidateId) {
    return NEUTRAL;
  }

  const index = context.candidateRankById.get(candidateId) ?? null;
  const ventureId = context.ventureIdByCandidateId?.get(candidateId) ?? null;
  const lineageId = ventureId ?? candidateId;
  const lineageType: HqLineageType = ventureId ? "venture" : "candidate";

  return {
    lineageId,
    lineageType,
    colorKey: colorKeyForLineageId(candidateId),
    label: rankLabel(index),
    index,
  };
}

export function applyLineageFields(
  artifact: HqWorkArtifact,
  context: ArtifactLineageContext,
): HqWorkArtifact {
  const lineage = resolveArtifactLineage(artifact, context);
  if (!lineage.lineageId || !lineage.colorKey) {
    return artifact;
  }

  return {
    ...artifact,
    lineageId: lineage.lineageId,
    lineageType: lineage.lineageType ?? undefined,
    lineageColorKey: lineage.colorKey,
    lineageLabel: lineage.label ?? undefined,
    lineageIndex: lineage.index ?? undefined,
  };
}

export function buildCandidateRankMap(artifacts: HqWorkArtifact[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const artifact of artifacts) {
    if (artifact.artifactType !== "opportunity_candidate") continue;
    const rank = artifact.metadata.rank;
    if (typeof rank === "number") {
      map.set(artifact.sourceRecordId, rank);
    }
  }
  return map;
}

export function applyLineageToRoomArtifacts(
  roomArtifacts: Partial<Record<string, HqWorkArtifact[]>>,
  context: ArtifactLineageContext,
): Partial<Record<string, HqWorkArtifact[]>> {
  const out: Partial<Record<string, HqWorkArtifact[]>> = {};
  for (const [roomId, artifacts] of Object.entries(roomArtifacts)) {
    out[roomId] = (artifacts ?? []).map((artifact) => applyLineageFields(artifact, context));
  }
  return out;
}

export function resolveHandoffLineageColorKey(
  handoffStage: string | null | undefined,
  context: ArtifactLineageContext,
): string | null {
  if (!handoffStage || !context.selectedCandidateId) return null;
  if (handoffStage === "selection_to_validation") {
    return colorKeyForLineageId(context.selectedCandidateId);
  }
  return null;
}

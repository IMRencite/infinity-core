import type { DepartmentId } from "./types";
import type { HqWorkArtifact } from "./artifacts/types";
import {
  isResearchGridArtifact,
  readHqCandidateId,
  readHqCandidateLineageIds,
} from "./architecture-entity";
import { canonicalizeInspectionRef, hqVentureIdentitiesMatch } from "@/lib/infinity/hq-inspection-identity/aliases";
import {
  OPPORTUNITY_INSPECTION_ROOMS,
  type HqInspectionContext,
  type HqInspectionRef,
} from "./inspection-model";

export const LEGACY_RESEARCH_LINEAGE_NOTICE =
  "Some legacy research lacks candidate lineage and is not shown in this scoped view.";

export function isRoomCompatibleWithInspection(roomId: DepartmentId, context: HqInspectionContext): boolean {
  if (roomId === "operations") return true;
  if (context.status !== "ACTIVE" || context.entityType !== "OPPORTUNITY_CANDIDATE") return true;
  return OPPORTUNITY_INSPECTION_ROOMS.includes(roomId);
}

function artifactHasVentureResearchLineage(artifact: HqWorkArtifact, ventureId: string): boolean {
  const metaVentureId = artifact.metadata.ventureId;
  if (typeof metaVentureId === "string" && metaVentureId.trim() === ventureId) return true;
  return artifact.lineageType === "venture" && artifact.lineageId === ventureId;
}

export function artifactBelongsToInspection(artifact: HqWorkArtifact, context: HqInspectionContext): boolean {
  if (context.status !== "ACTIVE" || !context.entityId) return true;
  const lineageIds = readHqCandidateLineageIds(artifact);
  if (context.entityType === "OPPORTUNITY_CANDIDATE") {
    return lineageIds.includes(context.entityId);
  }
  if (context.entityType === "VENTURE") {
    const matchesInspected = (value: string | null | undefined) => hqVentureIdentitiesMatch(value, context.entityId);
    if (isResearchGridArtifact(artifact)) {
      return artifactHasVentureResearchLineage(artifact, context.entityId) || matchesInspected(artifact.lineageId);
    }
    return lineageIds.length === 0 || lineageIds.some((id) => matchesInspected(id));
  }
  return true;
}

export function filterArtifactsForInspection(
  artifacts: HqWorkArtifact[],
  context: HqInspectionContext,
  roomId: DepartmentId,
): HqWorkArtifact[] {
  if (context.status === "UNAVAILABLE") return [];
  if (context.status !== "ACTIVE") return artifacts;
  if (context.entityType === "VENTURE" && roomId === "research_department") {
    return artifacts.filter((artifact) => artifactBelongsToInspection(artifact, context));
  }
  if (context.entityType !== "OPPORTUNITY_CANDIDATE") return artifacts;
  if (roomId === "opportunity_lab") return artifacts;
  return artifacts.filter((artifact) => artifactBelongsToInspection(artifact, context));
}

export function shouldShowLegacyResearchLineageNotice(
  artifacts: HqWorkArtifact[],
  context: HqInspectionContext,
  roomId: DepartmentId,
): boolean {
  if (roomId !== "research_department") return false;
  if (context.status !== "ACTIVE" || context.entityType !== "OPPORTUNITY_CANDIDATE") return false;
  return artifacts.some(
    (artifact) => isResearchGridArtifact(artifact) && readHqCandidateLineageIds(artifact).length === 0,
  );
}

export function inspectionRefFromOpportunityArtifact(artifact: HqWorkArtifact): HqInspectionRef | null {
  if (artifact.artifactType !== "opportunity_candidate") return null;
  const entityId = readHqCandidateId(artifact);
  if (!entityId) return null;
  const source: HqInspectionRef = { entityType: "OPPORTUNITY_CANDIDATE", entityId };
  return canonicalizeInspectionRef(source) ?? source;
}

export function isValidateDecisionArtifact(artifact: HqWorkArtifact): boolean {
  if (artifact.artifactType === "decision") return true;
  const decision = artifact.metadata.decision;
  return typeof decision === "string" && decision.toUpperCase() === "VALIDATE" && artifact.artifactType !== "opportunity_candidate";
}

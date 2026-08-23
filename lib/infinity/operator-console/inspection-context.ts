import type { DepartmentId, OperatorVentureSnapshot } from "./types";
import type { HqWorkArtifact } from "./artifacts/types";
import {
  architectureIdentityBind,
  collectHqArtifacts,
  findSelectedOpportunityCandidate,
  isResearchGridArtifact,
  readHqCandidateId,
  readHqCandidateLineageIds,
  resolveArchitectureEntity,
  titleForHqCandidate,
  type ArchitectureEntity,
} from "./architecture-entity";
import {
  bindSystemsArchitectVentureContext,
  evidenceFromHqSignals,
  resolveSystemsArchitectHqView,
  type SystemsArchitectHqView,
} from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import { rejectHarnessArchitectureId } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";

export type HqInspectionEntityType = "OPPORTUNITY_CANDIDATE" | "VENTURE";

export type HqInspectionRef = {
  entityType: HqInspectionEntityType;
  entityId: string;
};

export type HqInspectionContext = {
  status: "ACTIVE" | "UNAVAILABLE" | "NONE";
  entityType: HqInspectionEntityType | null;
  entityId: string | null;
  displayName: string | null;
  origin: string | null;
  stage: string | null;
  source: "EXPLICIT" | "VENTURE" | "CYCLE_SELECTED" | "NONE";
  explicit: boolean;
};

export const INSPECTION_QUERY_PARAM = "inspect";

export const OPPORTUNITY_INSPECTION_ROOMS: readonly DepartmentId[] = [
  "opportunity_lab",
  "research_department",
  "strategy_finance",
  "quality_control",
  "systems_architect",
] as const;

export const HQ_INSPECTION_WRITE_BOUNDARY = {
  validationWrites: 0,
  selectionWrites: 0,
  missionCreation: 0,
  treasuryMovements: 0,
  providerWrites: 0,
  eagActions: 0,
  buildAuthorizations: 0,
  deploymentActions: 0,
} as const;

export const EMPTY_INSPECTION_CONTEXT: HqInspectionContext = {
  status: "NONE",
  entityType: null,
  entityId: null,
  displayName: null,
  origin: null,
  stage: null,
  source: "NONE",
  explicit: false,
};

export function parseInspectionQuery(value: string | null | undefined): HqInspectionRef | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const separator = trimmed.indexOf(":");
  if (separator <= 0) return null;
  const rawType = trimmed.slice(0, separator).trim().toLowerCase();
  const entityId = trimmed.slice(separator + 1).trim();
  if (!entityId) return null;
  if (rawType === "opportunity_candidate") return { entityType: "OPPORTUNITY_CANDIDATE", entityId };
  if (rawType === "venture") return { entityType: "VENTURE", entityId };
  return null;
}

export function formatInspectionQuery(ref: HqInspectionRef): string {
  const type = ref.entityType === "VENTURE" ? "venture" : "opportunity_candidate";
  return `${type}:${ref.entityId}`;
}

function candidateVisibleInSnapshot(snapshot: OperatorVentureSnapshot, candidateId: string): boolean {
  return collectHqArtifacts(snapshot).some(
    (artifact) =>
      artifact.artifactType === "opportunity_candidate" && readHqCandidateId(artifact) === candidateId,
  );
}

function resolveExplicitContext(snapshot: OperatorVentureSnapshot, ref: HqInspectionRef): HqInspectionContext {
  if (ref.entityType === "OPPORTUNITY_CANDIDATE") {
    if (!candidateVisibleInSnapshot(snapshot, ref.entityId)) {
      return {
        status: "UNAVAILABLE",
        entityType: "OPPORTUNITY_CANDIDATE",
        entityId: ref.entityId,
        displayName: null,
        origin: null,
        stage: null,
        source: "EXPLICIT",
        explicit: true,
      };
    }
    return {
      status: "ACTIVE",
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: ref.entityId,
      displayName: titleForHqCandidate(snapshot, ref.entityId) ?? "Opportunity Candidate",
      origin: "Opportunity Discovery",
      stage: "Not yet promoted to venture",
      source: "EXPLICIT",
      explicit: true,
    };
  }

  const ventureId = rejectHarnessArchitectureId(snapshot.venture.ventureAssemblyId);
  if (!ventureId || ventureId !== ref.entityId) {
    return {
      status: "UNAVAILABLE",
      entityType: "VENTURE",
      entityId: ref.entityId,
      displayName: null,
      origin: null,
      stage: null,
      source: "EXPLICIT",
      explicit: true,
    };
  }
  const entity = resolveArchitectureEntity(snapshot);
  if (entity.kind !== "VENTURE" || entity.id !== ref.entityId) {
    return {
      status: "UNAVAILABLE",
      entityType: "VENTURE",
      entityId: ref.entityId,
      displayName: null,
      origin: null,
      stage: null,
      source: "EXPLICIT",
      explicit: true,
    };
  }
  return {
    status: "ACTIVE",
    entityType: "VENTURE",
    entityId: entity.id,
    displayName: entity.name,
    origin: entity.origin,
    stage: entity.statusLabel,
    source: "EXPLICIT",
    explicit: true,
  };
}

export function resolveHqInspectionContext(
  snapshot: OperatorVentureSnapshot,
  explicit: HqInspectionRef | null = null,
): HqInspectionContext {
  if (explicit) return resolveExplicitContext(snapshot, explicit);

  const entity = resolveArchitectureEntity(snapshot);
  if (entity.kind === "VENTURE" && entity.id) {
    return {
      status: "ACTIVE",
      entityType: "VENTURE",
      entityId: entity.id,
      displayName: entity.name,
      origin: entity.origin,
      stage: entity.statusLabel,
      source: "VENTURE",
      explicit: false,
    };
  }
  if (entity.kind === "OPPORTUNITY_CANDIDATE" && entity.id) {
    return {
      status: "ACTIVE",
      entityType: "OPPORTUNITY_CANDIDATE",
      entityId: entity.id,
      displayName: entity.name,
      origin: entity.origin,
      stage: entity.statusLabel,
      source: "CYCLE_SELECTED",
      explicit: false,
    };
  }
  return EMPTY_INSPECTION_CONTEXT;
}

export function inspectionEntityFromContext(context: HqInspectionContext): ArchitectureEntity {
  if (context.status !== "ACTIVE" || !context.entityType || !context.entityId) {
    return { kind: "NONE", id: null, name: null, origin: null, statusLabel: null };
  }
  return {
    kind: context.entityType,
    id: context.entityId,
    name: context.displayName,
    origin: context.origin,
    statusLabel: context.stage,
  };
}

export function isRoomCompatibleWithInspection(roomId: DepartmentId, context: HqInspectionContext): boolean {
  if (context.status !== "ACTIVE" || context.entityType !== "OPPORTUNITY_CANDIDATE") return true;
  return OPPORTUNITY_INSPECTION_ROOMS.includes(roomId);
}

export const LEGACY_RESEARCH_LINEAGE_NOTICE =
  "Some legacy research lacks candidate lineage and is not shown in this scoped view.";

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
    if (isResearchGridArtifact(artifact)) {
      return artifactHasVentureResearchLineage(artifact, context.entityId);
    }
    return lineageIds.length === 0 || lineageIds.includes(context.entityId);
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

function candidateMonetizationModel(snapshot: OperatorVentureSnapshot, candidateId: string): string | null {
  const plan = collectHqArtifacts(snapshot).find(
    (artifact) => artifact.artifactType === "monetization_plan" && readHqCandidateId(artifact) === candidateId,
  );
  const modelType = plan?.metadata.modelType;
  return typeof modelType === "string" && modelType.trim() ? modelType.trim() : null;
}

export function systemsViewForInspection(
  snapshot: OperatorVentureSnapshot,
  context: HqInspectionContext,
  baseView: SystemsArchitectHqView | null,
): SystemsArchitectHqView | null {
  const identity = architectureIdentityBind(inspectionEntityFromContext(context));
  if (context.status === "UNAVAILABLE" || context.status === "NONE") {
    if (!baseView) return resolveSystemsArchitectHqView({}, identity);
    return bindSystemsArchitectVentureContext(baseView, identity);
  }

  const defaultEntity = resolveArchitectureEntity(snapshot);
  const sameAsDefault =
    defaultEntity.kind === context.entityType && defaultEntity.id === context.entityId && Boolean(baseView);

  if (context.entityType === "VENTURE" && sameAsDefault && baseView) {
    return bindSystemsArchitectVentureContext(baseView, identity);
  }

  if (context.entityType === "OPPORTUNITY_CANDIDATE" && context.entityId) {
    if (sameAsDefault && baseView) {
      return bindSystemsArchitectVentureContext(baseView, identity);
    }
    return resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureId: context.entityId,
        businessConcept: context.displayName,
        monetizationModelType: candidateMonetizationModel(snapshot, context.entityId),
      }),
      identity,
    );
  }

  if (baseView) return bindSystemsArchitectVentureContext(baseView, identity);
  return resolveSystemsArchitectHqView({}, identity);
}

export function inspectionRefFromOpportunityArtifact(artifact: HqWorkArtifact): HqInspectionRef | null {
  if (artifact.artifactType !== "opportunity_candidate") return null;
  const entityId = readHqCandidateId(artifact);
  if (!entityId) return null;
  return { entityType: "OPPORTUNITY_CANDIDATE", entityId };
}

export function isValidateDecisionArtifact(artifact: HqWorkArtifact): boolean {
  if (artifact.artifactType === "decision") return true;
  const decision = artifact.metadata.decision;
  return typeof decision === "string" && decision.toUpperCase() === "VALIDATE" && artifact.artifactType !== "opportunity_candidate";
}

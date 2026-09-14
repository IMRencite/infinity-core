import type { OperatorVentureSnapshot } from "./types";
import {
  architectureIdentityBind,
  collectHqArtifacts,
  readHqCandidateId,
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
import {
  hqVentureIdentitiesMatch,
  projectKnownInspectionLifecycle,
  resolveKnownHqInspectionVentureIdentity,
} from "@/lib/infinity/hq-inspection-identity/aliases";
import {
  EMPTY_INSPECTION_CONTEXT,
  type HqInspectionContext,
  type HqInspectionRef,
} from "./inspection-model";

function candidateVisibleInSnapshot(snapshot: OperatorVentureSnapshot, candidateId: string): boolean {
  return collectHqArtifacts(snapshot).some(
    (artifact) =>
      artifact.artifactType === "opportunity_candidate" && readHqCandidateId(artifact) === candidateId,
  );
}

function resolveExplicitContext(snapshot: OperatorVentureSnapshot, ref: HqInspectionRef): HqInspectionContext {
  const identity = resolveKnownHqInspectionVentureIdentity(ref);
  if (identity.source === "canonical_venture" && identity.canonicalVentureId && identity.ventureName) {
    return {
      status: "ACTIVE",
      entityType: "VENTURE",
      entityId: identity.canonicalVentureId,
      displayName: identity.ventureName,
      origin: identity.productTitle,
      stage: identity.lifecycle,
      source: "EXPLICIT",
      explicit: true,
    };
  }

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
  if (!ventureId || !hqVentureIdentitiesMatch(ventureId, ref.entityId)) {
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
  if (entity.kind !== "VENTURE" || !entity.id || !hqVentureIdentitiesMatch(entity.id, ref.entityId)) {
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
    stage: projectKnownInspectionLifecycle(entity.id) ?? entity.statusLabel,
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
      stage: projectKnownInspectionLifecycle(entity.id) ?? entity.statusLabel,
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

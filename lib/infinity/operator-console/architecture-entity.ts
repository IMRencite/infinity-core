import type { HqWorkArtifact } from "./artifacts/types";
import { isFavc1CycleVentureId } from "./favc1-cycle/types";
import { publicVentureNameForActivity } from "./room-activity";
import type { OperatorVentureSnapshot } from "./types";
import {
  isHarnessArchitectureId,
  isHarnessArchitectureLabel,
  rejectHarnessArchitectureId,
  rejectHarnessArchitectureLabel,
} from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";
import type { SystemsArchitectIdentityBind } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";

export type ArchitectureEntityKind = "VENTURE" | "OPPORTUNITY_CANDIDATE" | "NONE";

export type ArchitectureEntity = {
  kind: ArchitectureEntityKind;
  id: string | null;
  name: string | null;
  origin: string | null;
  statusLabel: string | null;
};

type SelectedCandidate = {
  id: string;
  title: string | null;
};

function collectHqArtifacts(snapshot: OperatorVentureSnapshot): HqWorkArtifact[] {
  const fromDepartments = snapshot.departments.flatMap((dept) => dept.workArtifacts ?? []);
  const fromMap = snapshot.roomArtifacts ? Object.values(snapshot.roomArtifacts).flat() : [];
  return [...fromDepartments, ...fromMap];
}

function readCandidateId(artifact: HqWorkArtifact): string | null {
  const metaId = artifact.metadata.candidateId;
  if (typeof metaId === "string" && metaId.trim()) return metaId.trim();
  if (artifact.artifactType === "opportunity_candidate" && artifact.sourceRecordId.trim()) {
    return artifact.sourceRecordId.trim();
  }
  return null;
}

function titleForCandidate(artifacts: HqWorkArtifact[], candidateId: string): string | null {
  const card = artifacts.find(
    (artifact) =>
      artifact.artifactType === "opportunity_candidate" &&
      (artifact.sourceRecordId === candidateId || artifact.metadata.candidateId === candidateId),
  );
  if (card?.title.trim()) return card.title.trim();
  const selectedBlueprint = artifacts.find(
    (artifact) =>
      artifact.metadata.candidateId === candidateId &&
      typeof artifact.title === "string" &&
      artifact.title.trim() &&
      artifact.artifactType !== "decision",
  );
  return selectedBlueprint?.title.trim() ?? null;
}

export function findSelectedOpportunityCandidate(snapshot: OperatorVentureSnapshot): SelectedCandidate | null {
  const artifacts = collectHqArtifacts(snapshot);
  const selected = artifacts.find((artifact) => artifact.metadata.selected === true && readCandidateId(artifact));
  const selectedId = selected ? readCandidateId(selected) : null;
  const selectedCard = artifacts.find(
    (artifact) => artifact.artifactType === "opportunity_candidate" && artifact.state === "SELECTED",
  );
  const id = selectedId ?? (selectedCard ? readCandidateId(selectedCard) : null);
  if (!id) return null;
  return { id, title: titleForCandidate(artifacts, id) };
}

function isPreVentureHarness(snapshot: OperatorVentureSnapshot): boolean {
  const id = snapshot.venture.ventureAssemblyId;
  const name = snapshot.venture.ventureName;
  return (
    isFavc1CycleVentureId(id) ||
    isHarnessArchitectureId(id) ||
    isHarnessArchitectureLabel(name) ||
    snapshot.favc1Cycle?.mode === "pre_venture"
  );
}

export function resolveArchitectureEntity(snapshot: OperatorVentureSnapshot): ArchitectureEntity {
  if (isPreVentureHarness(snapshot)) {
    const selected = findSelectedOpportunityCandidate(snapshot);
    if (selected) {
      return {
        kind: "OPPORTUNITY_CANDIDATE",
        id: selected.id,
        name: selected.title,
        origin: "Opportunity Discovery",
        statusLabel: "Not yet promoted to venture",
      };
    }
    return {
      kind: "NONE",
      id: null,
      name: null,
      origin: null,
      statusLabel: null,
    };
  }

  const ventureId = rejectHarnessArchitectureId(snapshot.venture.ventureAssemblyId);
  const publicName =
    publicVentureNameForActivity(snapshot.venture.ventureName, snapshot.venture.ventureAssemblyId) ??
    rejectHarnessArchitectureLabel(snapshot.venture.ventureName);
  if (!ventureId || !publicName) {
    return {
      kind: "NONE",
      id: null,
      name: null,
      origin: null,
      statusLabel: null,
    };
  }

  return {
    kind: "VENTURE",
    id: ventureId,
    name: publicName,
    origin: rejectHarnessArchitectureLabel(snapshot.venture.origin ?? null),
    statusLabel: snapshot.venture.assemblyStatus ?? null,
  };
}

export function architectureIdentityBind(entity: ArchitectureEntity): SystemsArchitectIdentityBind {
  if (entity.kind === "NONE") {
    return {
      entityKind: "NONE",
      entityId: null,
      entityName: null,
      entityOrigin: null,
      entityStatusLabel: null,
      ventureId: null,
      ventureName: null,
      ventureOrigin: null,
      ventureStatus: null,
      ventureStage: null,
    };
  }

  return {
    entityKind: entity.kind,
    entityId: entity.id,
    entityName: entity.name,
    entityOrigin: entity.origin,
    entityStatusLabel: entity.statusLabel,
    ventureId: entity.id,
    ventureName: entity.name,
    ventureOrigin: entity.origin,
    ventureStatus: entity.statusLabel,
    ventureStage: null,
  };
}

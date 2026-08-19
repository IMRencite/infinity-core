import type { HqWorkArtifact } from "../artifacts/types";

export type LineageEntityStatus = "FOUND" | "NOT_APPLICABLE" | "NOT_YET_CREATED" | "BROKEN_LINEAGE";

export type VentureLineageIndex = {
  candidateId: string | null;
  artifactsByCandidate: Map<string, HqWorkArtifact[]>;
  artifactsByType: Map<string, HqWorkArtifact[]>;
};

export function buildVentureLineageIndex(allArtifacts: HqWorkArtifact[]): VentureLineageIndex {
  const artifactsByCandidate = new Map<string, HqWorkArtifact[]>();
  const artifactsByType = new Map<string, HqWorkArtifact[]>();

  for (const artifact of allArtifacts) {
    const typeList = artifactsByType.get(artifact.artifactType) ?? [];
    typeList.push(artifact);
    artifactsByType.set(artifact.artifactType, typeList);

    const candidateId =
      artifact.artifactType === "opportunity_candidate"
        ? artifact.sourceRecordId
        : typeof artifact.metadata.candidateId === "string"
          ? artifact.metadata.candidateId
          : null;

    if (!candidateId) continue;
    const list = artifactsByCandidate.get(candidateId) ?? [];
    list.push(artifact);
    artifactsByCandidate.set(candidateId, list);
  }

  const selected = allArtifacts.find(
    (a) => a.state === "SELECTED" && a.artifactType === "opportunity_candidate",
  );
  const candidateId =
    selected?.sourceRecordId ??
    allArtifacts.find((a) => a.metadata.selected === true && typeof a.metadata.candidateId === "string")
      ?.metadata.candidateId ??
    null;

  return { candidateId: typeof candidateId === "string" ? candidateId : null, artifactsByCandidate, artifactsByType };
}

export function artifactsForCandidate(
  index: VentureLineageIndex,
  candidateId: string,
  ventureCandidateId: string | null,
): HqWorkArtifact[] {
  if (ventureCandidateId && candidateId !== ventureCandidateId) {
    return [];
  }
  return index.artifactsByCandidate.get(candidateId) ?? [];
}

export function classifyLineageSlot(
  artifacts: HqWorkArtifact[],
  requiredTypes: string[],
): LineageEntityStatus {
  const found = artifacts.some((a) => requiredTypes.includes(a.artifactType));
  if (found) return "FOUND";
  return "NOT_YET_CREATED";
}

export function diagnoseVentureLineage(allArtifacts: HqWorkArtifact[]): Record<string, LineageEntityStatus> {
  const index = buildVentureLineageIndex(allArtifacts);
  const candidateId = index.candidateId;
  const linked = candidateId ? artifactsForCandidate(index, candidateId, candidateId) : [];

  return {
    Candidate: candidateId ? "FOUND" : "NOT_YET_CREATED",
    Discovery: classifyLineageSlot(linked, ["opportunity_candidate", "source_cluster"]),
    Research: classifyLineageSlot(allArtifacts, ["research_packet"]),
    Monetization: classifyLineageSlot(linked, ["monetization_plan", "unit_economics"]),
    Selection: classifyLineageSlot(linked, ["selection_blueprint", "decision"]),
    Adversarial: classifyLineageSlot(linked, ["adversarial_review"]),
    Assumptions: classifyLineageSlot(linked, ["assumption"]),
    Validation: classifyLineageSlot(linked, ["validation_evidence", "validation_experiment"]),
    Company: classifyLineageSlot(linked, ["company_blueprint"]),
    Growth: classifyLineageSlot(linked, ["content_artifact", "creative_asset"]),
    Creative: classifyLineageSlot(linked, ["creative_asset"]),
    Product: classifyLineageSlot(linked, ["production_artifact", "code_change"]),
    Deployment: classifyLineageSlot(linked, ["deployment"]),
    Performance: classifyLineageSlot(linked, ["performance_signal"]),
    Learning: classifyLineageSlot(linked, ["learning_decision"]),
    Mission: classifyLineageSlot(allArtifacts, ["mission"]),
  };
}

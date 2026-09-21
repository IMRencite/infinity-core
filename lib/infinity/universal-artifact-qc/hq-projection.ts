import type { ArtifactQcStatus, ArtifactReleaseStatus, MaterialArtifactQCContract, QcLayerId } from "./contract";
import { failedRequiredLayers, passedRequiredLayers } from "./gates";
import { listUniversalArtifactQc } from "./store";

export type UniversalArtifactQcHqRow = {
  artifact_id: string;
  artifact: string;
  venture: string;
  change: string;
  build_state: string;
  qc_state: ArtifactQcStatus;
  required_layers: QcLayerId[];
  passed_layers: QcLayerId[];
  failed_layers: QcLayerId[];
  latest_evidence: string;
  repair_state: string;
  release_eligibility: ArtifactReleaseStatus;
  waiting_for_qc: boolean;
};

export type UniversalArtifactQcHqProjection = {
  waiting: UniversalArtifactQcHqRow[];
  failed: UniversalArtifactQcHqRow[];
  repairing: UniversalArtifactQcHqRow[];
  release_ready: UniversalArtifactQcHqRow[];
  all: UniversalArtifactQcHqRow[];
};

function rowFrom(artifact: MaterialArtifactQCContract): UniversalArtifactQcHqRow {
  return {
    artifact_id: artifact.artifact_id,
    artifact: `${artifact.artifact_type} · ${artifact.surface}`,
    venture: artifact.venture_id ?? "Infinity",
    change: artifact.change_scope,
    build_state: artifact.lifecycle_state,
    qc_state: artifact.qc_status,
    required_layers: artifact.required_qc_layers,
    passed_layers: passedRequiredLayers(artifact.layer_results),
    failed_layers: failedRequiredLayers(artifact.layer_results),
    latest_evidence: artifact.evidence_refs[0] ?? artifact.evidence_level ?? "NONE",
    repair_state: artifact.lifecycle_state === "REPAIRING" || artifact.qc_status === "QC_REPAIR_REQUIRED"
      ? artifact.last_repair_action ?? artifact.qc_status
      : "NONE",
    release_eligibility: artifact.release_status,
    waiting_for_qc: artifact.qc_status === "QC_PENDING" || artifact.qc_status === "QC_RUNNING",
  };
}

export function projectUniversalArtifactQcHq(ventureId?: string | null): UniversalArtifactQcHqProjection {
  const artifacts = listUniversalArtifactQc().filter((row) => {
    if (!ventureId) return true;
    return row.venture_id === ventureId || row.venture_id == null || row.artifact_type === "HQ_SURFACE" || row.artifact_type === "FINANCIAL_SURFACE" || row.artifact_type === "TREASURY_SURFACE";
  });
  const all = artifacts
    .slice()
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
    .map(rowFrom);
  return {
    waiting: all.filter((row) => row.waiting_for_qc),
    failed: all.filter((row) => row.failed_layers.length > 0 || row.qc_state === "QC_REPAIR_REQUIRED" || row.qc_state === "INVALIDATED"),
    repairing: all.filter((row) => row.build_state === "REPAIRING" || row.qc_state === "QC_REPAIR_REQUIRED"),
    release_ready: all.filter((row) => row.release_eligibility === "RELEASE_READY"),
    all,
  };
}

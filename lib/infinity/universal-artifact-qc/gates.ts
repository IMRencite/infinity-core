import {
  BLOCKING_QC_STATES,
  BROWSER_RUNTIME_HEALTH_GATE,
  FOUNDER_BROWSER_DEFECT_OVERRIDE,
  NO_QC_NO_RELEASE_GATE,
  QC_ARTIFACT_VERSION_INTEGRITY_GATE,
  QC_EVIDENCE_PRECEDENCE,
  RELEASE_ELIGIBILITY_GATE,
  RENDERED_ARTIFACT_PROOF_GATE,
  REPEATED_QC_FAILURE_GATE,
  type ArtifactQcEvidenceLevel,
  type ArtifactQcStatus,
  type MaterialArtifactQCContract,
  type NamedArtifactGate,
  type QcLayerId,
  type QcLayerResult,
} from "./contract";
import { evaluateBrowserRuntimeHealth, evaluateFinalBrowserLayer } from "./layers";
import type { ArtifactQcEvidenceBundle } from "./evidence";

function fail(gate: string, reasons: string[]): NamedArtifactGate {
  return { gate, result: "FAIL", reasons };
}

function pass(gate: string, reason: string): NamedArtifactGate {
  return { gate, result: "PASS", reasons: [reason] };
}

export function evidenceLevelRank(level: ArtifactQcEvidenceLevel): number {
  return QC_EVIDENCE_PRECEDENCE.indexOf(level);
}

export function higherEvidenceWins(higher: ArtifactQcEvidenceLevel, lower: ArtifactQcEvidenceLevel): boolean {
  return evidenceLevelRank(higher) < evidenceLevelRank(lower);
}

export function evaluateReleaseEligibilityGate(artifact: MaterialArtifactQCContract): NamedArtifactGate {
  const reasons: string[] = [];
  if (artifact.lifecycle_state !== "BUILD_COMPLETE" && artifact.lifecycle_state !== "QC_PASS" && artifact.lifecycle_state !== "RELEASE_READY") {
    if (artifact.lifecycle_state === "BUILDING" || artifact.lifecycle_state === "QC_PENDING" || artifact.lifecycle_state === "QC_RUNNING") {
      reasons.push("BUILD_NOT_COMPLETE_OR_QC_INCOMPLETE");
    }
  }
  if (artifact.lifecycle_state === "BUILD_COMPLETE") reasons.push("BUILD_COMPLETE_WITHOUT_QC");
  if (artifact.qc_status !== "QC_PASS") reasons.push(`QC_STATUS_${artifact.qc_status}`);
  const failed = artifact.layer_results.filter((row) => row.required && row.result === "FAIL");
  if (failed.length) reasons.push(...failed.map((row) => `LAYER_FAIL:${row.layer}`));
  if (artifact.founder_override_state === "DEFECT_REPORTED" || artifact.founder_override_state === "INVALIDATED") {
    reasons.push("UNRESOLVED_FOUNDER_BROWSER_DEFECT");
  }
  if (artifact.qc_status === "QC_STALE") reasons.push("STALE_QC_EVIDENCE");
  if (!artifact.artifact_version) reasons.push("ARTIFACT_VERSION_MISSING");
  if (artifact.evidence_level === "SOURCE" || artifact.evidence_level === "BUILD_ARTIFACT") {
    if (artifact.required_qc_layers.includes("FINAL_BROWSER") || artifact.required_qc_layers.includes("RENDERED")) {
      reasons.push("SOURCE_ONLY_LIVE_CLAIM");
    }
  }
  return reasons.length === 0
    ? pass(RELEASE_ELIGIBILITY_GATE, "QC_PASS_AND_GOVERNED")
    : fail(RELEASE_ELIGIBILITY_GATE, reasons);
}

export function evaluateQCArtifactVersionIntegrityGate(input: {
  artifact: MaterialArtifactQCContract;
  observed_version: string;
  mutation_after_qc: boolean;
}): NamedArtifactGate {
  const reasons: string[] = [];
  if (input.artifact.artifact_version !== input.observed_version) reasons.push("QC_VERSION_MISMATCH");
  if (input.mutation_after_qc) reasons.push("MUTATION_AFTER_QC_PASS");
  if (input.artifact.qc_status === "QC_STALE") reasons.push("QC_ALREADY_STALE");
  return reasons.length === 0
    ? pass(QC_ARTIFACT_VERSION_INTEGRITY_GATE, "VERSION_MATCHES_EVIDENCE")
    : fail(QC_ARTIFACT_VERSION_INTEGRITY_GATE, reasons);
}

export function evaluateFounderBrowserDefectOverride(input: {
  qc_status: ArtifactQcStatus;
  founder_physical_defect: boolean;
  surface: string;
}): NamedArtifactGate {
  if (!input.founder_physical_defect) {
    return pass(FOUNDER_BROWSER_DEFECT_OVERRIDE, "NO_FOUNDER_DEFECT");
  }
  if (input.qc_status === "QC_PASS" || input.qc_status === "QC_STALE") {
    return fail(FOUNDER_BROWSER_DEFECT_OVERRIDE, [
      "FOUNDER_PHYSICAL_INVALIDATES_PRIOR_PASS",
      `SURFACE:${input.surface}`,
    ]);
  }
  return fail(FOUNDER_BROWSER_DEFECT_OVERRIDE, ["FOUNDER_PHYSICAL_DEFECT_REQUIRES_REPAIR"]);
}

export function evaluateRenderedArtifactProofGate(evidence: ArtifactQcEvidenceBundle["final_browser"]): NamedArtifactGate {
  return evaluateFinalBrowserLayer(evidence)[0] ?? fail(RENDERED_ARTIFACT_PROOF_GATE, ["BROWSER_PROOF_MISSING"]);
}

export function evaluateBrowserRuntimeHealthGate(
  evidence: ArtifactQcEvidenceBundle["browser_runtime"],
): NamedArtifactGate {
  return evaluateBrowserRuntimeHealth(evidence);
}

export function evaluateRepeatedQCFailureGate(input: {
  failure_signature: string | null;
  same_failure_recurrence: number;
  escaped_to_founder: boolean;
}): NamedArtifactGate {
  if (!input.failure_signature) return pass(REPEATED_QC_FAILURE_GATE, "NO_RECURRING_SIGNATURE");
  if (input.same_failure_recurrence >= 2 || input.escaped_to_founder) {
    return fail(REPEATED_QC_FAILURE_GATE, [
      `RECURRING_ESCAPED_DEFECT:${input.failure_signature}`,
      "FIX_THE_QC_SYSTEM",
    ]);
  }
  return pass(REPEATED_QC_FAILURE_GATE, "NO_REPEATED_ESCAPE");
}

export function evaluateNoQCNoReleaseGate(input: {
  qc_status: ArtifactQcStatus;
  lifecycle_state: MaterialArtifactQCContract["lifecycle_state"];
  release_requested: boolean;
}): NamedArtifactGate {
  if (!input.release_requested) return pass(NO_QC_NO_RELEASE_GATE, "NO_RELEASE_REQUESTED");
  if (BLOCKING_QC_STATES.includes(input.qc_status as (typeof BLOCKING_QC_STATES)[number])) {
    return fail(NO_QC_NO_RELEASE_GATE, [`RELEASE_BLOCKED_${input.qc_status}`]);
  }
  if (input.qc_status !== "QC_PASS") {
    return fail(NO_QC_NO_RELEASE_GATE, [`RELEASE_REQUIRES_QC_PASS:${input.qc_status}`]);
  }
  if (input.lifecycle_state === "BUILD_COMPLETE") {
    return fail(NO_QC_NO_RELEASE_GATE, ["BUILD_COMPLETE_CANNOT_RELEASE"]);
  }
  return pass(NO_QC_NO_RELEASE_GATE, "QC_PASS_REQUIRED_AND_PRESENT");
}

export function failedRequiredLayers(results: QcLayerResult[]): QcLayerId[] {
  return results.filter((row) => row.required && row.result === "FAIL").map((row) => row.layer);
}

export function passedRequiredLayers(results: QcLayerResult[]): QcLayerId[] {
  return results.filter((row) => row.required && row.result === "PASS").map((row) => row.layer);
}

import {
  MATERIAL_ARTIFACT_QC_CONTRACT,
  UNIVERSAL_QC_ORCHESTRATOR,
  type ArtifactLifecycleState,
  type ArtifactQcStatus,
  type ArtifactReleaseStatus,
  type MaterialArtifactQCContract,
  type MaterialArtifactType,
  type NamedArtifactGate,
} from "./contract";
import type { ArtifactQcEvidenceBundle } from "./evidence";
import {
  evaluateFounderBrowserDefectOverride,
  evaluateNoQCNoReleaseGate,
  evaluateQCArtifactVersionIntegrityGate,
  evaluateReleaseEligibilityGate,
  evaluateRepeatedQCFailureGate,
  failedRequiredLayers,
} from "./gates";
import { resolveArtifactQcLayers } from "./layer-resolver";
import { evaluateRequiredLayers } from "./layers";
import { assertArtifactLifecycleTransition } from "./lifecycle";
import { getUniversalArtifactQc, upsertUniversalArtifactQc } from "./store";
import { completeUniversalQcWork, startUniversalQcWork } from "./work";

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function qcExecutionId(artifactId: string, at: string): string {
  return `qc:${artifactId}:${at}`;
}

export function createMaterialArtifact(input: {
  artifact_id: string;
  artifact_type: MaterialArtifactType;
  artifact_version: string;
  venture_id?: string | null;
  surface: string;
  route?: string | null;
  change_scope: string;
  builder_execution_id: string;
  lifecycle_state?: ArtifactLifecycleState;
  now?: string;
}): MaterialArtifactQCContract {
  const at = nowIso(input.now);
  const layers = resolveArtifactQcLayers(input.artifact_type);
  return upsertUniversalArtifactQc({
    contract: MATERIAL_ARTIFACT_QC_CONTRACT,
    artifact_id: input.artifact_id,
    artifact_type: input.artifact_type,
    artifact_version: input.artifact_version,
    venture_id: input.venture_id ?? null,
    surface: input.surface,
    route: input.route ?? null,
    change_scope: input.change_scope,
    builder_execution_id: input.builder_execution_id,
    qc_execution_id: null,
    build_completed_at: input.lifecycle_state === "BUILD_COMPLETE" || input.lifecycle_state === "QC_PENDING" ? at : null,
    lifecycle_state: input.lifecycle_state ?? "BUILDING",
    required_qc_layers: layers,
    qc_status: "QC_PENDING",
    qc_run_id: null,
    qc_started_at: null,
    qc_completed_at: null,
    release_status: "NOT_ELIGIBLE",
    release_id: null,
    evidence_refs: [],
    evidence_level: null,
    founder_override_state: "NONE",
    superseded_qc_run_id: null,
    layer_results: [],
    attempt_count: 0,
    failure_signature: null,
    last_repair_action: null,
    same_failure_recurrence: 0,
    created_at: at,
    updated_at: at,
  });
}

export function markBuildComplete(artifactId: string, now?: string): MaterialArtifactQCContract {
  const existing = getUniversalArtifactQc(artifactId);
  if (!existing) throw new Error(`UNKNOWN_ARTIFACT:${artifactId}`);
  const from = existing.lifecycle_state === "REPAIRING" ? "REPAIRING" : existing.lifecycle_state;
  const toBuild = from === "REPAIRING" ? "BUILD_COMPLETE" : "BUILD_COMPLETE";
  if (from !== "BUILD_COMPLETE") {
    const allowed = assertArtifactLifecycleTransition(from === "BUILDING" || from === "REPAIRING" ? from : "BUILDING", toBuild);
    if (!allowed.ok && from !== "REPAIRING" && from !== "BUILDING") {
      throw new Error(allowed.reason);
    }
  }
  const at = nowIso(now);
  const pending = assertArtifactLifecycleTransition("BUILD_COMPLETE", "QC_PENDING");
  if (!pending.ok) throw new Error(pending.reason);
  return upsertUniversalArtifactQc({
    ...existing,
    lifecycle_state: "QC_PENDING",
    build_completed_at: at,
    qc_status: "QC_PENDING",
    release_status: "NOT_ELIGIBLE",
    updated_at: at,
  });
}

export function enqueueArtifactQcAfterBuildComplete(input: {
  artifact_id?: string;
  artifact_type?: MaterialArtifactType;
  artifact_version?: string;
  venture_id?: string | null;
  surface?: string;
  route?: string | null;
  change_scope?: string;
  builder_execution_id: string;
  organizationId?: string;
  buildId?: string;
  missionId?: string;
  now?: string;
}): MaterialArtifactQCContract {
  const at = nowIso(input.now);
  const artifactId = input.artifact_id ?? `artifact:build:${input.builder_execution_id}`;
  const existing = getUniversalArtifactQc(artifactId);
  if (existing) {
    return markBuildComplete(artifactId, at);
  }
  const created = createMaterialArtifact({
    artifact_id: artifactId,
    artifact_type: input.artifact_type ?? "VENTURE_SITE_BUILD",
    artifact_version: input.artifact_version ?? `build:${input.builder_execution_id}`,
    venture_id: input.venture_id ?? null,
    surface: input.surface ?? input.missionId ?? "venture-build",
    route: input.route ?? null,
    change_scope: input.change_scope ?? "build-factory internally_complete",
    builder_execution_id: input.builder_execution_id,
    lifecycle_state: "BUILD_COMPLETE",
    now: at,
  });
  return markBuildComplete(created.artifact_id, at);
}

function failureSignature(layers: ReturnType<typeof evaluateRequiredLayers>): string | null {
  const failed = failedRequiredLayers(layers);
  return failed.length ? failed.slice().sort().join("+") : null;
}

export function runUniversalQc(input: {
  artifact_id: string;
  evidence: ArtifactQcEvidenceBundle;
  evidence_refs?: string[];
  now?: string;
}): MaterialArtifactQCContract {
  const existing = getUniversalArtifactQc(input.artifact_id);
  if (!existing) throw new Error(`UNKNOWN_ARTIFACT:${input.artifact_id}`);
  if (existing.lifecycle_state === "BUILD_COMPLETE") {
    markBuildComplete(input.artifact_id, input.now);
  }
  const current = getUniversalArtifactQc(input.artifact_id)!;
  if (current.lifecycle_state !== "QC_PENDING" && current.lifecycle_state !== "QC_RUNNING") {
    throw new Error(`QC_NOT_RUNNABLE:${current.lifecycle_state}`);
  }
  const at = nowIso(input.now);
  if (current.lifecycle_state === "QC_PENDING") {
    const runningCheck = assertArtifactLifecycleTransition("QC_PENDING", "QC_RUNNING");
    if (!runningCheck.ok) throw new Error(runningCheck.reason);
  }
  startUniversalQcWork({ description: `QC ${current.artifact_id}`, now: at });
  const started = upsertUniversalArtifactQc({
    ...current,
    lifecycle_state: "QC_RUNNING",
    qc_status: "QC_RUNNING",
    qc_execution_id: qcExecutionId(current.artifact_id, at),
    qc_run_id: `run:${current.artifact_id}:${at}`,
    qc_started_at: at,
    updated_at: at,
    attempt_count: current.attempt_count + 1,
  });
  const layers = evaluateRequiredLayers(started.required_qc_layers, input.evidence);
  const failed = failedRequiredLayers(layers);
  const signature = failureSignature(layers);
  const recurrence =
    signature && signature === started.failure_signature ? started.same_failure_recurrence + 1 : signature ? 0 : 0;
  const evidenceLevel = input.evidence.final_browser?.evidence_level ?? input.evidence.rendered?.evidence_level ?? null;
  if (failed.length === 0) {
    const passCheck = assertArtifactLifecycleTransition("QC_RUNNING", "QC_PASS");
    if (!passCheck.ok) throw new Error(passCheck.reason);
    const readyCheck = assertArtifactLifecycleTransition("QC_PASS", "RELEASE_READY");
    if (!readyCheck.ok) throw new Error(readyCheck.reason);
    completeUniversalQcWork("QC_PASS · Validation Station idle", at);
    return upsertUniversalArtifactQc({
      ...started,
      lifecycle_state: "RELEASE_READY",
      qc_status: "QC_PASS",
      qc_completed_at: at,
      release_status: "RELEASE_READY",
      release_id: `release-elig:${started.artifact_id}:${at}`,
      layer_results: layers,
      evidence_refs: input.evidence_refs ?? started.evidence_refs,
      evidence_level: evidenceLevel,
      failure_signature: null,
      same_failure_recurrence: 0,
      founder_override_state: "NONE",
      updated_at: at,
    });
  }
  const repairCheck = assertArtifactLifecycleTransition("QC_RUNNING", "QC_REPAIR_REQUIRED");
  if (!repairCheck.ok) throw new Error(repairCheck.reason);
  completeUniversalQcWork(`QC_REPAIR_REQUIRED · ${failed.join(",")}`, at);
  return upsertUniversalArtifactQc({
    ...started,
    lifecycle_state: "QC_REPAIR_REQUIRED",
    qc_status: "QC_REPAIR_REQUIRED",
    qc_completed_at: at,
    release_status: "BLOCKED",
    layer_results: layers,
    evidence_refs: input.evidence_refs ?? started.evidence_refs,
    evidence_level: evidenceLevel,
    failure_signature: signature,
    same_failure_recurrence: recurrence,
    last_repair_action: null,
    updated_at: at,
  });
}

export function markArtifactRepairing(artifactId: string, repairAction: string, now?: string): MaterialArtifactQCContract {
  const existing = getUniversalArtifactQc(artifactId);
  if (!existing) throw new Error(`UNKNOWN_ARTIFACT:${artifactId}`);
  const allowed = assertArtifactLifecycleTransition(existing.lifecycle_state, "REPAIRING");
  if (!allowed.ok) throw new Error(allowed.reason);
  const at = nowIso(now);
  return upsertUniversalArtifactQc({
    ...existing,
    lifecycle_state: "REPAIRING",
    last_repair_action: repairAction,
    updated_at: at,
  });
}

export function invalidateQcAfterMutation(artifactId: string, nextVersion: string, now?: string): MaterialArtifactQCContract {
  const existing = getUniversalArtifactQc(artifactId);
  if (!existing) throw new Error(`UNKNOWN_ARTIFACT:${artifactId}`);
  const at = nowIso(now);
  return upsertUniversalArtifactQc({
    ...existing,
    artifact_version: nextVersion,
    lifecycle_state: "QC_PENDING",
    qc_status: "QC_STALE",
    release_status: "NOT_ELIGIBLE",
    superseded_qc_run_id: existing.qc_run_id,
    qc_run_id: null,
    qc_execution_id: null,
    updated_at: at,
  });
}

export function applyFounderBrowserDefect(input: {
  artifact_id: string;
  surface: string;
  now?: string;
}): MaterialArtifactQCContract {
  const existing = getUniversalArtifactQc(input.artifact_id);
  if (!existing) throw new Error(`UNKNOWN_ARTIFACT:${input.artifact_id}`);
  const at = nowIso(input.now);
  return upsertUniversalArtifactQc({
    ...existing,
    lifecycle_state: "QC_REPAIR_REQUIRED",
    qc_status: "INVALIDATED",
    release_status: "BLOCKED",
    founder_override_state: "INVALIDATED",
    superseded_qc_run_id: existing.qc_run_id,
    updated_at: at,
  });
}

export function evaluateUniversalQcOrchestrator(artifact: MaterialArtifactQCContract): NamedArtifactGate {
  const release = evaluateReleaseEligibilityGate(artifact);
  const noRelease = evaluateNoQCNoReleaseGate({
    qc_status: artifact.qc_status,
    lifecycle_state: artifact.lifecycle_state,
    release_requested: true,
  });
  const version = evaluateQCArtifactVersionIntegrityGate({
    artifact,
    observed_version: artifact.artifact_version,
    mutation_after_qc: artifact.qc_status === "QC_STALE",
  });
  const founder = evaluateFounderBrowserDefectOverride({
    qc_status: artifact.qc_status,
    founder_physical_defect: artifact.founder_override_state === "INVALIDATED",
    surface: artifact.surface,
  });
  const repeated = evaluateRepeatedQCFailureGate({
    failure_signature: artifact.failure_signature,
    same_failure_recurrence: artifact.same_failure_recurrence,
    escaped_to_founder: artifact.founder_override_state === "INVALIDATED",
  });
  const reasons = [release, noRelease, version, founder, repeated]
    .filter((row) => row.result === "FAIL")
    .flatMap((row) => row.reasons);
  return {
    gate: UNIVERSAL_QC_ORCHESTRATOR,
    result: reasons.length === 0 && artifact.release_status === "RELEASE_READY" ? "PASS" : "FAIL",
    reasons: reasons.length ? reasons : ["ORCHESTRATED"],
  };
}

export function requestRelease(artifactId: string): {
  allowed: boolean;
  release_status: ArtifactReleaseStatus;
  gates: NamedArtifactGate[];
} {
  const artifact = getUniversalArtifactQc(artifactId);
  if (!artifact) {
    return {
      allowed: false,
      release_status: "BLOCKED",
      gates: [{ gate: UNIVERSAL_QC_ORCHESTRATOR, result: "FAIL", reasons: ["ARTIFACT_MISSING"] }],
    };
  }
  const gates = [
    evaluateNoQCNoReleaseGate({
      qc_status: artifact.qc_status,
      lifecycle_state: artifact.lifecycle_state,
      release_requested: true,
    }),
    evaluateReleaseEligibilityGate(artifact),
  ];
  const allowed = gates.every((row) => row.result === "PASS") && artifact.qc_status === "QC_PASS";
  return { allowed, release_status: allowed ? artifact.release_status : "BLOCKED", gates };
}

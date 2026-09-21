import {
  FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID,
  FINANCIAL_RECONCILIATION_OVERFLOW_VERSION,
  escapedFinancialCardEvidence,
  repairedFinancialCardEvidence,
} from "./fixtures";
import {
  createMaterialArtifact,
  markArtifactRepairing,
  markBuildComplete,
  runUniversalQc,
} from "./orchestrator";
import { getUniversalArtifactQc } from "./store";
import type { MaterialArtifactQCContract } from "./contract";

export function runFinancialReconciliationContainmentProof(now = "2026-09-13T09:10:00.000Z"): {
  artifact: MaterialArtifactQCContract;
  progression: string[];
} {
  const progression: string[] = [];
  createMaterialArtifact({
    artifact_id: FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID,
    artifact_type: "FINANCIAL_SURFACE",
    artifact_version: FINANCIAL_RECONCILIATION_OVERFLOW_VERSION,
    venture_id: null,
    surface: "HQ Financial Reconciliation",
    route: "/dashboard",
    change_scope: "Contain PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED inside its card",
    builder_execution_id: "builder:infinity:hq-financial-recon-containment-v1",
    lifecycle_state: "BUILDING",
    now,
  });
  progression.push("BUILDING");
  markBuildComplete(FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID, now);
  progression.push("BUILD_COMPLETE");
  progression.push("QC_PENDING");
  const failed = runUniversalQc({
    artifact_id: FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID,
    evidence: escapedFinancialCardEvidence(),
    evidence_refs: ["hq-financial-truth-strip overflow observation"],
    now,
  });
  progression.push("QC_RUNNING");
  progression.push(failed.lifecycle_state);
  markArtifactRepairing(
    FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID,
    "Contain machine-state label with overflow-hidden + ellipsis",
    now,
  );
  progression.push("REPAIRING");
  markBuildComplete(FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID, now);
  progression.push("BUILD_COMPLETE");
  progression.push("QC_PENDING");
  const passed = runUniversalQc({
    artifact_id: FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID,
    evidence: repairedFinancialCardEvidence(),
    evidence_refs: ["hq-financial-truth-strip contained machine state"],
    now,
  });
  progression.push("QC_RUNNING");
  progression.push(passed.lifecycle_state);
  return {
    artifact: getUniversalArtifactQc(FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID)!,
    progression,
  };
}

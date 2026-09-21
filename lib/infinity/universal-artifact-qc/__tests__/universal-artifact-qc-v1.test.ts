import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { listCanonicalWork, resetCanonicalWorkStore } from "@/lib/infinity/canonical-work/store";
import { evaluateHQLiveWorkSurfaceConsistencyGate } from "@/lib/infinity/canonical-work/gates";
import {
  ARTIFACT_QC_LAYER_RESOLVER,
  BROWSER_RUNTIME_HEALTH_GATE,
  FOUNDER_BROWSER_DEFECT_OVERRIDE,
  NO_QC_NO_RELEASE_GATE,
  QC_ARTIFACT_VERSION_INTEGRITY_GATE,
  RELEASE_ELIGIBILITY_GATE,
  RENDERED_ARTIFACT_PROOF_GATE,
  REPEATED_QC_FAILURE_GATE,
  UNIVERSAL_QC_CANONICAL_RULE,
  UNIVERSAL_QC_WORK_ID,
  applyFounderBrowserDefect,
  assertArtifactLifecycleTransition,
  backendServiceEvidence,
  browserErrorEvidence,
  builderMayClaimProductionReady,
  createMaterialArtifact,
  enqueueArtifactQcAfterBuildComplete,
  escapedFinancialCardEvidence,
  evaluateArtifactQcLayerResolver,
  evaluateBrowserRuntimeHealthGate,
  evaluateNoQCNoReleaseGate,
  evaluateQCArtifactVersionIntegrityGate,
  evaluateReleaseEligibilityGate,
  evaluateRenderedArtifactProofGate,
  evaluateRepeatedQCFailureGate,
  FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID,
  idleCurrentWorkEvidence,
  invalidateQcAfterMutation,
  markArtifactRepairing,
  markBuildComplete,
  projectUniversalArtifactQcHq,
  repairedFinancialCardEvidence,
  requestRelease,
  resetUniversalArtifactQcStore,
  resolveArtifactQcLayers,
  runFinancialReconciliationContainmentProof,
  runUniversalQc,
  sourceOnlyRenderedEvidence,
  staleActiveWorkEvidence,
  thinCustomerPageEvidence,
} from "..";

describe("universal artifact QC release gate v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
    resetUniversalArtifactQcStore();
  });

  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
    resetUniversalArtifactQcStore();
  });

  it("1. BUILD_COMPLETE cannot become RELEASE_READY without QC", () => {
    expect(assertArtifactLifecycleTransition("BUILD_COMPLETE", "RELEASE_READY").ok).toBe(false);
    expect(assertArtifactLifecycleTransition("BUILD_COMPLETE", "RELEASED").ok).toBe(false);
    expect(UNIVERSAL_QC_CANONICAL_RULE).toMatch(/QC CONTRACT PASSES/);
    expect(builderMayClaimProductionReady()).toBe(false);
  });

  it("2. UI artifact automatically enters QC_PENDING after build complete", () => {
    const artifact = enqueueArtifactQcAfterBuildComplete({
      builder_execution_id: "build_ui_1",
      artifact_type: "UI_CHANGE",
      surface: "HQ Command",
      change_scope: "button hierarchy",
    });
    expect(artifact.lifecycle_state).toBe("QC_PENDING");
    expect(artifact.qc_status).toBe("QC_PENDING");
    expect(artifact.release_status).toBe("NOT_ELIGIBLE");
  });

  it("3. applicable QC layers resolve correctly", () => {
    const content = resolveArtifactQcLayers("CONTENT_CHANGE");
    expect(content).toEqual(
      expect.arrayContaining(["STRUCTURAL", "RENDERED", "CONTENT", "RESPONSIVE", "FINAL_BROWSER"]),
    );
    expect(content).not.toContain("FUNCTIONAL");
    const form = resolveArtifactQcLayers("FORM");
    expect(form).toEqual(
      expect.arrayContaining(["STRUCTURAL", "RENDERED", "FUNCTIONAL", "DATA_STATE", "RESPONSIVE", "ACCESSIBILITY", "FINAL_BROWSER"]),
    );
    const financial = resolveArtifactQcLayers("FINANCIAL_SURFACE");
    expect(financial).toContain("DATA_STATE");
    expect(financial).toContain("SECURITY_GOVERNANCE");
    const backend = resolveArtifactQcLayers("BACKEND_SERVICE");
    expect(backend).not.toContain("FINAL_BROWSER");
    expect(backend).not.toContain("RENDERED");
    expect(
      evaluateArtifactQcLayerResolver({ artifact_type: "FORM", resolved: form }).gate,
    ).toBe(ARTIFACT_QC_LAYER_RESOLVER);
    expect(evaluateArtifactQcLayerResolver({ artifact_type: "FORM", resolved: form }).result).toBe("PASS");
  });

  it("4. one failed layer blocks release", () => {
    createMaterialArtifact({
      artifact_id: "artifact:fail-one-layer",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "Treasury",
      change_scope: "overflow",
      builder_execution_id: "builder:fail-one",
    });
    markBuildComplete("artifact:fail-one-layer");
    const failed = runUniversalQc({
      artifact_id: "artifact:fail-one-layer",
      evidence: escapedFinancialCardEvidence(),
    });
    expect(failed.qc_status).toBe("QC_REPAIR_REQUIRED");
    expect(evaluateReleaseEligibilityGate(failed).result).toBe("FAIL");
    expect(requestRelease("artifact:fail-one-layer").allowed).toBe(false);
  });

  it("5. repaired artifact reruns QC and cannot skip to release", () => {
    createMaterialArtifact({
      artifact_id: "artifact:repair-loop",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "Treasury",
      change_scope: "overflow",
      builder_execution_id: "builder:repair",
    });
    markBuildComplete("artifact:repair-loop");
    runUniversalQc({ artifact_id: "artifact:repair-loop", evidence: escapedFinancialCardEvidence() });
    expect(assertArtifactLifecycleTransition("QC_REPAIR_REQUIRED", "RELEASE_READY").ok).toBe(false);
    markArtifactRepairing("artifact:repair-loop", "contain card text");
    const pending = markBuildComplete("artifact:repair-loop");
    expect(pending.lifecycle_state).toBe("QC_PENDING");
    const passed = runUniversalQc({ artifact_id: "artifact:repair-loop", evidence: repairedFinancialCardEvidence() });
    expect(passed.qc_status).toBe("QC_PASS");
    expect(passed.lifecycle_state).toBe("RELEASE_READY");
  });

  it("6. mutation after QC_PASS marks QC stale", () => {
    createMaterialArtifact({
      artifact_id: "artifact:stale-version",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "Treasury",
      change_scope: "pulse",
      builder_execution_id: "builder:stale",
    });
    markBuildComplete("artifact:stale-version");
    runUniversalQc({ artifact_id: "artifact:stale-version", evidence: repairedFinancialCardEvidence() });
    const stale = invalidateQcAfterMutation("artifact:stale-version", "v2");
    expect(stale.qc_status).toBe("QC_STALE");
    expect(stale.lifecycle_state).toBe("QC_PENDING");
    expect(
      evaluateQCArtifactVersionIntegrityGate({
        artifact: stale,
        observed_version: "v2",
        mutation_after_qc: true,
      }).result,
    ).toBe("FAIL");
    expect(evaluateReleaseEligibilityGate(stale).gate).toBe(RELEASE_ELIGIBILITY_GATE);
    expect(evaluateReleaseEligibilityGate(stale).result).toBe("FAIL");
  });

  it("7. founder browser defect invalidates QC_PASS", () => {
    createMaterialArtifact({
      artifact_id: "artifact:founder-defect",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "Treasury",
      change_scope: "overflow",
      builder_execution_id: "builder:founder",
    });
    markBuildComplete("artifact:founder-defect");
    runUniversalQc({ artifact_id: "artifact:founder-defect", evidence: repairedFinancialCardEvidence() });
    const invalidated = applyFounderBrowserDefect({ artifact_id: "artifact:founder-defect", surface: "Treasury" });
    expect(invalidated.qc_status).toBe("INVALIDATED");
    expect(invalidated.lifecycle_state).toBe("QC_REPAIR_REQUIRED");
    expect(invalidated.founder_override_state).toBe("INVALIDATED");
    expect(evaluateReleaseEligibilityGate(invalidated).result).toBe("FAIL");
  });

  it("8. source-only evidence cannot produce rendered PASS", () => {
    createMaterialArtifact({
      artifact_id: "artifact:source-only",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "Treasury",
      change_scope: "source scan",
      builder_execution_id: "builder:source",
    });
    markBuildComplete("artifact:source-only");
    const failed = runUniversalQc({
      artifact_id: "artifact:source-only",
      evidence: sourceOnlyRenderedEvidence(),
    });
    expect(failed.qc_status).toBe("QC_REPAIR_REQUIRED");
    expect(evaluateRenderedArtifactProofGate(sourceOnlyRenderedEvidence().final_browser).result).toBe("FAIL");
    expect(evaluateRenderedArtifactProofGate(sourceOnlyRenderedEvidence().final_browser).reasons).toContain(
      "SOURCE_ONLY_CANNOT_PRODUCE_RENDERED_PASS",
    );
  });

  it("9b. overflow flags cannot pass when the live card still shows the raw machine state", () => {
    const flagsOnly = repairedFinancialCardEvidence();
    flagsOnly.rendered = {
      ...flagsOnly.rendered!,
      overflow_hidden: true,
      text_contained: true,
      visible_display: undefined,
      visible_machine_state: "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED",
    };
    createMaterialArtifact({
      artifact_id: "artifact:flags-only",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "Financial Reconciliation",
      change_scope: "flags without display coverage",
      builder_execution_id: "builder:flags",
    });
    markBuildComplete("artifact:flags-only");
    const failed = runUniversalQc({ artifact_id: "artifact:flags-only", evidence: flagsOnly });
    expect(failed.qc_status).toBe("QC_REPAIR_REQUIRED");
    expect(failed.layer_results.find((row) => row.layer === "RENDERED")?.reasons).toEqual(
      expect.arrayContaining(["RAW_MACHINE_STATE_ON_CARD", "TEXT_ESCAPING_CONTAINER"]),
    );
  });

  it("9. text escaping a container fails rendered QC", () => {
    createMaterialArtifact({
      artifact_id: "artifact:escape",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "Financial Reconciliation",
      change_scope: "machine state label",
      builder_execution_id: "builder:escape",
    });
    markBuildComplete("artifact:escape");
    const failed = runUniversalQc({ artifact_id: "artifact:escape", evidence: escapedFinancialCardEvidence() });
    expect(failed.layer_results.find((row) => row.layer === "RENDERED")?.result).toBe("FAIL");
    expect(failed.layer_results.find((row) => row.layer === "RENDERED")?.reasons).toEqual(
      expect.arrayContaining(["TEXT_ESCAPING_CONTAINER"]),
    );
  });

  it("10. browser runtime error fails QC", () => {
    expect(evaluateBrowserRuntimeHealthGate(browserErrorEvidence().browser_runtime).gate).toBe(
      BROWSER_RUNTIME_HEALTH_GATE,
    );
    expect(evaluateBrowserRuntimeHealthGate(browserErrorEvidence().browser_runtime).result).toBe("FAIL");
    createMaterialArtifact({
      artifact_id: "artifact:runtime",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "HQ",
      change_scope: "runtime",
      builder_execution_id: "builder:runtime",
    });
    markBuildComplete("artifact:runtime");
    const failed = runUniversalQc({ artifact_id: "artifact:runtime", evidence: browserErrorEvidence() });
    expect(failed.qc_status).toBe("QC_REPAIR_REQUIRED");
  });

  it("11. stale ACTIVE state fails state QC", () => {
    createMaterialArtifact({
      artifact_id: "artifact:stale-active",
      artifact_type: "STATE_BEHAVIOR_CHANGE",
      artifact_version: "v1",
      surface: "HQ current work",
      change_scope: "rooms stayed lit",
      builder_execution_id: "builder:stale-active",
    });
    markBuildComplete("artifact:stale-active");
    const failed = runUniversalQc({ artifact_id: "artifact:stale-active", evidence: staleActiveWorkEvidence() });
    expect(failed.layer_results.find((row) => row.layer === "DATA_STATE")?.reasons).toEqual(
      expect.arrayContaining(["STALE_ACTIVE_STATE"]),
    );
  });

  it("12. correct idle/current-work behavior passes state QC", () => {
    createMaterialArtifact({
      artifact_id: "artifact:idle-agree",
      artifact_type: "STATE_BEHAVIOR_CHANGE",
      artifact_version: "v1",
      surface: "HQ current work",
      change_scope: "idle after stop",
      builder_execution_id: "builder:idle",
    });
    markBuildComplete("artifact:idle-agree");
    const passed = runUniversalQc({ artifact_id: "artifact:idle-agree", evidence: idleCurrentWorkEvidence() });
    expect(passed.qc_status).toBe("QC_PASS");
    expect(
      evaluateHQLiveWorkSurfaceConsistencyGate({
        command: { work_id: "current", status: "PRESENT_IDLE", mission: null },
        floor: { work_id: "current", status: "PRESENT_IDLE", mission: null },
      }).result,
    ).toBe("PASS");
  });

  it("13. thin material page fails content QC", () => {
    createMaterialArtifact({
      artifact_id: "artifact:thin",
      artifact_type: "CONTENT_CHANGE",
      artifact_version: "v1",
      surface: "pricing",
      route: "/pricing",
      change_scope: "thin page",
      builder_execution_id: "builder:thin",
    });
    markBuildComplete("artifact:thin");
    const failed = runUniversalQc({ artifact_id: "artifact:thin", evidence: thinCustomerPageEvidence() });
    expect(failed.layer_results.find((row) => row.layer === "CONTENT")?.result).toBe("FAIL");
  });

  it("14. non-UI backend artifact does not require rendered QC", () => {
    const layers = resolveArtifactQcLayers("BACKEND_SERVICE");
    expect(layers).not.toContain("RENDERED");
    expect(layers).not.toContain("FINAL_BROWSER");
    createMaterialArtifact({
      artifact_id: "artifact:backend",
      artifact_type: "BACKEND_SERVICE",
      artifact_version: "v1",
      surface: "capital-ledger",
      change_scope: "read adapter",
      builder_execution_id: "builder:backend",
    });
    markBuildComplete("artifact:backend");
    const passed = runUniversalQc({ artifact_id: "artifact:backend", evidence: backendServiceEvidence() });
    expect(passed.qc_status).toBe("QC_PASS");
    expect(passed.required_qc_layers).not.toContain("FINAL_BROWSER");
  });

  it("15. financial surface requires data/state correctness", () => {
    expect(resolveArtifactQcLayers("FINANCIAL_SURFACE")).toContain("DATA_STATE");
    expect(resolveArtifactQcLayers("TREASURY_SURFACE")).toContain("DATA_STATE");
  });

  it("16. successful all-layer pass creates RELEASE_READY only after QC", () => {
    const proof = runFinancialReconciliationContainmentProof();
    expect(proof.progression).toEqual([
      "BUILDING",
      "BUILD_COMPLETE",
      "QC_PENDING",
      "QC_RUNNING",
      "QC_REPAIR_REQUIRED",
      "REPAIRING",
      "BUILD_COMPLETE",
      "QC_PENDING",
      "QC_RUNNING",
      "RELEASE_READY",
    ]);
    expect(proof.artifact.artifact_id).toBe(FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID);
    expect(proof.artifact.qc_status).toBe("QC_PASS");
    expect(proof.artifact.lifecycle_state).toBe("RELEASE_READY");
    expect(proof.artifact.release_status).toBe("RELEASE_READY");
    expect(proof.artifact.builder_execution_id).not.toBe(proof.artifact.qc_execution_id);
    expect(evaluateReleaseEligibilityGate(proof.artifact).result).toBe("PASS");
  });

  it("17-18. release blocked while QC_PENDING or QC_REPAIR_REQUIRED", () => {
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_PENDING",
        lifecycle_state: "QC_PENDING",
        release_requested: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_RUNNING",
        lifecycle_state: "QC_RUNNING",
        release_requested: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_REPAIR_REQUIRED",
        lifecycle_state: "QC_REPAIR_REQUIRED",
        release_requested: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_STALE",
        lifecycle_state: "QC_PENDING",
        release_requested: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_PASS",
        lifecycle_state: "RELEASE_READY",
        release_requested: true,
      }).gate,
    ).toBe(NO_QC_NO_RELEASE_GATE);
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_PASS",
        lifecycle_state: "RELEASE_READY",
        release_requested: true,
      }).result,
    ).toBe("PASS");
  });

  it("19. duplicate/stale evidence cannot certify a newer version", () => {
    createMaterialArtifact({
      artifact_id: "artifact:old-evidence",
      artifact_type: "FINANCIAL_SURFACE",
      artifact_version: "v1",
      surface: "Treasury",
      change_scope: "pulse",
      builder_execution_id: "builder:old-ev",
    });
    markBuildComplete("artifact:old-evidence");
    const passed = runUniversalQc({ artifact_id: "artifact:old-evidence", evidence: repairedFinancialCardEvidence() });
    expect(
      evaluateQCArtifactVersionIntegrityGate({
        artifact: passed,
        observed_version: "v2",
        mutation_after_qc: false,
      }).gate,
    ).toBe(QC_ARTIFACT_VERSION_INTEGRITY_GATE);
    expect(
      evaluateQCArtifactVersionIntegrityGate({
        artifact: passed,
        observed_version: "v2",
        mutation_after_qc: false,
      }).result,
    ).toBe("FAIL");
  });

  it("20. recurring escaped defect triggers RepeatedQCFailureGate", () => {
    expect(
      evaluateRepeatedQCFailureGate({
        failure_signature: "RENDERED",
        same_failure_recurrence: 2,
        escaped_to_founder: true,
      }).gate,
    ).toBe(REPEATED_QC_FAILURE_GATE);
    expect(
      evaluateRepeatedQCFailureGate({
        failure_signature: "RENDERED",
        same_failure_recurrence: 2,
        escaped_to_founder: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateRepeatedQCFailureGate({
        failure_signature: "RENDERED",
        same_failure_recurrence: 2,
        escaped_to_founder: true,
      }).reasons,
    ).toContain("FIX_THE_QC_SYSTEM");
  });

  it("HQ visibility and QC room idle after completion", () => {
    runFinancialReconciliationContainmentProof();
    const hq = projectUniversalArtifactQcHq();
    expect(hq.release_ready.length).toBeGreaterThan(0);
    expect(hq.all[0]?.qc_state).toBe("QC_PASS");
    expect(hq.all[0]?.failed_layers).toEqual([]);
    expect(hq.all[0]?.release_eligibility).toBe("RELEASE_READY");
    const qcWork = listCanonicalWork().find((row) => row.work_id === UNIVERSAL_QC_WORK_ID);
    expect(qcWork?.status).not.toBe("ACTIVE");
  });

  it("direct LIVE claim from BUILD_COMPLETE is blocked", () => {
    expect(assertArtifactLifecycleTransition("BUILD_COMPLETE", "RELEASED").ok).toBe(false);
    expect(FOUNDER_BROWSER_DEFECT_OVERRIDE).toBe("FounderBrowserDefectOverride");
    expect(RENDERED_ARTIFACT_PROOF_GATE).toBe("RenderedArtifactProofGate");
  });
});

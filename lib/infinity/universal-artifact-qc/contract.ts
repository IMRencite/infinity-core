export const MATERIAL_ARTIFACT_QC_CONTRACT = "MaterialArtifactQCContract" as const;
export const ARTIFACT_QC_LAYER_RESOLVER = "ArtifactQCLayerResolver" as const;
export const UNIVERSAL_QC_ORCHESTRATOR = "UniversalQCOrchestrator" as const;
export const RELEASE_ELIGIBILITY_GATE = "ReleaseEligibilityGate" as const;
export const QC_ARTIFACT_VERSION_INTEGRITY_GATE = "QCArtifactVersionIntegrityGate" as const;
export const FOUNDER_BROWSER_DEFECT_OVERRIDE = "FounderBrowserDefectOverride" as const;
export const RENDERED_ARTIFACT_PROOF_GATE = "RenderedArtifactProofGate" as const;
export const BROWSER_RUNTIME_HEALTH_GATE = "BrowserRuntimeHealthGate" as const;
export const REPEATED_QC_FAILURE_GATE = "RepeatedQCFailureGate" as const;
export const NO_QC_NO_RELEASE_GATE = "NoQCNoReleaseGate" as const;

export const UNIVERSAL_QC_CANONICAL_RULE =
  "NO MATERIAL BUILD ARTIFACT MAY ADVANCE TO COMPLETE / READY / LIVE UNTIL ITS APPLICABLE QC CONTRACT PASSES AGAINST THE RENDERED RESULT." as const;

export const UNIVERSAL_QC_LOCKED_PRINCIPLES = {
  build_is_not_qc: "BUILD PASS != QC PASS.",
  source_is_not_rendered: "SOURCE EXISTS != RENDERED CORRECTLY.",
  component_is_not_visible: "COMPONENT EXISTS != USER CAN SEE IT.",
  route_is_not_usable: "ROUTE EXISTS != USER CAN USE IT.",
  button_is_not_working: "BUTTON EXISTS != BUTTON WORKS.",
  form_is_not_submitting: "FORM EXISTS != FORM SUBMITS.",
  text_is_not_contained: "TEXT EXISTS != TEXT IS VISUALLY CONTAINED.",
  readable_is_not_composed: "READABLE != VISUALLY WELL-COMPOSED.",
  previous_is_not_current: "PREVIOUS PASS != CURRENT PASS.",
  founder_invalidates: "FOUNDER PHYSICAL BROWSER DEFECT INVALIDATES PRIOR QC PASS FOR THAT SURFACE.",
  no_self_certified_live: "NO WORKER MAY CALL A UI CHANGE LIVE FROM SOURCE, HTML PRESENCE, TESTS, OR BUILD SUCCESS ALONE.",
  escaped_text: "ANY TEXT ESCAPING ITS INTENDED CONTAINER = HARD QC FAIL.",
  colliding_text: "ANY TEXT COLLIDING WITH ADJACENT UI = HARD QC FAIL.",
  page_overflow: "ANY PAGE-LEVEL HORIZONTAL OVERFLOW CAUSED BY NORMAL CONTENT = HARD QC FAIL.",
  unreadable_machine_state: "ANY MACHINE-STATE VALUE THAT RENDERS UNREADABLY = HARD QC FAIL.",
} as const;

export const ARTIFACT_LIFECYCLE_STATES = [
  "BUILDING",
  "BUILD_COMPLETE",
  "QC_PENDING",
  "QC_RUNNING",
  "QC_PASS",
  "QC_REPAIR_REQUIRED",
  "REPAIRING",
  "RELEASE_READY",
  "RELEASED",
] as const;
export type ArtifactLifecycleState = (typeof ARTIFACT_LIFECYCLE_STATES)[number];

export const BLOCKING_QC_STATES = [
  "QC_PENDING",
  "QC_RUNNING",
  "QC_REPAIR_REQUIRED",
  "QC_FAILED",
  "QC_STALE",
  "QC_PENDING_BROWSER_PROOF",
] as const;
export type BlockingQcStatus = (typeof BLOCKING_QC_STATES)[number];

export const ARTIFACT_QC_STATUSES = [
  "QC_PENDING",
  "QC_RUNNING",
  "QC_PASS",
  "QC_REPAIR_REQUIRED",
  "QC_FAILED",
  "QC_STALE",
  "INVALIDATED",
  "QC_PENDING_BROWSER_PROOF",
] as const;
export type ArtifactQcStatus = (typeof ARTIFACT_QC_STATUSES)[number];

export const ARTIFACT_RELEASE_STATUSES = [
  "NOT_ELIGIBLE",
  "RELEASE_READY",
  "RELEASED",
  "PUBLICLY_LAUNCHED",
  "BLOCKED",
] as const;
export type ArtifactReleaseStatus = (typeof ARTIFACT_RELEASE_STATUSES)[number];

export const MATERIAL_ARTIFACT_TYPES = [
  "PAGE",
  "COMPONENT",
  "UI_CHANGE",
  "CONTENT_CHANGE",
  "FORM",
  "WORKFLOW",
  "ROUTE",
  "NAVIGATION",
  "FINANCIAL_SURFACE",
  "TREASURY_SURFACE",
  "HQ_SURFACE",
  "PRODUCT_FLOW",
  "RESPONSIVE_CHANGE",
  "DESIGN_SYSTEM_CHANGE",
  "DATA_PROJECTION_CHANGE",
  "STATE_BEHAVIOR_CHANGE",
  "VENTURE_SITE_BUILD",
  "VENTURE_FEATURE",
  "BUG_REPAIR",
  "BACKEND_SERVICE",
] as const;
export type MaterialArtifactType = (typeof MATERIAL_ARTIFACT_TYPES)[number];

export const QC_LAYERS = [
  "STRUCTURAL",
  "RENDERED",
  "FUNCTIONAL",
  "DATA_STATE",
  "RESPONSIVE",
  "CONTENT",
  "ACCESSIBILITY",
  "FINAL_BROWSER",
  "SECURITY_GOVERNANCE",
] as const;
export type QcLayerId = (typeof QC_LAYERS)[number];

export const QC_EVIDENCE_PRECEDENCE = [
  "FOUNDER_PHYSICAL",
  "LIVE_PRODUCTION",
  "SERVED_PREVIEW",
  "SERVED_LOCAL",
  "COMPUTED_GEOMETRY",
  "BUILD_ARTIFACT",
  "SOURCE",
] as const;
export type ArtifactQcEvidenceLevel = (typeof QC_EVIDENCE_PRECEDENCE)[number];

export type NamedArtifactGate = {
  gate: string;
  result: "PASS" | "FAIL" | "N/A";
  reasons: string[];
};

export type QcLayerResult = {
  layer: QcLayerId;
  required: boolean;
  result: "PASS" | "FAIL" | "N/A";
  reasons: string[];
  inherited_gates: NamedArtifactGate[];
};

export type MaterialArtifactQCContract = {
  contract: typeof MATERIAL_ARTIFACT_QC_CONTRACT;
  artifact_id: string;
  artifact_type: MaterialArtifactType;
  artifact_version: string;
  venture_id: string | null;
  surface: string;
  route: string | null;
  change_scope: string;
  builder_execution_id: string;
  qc_execution_id: string | null;
  build_completed_at: string | null;
  lifecycle_state: ArtifactLifecycleState;
  required_qc_layers: QcLayerId[];
  qc_status: ArtifactQcStatus;
  qc_run_id: string | null;
  qc_started_at: string | null;
  qc_completed_at: string | null;
  release_status: ArtifactReleaseStatus;
  release_id: string | null;
  evidence_refs: string[];
  evidence_level: ArtifactQcEvidenceLevel | null;
  founder_override_state: "NONE" | "DEFECT_REPORTED" | "INVALIDATED" | null;
  superseded_qc_run_id: string | null;
  layer_results: QcLayerResult[];
  attempt_count: number;
  failure_signature: string | null;
  last_repair_action: string | null;
  same_failure_recurrence: number;
  created_at: string;
  updated_at: string;
};

export const FORBIDDEN_LIFECYCLE_TRANSITIONS = [
  ["BUILD_COMPLETE", "RELEASE_READY"],
  ["BUILD_COMPLETE", "RELEASED"],
  ["BUILD_COMPLETE", "QC_PASS"],
  ["BUILDING", "RELEASE_READY"],
  ["BUILDING", "RELEASED"],
] as const;

export const ALLOWED_LIFECYCLE_TRANSITIONS: Record<ArtifactLifecycleState, ArtifactLifecycleState[]> = {
  BUILDING: ["BUILD_COMPLETE"],
  BUILD_COMPLETE: ["QC_PENDING"],
  QC_PENDING: ["QC_RUNNING"],
  QC_RUNNING: ["QC_PASS", "QC_REPAIR_REQUIRED"],
  QC_PASS: ["RELEASE_READY", "QC_PENDING", "QC_REPAIR_REQUIRED"],
  QC_REPAIR_REQUIRED: ["REPAIRING"],
  REPAIRING: ["BUILD_COMPLETE"],
  RELEASE_READY: ["RELEASED", "QC_PENDING", "QC_REPAIR_REQUIRED"],
  RELEASED: ["QC_PENDING", "QC_REPAIR_REQUIRED"],
};

export const UNIVERSAL_QC_WORK_ID = "work:infinity:universal-artifact-qc" as const;
export const UNIVERSAL_QC_WORK_TITLE = "Infinity — Universal Artifact QC" as const;

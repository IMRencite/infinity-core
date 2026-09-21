export const RENDERED_IMPROVEMENT_INTAKE_VERIFICATION_GATE = "RenderedImprovementIntakeVerificationGate" as const;
export const CUSTOMER_FACING_INTERACTION_QC_GATE = "CustomerFacingInteractionQCGate" as const;
export const BROWSER_CONSOLE_QC_GATE = "BrowserConsoleQCGate" as const;
export const CUSTOMER_FACING_NETWORK_QC_GATE = "CustomerFacingNetworkQCGate" as const;
export const CUSTOMER_FACING_NAVIGATION_QC_GATE = "CustomerFacingNavigationQCGate" as const;
export const CUSTOMER_FACING_PRODUCTION_QUALITY_GATE = "CustomerFacingProductionQualityGate" as const;
export const FOUNDER_FACING_PRODUCTION_QUALITY_GATE = "FounderFacingProductionQualityGate" as const;
export const RUNTIME_REGRESSION_RECURRENCE_GATE = "RuntimeRegressionRecurrenceGate" as const;

export const QC_EVIDENCE_LEVELS = [
  "SOURCE_ONLY",
  "BUILD_ARTIFACT",
  "SERVED_LOCAL",
  "SERVED_PREVIEW",
  "LIVE_PRODUCTION",
  "FOUNDER_PHYSICAL",
] as const;
export type QcEvidenceLevel = (typeof QC_EVIDENCE_LEVELS)[number];

export const CONSOLE_CLASSIFICATIONS = ["MATERIAL", "ACTIONABLE_WARNING", "BENIGN_EXTERNAL"] as const;
export type ConsoleClassification = (typeof CONSOLE_CLASSIFICATIONS)[number];

export const CUSTOMER_FACING_QC_PRINCIPLES = {
  source_is_not_experience: "SOURCE CODE EXISTENCE IS NOT USER EXPERIENCE.",
  component_exists_is_not_rendered: "COMPONENT EXISTS != RENDERED.",
  route_exists_is_not_reachable: "ROUTE EXISTS != REACHABLE.",
  button_exists_is_not_clickable: "BUTTON EXISTS != CLICKABLE.",
  form_exists_is_not_submittable: "FORM EXISTS != SUBMITTABLE.",
  build_is_not_browser: "BUILD PASS != BROWSER RUNTIME PASS.",
  unseen_is_incomplete: "IF A CUSTOMER CANNOT SEE OR USE THE FEATURE, THE FEATURE IS NOT COMPLETE.",
  material_runtime_blocks_quality: "A CUSTOMER-FACING VENTURE WITH MATERIAL UNRESOLVED BROWSER RUNTIME ERRORS IS NOT PRODUCTION-QUALITY.",
  build_does_not_override_browser: "BUILD PASS DOES NOT OVERRIDE BROWSER FAILURE.",
  founder_physical_overrides_source: "FOUNDER PHYSICAL BROWSER EVIDENCE OVERRIDES SOURCE-LEVEL CLAIMS.",
} as const;

export const SOURCE_ONLY_INSUFFICIENT_FOR_PRODUCTION_QUALITY = "SOURCE_ONLY_INSUFFICIENT_FOR_PRODUCTION_QUALITY" as const;

export type NamedGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
  evidence_level?: QcEvidenceLevel;
};

export type ConsoleEntry = {
  text: string;
  classification: ConsoleClassification;
  reason: string;
};

export type NetworkObservation = {
  name: string;
  required: boolean;
  url?: string;
  method?: string;
  status?: number | null;
  ok: boolean;
  failure?: string | null;
};

export type InteractionObservation = {
  name: string;
  rendered: boolean;
  visible: boolean;
  enabled: boolean;
  clickable: boolean;
  action_ok: boolean;
  uncaught_exception: boolean;
  result_state_ok: boolean;
};

export type NavigationObservation = {
  route: string;
  reached: boolean;
  failed_fetch: boolean;
};

export type RenderedIntakeEvidence = {
  venture_id: string;
  evidence_level: QcEvidenceLevel;
  founder_physical?: "PASS" | "FAIL" | "UNVERIFIED";
  trigger_rendered: boolean;
  trigger_reachable: boolean;
  trigger_clickable: boolean;
  form_opens: boolean;
  form_fields_render: boolean;
  submission_works: boolean;
  success_state_works: boolean;
  failure_state_works: boolean;
  canonical_ingest_works: boolean;
  source_only?: boolean;
};

export type ProductionQualityEvidence = {
  venture_id: string;
  evidence_level: QcEvidenceLevel;
  rendered?: NamedGate;
  interaction?: NamedGate;
  console?: NamedGate;
  network?: NamedGate;
  navigation?: NamedGate;
  responsive?: NamedGate;
  accessibility?: NamedGate;
  workflow?: NamedGate;
  production_readiness?: NamedGate;
  typecheck?: "PASS" | "FAIL";
  production_build?: "PASS" | "FAIL";
};

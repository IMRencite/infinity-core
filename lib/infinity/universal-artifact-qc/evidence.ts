import type { CustomerPageType } from "@/lib/infinity/customer-page-depth/types";
import type { ArtifactQcEvidenceLevel, MaterialArtifactType } from "./contract";

export type StructuralQcEvidence = {
  typecheck: "PASS" | "FAIL";
  build: "PASS" | "FAIL";
  schema: "PASS" | "FAIL";
  tests: "PASS" | "FAIL";
  routes_exist?: boolean;
};

export type RenderedQcEvidence = {
  overflow_hidden: boolean;
  text_contained: boolean;
  colliding: boolean;
  machine_state_readable: boolean;
  page_overflow_hidden: boolean;
  layout_ok: boolean;
  visible_machine_state?: string | null;
  visible_display?: string | null;
  evidence_level: ArtifactQcEvidenceLevel;
};

export type FunctionalQcEvidence = {
  buttons_clickable: boolean;
  forms_submit: boolean;
  routes_navigate: boolean;
  primary_action_obvious: boolean;
  dead_interactions: boolean;
};

export type DataStateQcEvidence = {
  canonical_source: boolean;
  current_state: boolean;
  no_stale_projection: boolean;
  no_fabricated_values: boolean;
  venture_identity_correct: boolean;
  current_work_consistent: boolean;
  command_status?: string | null;
  floor_status?: string | null;
  rooms_status?: string | null;
  canonical_status?: string | null;
  command_mission?: string | null;
  floor_mission?: string | null;
};

export type ResponsiveQcEvidence = {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
  no_horizontal_overflow: boolean;
};

export type ContentQcEvidence = {
  html: string;
  page_type: CustomerPageType;
};

export type AccessibilityQcEvidence = {
  contrast: boolean;
  focus: boolean;
  labels: boolean;
  keyboard: boolean;
};

export type FinalBrowserQcEvidence = {
  route_loads: boolean;
  version_matches: boolean;
  content_visible: boolean;
  no_material_errors: boolean;
  no_overflow: boolean;
  current_data: boolean;
  evidence_level: ArtifactQcEvidenceLevel;
};

export type BrowserRuntimeQcEvidence = {
  console_errors: boolean;
  runtime_exceptions: boolean;
  hydration_failures: boolean;
  network_failures: boolean;
  broken_resources: boolean;
  uncaught_interaction_errors: boolean;
};

export type SecurityGovernanceQcEvidence = {
  secret_exposure: boolean;
  write_scope_ok: boolean;
  money_movement_ok: boolean;
  capital_authority_ok: boolean;
};

export type ArtifactQcEvidenceBundle = {
  artifact_type: MaterialArtifactType;
  artifact_version: string;
  structural?: StructuralQcEvidence;
  rendered?: RenderedQcEvidence;
  functional?: FunctionalQcEvidence;
  data_state?: DataStateQcEvidence;
  responsive?: ResponsiveQcEvidence;
  content?: ContentQcEvidence;
  accessibility?: AccessibilityQcEvidence;
  final_browser?: FinalBrowserQcEvidence;
  browser_runtime?: BrowserRuntimeQcEvidence;
  security?: SecurityGovernanceQcEvidence;
};

export const ESCAPED_DEFECT_REGISTRY = "EscapedDefectRegistry" as const;

export const QC_GATE_RESULTS = ["PASS", "FAIL", "NOT_PROVEN", "NOT_APPLICABLE"] as const;
export type QcGateResult = (typeof QC_GATE_RESULTS)[number];

export const QC_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;
export type QcConfidence = (typeof QC_CONFIDENCE)[number];

export const QC_EVIDENCE_LAYERS = ["SOURCE_PASS", "COMPOSE_PASS", "DEPLOYED", "LIVE_RENDER_PASS"] as const;
export type QcEvidenceLayer = (typeof QC_EVIDENCE_LAYERS)[number];

export const INTERACTION_STATES = [
  "REST",
  "HOVER",
  "FOCUS",
  "ACTIVE",
  "VISITED",
  "DISABLED",
  "SELECTED",
] as const;
export type InteractionState = (typeof INTERACTION_STATES)[number];

export const LIVE_INTERACTION_STATES = [
  "LIVE_REST_PASS",
  "LIVE_HOVER_PASS",
  "LIVE_FOCUS_PASS",
  "LIVE_ACTIVE_PASS",
  "LIVE_VISITED_PASS",
] as const;
export type LiveInteractionState = (typeof LIVE_INTERACTION_STATES)[number];

export type QcEvidenceRecord = {
  live_url?: string | null;
  viewport?: number | null;
  rest_rendered?: boolean;
  hover_rendered?: boolean;
  focus_rendered?: boolean;
  active_rendered?: boolean;
  visited_rendered?: boolean;
  computed_contrast_checked?: boolean;
  screenshot_captured?: boolean;
  source_inspected?: boolean;
};

export type EscapedDefectRecord = {
  escape_id: string;
  discovered_at: string;
  discovered_by: "HUMAN" | "FOUNDER" | "LIVE_USER";
  defect_class: string[];
  surface: string;
  live_url?: string;
  gates_that_passed: string[];
  gate_that_should_have_caught: string;
  miss_reason: string;
  confidence_after_escape: QcConfidence;
  escape_count_in_family: number;
  required_verification: "RENDERED_REGRESSION" | "LIVE_SCREENSHOT_PROOF" | "HUMAN_VISUAL_SIGNOFF";
  defect_fixed: boolean;
  gate_strengthened: boolean;
  resolved: boolean;
  root_cause?: string;
  gate_gap?: string;
  fix?: string;
  regression?: string;
  production_proof?: string;
};

export function qcResultFromEvidence(input: {
  failed: boolean;
  requiredEvidencePresent: boolean;
  applicable?: boolean;
}): QcGateResult {
  if (input.applicable === false) return "NOT_APPLICABLE";
  if (input.failed) return "FAIL";
  if (!input.requiredEvidencePresent) return "NOT_PROVEN";
  return "PASS";
}

export function requiredVerificationForEscapeCount(count: number): EscapedDefectRecord["required_verification"] {
  if (count >= 3) return "HUMAN_VISUAL_SIGNOFF";
  if (count >= 2) return "LIVE_SCREENSHOT_PROOF";
  return "RENDERED_REGRESSION";
}

export function confidenceAfterEscape(previous: QcConfidence | null, escaped: boolean): QcConfidence {
  if (!escaped) return previous ?? "HIGH";
  return "LOW";
}

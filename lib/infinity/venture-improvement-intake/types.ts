export const VENTURE_IMPROVEMENT_INTAKE_CONTRACT = "VentureImprovementIntakeContract" as const;
export const UNIVERSAL_VENTURE_IMPROVEMENT_INTAKE_REQUIREMENT = "UniversalVentureImprovementIntakeRequirement" as const;
export const IMPROVEMENT_SUBMISSION_IDEMPOTENCY_GATE = "ImprovementSubmissionIdempotencyGate" as const;
export const VENTURE_IMPROVEMENT_INTAKE_READINESS_GATE = "VentureImprovementIntakeReadinessGate" as const;

export const INTAKE_SOURCES = [
  "IN_APP_FEEDBACK",
  "PUBLIC_SITE_FEEDBACK",
  "EMAIL",
  "SUPPORT",
  "OTHER_CANONICAL_CHANNEL",
] as const;
export type IntakeSource = (typeof INTAKE_SOURCES)[number];

export const CUSTOMER_IMPROVEMENT_CTA = "Suggest an Improvement" as const;
export const CUSTOMER_IMPROVEMENT_ACKNOWLEDGEMENT =
  "Thanks — your suggestion has been received and will be evaluated as product feedback." as const;

export type NamedGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };

export type VentureImprovementIntakeRecord = {
  contract: typeof VENTURE_IMPROVEMENT_INTAKE_CONTRACT;
  venture_id: string;
  submission_id: string;
  source: IntakeSource;
  customer_ref: string | null;
  contact_email: string | null;
  message: string;
  goal_or_context: string | null;
  page_url_or_route: string | null;
  workflow_context: string | null;
  product_area: string | null;
  authenticated_state: "AUTHENTICATED" | "ANONYMOUS";
  created_at: string;
  consent_privacy: "MINIMAL_PRODUCT_CONTEXT";
  provenance: "CUSTOMER_INTAKE_FORM" | "EMAIL" | "SUPPORT";
  synthetic: boolean;
  status: "ACCEPTED" | "DUPLICATE" | "REJECTED" | "ASKREVIEW_PAUSED";
  feedback_id: string | null;
};

export type UniversalVentureImprovementIntakeRequirement = {
  requirement: typeof UNIVERSAL_VENTURE_IMPROVEMENT_INTAKE_REQUIREMENT;
  required_for_customer_facing: true;
  surfaces: [
    "global_cta",
    "form_or_dialog",
    "server_intake",
    "canonical_feedback",
    "hq_projection",
    "rendered_trigger",
    "clickable_interaction",
    "working_submission",
    "served_browser_evidence",
  ];
  default_cta: typeof CUSTOMER_IMPROVEMENT_CTA;
  visual_sameness_forbidden: true;
  forced_popup_forbidden: true;
  source_only_insufficient: true;
};

export type IntakeAnalyticsEvent =
  | "improvement_cta_opened"
  | "submission_started"
  | "submission_completed"
  | "submission_failed";

export const FOUNDER_IDEA_LAB_VERSION = "founder_idea_lab_v1";

export const FOUNDER_IDEA_DESIRED_MODES = [
  "GRADE_ONLY",
  "GRADE_AND_VALIDATE",
  "GRADE_AND_BUILD_IF_READY",
] as const;

export type FounderIdeaDesiredMode = (typeof FOUNDER_IDEA_DESIRED_MODES)[number];

/** Statuses accepted by founder_idea_submissions_status_valid before reanalysis V1. */
export const FOUNDER_IDEA_SQL_STATUSES_V1 = [
  "DRAFT",
  "SUBMITTED",
  "RESEARCHING",
  "GRADED",
  "VALIDATING",
  "READY_FOR_DECISION",
  "BUILD_APPROVED",
  "BUILDING",
  "COMPLETED",
  "HELD",
  "REJECTED",
  "FAILED",
] as const;

/** Proposed CHECK after 20260825010000_founder_idea_lab_reanalysis_status_v1.sql */
export const FOUNDER_IDEA_SQL_STATUSES_REANALYSIS_V1 = [
  ...FOUNDER_IDEA_SQL_STATUSES_V1,
  "INSUFFICIENT_EVIDENCE",
  "RESEARCH_INCOMPLETE",
  "NEEDS_REANALYSIS",
] as const;

export const FOUNDER_IDEA_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "RESEARCHING",
  "GRADED",
  "VALIDATING",
  "READY_FOR_DECISION",
  "INSUFFICIENT_EVIDENCE",
  "RESEARCH_INCOMPLETE",
  "NEEDS_REANALYSIS",
  "BUILD_APPROVED",
  "BUILDING",
  "COMPLETED",
  "HELD",
  "REJECTED",
  "FAILED",
] as const;

export type FounderIdeaStatus = (typeof FOUNDER_IDEA_STATUSES)[number];

export const FOUNDER_ACTIONS = [
  "BUILD_THIS_BUSINESS",
  "VALIDATE_MORE",
  "HOLD",
  "REJECT",
  "BUILD_ANYWAY",
  "REASSESS",
  "REANALYZE",
  "REVIEW_REASONS",
  "ACCEPT_REJECT",
] as const;

export type FounderAction = (typeof FOUNDER_ACTIONS)[number];

export const VENTURE_ORIGINS = [
  "AUTONOMOUS_DISCOVERY",
  "FOUNDER_SUBMITTED",
  "FOUNDER_OVERRIDE",
] as const;

export type VentureOrigin = (typeof VENTURE_ORIGINS)[number];

export const CLAIM_SOURCES = ["FOUNDER_PROVIDED", "INFINITY_INFERRED"] as const;
export type ClaimSource = (typeof CLAIM_SOURCES)[number];

export const FOUNDER_FAILURE_CODES = [
  "RESEARCH_FAILED",
  "PROVIDER_FAILED",
  "RESEARCH_INCOMPLETE",
  "INSUFFICIENT_EVIDENCE",
  "NEEDS_REANALYSIS",
  "VALIDATION_REQUIRED",
  "FINANCIAL_AUTHORITY_REQUIRED",
  "BUILD_FAILED",
  "BUSINESS_REJECTED",
] as const;

export type FounderFailureCode = (typeof FOUNDER_FAILURE_CODES)[number];

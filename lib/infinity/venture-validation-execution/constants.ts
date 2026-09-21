export const EXECUTABLE_VALIDATION_PLAN_SCHEMA = "executable_validation_plan_v1" as const;

export const VALIDATION_DIMENSIONS = [
  "MARKET_DEMAND",
  "CUSTOMER_PROBLEM",
  "CUSTOMER_SEGMENT",
  "WILLINGNESS_TO_PAY",
  "PRICING",
  "COMPETITION",
  "DIFFERENTIATION",
  "DISTRIBUTION",
  "CAC",
  "RETENTION",
  "MARGIN",
  "LTV",
  "BUILDABILITY",
  "LEGAL_COMPLIANCE",
] as const;

export const VALIDATION_PHASES = [
  "VALIDATION_DEFINITION",
  "GROUNDING_RESEARCH",
  "CUSTOMER_EVIDENCE",
  "PRICING_VALIDATION",
  "ECONOMIC_VALIDATION",
  "PRODUCT_ADVANTAGE_VALIDATION",
  "DECISION_REASSESSMENT",
  "BUILD_HANDOFF",
] as const;

export const VALIDATION_MODES = ["RESEARCH_VALIDATION", "MARKET_EXPERIMENT"] as const;

export const VALIDATION_OUTCOMES = [
  "BUILD_READY",
  "MORE_VALIDATION_REQUIRED",
  "EXTERNAL_VALIDATION_REQUIRED",
  "HOLD",
  "REJECT",
  "POLICY_BLOCKED",
] as const;

export const LIVE_QUERY_BUDGET = {
  maxProviderPhases: 3,
  maxQueriesPerPhase: 5,
  hardQueryCap: 15,
} as const;

export const SOURCE_QUALITY = ["HIGH", "MEDIUM", "LOW"] as const;
export const SOURCE_INDEPENDENCE = ["KNOWN", "PARTIALLY_KNOWN", "INDEPENDENCE_UNKNOWN"] as const;

export const WRITE_BOUNDARY = {
  deployments: 0,
  domainPurchases: 0,
  dnsWrites: 0,
  paymentWrites: 0,
  treasuryMovements: 0,
  adSpend: 0,
  customerOutreach: 0,
  emailSends: 0,
  publicPublishing: 0,
  realProductBuilds: 0,
} as const;

export const AUTONOMOUS_SALES_EXECUTION_CONTRACT = "AutonomousSalesExecutionV1" as const;
export const OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID =
  "campaign:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:first-outbound-validation" as const;
export const OCCUPANCYNPV_VENTURE_ID = "candidate:7e7e924e-0741-4155-a729-8d529da77ea9" as const;

export const SALES_DAILY_CAP = 10;
export const SALES_INITIAL_RAMP = 5;
export const SALES_MAX_TOUCHES = 3;
export const SALES_PER_RECIPIENT_CAP = 3;
export const SALES_PER_DOMAIN_CAP = 2;

export const AUTONOMOUS_OUTBOUND_EXECUTION_GATE = "AutonomousOutboundExecutionGate" as const;
export const OUTBOUND_MESSAGE_QUALITY_GATE = "OutboundMessageQualityGate" as const;
export const SALES_OUTBOUND_RATE_LIMIT_GATE = "SalesOutboundRateLimitGate" as const;
export const SALES_EXTERNAL_ACTION_IDEMPOTENCY_GATE = "SalesExternalActionIdempotencyGate" as const;
export const SALES_REPLY_CLASSIFICATION_GATE = "SalesReplyClassificationGate" as const;
export const SALES_TECHNICAL_FAILURE_TRUTH_GATE = "SalesTechnicalFailureTruthGate" as const;
export const OCCUPANCYNPV_OUTBOUND_ACTIVATION_GATE = "OccupancyNPVOutboundActivationGate" as const;

export const RESPONSE_CLASSES = [
  "POSITIVE_INTEREST",
  "QUESTION",
  "DEMO_REQUEST",
  "PRICING_QUESTION",
  "OBJECTION",
  "NOT_NOW",
  "REFERRAL",
  "WRONG_PERSON",
  "NOT_INTERESTED",
  "UNSUBSCRIBE",
  "OUT_OF_OFFICE",
  "BOUNCE",
  "SPAM_COMPLAINT",
  "UNKNOWN",
] as const;
export type ResponseClass = (typeof RESPONSE_CLASSES)[number];

export const FOLLOW_UP_ACTIONS = ["FOLLOW_UP", "WAIT", "HANDOFF", "STOP", "SUPPRESS"] as const;
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number];

export const OBJECTION_CLASSES = [
  "PRICE",
  "TIMING",
  "FEATURE_GAP",
  "TRUST",
  "ROI",
  "AUTHORITY",
  "PROCUREMENT",
  "IMPLEMENTATION",
  "COMPETITOR",
  "NO_NEED",
] as const;
export type ObjectionClass = (typeof OBJECTION_CLASSES)[number];

export const VENTURE_SALES_FLOOR_CONTRACT = "VentureSalesFloorContract" as const;
export const SALES_INTELLIGENCE_CORE = "SalesIntelligenceCore" as const;

export const SALES_FLOOR_DEPARTMENT_ID = "sales_floor" as const;

export const SALES_ROOMS = [
  "OUTBOUND_ACQUISITION",
  "INBOUND_CONVERSION",
  "EXPANSION_RETENTION",
  "PARTNERSHIPS_CHANNEL",
  "OFFER_CLOSING",
] as const;

export type SalesRoomId = (typeof SALES_ROOMS)[number];

export const SALES_ROOM_LABELS: Record<SalesRoomId, string> = {
  OUTBOUND_ACQUISITION: "Outbound Acquisition",
  INBOUND_CONVERSION: "Inbound Conversion",
  EXPANSION_RETENTION: "Expansion & Retention",
  PARTNERSHIPS_CHANNEL: "Partnerships & Channel",
  OFFER_CLOSING: "Offer & Closing",
};

export const SALES_ROOM_QUESTIONS: Record<SalesRoomId, string> = {
  OUTBOUND_ACQUISITION: "Who should we proactively approach next?",
  INBOUND_CONVERSION: "Who is already interested, and what should happen next to convert them?",
  EXPANSION_RETENTION: "How do we retain and expand existing customer revenue?",
  PARTNERSHIPS_CHANNEL: "Who already has access to our buyers and can help us reach them?",
  OFFER_CLOSING: "What is preventing this qualified opportunity from closing?",
};

export const SALES_ROOM_STATES = [
  "ACTIVE",
  "MONITORING",
  "WAITING",
  "BLOCKED",
  "PRESENT_IDLE",
  "DEGRADED",
  "NOT_APPLICABLE_TO_CURRENT_STATE",
] as const;

export type SalesRoomState = (typeof SALES_ROOM_STATES)[number];

export const SALES_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type SalesPriority = (typeof SALES_PRIORITIES)[number];

export const SALES_PIPELINE_STAGES = [
  "IDENTIFIED",
  "RESEARCHING",
  "QUALIFIED",
  "CONTACT_READY",
  "CONTACTED",
  "ENGAGED",
  "INTERESTED",
  "MEETING_REQUESTED",
  "MEETING_SCHEDULED",
  "DEMO_COMPLETED",
  "TRIAL_STARTED",
  "EVALUATING",
  "OBJECTION",
  "PROPOSAL",
  "NEGOTIATION",
  "VERBAL_COMMIT",
  "WON",
  "LOST",
  "DISQUALIFIED",
  "UNSUBSCRIBED",
  "DORMANT",
  "REACTIVATION",
] as const;

export type SalesPipelineStage = (typeof SALES_PIPELINE_STAGES)[number];

export const SALES_MOTIONS = [
  "OUTBOUND_PROSPECTING",
  "INBOUND_CONVERSION",
  "EXPANSION",
  "RETENTION",
  "PARTNER_SOURCED",
  "ASSISTED_CLOSE",
] as const;

export type SalesMotion = (typeof SALES_MOTIONS)[number];

export const SALES_OBJECTION_CLASSES = [
  "PRICE",
  "TIMING",
  "TRUST",
  "FEATURE_GAP",
  "COMPETITOR",
  "AUTHORITY",
  "BUDGET",
  "IMPLEMENTATION",
  "SECURITY",
  "LEGAL",
  "PROCUREMENT",
  "ROI",
  "NO_NEED",
  "UNKNOWN",
] as const;

export type SalesObjectionClass = (typeof SALES_OBJECTION_CLASSES)[number];

export const PARTNER_RELATIONSHIP_STATES = [
  "IDENTIFIED",
  "RESEARCHING",
  "QUALIFIED",
  "CONTACTED",
  "ENGAGED",
  "DISCUSSING",
  "ACTIVE_PARTNER",
  "PAUSED",
  "REJECTED",
  "ENDED",
] as const;

export type PartnerRelationshipState = (typeof PARTNER_RELATIONSHIP_STATES)[number];

export const INBOUND_INTENT_SOURCES = [
  "FORM_SUBMIT",
  "TRIAL_START",
  "SIGNUP",
  "PRICING_VIEW",
  "CHECKOUT_START",
  "CHECKOUT_ABANDON",
  "DEMO_REQUEST",
  "REPLY",
  "SALES_QUESTION",
  "PQL",
] as const;

export type InboundIntentSource = (typeof INBOUND_INTENT_SOURCES)[number];

export const SALES_OWNER = "SALES" as const;
export const GROWTH_OWNER = "GROWTH" as const;
export const FULFILLMENT_OWNER = "FULFILLMENT" as const;
export const SUPPORT_OWNER = "SUPPORT" as const;

export const OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID =
  "campaign:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:first-outbound-validation" as const;

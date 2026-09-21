export const MARKET_VALIDATION_ACQUISITION_RUNTIME = "MarketValidationAcquisitionRuntime" as const;
export const MARKET_VALIDATION_ACQUISITION = "MARKET_VALIDATION_ACQUISITION" as const;
export const LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED =
  "LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED" as const;
export const READY_FOR_VALIDATION_DECISION = "READY_FOR_VALIDATION_DECISION" as const;
export const MAX_DISCOVERY_COHORT = 8 as const;
export const TELEMETRY_PERSISTENCE_NOTE =
  "V1 persists MISSION_ACTIVITY_EVENT_V1 to process memory and .infinity/mission-activity/events.json for local single-process restart. The autonomous Vercel/cron host also writes the same events to engine_events. Disk-only is not the long-term multi-instance/serverless event store; production heartbeat uses canonical database-backed durability." as const;

export const ACQUISITION_TRIGGERS = [
  "EXPERIMENT_ENTERED_COLLECTING",
  "REAL_SUBMISSION_RECEIVED",
  "STRONG_INTENT_RECEIVED",
  "PRICING_SELECTION_RECEIVED",
  "ACQUISITION_MISSION_COMPLETED",
  "ACQUISITION_MISSION_FAILED",
  "ACQUISITION_MISSION_BLOCKED",
  "AUTHORIZATION_GRANTED",
  "COMMUNICATIONS_MISSION_COMPLETED",
  "RESEARCH_FAILURE_CLEARED",
  "CHANNEL_UNDERPERFORMING",
  "THRESHOLD_MET",
  "EXPERIMENT_WINDOW_NEARING_EXPIRY",
  "EXPERIMENT_WINDOW_EXPIRED",
] as const;

export type AcquisitionTrigger = (typeof ACQUISITION_TRIGGERS)[number];

export const ACQUISITION_CHANNEL_TYPES = [
  "founder_assisted_introduction",
  "bounded_professional_outreach",
  "professional_association",
  "bounded_directory_cohort",
  "community_post",
  "professional_social_post",
  "organic_growth_limited",
  "paid_acquisition",
] as const;

export type AcquisitionChannelType = (typeof ACQUISITION_CHANNEL_TYPES)[number];

export const AUTHORIZATION_CLASSES = [
  "READ_ONLY_RESEARCH",
  "INTERNAL_GENERATION",
  "EXTERNAL_COMMUNICATION",
  "PUBLICATION",
  "PAID_ACQUISITION",
  "FINANCIAL_SPEND",
  "PROVIDER_MUTATION",
] as const;

export type AuthorizationClass = (typeof AUTHORIZATION_CLASSES)[number];

export const MISSION_SUBTYPES = [
  "ACQUISITION_RESEARCH",
  "PROSPECT_DISCOVERY",
  "PROSPECT_QUALIFICATION",
  "OUTREACH_PREPARATION",
  "OUTREACH_EXECUTION",
  "COMMUNITY_DISTRIBUTION",
  "ORGANIC_VALIDATION_CONTENT",
  "CREATIVE_ACQUISITION_ASSET",
  "PAID_VALIDATION_TRAFFIC",
  "EVIDENCE_MONITORING",
] as const;

export type AcquisitionMissionSubtype = (typeof MISSION_SUBTYPES)[number];

export const SCHEDULE_HOST_REQUIREMENT =
  "runMissionRuntimeTick hosted by Vercel cron /api/runtime/tick every 12 hours, plus event-driven invokeMarketValidationAcquisitionRuntime. No browser or Cursor session required." as const;

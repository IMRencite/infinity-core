export const PROSPECT_INTELLIGENCE_CONTRACT = "ProspectIntelligenceFoundationV1" as const;
export const PROSPECT_INTELLIGENCE_VERSION = "prospect-intelligence-v1" as const;
export const PROSPECT_INTELLIGENCE_OWNER = "INFINITY_OS" as const;

export const LOCKED_PRINCIPLES = [
  "INFINITY_OS_OWNS_CANONICAL_GRAPH",
  "INTELLIGENCE_COMPOUNDS",
  "SHARED_SERVICE_ONLY",
  "VENTURES_DO_NOT_OWN_ENTITIES",
  "NEW_VENTURES_QUERY_EXISTING_GRAPH",
  "REFRESH_AND_HISTORY",
  "FACTS_SEPARATE_FROM_INFERENCE",
  "CONTINUOUS_REPLENISHMENT",
  "ALWAYS_ON_SALES_WHEN_ELIGIBLE",
  "DISCOVERY_NOT_OUTREACH",
  "ELIGIBILITY_OVERRIDES_OPPORTUNITY",
  "OUTCOMES_FEED_PERFORMANCE",
  "HQ_FIRST_CLASS_ROOM",
  "PUBLIC_SANITIZED_ROOM",
  "NO_PUBLIC_PII",
  "LONG_TERM_DATA_ASSET",
] as const;

export const PROSPECT_INTELLIGENCE_CAPABILITY = "prospect.intelligence.shared" as const;

export const AUTHORIZED_CONSUMERS = [
  "opportunity_discovery",
  "research_grid",
  "growth_nexus",
  "decision_engine",
  "sales_outbound_runtime",
  "communication_runtime",
  "performance_intelligence",
  "venture_runtime",
  "agent_runtime",
  "hq_interface",
  "reporting",
  "prospect_intelligence",
] as const;
export type ProspectIntelligenceConsumer = (typeof AUTHORIZED_CONSUMERS)[number];

export const PROSPECT_EVENT_TYPES = [
  "prospect.source.observed",
  "prospect.discovery.requested",
  "prospect.discovery.started",
  "prospect.discovery.completed",
  "prospect.source.healthy",
  "prospect.source.degraded",
  "prospect.observation.created",
  "prospect.entity.created",
  "prospect.entity.updated",
  "prospect.entity.merged",
  "prospect.entity.ambiguous",
  "prospect.relationship.created",
  "prospect.enrichment.requested",
  "prospect.enrichment.completed",
  "prospect.refresh.due",
  "prospect.refresh.requested",
  "prospect.refresh.completed",
  "prospect.match.created",
  "prospect.match.changed",
  "prospect.match.updated",
  "prospect.inventory.low",
  "prospect.inventory.replenishment_requested",
  "prospect.inventory.replenished",
  "prospect.published_to_sales",
  "sales.outreach.created",
  "sales.outreach.sent",
  "sales.reply.received",
  "sales.meeting.booked",
  "sales.outcome.recorded",
] as const;
export type ProspectEventType = (typeof PROSPECT_EVENT_TYPES)[number];

export const RESOLUTION_DECISIONS = [
  "MATCHED",
  "LIKELY_MATCH",
  "AMBIGUOUS",
  "NOT_MATCHED",
  "MANUAL_REVIEW",
] as const;
export type ResolutionDecision = (typeof RESOLUTION_DECISIONS)[number];

export const INVENTORY_STATES = [
  "ready",
  "needs_enrichment",
  "warming",
  "recently_contacted",
  "recycle_later",
  "suppressed",
  "exhausted",
  "disqualified",
] as const;
export type InventoryState = (typeof INVENTORY_STATES)[number];

export const WORKFLOW_STAGES = [
  "DISCOVER",
  "INGEST",
  "RESOLVE",
  "ENRICH",
  "CLASSIFY",
  "MATCH",
  "PUBLISH",
  "REFRESH",
] as const;
export type ProspectWorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const HQ_PROSPECT_INTELLIGENCE_ROOM_ID = "prospect_intelligence" as const;
export const PUBLIC_PROSPECT_INTELLIGENCE_DEPARTMENT = "PROSPECT_INTELLIGENCE" as const;

export const HQ_PROSPECT_WORKER_ROLES = [
  "Source Scout",
  "Acquisition Worker",
  "Ingestion Worker",
  "Record Normalizer",
  "Identity Resolver",
  "Enrichment Agent",
  "Classification Agent",
  "Venture Match Agent",
  "Refresh Agent",
  "Compliance Agent",
] as const;

export const SHARED_PROSPECT_INTELLIGENCE_ACCESS_GATE = "SharedProspectIntelligenceAccessGate" as const;
export const PROSPECT_DATA_LINEAGE_GATE = "ProspectDataLineageGate" as const;
export const PROSPECT_INVENTORY_HEALTH_GATE = "ProspectInventoryHealthGate" as const;
export const ALWAYS_ON_SALES_CONTINUITY_GATE = "AlwaysOnSalesContinuityGate" as const;
export const PROSPECT_INTELLIGENCE_ROOM_PARITY_GATE = "ProspectIntelligenceRoomParityGate" as const;
export const PROSPECT_INTELLIGENCE_PUBLIC_PRIVACY_GATE = "ProspectIntelligencePublicPrivacyGate" as const;
export const PROSPECT_SOURCE_POLICY_GATE = "ProspectSourcePolicyGate" as const;
export const PROSPECT_ACQUISITION_CONTINUITY_GATE = "ProspectAcquisitionContinuityGate" as const;
export const PROSPECT_ACQUISITION_LINEAGE_GATE = "ProspectAcquisitionLineageGate" as const;
export const PROSPECT_ACQUISITION_DEDUPE_GATE = "ProspectAcquisitionDedupeGate" as const;
export const PROSPECT_SOURCE_HEALTH_GATE = "ProspectSourceHealthGate" as const;
export const PROSPECT_ACQUISITION_CONTRACT = "ProspectIntelligenceAcquisitionV1" as const;

export const DEFAULT_TARGET_READY_INVENTORY = 50;
export const DEFAULT_MINIMUM_READY_INVENTORY = 10;
export const DEFAULT_AVERAGE_DAILY_CONSUMPTION = 5;

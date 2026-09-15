import type {
  InboundIntentSource,
  PartnerRelationshipState,
  SalesMotion,
  SalesObjectionClass,
  SalesPipelineStage,
  SalesPriority,
  SalesRoomId,
  SalesRoomState,
} from "./contract";

export type UnknownOrNumber = number | "UNKNOWN";

export type SalesAccount = {
  account_id: string;
  venture_id: string;
  public_safe_label: string;
  is_customer: boolean;
  industry?: string;
  segment?: string;
};

export type SalesContact = {
  contact_id: string;
  account_id: string;
  role?: string;
  suppressed: boolean;
};

export type SalesLead = {
  lead_id: string;
  account_id: string;
  contact_id: string;
  source: "OUTBOUND" | "INBOUND" | "PARTNER";
  stage: SalesPipelineStage;
};

export type SalesOpportunity = {
  opportunity_id: string;
  lead_id: string;
  account_id: string;
  stage: SalesPipelineStage;
  owner_room: SalesRoomId;
  qualified: boolean;
};

export type SalesDeal = {
  deal_id: string;
  opportunity_id: string;
  stage: SalesPipelineStage;
  won_evidence: string | null;
};

export type SalesPipeline = {
  pipeline_id: string;
  venture_id: string;
  records: Array<{ record_id: string; stage: SalesPipelineStage; evidence: string[] }>;
};

export type SalesActivity = {
  activity_id: string;
  target_id: string;
  room: SalesRoomId;
  kind: string;
  executed: boolean;
};

export type SalesInteraction = {
  interaction_id: string;
  target_id: string;
  kind: "REPLY" | "MEETING" | "DEMO" | "OTHER";
  occurred: boolean;
};

export type SalesObjection = {
  objection_id: string;
  class: SalesObjectionClass;
  opportunity_id?: string;
  outcome?: "OPEN" | "RESOLVED" | "LOST";
};

export type SalesOfferContext = {
  offer_id: string;
  venture_id: string;
  architecture_ready: boolean;
};

export type SalesPartner = {
  partner_id: string;
  venture_id: string;
  relationship: PartnerRelationshipState;
  referrals: number;
};

export type SalesChannel = {
  channel_id: string;
  name: string;
  converting: boolean;
};

export type SalesSequence = {
  sequence_id: string;
  campaign_id: string;
  touches: number;
  max_touches: number;
};

export type SalesFollowUp = {
  follow_up_id: string;
  target_id: string;
  due: boolean;
  blocked_by_suppression: boolean;
};

export type SalesOutcome = {
  outcome_id: string;
  kind: "REPLY" | "MEETING" | "WON" | "LOST" | "UNSUBSCRIBE" | "PROVIDER_FAILURE";
  inferred_won: boolean;
};

export type SalesAttribution = {
  attribution_id: string;
  room: SalesRoomId;
  motion: SalesMotion;
  channel?: string;
  partner_id?: string;
  attributed_revenue: UnknownOrNumber;
};

export type SalesRoomAssignment = {
  target_id: string;
  primary_room: SalesRoomId;
  contributing_rooms: SalesRoomId[];
};

export type SalesIntelligenceObservation = {
  observation_id: string;
  kind: "ICP" | "MESSAGE" | "OBJECTION" | "CHANNEL" | "OFFER" | "RETENTION";
  key: string;
  converts: boolean;
  weight: number;
};

export type SalesLearningDecision = {
  decision_id: string;
  changes_priority: boolean;
  preferred_room?: SalesRoomId;
  preferred_motion?: SalesMotion;
  reason: string;
};

export type InboundIntentSignal = {
  signal_id: string;
  source: InboundIntentSource;
  target_id: string;
  available: boolean;
};

export type CustomerExpansionSignal = {
  signal_id: string;
  customer_id: string;
  kind: "UPSELL" | "CROSS_SELL" | "SEAT_GROWTH" | "FEATURE_LIMIT";
  evidence: string;
};

export type RetentionRiskSignal = {
  signal_id: string;
  customer_id: string;
  kind: "USAGE_DECLINE" | "ONBOARDING_INCOMPLETE" | "PAYMENT_FAILURE" | "RENEWAL" | "SUPPORT_FRICTION";
  evidence: string;
};

export type PartnerOpportunity = {
  partner_opportunity_id: string;
  partner_id: string;
  stage: PartnerRelationshipState;
};

export type SalesRoomProjection = {
  room: SalesRoomId;
  label: string;
  question: string;
  state: SalesRoomState;
  priority: SalesPriority;
  applicable: boolean;
  contribution: string;
  active_ventures: string[];
  queue_count: number;
  kpi_summary: Record<string, UnknownOrNumber | string>;
  latest_result: string;
  next_action: string;
  reason: string;
};

export type SalesFloorEvidence = {
  venture_id: string;
  display_name: string;
  commercial: boolean;
  non_commercial_reason?: string;
  customers: number;
  inbound_signals: InboundIntentSignal[];
  qualified_opportunities: number;
  won_deals: number;
  lost_deals: number;
  partners: SalesPartner[];
  offer_ready: boolean;
  public_site_live: boolean;
  existing_campaign?: {
    campaign_id: string;
    motion: SalesMotion;
    recognized: boolean;
    sending: boolean;
    authorized_to_execute: boolean;
  };
  suppressions: string[];
  objections: SalesObjection[];
  observations: SalesIntelligenceObservation[];
  provider_failures: number;
  pipeline: SalesPipeline["records"];
  paid_acquisition: 0;
  money_movement: "DISABLED";
  mercury: "READ_ONLY";
};

export type SalesMotionResolution = {
  venture_id: string;
  eligible_rooms: SalesRoomId[];
  priority_by_room: Record<SalesRoomId, SalesPriority>;
  recommended_motion: SalesMotion;
  recommended_room: SalesRoomId;
  reason: string;
  expected_outcome: string;
  evidence: string[];
  risk: string;
  financial_exposure: "NONE";
  required_capability: string;
  next_review_condition: string;
};

export type AutonomousSalesRecommendation = {
  recommended_room: SalesRoomId;
  recommended_action: string;
  reason: string;
  evidence: string[];
  expected_value: UnknownOrNumber;
  execution_authorized: false;
};

export type SalesIntelligenceProjection = {
  top_converting_icp: string | "UNKNOWN";
  best_performing_motion: SalesMotion | "UNKNOWN";
  top_recurring_objection: SalesObjectionClass | "UNKNOWN";
  highest_converting_channel: string | "UNKNOWN";
  close_rate: UnknownOrNumber;
  pipeline_health: string;
};

export type SalesFloorHqView = {
  floor: "Sales Floor";
  status: SalesRoomState;
  venture_id: string;
  venture_name: string;
  total_pipeline: number;
  qualified_opportunities: number;
  deals_in_progress: number;
  wins: number;
  losses: number;
  rooms: SalesRoomProjection[];
  intelligence: SalesIntelligenceProjection;
  priorities: Array<{ room: SalesRoomId; priority: SalesPriority }>;
  latest_outcomes: string[];
  next_actions: string[];
  recognized_campaign_id: string | null;
  duplicate_campaign_created: false;
  autonomous_execution_enabled: false;
  current_motion: SalesMotion;
  highest_priority_room: SalesRoomId;
  highest_priority_reason: string;
};

export type PublicSalesFloorProjection = {
  floor: "Sales Floor";
  rooms: Array<{
    public_name: string;
    public_activity: string;
  }>;
  public_agent_count: number;
};

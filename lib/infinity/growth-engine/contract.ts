export const VENTURE_GROWTH_STRATEGY_CONTRACT = "VentureGrowthStrategyContract" as const;
export const GROWTH_TACTIC_REGISTRY = "GrowthTacticRegistry" as const;
export const GROWTH_TACTIC_SELECTION_ENGINE = "GrowthTacticSelectionEngine" as const;
export const GROWTH_TACTIC_CONTRACT = "GrowthTacticContract" as const;
export const LIVE_OUTBOUND_COMMUNICATION_PATH_GATE = "LiveOutboundCommunicationPathGate" as const;
export const PRODUCTION_GROWTH_RUNTIME_READINESS_GATE = "ProductionGrowthRuntimeReadinessGate" as const;
export const GROWTH_EXPERIMENT_ACTIVE = "GROWTH_EXPERIMENT_ACTIVE" as const;
export const VENTURE_GROWTH_FUNNEL_CONTRACT = "VentureGrowthFunnelContract" as const;
export const FREE_TRIAL_OFFER_CONTRACT = "FreeTrialOfferContract" as const;
export const USAGE_LIMITED_TRIAL_CONTRACT = "UsageLimitedTrialContract" as const;
export const TRIAL_FULFILLMENT_CONTRACT = "TrialFulfillmentContract" as const;
export const OUTBOUND_VALIDATION_CAMPAIGN_CONTRACT = "OutboundValidationCampaignContract" as const;
export const OUTREACH_SEND_TIME_OPTIMIZATION_CONTRACT = "OutreachSendTimeOptimizationContract" as const;
export const INFINITY_COMMUNICATION_IDENTITY_CONTRACT = "InfinityCommunicationIdentityContract" as const;
export const NATURAL_AUTONOMOUS_COMMUNICATION_CONTRACT = "NaturalAutonomousCommunicationContract" as const;
export const AUTONOMOUS_RESPONSE_PACING_CONTRACT = "AutonomousResponsePacingContract" as const;
export const GROWTH_ACTIVATION_REQUIRED = "GROWTH_ACTIVATION_REQUIRED" as const;
export const GROWTH_STRATEGY_REQUIRED = "GROWTH_STRATEGY_REQUIRED" as const;

export const DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY = 10;
export const DEFAULT_CAMPAIGN_BUSINESS_DAYS = 20;
export const DEFAULT_STARTING_PROSPECT_TARGET = 200;
export const DEFAULT_MAX_TOUCHES = 3;
export const DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS = 3;
export const DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS = 6;
export const ASKREVIEW_MINIMUM_QUALIFIED_CONVERSATIONS = 15;
export const FIVE_CONTACTS_IS_INSUFFICIENT = 5;

export const MORNING_SEND_HYPOTHESIS = "08:30-10:30 recipient local time";
export const AFTERNOON_SEND_HYPOTHESIS = "13:00-15:00 recipient local time";

export const INFINITY_BRAND_NAME = "Infinity" as const;
export const INFINITY_TRUTHFUL_IDENTITY =
  "I’m Infinity, IMR’s autonomous venture operating system." as const;
export const INFINITY_FIRST_CONTACT_IDENTITY = "I’m Infinity." as const;

export const GROWTH_TACTICS = [
  "FREE_TRIAL",
  "LIMITED_FREE_USAGE",
  "FREEMIUM",
  "PAID_TRIAL",
  "FIRST_USE_FREE",
  "ONE_TIME_SAMPLE",
  "DEMO",
  "INTERACTIVE_PREVIEW",
  "MONEY_BACK_GUARANTEE",
  "INTRODUCTORY_PRICE",
  "ANNUAL_PLAN_INCENTIVE",
  "BUNDLE",
  "REFERRAL",
  "AFFILIATE",
  "PARTNERSHIP",
  "CASE_STUDY",
  "SOCIAL_PROOF",
  "TESTIMONIAL",
  "COMPARISON",
  "ROI_CALCULATOR",
  "LEAD_MAGNET",
  "EMAIL_NURTURE",
  "OUTBOUND_EMAIL",
  "FOLLOW_UP_SEQUENCE",
  "ABANDONED_CHECKOUT_RECOVERY",
  "ACTIVATION_SEQUENCE",
  "ONBOARDING",
  "UPSELL",
  "CROSS_SELL",
  "WINBACK",
  "REACTIVATION",
  "RETENTION_OFFER",
  "SEO",
  "ORGANIC_CONTENT",
  "PAID_SEARCH",
  "PAID_SOCIAL",
  "ORGANIC_SOCIAL",
] as const;

export type GrowthTacticId = (typeof GROWTH_TACTICS)[number];

export type GrowthTacticContract = {
  contract: typeof GROWTH_TACTIC_CONTRACT;
  tactic: GrowthTacticId;
  providerNeutral: true;
  enabled: boolean;
};

export type GrowthFunnelState =
  | "VISITOR"
  | "PROSPECT"
  | "CONTACTED"
  | "REPLIED"
  | "QUALIFIED"
  | "ACCOUNT_CREATED"
  | "TRIAL_STARTED"
  | "ACTIVATED"
  | "VALUE_EVENT_REACHED"
  | "CHECKOUT_STARTED"
  | "TRIAL_CONVERTED"
  | "PAID"
  | "RETAINED"
  | "EXPANDED"
  | "CHURNED"
  | "REACTIVATED";

export type InboundCommunicationClass =
  | "POSITIVE_INTEREST"
  | "QUALIFIED_INTEREST"
  | "QUESTION"
  | "PRICING_QUESTION"
  | "OBJECTION"
  | "NOT_NOW"
  | "NOT_INTERESTED"
  | "UNSUBSCRIBE"
  | "WRONG_PERSON"
  | "REFERRAL"
  | "SUPPORT"
  | "LEGAL_RISK"
  | "REGULATED_RISK"
  | "IDENTITY_QUESTION"
  | "IDENTITY_UNCERTAIN"
  | "OTHER";

export type TrialSuitability = "RECOMMENDED" | "TEST" | "NOT_RECOMMENDED" | "INSUFFICIENT_EVIDENCE";

export type NamedGrowthGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type VentureGrowthStrategy = {
  contract: typeof VENTURE_GROWTH_STRATEGY_CONTRACT;
  venture_id: string;
  target_segments: string[];
  positioning: string;
  primary_acquisition_channels: string[];
  secondary_channels: string[];
  conversion_strategy: string;
  activation_strategy: string;
  trial_or_entry_strategy: string;
  outreach_strategy: string;
  follow_up_strategy: string;
  retention_strategy: string;
  current_tactics: GrowthTacticId[];
  current_experiments: string[];
  economic_guardrails: string[];
  budget_guardrails: string[];
  current_evidence: string[];
  next_learning_objective: string;
  current_status:
    | "READY"
    | "QUEUED"
    | "GROWTH_ACTIVATION_REQUIRED"
    | "GROWTH_EXPERIMENT_ACTIVE"
    | "GROWTH_STRATEGY_REQUIRED"
    | "WAITING_FOR_EVIDENCE";
  last_updated_at: string;
  value_event: string;
  authorized_to_execute: boolean;
};

export type GrowthNexusHqView = {
  strategy: VentureGrowthStrategy;
  channels: string[];
  campaign: {
    campaignId: string;
    dailyTarget: number;
    businessDays: number;
    prospectTarget: number;
    newProspectsToday: number;
    sourced: number;
    sent: number;
    delivered: number;
    sequenceVolume: number;
    replies: number;
    qualifiedReplies: number;
    qualifiedConversations: number;
    selectedSegment: string;
    messageVariant: string;
    followUpState: string;
    sendTimeExperiment: string;
    currentBestWindow: string;
    nextSendWindow: string;
    status: string;
  };
  trial: {
    strategy: string;
    suitability: TrialSuitability;
    starts: number;
    activation: number;
    valueEvents: number;
    conversions: number;
    enabled: boolean;
  };
  timing: {
    bestSendWindows: string[];
    recipientLocalTime: boolean;
    responsePacing: string;
  };
  communication: {
    senderIdentity: typeof INFINITY_BRAND_NAME;
    identityPolicy: "BRAND_FIRST / TRUTHFUL_ON_INQUIRY";
    humanImpersonation: "PROHIBITED";
  };
  deliverability: string;
  retention: string;
  currentExperiments: string[];
  nextTactic: string;
  nextLearningObjective: string;
  production?: Record<string, string | number | null | undefined>;
};

export type GrowthNexusFloorView = {
  views: GrowthNexusHqView[];
  senderIdentity: typeof INFINITY_BRAND_NAME;
  identityPolicy: "BRAND_FIRST / TRUTHFUL_ON_INQUIRY";
  humanImpersonation: "PROHIBITED";
  organic?: Record<string, unknown>;
  organicRuntime?: Record<string, unknown>;
  blogOs?: { latest_article?: string | null } | null;
  systemBlog?: { current_work?: string | null } | null;
};

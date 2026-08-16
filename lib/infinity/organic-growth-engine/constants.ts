export const ORGANIC_GROWTH_ENGINE_VERSION = "organic_growth_engine_v1";
export const ORGANIC_GROWTH_SCORING_VERSION = "organic_growth_scoring_v1";

export const ORGANIC_VIABILITY_RECOMMENDATIONS = [
  "NONE",
  "LIMITED",
  "STANDARD",
  "AUTHORITY",
  "LARGE_SCALE",
] as const;
export type OrganicViabilityRecommendation =
  (typeof ORGANIC_VIABILITY_RECOMMENDATIONS)[number];

export const EVIDENCE_CONFIDENCE_LEVELS = [
  "SOURCE_BACKED",
  "DERIVED",
  "ESTIMATED",
  "UNKNOWN",
] as const;
export type EvidenceConfidenceLevel = (typeof EVIDENCE_CONFIDENCE_LEVELS)[number];

export const PAGE_TYPES = [
  "homepage",
  "service",
  "product",
  "category",
  "industry",
  "location",
  "region",
  "state",
  "city",
  "neighborhood",
  "airport",
  "route",
  "destination",
  "use_case",
  "comparison",
  "alternative",
  "question",
  "definition",
  "guide",
  "calculator",
  "tool",
  "directory",
  "profile",
  "listing",
  "collection",
  "resource",
  "case_study",
  "research",
  "article",
  "transactional_landing_page",
  "programmatic_page",
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const PAGE_DECISIONS = [
  "CREATE",
  "MERGE",
  "SUPPORTING_ONLY",
  "DEFER",
  "NOINDEX",
  "REJECT",
] as const;
export type PageDecision = (typeof PAGE_DECISIONS)[number];

export const CANNIBALIZATION_LEVELS = [
  "DISTINCT",
  "RELATED",
  "OVERLAPPING",
  "DUPLICATE",
] as const;
export type CannibalizationLevel = (typeof CANNIBALIZATION_LEVELS)[number];

export const CANNIBALIZATION_ACTIONS = [
  "CREATE",
  "DIFFERENTIATE",
  "MERGE",
  "CANONICALIZE",
  "REJECT",
] as const;
export type CannibalizationAction = (typeof CANNIBALIZATION_ACTIONS)[number];

export const NEIGHBORHOOD_DECISIONS = [
  "CREATE",
  "MERGE_INTO_CITY_PAGE",
  "SUPPORTING_SECTION",
  "DEFER",
  "REJECT",
] as const;
export type NeighborhoodDecision = (typeof NEIGHBORHOOD_DECISIONS)[number];

export const THIN_CONTENT_DECISIONS = [
  "PASS",
  "EXPAND",
  "MERGE",
  "NOINDEX",
  "REJECT",
] as const;
export type ThinContentDecision = (typeof THIN_CONTENT_DECISIONS)[number];

export const RESOURCE_DEPTH_CLASSIFICATIONS = [
  "DIRECT_RESPONSE",
  "STANDARD_RESOURCE",
  "DEEP_RESOURCE",
  "DEFINITIVE_RESOURCE",
] as const;
export type ResourceDepthClassification =
  (typeof RESOURCE_DEPTH_CLASSIFICATIONS)[number];

export const FOLLOW_UP_ASSIGNMENTS = [
  "ANSWER_ON_PAGE",
  "DEDICATED_SPOKE",
  "FAQ",
  "NOT_RELEVANT",
] as const;
export type FollowUpAssignment = (typeof FOLLOW_UP_ASSIGNMENTS)[number];

export const HITL_NECESSITY_LEVELS = [
  "NOT_NEEDED",
  "OPTIONAL_ENRICHMENT",
  "RECOMMENDED",
  "REQUIRED_FOR_PUBLICATION",
] as const;
export type HitlNecessityLevel = (typeof HITL_NECESSITY_LEVELS)[number];

export const HUMAN_CONTRIBUTION_STATUSES = [
  "NOT_REQUESTED",
  "REQUESTED",
  "RECEIVED",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
  "SUPERSEDED",
] as const;
export type HumanContributionStatus = (typeof HUMAN_CONTRIBUTION_STATUSES)[number];

export const URL_LIFECYCLE_STATUSES = [
  "PROPOSED",
  "APPROVED",
  "GENERATED",
  "PUBLISHED",
  "REDIRECTED",
  "RETIRED",
] as const;
export type UrlLifecycleStatus = (typeof URL_LIFECYCLE_STATUSES)[number];

export const EXPANSION_WAVES = [
  "FOUNDATION",
  "VALIDATION",
  "EXPANSION",
  "SCALE",
] as const;
export type ExpansionWave = (typeof EXPANSION_WAVES)[number];

export const PLANNING_BANDS = [
  "Compact",
  "Standard",
  "Authority",
  "Large Authority",
  "Massive Digital Real Estate",
] as const;
export type PlanningBand = (typeof PLANNING_BANDS)[number];

export const GRAPH_RELATIONSHIP_TYPES = [
  "parent_topic",
  "child_topic",
  "related_topic",
  "entity_attribute",
  "question_about",
  "service_for",
  "product_for",
  "location_for",
  "located_in",
  "part_of",
  "comparison_between",
  "alternative_to",
  "supports_purchase",
  "supports_conversion",
  "supports_authority",
] as const;
export type GraphRelationshipType = (typeof GRAPH_RELATIONSHIP_TYPES)[number];

export const INTERNAL_LINK_RELATIONSHIPS = [
  "PARENT",
  "CHILD",
  "SIBLING",
  "RELATED",
  "DEFINITION",
  "COMMERCIAL",
  "CONVERSION",
  "GEOGRAPHIC",
  "PRODUCT",
  "SERVICE",
  "COMPARISON",
  "AUTHORITY_SUPPORT",
  "NEXT_STEP",
] as const;
export type InternalLinkRelationship = (typeof INTERNAL_LINK_RELATIONSHIPS)[number];

export const CLAIM_TYPES = [
  "FACT",
  "STATISTIC",
  "SPECIFICATION",
  "REGULATION",
  "COMPARISON",
  "CALCULATION",
  "RECOMMENDATION",
  "FIRST_PARTY_CLAIM",
  "DERIVED_ANALYSIS",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const DEFAULT_VIABILITY_THRESHOLDS = {
  noneMax: 24,
  limitedMax: 44,
  standardMax: 64,
  authorityMax: 84,
} as const;

export type OrganicViabilityThresholds = typeof DEFAULT_VIABILITY_THRESHOLDS;

export type OrganicViabilityWeights = {
  searchDemand: number;
  aiAnswerDemand: number;
  commercialIntent: number;
  customerValue: number;
  conversionPotential: number;
  competition: number;
  contentProductionCost: number;
  authorityRequirements: number;
  timeToSignal: number;
  timeToRevenue: number;
  topicDepth: number;
  evidenceAvailability: number;
  brandRelevance: number;
  marginalPageValue: number;
};

export const DEFAULT_VIABILITY_WEIGHTS: OrganicViabilityWeights = {
  searchDemand: 0.1,
  aiAnswerDemand: 0.08,
  commercialIntent: 0.12,
  customerValue: 0.1,
  conversionPotential: 0.1,
  competition: 0.08,
  contentProductionCost: 0.06,
  authorityRequirements: 0.06,
  timeToSignal: 0.06,
  timeToRevenue: 0.08,
  topicDepth: 0.06,
  evidenceAvailability: 0.05,
  brandRelevance: 0.05,
  marginalPageValue: 0.1,
};

export type PageOpportunityScoreWeights = {
  searchDemand: number;
  aiAnswerDemand: number;
  commercialIntent: number;
  conversionPotential: number;
  revenueRelationship: number;
  authorityContribution: number;
  internalLinkContribution: number;
  contentUniqueness: number;
  informationGain: number;
  evidenceAvailability: number;
  customerUsefulness: number;
  entityImportance: number;
  citationPotential: number;
  cannibalizationRisk: number;
  thinContentRisk: number;
  productionCost: number;
  researchCost: number;
  maintenanceCost: number;
  lowDifferentiation: number;
  weakEvidence: number;
  weakBusinessRelevance: number;
};

export const DEFAULT_PAGE_OPPORTUNITY_WEIGHTS: PageOpportunityScoreWeights = {
  searchDemand: 0.08,
  aiAnswerDemand: 0.06,
  commercialIntent: 0.1,
  conversionPotential: 0.1,
  revenueRelationship: 0.08,
  authorityContribution: 0.07,
  internalLinkContribution: 0.04,
  contentUniqueness: 0.08,
  informationGain: 0.08,
  evidenceAvailability: 0.06,
  customerUsefulness: 0.06,
  entityImportance: 0.05,
  citationPotential: 0.05,
  cannibalizationRisk: -0.08,
  thinContentRisk: -0.1,
  productionCost: -0.04,
  researchCost: -0.03,
  maintenanceCost: -0.02,
  lowDifferentiation: -0.06,
  weakEvidence: -0.05,
  weakBusinessRelevance: -0.05,
};

export const DEFAULT_QUALITY_THRESHOLDS = {
  minPageOpportunityScore: 38,
  maxThinContentRisk: 35,
  minStandalonePageValue: 45,
  minCitationWorthiness: 35,
  minContentCompleteness: 48,
  minInformationGain: 40,
  minNeighborhoodViability: 55,
  minMarginalPageValue: 0,
} as const;

export type QualityThresholds = typeof DEFAULT_QUALITY_THRESHOLDS;

export const ORGANIC_GROWTH_RUN_STATUSES = [
  "requested",
  "running",
  "analyzing",
  "architecting",
  "packaging",
  "completed",
  "failed",
  "policy_blocked",
] as const;
export type OrganicGrowthRunStatus = (typeof ORGANIC_GROWTH_RUN_STATUSES)[number];

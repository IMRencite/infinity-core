export const ORGANIC_CONTINUOUS_PUBLISHING_V2 = "OrganicGrowthContinuousPublishingV2" as const;
export const ORGANIC_CONTINUOUS_POLICY_VERSION = "organic-continuous-publishing-v2" as const;
export const ORGANIC_CONTINUOUS_SCOPE = "organic-growth-continuous-v2" as const;

export const ORGANIC_CONTENT_TYPES = [
  "PILLAR",
  "CLUSTER_HUB",
  "EVERGREEN_QUESTION",
  "GUIDE",
  "BLOG",
  "COMPARISON",
  "COMMERCIAL_INTENT",
  "GLOSSARY",
  "FAQ",
  "TIMELY_EDITORIAL",
  "CONTENT_REFRESH",
] as const;
export type OrganicContentType = (typeof ORGANIC_CONTENT_TYPES)[number];

export const ORGANIC_QUEUE_STAGES = [
  "DISCOVER",
  "RESEARCH",
  "PLAN",
  "WRITE",
  "VALIDATE",
  "SEO_REVIEW",
  "GEO_REVIEW",
  "LINK",
  "PUBLISH",
  "INDEX_MONITOR",
  "MEASURE",
  "REFRESH",
] as const;
export type OrganicQueueStage = (typeof ORGANIC_QUEUE_STAGES)[number];

export const DUPLICATE_INTENT_OUTCOMES = ["CREATE_NEW", "EXPAND_EXISTING", "REFRESH", "MERGE", "REJECT"] as const;
export type DuplicateIntentOutcome = (typeof DUPLICATE_INTENT_OUTCOMES)[number];

export const ANSWER_MATCH_STATES = ["ANSWERED_WELL", "ANSWERED_WEAKLY", "UNANSWERED"] as const;
export type AnswerMatchState = (typeof ANSWER_MATCH_STATES)[number];

export const ORGANIC_CADENCE_DEFAULT = { target_min: 2, target_max: 4 } as const;

export const ORGANIC_CONTENT_QUALITY_GATE = "OrganicContentQualityGate" as const;
export const ORGANIC_DUPLICATE_INTENT_GATE = "OrganicDuplicateIntentGate" as const;
export const ORGANIC_URL_HIERARCHY_GATE = "OrganicURLHierarchyGate" as const;
export const ORGANIC_INTERNAL_LINK_GATE = "OrganicInternalLinkGate" as const;
export const ORGANIC_EVIDENCE_GATE = "OrganicEvidenceGate" as const;
export const ORGANIC_PUBLISHING_CADENCE_GATE = "OrganicPublishingCadenceGate" as const;
export const ORGANIC_CONTENT_VELOCITY_GATE = "OrganicContentVelocityGate" as const;
export const ORGANIC_VOICE_OF_CUSTOMER_GATE = "OrganicVoiceOfCustomerGate" as const;
export const ORGANIC_SALES_CONTENT_BRIDGE_GATE = "OrganicSalesContentBridgeGate" as const;
export const ORGANIC_GROWTH_PERFORMANCE_FEEDBACK_GATE = "OrganicGrowthPerformanceFeedbackGate" as const;
export const ORGANIC_INDEXATION_GATE = "OrganicIndexationGate" as const;
export const ORGANIC_SITE_ARCHITECTURE_GATE = "OrganicSiteArchitectureGate" as const;
export const ORGANIC_TECHNICAL_SEO_GATE = "OrganicTechnicalSEOGate" as const;
export const ORGANIC_PUBLISHING_AUTHORIZATION_GATE = "OrganicPublishingAuthorizationGate" as const;
export const ORGANIC_LIVE_PUBLISHING_GATE = "OrganicLivePublishingGate" as const;
export const ORGANIC_LIVE_URL_TRUTH_GATE = "OrganicLiveURLTruthGate" as const;
export const ORGANIC_PUBLICATION_PERSISTENCE_GATE = "OrganicPublicationPersistenceGate" as const;
export const ORGANIC_SALES_ASSET_AVAILABILITY_GATE = "OrganicSalesAssetAvailabilityGate" as const;
export const ORGANIC_TOPICAL_COMPLETENESS_GATE = "OrganicTopicalCompletenessGate" as const;
export const QUESTION_CLUSTER_COVERAGE_GATE = "QuestionClusterCoverageGate" as const;
export const ENTITY_COVERAGE_GATE = "EntityCoverageGate" as const;
export const PRACTICAL_USEFULNESS_GATE = "PracticalUsefulnessGate" as const;
export const VENTURE_BLOG_READINESS_GATE = "VentureBlogReadinessGate" as const;
export const VENTURE_SCHEMA_STANDARD = "VentureSchemaStandard" as const;
export const ORGANIC_SCHEMA_STACK_GATE = "OrganicSchemaStackGate" as const;
export const ORGANIC_BREADCRUMB_SCHEMA_GATE = "OrganicBreadcrumbSchemaGate" as const;
export const ORGANIC_SPEAKABLE_GATE = "OrganicSpeakableGate" as const;
export const ORGANIC_FAQ_SCHEMA_GATE = "OrganicFAQSchemaGate" as const;
export const ORGANIC_CANONICAL_SCHEMA_GATE = "OrganicCanonicalSchemaGate" as const;
export const VENTURE_SCHEMA_READINESS_GATE = "VentureSchemaReadinessGate" as const;
export const BLOG_VALUE_FIRST_GATE = "BlogValueFirstGate" as const;
export const BLOG_CONTENT_QUALITY_GATE = "BlogContentQualityGate" as const;
export const BLOG_ACTIONABILITY_GATE = "BlogActionabilityGate" as const;
export const BLOG_HUMAN_READABILITY_GATE = "BlogHumanReadabilityGate" as const;
export const BLOG_VISUAL_ASSET_GATE = "BlogVisualAssetGate" as const;
export const BLOG_INDEX_READINESS_GATE = "BlogIndexReadinessGate" as const;
export const BLOG_FEATURED_CARD_QUALITY_GATE = "BlogFeaturedCardQualityGate" as const;
export const BLOG_LATEST_CAROUSEL_GATE = "BlogLatestCarouselGate" as const;
export const BLOG_SIDEBAR_UX_GATE = "BlogSidebarUXGate" as const;
export const BLOG_SEQUENTIAL_NAVIGATION_GATE = "BlogSequentialNavigationGate" as const;
export const BLOG_EDITORIAL_DESIGN_GATE = "BlogEditorialDesignGate" as const;
export const BLOG_DEPTH_COMPLETENESS_GATE = "BlogDepthCompletenessGate" as const;
export const BLOG_CAROUSEL_CONTROL_QUALITY_GATE = "BlogCarouselControlQualityGate" as const;
export const BLOG_ARTICLE_DISCOVERY_GATE = "BlogArticleDiscoveryGate" as const;
export const BLOG_HERO_DESIGN_GATE = "BlogHeroDesignGate" as const;
export const BLOG_SECTION_SPACING_GATE = "BlogSectionSpacingGate" as const;
export const BLOG_CAROUSEL_CONTRAST_GATE = "BlogCarouselContrastGate" as const;
export const BLOG_ARTICLE_SIDEBAR_GATE = "BlogArticleSidebarGate" as const;
export const BLOG_PRIMARY_CATEGORY_GATE = "BlogPrimaryCategoryGate" as const;
export const BLOG_TAXONOMY_ARCHIVE_TRUTH_GATE = "BlogTaxonomyArchiveTruthGate" as const;
export const BLOG_TAXONOMY_ARCHIVE_QUALITY_GATE = "BlogTaxonomyArchiveQualityGate" as const;
export const BLOG_TAXONOMY_INDEXATION_GATE = "BlogTaxonomyIndexationGate" as const;
export const BLOG_TAXONOMY_ARCHIVE_DESIGN_GATE = "BlogTaxonomyArchiveDesignGate" as const;
export const BLOG_PERMALINK_INTEGRITY_GATE = "BlogPermalinkIntegrityGate" as const;
export const BLOG_PERMALINK_MIGRATION_GATE = "BlogPermalinkMigrationGate" as const;
export const BLOG_HERO_CONTRAST_GATE = "BlogHeroContrastGate" as const;
export const BLOG_TAXONOMY_CHIP_GATE = "BlogTaxonomyChipGate" as const;
export const BLOG_TAXONOMY_CONTRAST_GATE = "BlogTaxonomyContrastGate" as const;
export const BLOG_RENDERED_VISUAL_QUALITY_GATE = "BlogRenderedVisualQualityGate" as const;

export const ORGANIC_COMPLETENESS_GATES = [
  ORGANIC_TOPICAL_COMPLETENESS_GATE,
  QUESTION_CLUSTER_COVERAGE_GATE,
  ENTITY_COVERAGE_GATE,
  PRACTICAL_USEFULNESS_GATE,
] as const;

export const PUBLIC_ORGANIC_ACTIVITY = [
  "Researching market questions",
  "Building venture knowledge",
  "Publishing educational resources",
  "Refreshing venture content",
  "Expanding topic coverage",
  "Expanding venture knowledge",
  "Improving published resources",
  "Publishing editorial content",
  "Strengthening topic coverage",
  "Monitoring organic growth",
] as const;

export const PUBLIC_ORGANIC_FORBIDDEN = [
  /@[a-z0-9.-]+\.[a-z]{2,}/i,
  /draft text/i,
  /keyword strategy/i,
  /opportunity score/i,
  /prospect_id/i,
];

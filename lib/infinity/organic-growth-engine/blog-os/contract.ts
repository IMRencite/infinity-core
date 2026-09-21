export const VENTURE_BLOG_OPERATING_SYSTEM = "VentureBlogOperatingSystemV2" as const;
export const VENTURE_BLOG_OS_POLICY_VERSION = "venture-blog-operating-system-v2" as const;
export const VENTURE_BLOG_OS_SCOPE = "venture-blog-os-v2" as const;

export const DAILY_BLOG_TARGET = 1 as const;
export const MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY = 2 as const;
export const POTENTIAL_NEW_ASSETS_PER_DAY = {
  min: DAILY_BLOG_TARGET,
  max: DAILY_BLOG_TARGET + MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY,
} as const;

export const BLOG_DISABLED_FORBIDDEN = true as const;

export const FACTORY_BLOG_DEFAULTS = {
  PUBLIC_BLOG_ENABLED: true,
  BLOG_REQUIRED_FOR_LAUNCH: true,
  BLOG_REQUIRED_FOR_GROWTH_READY: true,
  DAILY_BLOG_TARGET,
  CATEGORY_TAXONOMY_REQUIRED: true,
  TAG_TAXONOMY_REQUIRED: true,
  QUESTION_CLUSTER_REQUIRED: true,
  AUTHORITY_GRAPH_REQUIRED: true,
  PREMIUM_BLOG_ROLL_REQUIRED: true,
  FEATURED_LATEST_POST_REQUIRED: true,
  LATEST_POST_CAROUSEL_REQUIRED: true,
  BLOG_SIDEBAR_REQUIRED: true,
  TOPIC_CLOUD_REQUIRED: true,
  CATEGORY_DISCOVERY_REQUIRED: true,
  BLOG_SEARCH_DISCOVERY_REQUIRED: "WHERE_USEFUL",
  BLOG_RENDERED_QC_REQUIRED: true,
  BLOG_ALWAYS_ON_REQUIRED: true,
} as const;

export const DAILY_BLOG_STATES = [
  "PLANNED",
  "RESEARCHING",
  "DRAFTING",
  "VALIDATING",
  "REPAIRING",
  "READY_FOR_PUBLISH",
  "PUBLISHING",
  "VERIFYING",
  "LIVE_VERIFIED",
  "ESCALATED_EXTERNAL_BLOCKER",
] as const;

export const BLOG_FAILURE_CLASSES = [
  "TOPIC_QUALITY",
  "THIN_CONTENT",
  "QUESTION_COVERAGE",
  "GEO",
  "SEO",
  "EVIDENCE",
  "CANNIBALIZATION",
  "TAXONOMY",
  "INTERNAL_LINK",
  "PRODUCT_TRUTH",
  "SCHEMA",
  "CONTRAST",
  "RENDER",
  "DEPLOYMENT",
  "POST_PUBLISH",
] as const;

export const BLOG_REPAIR_STRATEGIES: Record<(typeof BLOG_FAILURE_CLASSES)[number], string> = {
  TOPIC_QUALITY: "select_better_candidate",
  THIN_CONTENT: "expand_substantively",
  QUESTION_COVERAGE: "improve_owned_questions",
  GEO: "improve_answer_structure_evidence",
  SEO: "repair_seo",
  EVIDENCE: "research_or_replace_unsupported_claims",
  CANNIBALIZATION: "choose_distinct_angle_or_expand_canonical",
  TAXONOMY: "repair_taxonomy",
  INTERNAL_LINK: "repair_authority_graph",
  PRODUCT_TRUTH: "correct_claims",
  SCHEMA: "repair_schema",
  CONTRAST: "repair_ui",
  RENDER: "repair_ui_layout",
  DEPLOYMENT: "retry_safely",
  POST_PUBLISH: "repair_redeploy_reverify",
};

export const BLOG_REQUIRED_FOR_LAUNCH_GATE = "BlogRequiredForLaunchGate" as const;
export const BLOG_REQUIRED_FOR_GROWTH_READY_GATE = "BlogRequiredForGrowthReadyGate" as const;
export const BLOG_BUILD_RECOVERY_GATE = "BlogBuildRecoveryGate" as const;
export const BLOG_OBLIGATION_CONTINUITY_GATE = "BlogObligationContinuityGate" as const;
export const BLOGLESS_VENTURE_GATE = "BloglessVentureGate" as const;
export const SYSTEM_DAILY_BLOG_COVERAGE_GATE = "SystemDailyBlogCoverageGate" as const;
export const SYSTEM_BLOG_EXPERIENCE_GATE = "SystemBlogExperienceGate" as const;
export const SYSTEM_BLOG_CAPABILITY_GATE = "SystemBlogCapabilityGate" as const;
export const SYSTEM_GEO_AUTHORITY_GATE = "SystemGEOAuthorityGate" as const;
export const FIRST_VENTURE_BLOG_CANARY_GATE = "FirstVentureBlogCanaryGate" as const;
export const VENTURE_BLOG_ALWAYS_ON_GATE = "VentureBlogAlwaysOnGate" as const;
export const VENTURE_DAILY_BLOG_GATE = "VentureDailyBlogGate" as const;
export const VENTURE_BLOG_INFRASTRUCTURE_GATE = "VentureBlogInfrastructureGate" as const;
export const VENTURE_BLOG_ROLL_GATE = "VentureBlogRollGate" as const;
export const VENTURE_BLOG_TAXONOMY_GATE = "VentureBlogTaxonomyGate" as const;
export const VENTURE_CONTENT_AUTHORITY_GATE = "VentureContentAuthorityGate" as const;
export const PREMIUM_BLOG_ROLL_GATE = "PremiumBlogRollGate" as const;
export const BLOG_CHRONOLOGY_GATE = "BlogChronologyGate" as const;
export const LATEST_POST_CAROUSEL_GATE = "LatestPostCarouselGate" as const;
export const BLOG_SIDEBAR_QUALITY_GATE = "BlogSidebarQualityGate" as const;
export const BLOG_TOPIC_CLOUD_GATE = "BlogTopicCloudGate" as const;
export const CATEGORY_ARCHIVE_QUALITY_GATE = "CategoryArchiveQualityGate" as const;
export const TAG_ARCHIVE_INDEXABILITY_GATE = "TagArchiveIndexabilityGate" as const;
export const BLOG_DISCOVERY_GATE = "BlogDiscoveryGate" as const;
export const PREMIUM_BLOG_VISUAL_QUALITY_GATE = "PremiumBlogVisualQualityGate" as const;
export const BLOG_EDITORIAL_EXPERIENCE_GATE = "BlogEditorialExperienceGate" as const;
export const BLOG_MEDIA_PERFORMANCE_GATE = "BlogMediaPerformanceGate" as const;
export const BLOG_ACCESSIBILITY_GATE = "BlogAccessibilityGate" as const;
export const BLOG_ROLL_FRESHNESS_GATE = "BlogRollFreshnessGate" as const;
export const BLOG_SITEMAP_INTEGRITY_GATE = "BlogSitemapIntegrityGate" as const;
export const BLOG_CANONICAL_INTEGRITY_GATE = "BlogCanonicalIntegrityGate" as const;
export const BLOG_TAG_QUALITY_GATE = "BlogTagQualityGate" as const;
export const BLOG_CATEGORY_QUALITY_GATE = "BlogCategoryQualityGate" as const;
export const BLOG_INTERNAL_AUTHORITY_LINK_GATE = "BlogInternalAuthorityLinkGate" as const;
export const ORPHAN_CONTENT_GATE = "OrphanContentGate" as const;
export const RELATED_CONTENT_QUALITY_GATE = "RelatedContentQualityGate" as const;
export const QUESTION_COVERAGE_REFRESH_TRIGGER = "QuestionCoverageRefreshTrigger" as const;
export const DUAL_CONTENT_LOOP_CADENCE_GATE = "DualContentLoopCadenceGate" as const;
export const BLOG_HQ_LIVE_WORK_GATE = "BlogHqLiveWorkGate" as const;
export const BLOG_PUBLIC_OCCUPANCY_GATE = "BlogPublicOccupancyGate" as const;

export const FACTORY_INHERITED_BLOG_OS_CONTRACTS = [
  BLOG_REQUIRED_FOR_LAUNCH_GATE,
  BLOG_REQUIRED_FOR_GROWTH_READY_GATE,
  FIRST_VENTURE_BLOG_CANARY_GATE,
  VENTURE_BLOG_ALWAYS_ON_GATE,
  VENTURE_DAILY_BLOG_GATE,
  VENTURE_BLOG_INFRASTRUCTURE_GATE,
  VENTURE_BLOG_ROLL_GATE,
  VENTURE_BLOG_TAXONOMY_GATE,
  VENTURE_CONTENT_AUTHORITY_GATE,
  BLOGLESS_VENTURE_GATE,
  SYSTEM_DAILY_BLOG_COVERAGE_GATE,
  SYSTEM_BLOG_EXPERIENCE_GATE,
  SYSTEM_GEO_AUTHORITY_GATE,
  SYSTEM_BLOG_CAPABILITY_GATE,
  BLOG_HQ_LIVE_WORK_GATE,
  BLOG_PUBLIC_OCCUPANCY_GATE,
] as const;

export const BLOG_OS_DAILY_IMPROVEMENT_QUESTIONS = [
  "Was today's blog published?",
  "Was it worth publishing?",
  "Did any attempt fail?",
  "Did Infinity recover automatically?",
  "Is newest content displayed first?",
  "Did featured latest update?",
  "Did carousel update?",
  "Did sidebar update?",
  "Did topic cloud update?",
  "Did taxonomy remain healthy?",
  "Did internal links improve?",
  "Did the post strengthen an authority cluster?",
  "Did it answer a meaningful question cluster?",
  "Were direct answers citation-ready?",
  "Did factual claims have evidence?",
  "Did any existing page deserve expansion instead of another URL?",
  "Did the blog create a new pillar opportunity?",
  "Did visual quality regress?",
  "Are any tags thin?",
  "Are any categories overlapping?",
  "Are there orphan articles?",
] as const;

export const OCCUPANCYNPV_GEO_REFERENCE_URL =
  "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/" as const;

export const PUBLIC_BLOG_ACTIVITY = [
  "Publishing editorial content",
  "Building venture knowledge",
  "Refreshing venture content",
  "Improving published resources",
  "Expanding topic coverage",
  "Monitoring organic growth",
] as const;

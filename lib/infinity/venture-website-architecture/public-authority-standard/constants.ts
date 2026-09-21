export const INFINITY_PUBLIC_AUTHORITY_STANDARD_ID = "INFINITY_PUBLIC_AUTHORITY_AND_DIGITAL_REAL_ESTATE_STANDARD" as const;
export const INFINITY_PUBLIC_AUTHORITY_STANDARD_VERSION = "V1" as const;

export const PUBLIC_SITE_CLASSES = [
  "AUTHORITY_LED",
  "PRODUCT_LED",
  "UTILITY_LED",
  "MARKETPLACE_LED",
  "TRANSACTION_LED",
] as const;

export const PUBLIC_PAGE_ARCHETYPES = [
  "TOPIC_HUB",
  "QUESTION_AUTHORITY",
  "COMPARISON",
  "HOW_TO",
  "CALCULATOR_TOOL",
  "PRODUCT",
  "PRICING",
  "PERSONA",
  "LOCATION",
  "RESOURCE_LIBRARY",
  "ABOUT",
  "CONTACT",
  "LEGAL",
  "FAQ_COLLECTION",
] as const;

export const SEARCH_INTENTS = [
  "INFORMATIONAL",
  "COMMERCIAL_INVESTIGATION",
  "TRANSACTIONAL",
  "NAVIGATIONAL",
] as const;

export const QUESTION_TYPES = [
  "DEFINITION",
  "HOW_TO",
  "CALCULATION",
  "FORMULA",
  "COMPARISON",
  "ASSUMPTION",
  "WORKFLOW",
  "MISTAKE",
  "LIMITATION",
  "DECISION",
  "COST_COMPONENT",
  "PERSONA_WORKFLOW",
  "SCENARIO",
  "SENSITIVITY",
  "SOFTWARE_COMPARISON",
  "PRICING_INTENT",
  "PRODUCT_WORKFLOW",
  "OTHER",
] as const;

export const SEARCH_EVIDENCE_CLASSES = [
  "SERP_OBSERVED",
  "QUESTION_PATTERN_OBSERVED",
  "AUTOCOMPLETE_OBSERVED",
  "COMMUNITY_DEMAND_OBSERVED",
  "PROFESSIONAL_QUERY_PATTERN",
  "AUTHORITY_TERMINOLOGY",
  "MULTI_SOURCE_CONFIRMED",
  "SEARCH_DEMAND_UNKNOWN",
] as const;

export const SEARCH_DEMAND_CLASSES = [
  "SEARCH_DEMAND_OBSERVED",
  "SEARCH_DEMAND_RELATIVE",
  "SEARCH_DEMAND_UNKNOWN",
] as const;

export const COVERAGE_DECISIONS = [
  "BUILD_STANDALONE",
  "EXPAND_EXISTING_PAGE",
  "ADD_TO_HUB",
  "ADD_ANSWER_CHUNK",
  "MERGE_WITH_EXISTING",
  "DEFER_LOW_VALUE",
] as const;

export const TOPIC_COVERAGE_STATES = [
  "UNRESEARCHED",
  "RESEARCHED_INCOMPLETE",
  "SEARCH_COVERAGE_READY",
  "CONTENT_COVERAGE_PARTIAL",
  "TOPIC_AUTHORITY_READY",
] as const;

export const COMPLIANCE_STATES = [
  "LEGACY_UNASSESSED",
  "PARTIALLY_COMPLIANT",
  "COMPLIANT",
  "PREMIUM_AUTHORITY_VALIDATION_READY",
] as const;

export const VISUAL_EVIDENCE_PRECEDENCE = [
  "FOUNDER_PHYSICAL_BROWSER_EVIDENCE",
  "SERVED_SCREENSHOT_EVIDENCE",
  "COMPUTED_BROWSER_GEOMETRY",
  "COMPILED_CSS",
  "SOURCE_CSS",
] as const;

export const AUTHORITY_GENERATION_FLOW = [
  "GLOBAL_PUBLIC_AUTHORITY_STANDARD",
  "PUBLIC_AUTHORITY_SITE_PROFILE",
  "SEARCH_QUESTION_RESEARCH",
  "QUESTION_KNOWLEDGE_GRAPH",
  "CONTENT_DECISIONS",
  "PAGE_ARCHETYPE",
  "PAGE_CONTRACT",
  "PAGE_SPECIFIC_PLAN",
  "GENERATION",
  "INTERNAL_LINK_GRAPH",
  "AUTHORITY_CITATION_GROUNDING",
  "VISUAL_PLAN_MEDIA",
  "CONVERSION_PATH",
  "CLEAN_ROOM_BUILD",
  "SERVED_BROWSER_VALIDATION",
  "PUBLIC_AUTHORITY_PUBLISHABILITY",
  "DEPLOYMENT_READINESS",
] as const;

export const LOCKED_QUALITY_FLOORS = {
  readabilityTarget: "approximately 4th grade",
  maxFleschKincaidGrade: 7.2,
  maxAverageSentenceWords: 16,
  maxParagraphWords: 150,
  minStandaloneUsefulWords: 2000,
  minValidatedQuestionsPerCoreTopic: 20,
  orphanAuthorityPages: 0,
  deadEndAuthorityPages: 0,
  cssOnlyVisualCountsAsCoverage: false,
  fabricatedSearchVolumePermitted: false,
  keywordPermutationPagesPermitted: false,
  wordCountPaddingPermitted: false,
  silentWeakeningPermitted: false,
} as const;

export const PREFERRED_AUTHORITY_SOURCE_CLASSES = [
  "GOVERNMENT",
  "UNIVERSITY",
  "PROFESSIONAL_ORGANIZATION",
  "PRIMARY_RESEARCH",
  "STANDARDS_BODY",
  "FINANCIAL_ACCOUNTING_AUTHORITY",
  "PEER_REVIEWED",
  "CREDIBLE_INSTITUTION",
] as const;

export const DEFAULT_AVOIDED_SOURCE_CLASSES = [
  "DIRECT_COMPETITOR",
  "AFFILIATE_SITE",
  "SEO_BLOG",
  "CONTENT_FARM",
  "LOW_QUALITY_AGGREGATOR",
] as const;

export const DEFAULT_AUTHORITY_URL_PATTERN = "/{topic}/{question-slug}/" as const;

export const TOPICAL_COVERAGE_DIMENSIONS = [
  "definitions",
  "mechanics",
  "calculations",
  "how_to",
  "comparisons",
  "assumptions",
  "mistakes",
  "limitations",
  "decision_questions",
  "edge_cases",
  "cost_components",
  "persona_workflows",
  "commercial_relationships",
  "tool_workflow_relationships",
] as const;

export const HARD_PUBLISHABILITY_GATES = [
  "HumanReadabilityGate",
  "QuestionCoverageGate",
  "SemanticCoverageProfile",
  "TopicalCompletenessGate",
  "StandaloneAuthorityPageEligibilityGate",
  "AnswerSurfaceCoverageGate",
  "CitationReadinessGate",
  "SemanticInternalLinkDensityGate",
  "TopicGraphConnectivityGate",
  "BodyContextInternalLinkGate",
  "SearchIntentConversionPathGate",
  "AboveFoldVisualCoverageGate",
  "AuthorityVisualAssetCoverageGate",
  "RenderedCompositionQualityGate",
  "RenderedTableQualityGate",
  "VisualDeadSpaceGate",
  "LongFormTextWallGate",
  "ResponsiveGeometryGate",
  "CrossRouteConsistencyGate",
  "SchemaValidityGate",
  "IndexabilityGate",
  "SemanticContentRedundancyGate",
  "SemanticNavigationQualityGate",
  "SemanticNavigationRenderedQualityGate",
  "HeroContentSeparationGate",
  "RenderedRouteClassCoverageGate",
  "CardTextRhythmGate",
  "EditorialHighlightQualityGate",
  "AuthoritySectionWidthGate",
  "SemanticNavigationBreakoutLayoutGate",
  "BalancedCardGridGate",
  "AuthoritySourceRenderedQualityGate",
  "AuthoritySectionShellConsistencyGate",
  "SearchDemandAuthoritySurfaceGate",
  "HubQuestionDiscoveryCoverageGate",
  "HubQuestionBoardLayoutGate",
  "SearchIntentCannibalizationGate",
  "SectionSurfaceRhythmGate",
  "SectionSurfaceContrastGate",
  "RenderedTextContrastGate",
  "RenderedMutedTextContrastGate",
  "RenderedHeadingInkGate",
  "HumanFirstPublicLanguageGate",
  "RenderedLinkContrastGate",
  "FullPublicRouteValidationGate",
  "RepeatedFailurePromotionGate",
] as const;

export const CANONICAL_PUBLIC_FOOTER_ATTRIBUTION = "An Infinity OS Venture" as const;
export const REJECTED_PUBLIC_FOOTER_ATTRIBUTION = "An Infinite OS Venture" as const;
export const CANONICAL_PUBLIC_FOOTER_VISIBLE_FORMAT =
  "Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR" as const;

export const SEMANTIC_NAVIGATION_VARIANTS = [
  "RELATED_QUESTIONS",
  "RELATED_TOPICS",
  "LEARN_NEXT",
  "GO_DEEPER",
  "COMPARE_NEXT",
  "FOR_YOUR_ROLE",
  "USE_THE_TOOL",
  "QUESTIONS_PEOPLE_ASK_NEXT",
] as const;

export const EDITORIAL_HIGHLIGHT_KINDS = [
  "KEY_TAKEAWAY",
  "WHY_THIS_MATTERS",
  "DECISION_NOTE",
  "COMMON_MISTAKE",
  "WHAT_CHANGES_THE_RESULT",
  "WHEN_TO_BE_CAREFUL",
  "FOR_YOUR_ROLE",
  "FOR_FINANCE_TEAMS",
] as const;

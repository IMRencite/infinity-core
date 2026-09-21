export {
  INFINITY_PUBLIC_AUTHORITY_STANDARD_ID,
  INFINITY_PUBLIC_AUTHORITY_STANDARD_VERSION,
  PUBLIC_PAGE_ARCHETYPES,
  PUBLIC_SITE_CLASSES,
  SEARCH_INTENTS,
  QUESTION_TYPES,
  SEARCH_EVIDENCE_CLASSES,
  COVERAGE_DECISIONS,
  TOPIC_COVERAGE_STATES,
  COMPLIANCE_STATES,
  AUTHORITY_GENERATION_FLOW,
  LOCKED_QUALITY_FLOORS,
  HARD_PUBLISHABILITY_GATES,
  VISUAL_EVIDENCE_PRECEDENCE,
  DEFAULT_AUTHORITY_URL_PATTERN,
  CANONICAL_PUBLIC_FOOTER_ATTRIBUTION,
  REJECTED_PUBLIC_FOOTER_ATTRIBUTION,
  CANONICAL_PUBLIC_FOOTER_VISIBLE_FORMAT,
  SEMANTIC_NAVIGATION_VARIANTS,
  EDITORIAL_HIGHLIGHT_KINDS,
} from "./constants";
export type {
  InfinityPublicAuthorityStandard,
  PublicAuthorityPageContract,
  PublicAuthoritySiteProfile,
  PublicAuthorityStandardOverride,
  PublicQuestionKnowledgeGraph,
  SearchQuestionEvidence,
  AuthorityContentGap,
  PublicPageArchetype,
  PublicSiteClass,
} from "./types";
export {
  infinityPublicAuthorityStandard,
  buildPublicAuthorityPageContract,
  buildPublicAuthoritySiteProfile,
  emptySearchEvidence,
  standardIdentity,
  INFINITY_PUBLIC_AUTHORITY_STANDARD_PRINCIPLE,
} from "./standard";
export { publicPageArchetype, publicPageArchetypeRegistry, archetypeSpecializesGlobalContract } from "./archetypes";
export {
  normalizeQuestion,
  clusterSemanticQuestions,
  assignPrimaryTopic,
  interpretUnknownVolume,
  rejectFabricatedSearchMetrics,
  evaluateQuestionCoverageRule,
  topicCoverageState,
  evaluateStandaloneEligibility,
  evaluateTopicalCompleteness,
  buildAuthorityContentGap,
  buildQuestionKnowledgeGraph,
} from "./research";
export {
  createStandardOverride,
  evaluateSilentWeakening,
  evaluateFactoryFlow,
  rejectDirectWorkerBypass,
  evaluateResearchBeforeScale,
  evaluateBoundedGeneration,
  classifyPublicSite,
  evaluateNewAuthorityLedVentureReadiness,
  evaluateLegacyCompliance,
  complianceStates,
} from "./governance";
export {
  resolveVisualEvidenceConflict,
  evaluateCssOnlyVisual,
  evaluateAboveFoldVisualRequirement,
  evaluateLinkGraphRequirements,
  evaluateBodyContextLinks,
  evaluateSemanticLinkDensity,
  evaluateConversionPath,
  evaluateSourcePolicy,
  evaluatePaddedWordCount,
  evaluatePublicAuthorityPublishability,
  visualEvidencePrecedence,
  evaluateCrossRouteConsistency,
  evaluateResponsiveGeometry,
} from "./publishability";
export {
  evaluateSemanticContentRedundancy,
  evaluateSemanticPair,
  extractRedundancyBlocks,
  extractSemanticNavSurfaces,
  evaluateSemanticNavSurfaceRedundancy,
  SEMANTIC_CONTENT_REDUNDANCY_GATE,
} from "./semantic-content-redundancy";
export {
  evaluateEditorialHighlightQuality,
  evaluateAuthorityQuoteProvenance,
  EDITORIAL_HIGHLIGHT_QUALITY_GATE,
} from "./editorial-highlight-quality";
export {
  evaluateSemanticNavigationQuality,
  expectedSemanticNavigationVariant,
  SEMANTIC_NAVIGATION_QUALITY_GATE,
} from "./semantic-navigation-quality";
export {
  evaluateHeroContentSeparation,
  evaluateSemanticNavigationRenderedQuality,
  evaluateCardTextRhythm,
  HERO_CONTENT_SEPARATION_GATE,
  FOUNDER_HOW_IT_WORKS_HERO_OVERLAP_FIXTURE,
  FOUNDER_LEARN_NEXT_NAV_FIXTURE,
  GOOD_SEMANTIC_NAV_RENDERED_FIXTURE,
} from "./hero-content-separation";
export {
  evaluateRenderedRouteClassCoverage,
  classifySampledRoute,
  RENDERED_ROUTE_CLASS_COVERAGE_GATE,
  REQUIRED_RENDERED_ROUTE_CLASSES,
} from "./rendered-route-class-coverage";
export { evaluateCardTextRhythm as evaluateCardTextRhythmGate, CARD_TEXT_RHYTHM_GATE } from "./card-text-rhythm";
export {
  evaluateSemanticNavigationRenderedQuality as evaluateSemanticNavRenderedQuality,
  SEMANTIC_NAVIGATION_RENDERED_QUALITY_GATE,
  evaluateKickerTitleRedundancy,
} from "./semantic-navigation-rendered-quality";
export { CRE_PUBLIC_AUTHORITY_REFERENCE, creReferenceCompatibility, CRE_TERMS_FORBIDDEN_IN_GLOBAL_STANDARD } from "./cre-reference";
export {
  AUTHORITY_SECTION_WIDTH_GATE,
  SEMANTIC_NAVIGATION_BREAKOUT_LAYOUT_GATE,
  BALANCED_CARD_GRID_GATE,
  AUTHORITY_SOURCE_RENDERED_QUALITY_GATE,
  AUTHORITY_SECTION_SHELL_CONSISTENCY_GATE,
  defaultAuthorityContentWidthProfile,
  adaptAuthorityContentWidthProfile,
  evaluateAuthoritySectionWidth,
  evaluateSemanticNavigationBreakoutLayout,
  evaluateBalancedCardGrid,
  evaluateAuthoritySourceRenderedQuality,
  evaluateAuthoritySectionShellConsistency,
  evaluateCrossRouteWidthConsistency,
  FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE,
  FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE,
  FOUNDER_NARROW_CARD_WRAP_FIXTURE,
  GOOD_PROSE_PLUS_BREAKOUT_FIXTURE,
  GOOD_FOUR_CARD_BREAKOUT_GRID,
  GOOD_SOURCE_SECTION_FIXTURE,
} from "./authority-content-width";
export type { AuthorityContentWidthProfile, RenderedWidthHierarchy, RenderedCardGrid } from "./authority-content-width";
export {
  AUTHORITY_SECTION_SURFACE_SYSTEM_CONTRACT,
  AUTHORITY_SECTION_SURFACE_VARIANTS,
  evaluateSectionSurfaceRhythm,
  evaluateSectionSurfaceContrast,
  extractSurfaceSequence,
  surfaceForSectionType,
} from "./section-surface-system";
export {
  evaluateRenderedMutedTextContrastGate,
  FOUNDER_DARK_NAVY_LOW_OPACITY_CAPTION_FIXTURE,
  FOUNDER_DARK_NAVY_READABLE_MUTED_CAPTION_FIXTURE,
} from "./rendered-muted-text-contrast-gate";
export {
  evaluateRenderedTextContrastGate,
  evaluateRenderedHeadingInkGate,
  evaluateRenderedTextContrastFromFiles,
  FOUNDER_EMPHASIS_LEAK_FIXTURE,
  FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE,
  FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE,
  FOUNDER_EMPHASIS_SPOKE_DARK_ON_DARK_FIXTURE,
  FOUNDER_TRUSTED_SOURCES_COMPUTED_SAMPLE,
  RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT,
} from "./rendered-text-contrast-gate";
export {
  evaluateRenderedLinkContrastGate,
  FOUNDER_LINK_SAME_COLOR_FIXTURE,
  FOUNDER_LINK_NEAR_INVISIBLE_FIXTURE,
  FOUNDER_LINK_HOVER_SAME_AS_BACKGROUND_FIXTURE,
  FOUNDER_NESTED_PALE_LINK_FIXTURE,
  FOUNDER_TRUSTED_SOURCES_MISSING_LINK_SAMPLE_FIXTURE,
  FOUNDER_LINK_GOOD_FIXTURE,
  RENDERED_LINK_CONTRAST_BROWSER_SCRIPT,
} from "./rendered-link-contrast-gate";
export {
  evaluateFullPublicRouteValidationGate,
} from "./full-public-route-validation-gate";
export {
  evaluateRepeatedFailurePromotionGate,
} from "./repeated-failure-promotion-gate";
export {
  evaluatePrerenderHookBoundaryGate,
  stripUnnecessaryUseClient,
  FOUNDER_PRERENDER_USEOPTIMISTIC_NO_CLIENT_FIXTURE,
  FOUNDER_PRERENDER_USEOPTIMISTIC_CLIENT_BOUNDARY_FIXTURE,
  PRERENDER_HOOK_BOUNDARY_GATE,
} from "./prerender-hook-boundary-gate";
export {
  runDeterministicPerPageAdmission,
  evaluatePage,
} from "./per-page-render-validate-repair";
export {
  runRenderedFullRouteValidation,
} from "./rendered-full-route-validation";
export {
  evaluateHubDiscoveryRenderedQuality,
  evaluateHubQuestionBoardLayout,
  FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE,
  GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE,
  HUB_DISCOVERY_RENDERED_QUALITY_GATE,
  HUB_QUESTION_BOARD_LAYOUT_GATE,
} from "./hub-discovery-rendered-quality";
export {
  canAdmitPage,
  transitionPageState,
  initialPageState,
  repairCeilingExceeded,
  classifyFailureFamily,
} from "./page-build-state";

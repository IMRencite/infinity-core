export {
  PAGE_INFORMATION_DEPTH_CONTRACT,
  CUSTOMER_PAGE_DEPTH_CANONICAL_PRINCIPLE,
  SECTION_CONTAINER_ALIGNMENT_GATE,
  COMMERCIAL_PAGE_LAYOUT_CONSISTENCY_GATE,
  MATERIAL_QUESTION_COVERAGE_GATE,
  PAGE_INFORMATION_GAIN_GATE,
  BUYER_DECISION_SUPPORT_GATE,
  PRODUCT_UNDERSTANDING_GATE,
  CUSTOMER_PAGE_THINNESS_GATE,
  COMMERCIAL_CONTENT_REDUNDANCY_GATE,
  OCCUPANCYNPV_PRICING_DEPTH_REFERENCE,
  HERO_COMPOSITION_GATE,
  INTERACTIVE_TEXT_CONTRAST_GATE,
  FAQ_COMPLETENESS_GATE,
  FOUNDER_RENDERED_COMMERCIAL_CONTRADICTION_GATE,
  H1_WIDTH_UTILIZATION_GATE,
  H1_WRAP_QUALITY_GATE,
  UNUSED_HERO_SPACE_BALANCE_GATE,
  PRIMARY_H1_WIDTH_PRINCIPLE,
  PRIMARY_ACTION_DISCOVERABILITY_GATE,
  APP_ACTION_HIERARCHY_GATE,
  APP_ACTION_HIERARCHY_CONTRACT,
  INTERACTIVE_CONTROL_VISUAL_HIERARCHY_GATE,
  FOUNDER_RENDERED_UX_CONTRADICTION_GATE,
  VENTURE_FAVICON_GATE,
  APP_ACTION_HIERARCHY_PRINCIPLE,
} from "./types";
export type {
  PageInformationDepthContract,
  CustomerPageDepthScorecard,
  SectionAlignmentObservation,
  VenturePageDepthInventoryRow,
  VenturePageDepthSummary,
  NamedDepthGate,
} from "./types";
export {
  evaluateSectionContainerAlignmentGate,
  evaluateCommercialPageLayoutConsistencyGate,
  relatedPathsStructuralDefect,
  relatedPathsAligned,
  RELATED_PATHS_WIDTH_DEFECT_CAUSE,
} from "./layout";
export {
  buildPageInformationDepthContract,
  evaluateMaterialQuestionCoverageGate,
  evaluatePageInformationGainGate,
  evaluateBuyerDecisionSupportGate,
  evaluateProductUnderstandingGate,
  evaluateCustomerPageThinnessGate,
  evaluateGeneralContentRedundancyGate,
  evaluatePageDepthBundle,
  inferSourceVisualQuality,
} from "./gates";
export { classifyRoute, displayPageType, expectedDepthClass, materialQuestionsFor, pageTypeDepthPolicy, asCustomerPageArchetype } from "./questions";
export {
  OCCUPANCYNPV_MATERIAL_PUBLIC_PAGES,
  scorecardFromBundle,
  inventoryVentureCustomerPages,
  invalidateDepthOnRewrite,
} from "./inventory";
export { planCustomerPageDepthBeforeBuild, factoryRequiresDepthPlanBeforePageBuild, INHERITED_VISUAL_AND_FAQ_QC_GATES } from "./factory";
export { hqCustomerPageDepthFields } from "./hq";
export {
  evaluateHeroCompositionGate,
  evaluateInteractiveTextContrastGate,
  evaluateHomepageInitialViewportCommercialActionGate,
  contrastRatio,
} from "./hero-composition";
export { evaluateFAQCompletenessGate, faqEvidenceGapCount, FAQ_QUESTION_CLUSTERS } from "./faq-completeness";
export { evaluateFounderRenderedCommercialContradictionGate, evaluateFounderRenderedUXContradictionGate } from "./founder-contradiction";
export {
  evaluatePrimaryActionDiscoverabilityGate,
  evaluateAppActionHierarchyGate,
  evaluateInteractiveControlVisualHierarchyGate,
  evaluateOccupancynpvWorkspaceActionHierarchy,
  occupancynpvWorkspaceActionContract,
  APPLICATION_INTERFACE_FULL_QC_GATES,
  APP_ACTION_REQUIRED_VIEWPORTS,
} from "./app-action-hierarchy";
export {
  evaluateH1WidthUtilizationGate,
  evaluateH1WrapQualityGate,
  evaluateUnusedHeroSpaceBalanceGate,
  inferH1LayoutContext,
  articleHeadingStillChConstrained,
} from "./h1-width";

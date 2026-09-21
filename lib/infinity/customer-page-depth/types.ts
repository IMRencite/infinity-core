export const PAGE_INFORMATION_DEPTH_CONTRACT = "PageInformationDepthContract" as const;
export const CUSTOMER_PAGE_DEPTH_CANONICAL_PRINCIPLE =
  "EVERY CUSTOMER-FACING VENTURE PAGE MUST PROVIDE SUFFICIENT DEPTH TO SATISFY THE MATERIAL USER INTENT OF THAT PAGE. A PAGE IS NOT PRODUCTION-QUALITY MERELY BECAUSE IT RENDERS, FUNCTIONS, AND CONTAINS BASIC COPY. CONTENT DEPTH MUST BE JUDGED BY QUESTION COVERAGE, DECISION SUPPORT, PRODUCT UNDERSTANDING, OBJECTION HANDLING, AND INFORMATION COMPLETENESS — NOT BY WORD COUNT ALONE. THIN PAGES FAIL QC. REPETITIVE PAGES FAIL QC. LONG BUT LOW-INFORMATION PAGES FAIL QC. DEPTH MUST MATCH PAGE PURPOSE." as const;

export const DEPTH_CLASSES = [
  "DIRECT_RESPONSE",
  "STANDARD_RESOURCE",
  "DEEP_RESOURCE",
  "DEFINITIVE_RESOURCE",
] as const;
export type DepthClass = (typeof DEPTH_CLASSES)[number];

export const CUSTOMER_PAGE_TYPES = [
  "HOMEPAGE",
  "PRICING",
  "PRODUCT",
  "SERVICE",
  "RESOURCE",
  "CONVERSION",
  "SUPPORT",
  "LEGAL",
  "UTILITY",
  "LOGIN",
  "NOT_FOUND",
  "FAQ",
  "FEEDBACK",
  "ACCOUNT",
  "RESULT",
  "FEATURE",
  "WORKFLOW",
  "COMPARISON",
] as const;
export type CustomerPageType = (typeof CUSTOMER_PAGE_TYPES)[number];

export const CUSTOMER_PAGE_ARCHETYPES = [
  "saas",
  "utility",
  "calculator",
  "ecommerce",
  "merch",
  "creator_media",
  "youtube_channel",
  "newsletter",
  "affiliate_content",
  "marketplace",
  "lead_gen",
  "service",
  "digital_product",
] as const;
export type CustomerPageArchetype = (typeof CUSTOMER_PAGE_ARCHETYPES)[number];

export const SECTION_CONTAINER_ALIGNMENT_GATE = "SectionContainerAlignmentGate" as const;
export const COMMERCIAL_PAGE_LAYOUT_CONSISTENCY_GATE = "CommercialPageLayoutConsistencyGate" as const;
export const MATERIAL_QUESTION_COVERAGE_GATE = "MaterialQuestionCoverageGate" as const;
export const PAGE_INFORMATION_GAIN_GATE = "PageInformationGainGate" as const;
export const BUYER_DECISION_SUPPORT_GATE = "BuyerDecisionSupportGate" as const;
export const PRODUCT_UNDERSTANDING_GATE = "ProductUnderstandingGate" as const;
export const CUSTOMER_PAGE_THINNESS_GATE = "CustomerPageThinnessGate" as const;
export const COMMERCIAL_CONTENT_REDUNDANCY_GATE = "CommercialContentRedundancyGate" as const;
export const HERO_COMPOSITION_GATE = "HeroCompositionGate" as const;
export const INTERACTIVE_TEXT_CONTRAST_GATE = "InteractiveTextContrastGate" as const;
export const FAQ_COMPLETENESS_GATE = "FAQCompletenessGate" as const;
export const FOUNDER_RENDERED_COMMERCIAL_CONTRADICTION_GATE = "FounderRenderedCommercialContradictionGate" as const;
export const H1_WIDTH_UTILIZATION_GATE = "H1WidthUtilizationGate" as const;
export const H1_WRAP_QUALITY_GATE = "H1WrapQualityGate" as const;
export const UNUSED_HERO_SPACE_BALANCE_GATE = "UnusedHeroSpaceBalanceGate" as const;
export const PRIMARY_ACTION_DISCOVERABILITY_GATE = "PrimaryActionDiscoverabilityGate" as const;
export const APP_ACTION_HIERARCHY_GATE = "AppActionHierarchyGate" as const;
export const APP_ACTION_HIERARCHY_CONTRACT = "AppActionHierarchyContract" as const;
export const INTERACTIVE_CONTROL_VISUAL_HIERARCHY_GATE = "InteractiveControlVisualHierarchyGate" as const;
export const FOUNDER_RENDERED_UX_CONTRADICTION_GATE = "FounderRenderedUXContradictionGate" as const;
export const VENTURE_FAVICON_GATE = "VentureFaviconGate" as const;
export const VENTURE_BRAND_IDENTITY_CONTRACT = "VentureBrandIdentityContract" as const;
export const VENTURE_LOGO_GATE = "VentureLogoGate" as const;
export const VENTURE_BRAND_CONSISTENCY_GATE = "VentureBrandConsistencyGate" as const;
export const VENTURE_BRAND_COMPLETENESS_GATE = "VentureBrandCompletenessGate" as const;
export const BRAND_IDENTITY_DISCOVERABILITY_GATE = "BrandIdentityDiscoverabilityGate" as const;
export const APPLICATION_METADATA_IDENTITY_GATE = "ApplicationMetadataIdentityGate" as const;
export const APP_ACTION_HIERARCHY_PRINCIPLE =
  "PRIMARY PRODUCT ACTIONS MUST BE VISUALLY IDENTIFIABLE AS PRIMARY ACTIONS. AN ACTION CAN BE FUNCTIONALLY PRESENT AND STILL FAIL PRODUCT QC IF ITS VISUAL TREATMENT MAKES IT EASY TO MISS. BUTTON PRIORITY MUST REFLECT WORKFLOW PRIORITY. A CORE NEXT-STEP ACTION MUST NOT LOOK LIKE AN INCIDENTAL UTILITY CONTROL. EVERY CUSTOMER-FACING APPLICATION MUST HAVE AN INTENTIONAL ACTION HIERARCHY BEFORE FINAL PRODUCTION-QUALITY PASS." as const;
export const PRIMARY_H1_WIDTH_PRINCIPLE =
  "PRIMARY PAGE HEADINGS MUST USE AN INTENTIONAL PROPORTION OF AVAILABLE LAYOUT WIDTH. READABLE DOES NOT MEAN WELL-COMPOSED. A PRIMARY H1 MUST NOT BE FORCED INTO AN ARTIFICIALLY NARROW BOX WHEN SUBSTANTIAL HORIZONTAL SPACE IS AVAILABLE. FIXED CHARACTER-WIDTH RULES SUCH AS 16ch / 20ch / 24ch MUST NOT BE UNIVERSALLY APPLIED TO PRIMARY HEADINGS. H1 WIDTH MUST RESPOND TO PAGE LAYOUT, HEADING LENGTH, VIEWPORT WIDTH, ADJACENT CONTENT, IMAGE COMPOSITION, AND INTENDED HIERARCHY. EXCESSIVE LINE WRAPPING CAUSED BY ARBITRARY MAX-WIDTH IS A VISUAL QC FAILURE." as const;
export const OCCUPANCYNPV_PRICING_DEPTH_REFERENCE = "OCCUPANCYNPV_PRICING_DEPTH_PHILOSOPHY" as const;

export type NamedDepthGate = {
  gate: string;
  result: "PASS" | "FAIL" | "N/A";
  reasons: string[];
};

export type MaterialQuestion = {
  id: string;
  question: string;
  dimension: string;
  required: boolean;
  answered: boolean;
};

export type PageInformationDepthContract = {
  contract: typeof PAGE_INFORMATION_DEPTH_CONTRACT;
  page_type: CustomerPageType;
  route: string;
  primary_user_intent: string;
  secondary_user_intents: string[];
  material_questions: MaterialQuestion[];
  required_information_dimensions: string[];
  decision_stage: "AWARENESS" | "CONSIDERATION" | "DECISION" | "VALIDATION" | "TASK" | "LEGAL" | "UTILITY";
  product_capability_context: string[];
  trust_requirements: string[];
  transaction_requirements: string[];
  supporting_evidence_requirements: string[];
  expected_depth_class: DepthClass;
  actual_coverage: string[];
  missing_dimensions: string[];
  status: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
  word_count_sole_metric: false;
};

export type SectionRect = { left: number; right: number; width: number; top?: number; bottom?: number };

export type SectionAlignmentObservation = {
  section: string;
  container: SectionRect;
  background: SectionRect;
  content: SectionRect;
  adjacent?: SectionRect | null;
  overflowX?: boolean;
};

export type CustomerPageDepthScorecard = {
  page: string;
  information_depth: "PASS" | "FAIL" | "N/A";
  question_coverage: "PASS" | "FAIL" | "N/A";
  product_understanding: "PASS" | "FAIL" | "N/A";
  buyer_decision_support: "PASS" | "FAIL" | "N/A";
  information_gain: "PASS" | "FAIL" | "N/A";
  redundancy: "PASS" | "FAIL" | "N/A";
  thinness: "PASS" | "FAIL" | "N/A";
  visual_quality: "PASS" | "FAIL" | "N/A";
  missing_material_questions: number;
};

export type VenturePageDepthInventoryRow = {
  route: string;
  page_type: CustomerPageType;
  depth_class?: string;
  status: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
  missing_material_questions: number;
  question_coverage?: "PASS" | "FAIL" | "N/A";
  product_understanding?: "PASS" | "FAIL" | "N/A";
  buyer_decision_support?: "PASS" | "FAIL" | "N/A";
  information_gain?: "PASS" | "FAIL" | "N/A";
  thinness?: "PASS" | "FAIL" | "N/A";
  visual_quality?: "PASS" | "FAIL" | "N/A";
};

export type VenturePageDepthSummary = {
  total_material_pages: number;
  passed: number;
  failed: number;
  thin: number;
  unverified: number;
  pages: VenturePageDepthInventoryRow[];
};

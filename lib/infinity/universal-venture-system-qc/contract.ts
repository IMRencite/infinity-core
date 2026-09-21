export const VENTURE_SYSTEM_INVENTORY_CONTRACT = "VentureSystemInventoryContract" as const;
export const VENTURE_PRODUCTION_QC_MATRIX = "VentureProductionQCMatrix" as const;
export const UNIVERSAL_VENTURE_PRODUCTION_QUALITY_GATE = "UniversalVentureProductionQualityGate" as const;
export const VENTURE_QC_COVERAGE_CONTRACT = "VentureQCCoverageContract" as const;
export const VENTURE_QC_FRESHNESS_GATE = "VentureQCFreshnessGate" as const;
export const CHANGE_IMPACT_QC_PLANNER = "ChangeImpactQCPlanner" as const;
export const EXPECTED_RENDERED_CAPABILITY_GATE = "ExpectedRenderedCapabilityGate" as const;
export const CUSTOMER_JOURNEY_END_TO_END_QC_GATE = "CustomerJourneyEndToEndQCGate" as const;
export const RENDERED_ACTION_INVENTORY_CONTRACT = "RenderedActionInventoryContract" as const;
export const CUSTOMER_FORM_QC_GATE = "CustomerFormQCGate" as const;
export const CUSTOMER_AUTH_QC_GATE = "CustomerAuthQCGate" as const;
export const CUSTOMER_PERSISTENCE_QC_GATE = "CustomerPersistenceQCGate" as const;
export const RESULT_UX_QC_GATE = "ResultUxQCGate" as const;
export const LEGAL_TRUST_QC_GATE = "LegalTrustQCGate" as const;
export const DOMAIN_SSL_QC_GATE = "DomainSslQCGate" as const;
export const SEO_PUBLIC_INDEXABILITY_QC_GATE = "SeoPublicIndexabilityQCGate" as const;
export const RESPONSIVE_QC_GATE = "ResponsiveQCGate" as const;
export const ACCESSIBILITY_QC_GATE = "AccessibilityQCGate" as const;
export const PERFORMANCE_QC_GATE = "PerformanceQCGate" as const;
export const ERROR_STATE_QC_GATE = "ErrorStateQCGate" as const;
export const DESIGN_QUALITY_QC_GATE = "DesignQualityQCGate" as const;
export const MANDATORY_VENTURE_SMOKE_SUITE = "MandatoryVentureSmokeSuite" as const;
export const DEV_SERVER_PROCESS_HEALTH_GATE = "DevServerProcessHealthGate" as const;
export const VENTURE_CUSTOMER_JOURNEY_CONTRACT = "VentureCustomerJourneyContract" as const;

export const VENTURE_SYSTEM_IDS = [
  "PUBLIC_SITE",
  "NAVIGATION",
  "PRODUCT_WORKFLOW",
  "AUTH",
  "ACCOUNT",
  "PAYMENT",
  "CHECKOUT",
  "SUBSCRIPTION",
  "COMMERCIAL_OFFER",
  "FULFILLMENT",
  "EMAIL",
  "CUSTOMER_SUPPORT",
  "IMPROVEMENT_INTAKE",
  "ANALYTICS",
  "GROWTH",
  "GROWTH_GMAIL",
  "GROWTH_GEMINI",
  "GROWTH_DURABLE_QUEUE",
  "GROWTH_REPLY_HANDLING",
  "SEO",
  "LEGAL",
  "PRIVACY",
  "ACCESSIBILITY",
  "MOBILE",
  "RESPONSIVE",
  "PERFORMANCE",
  "ERROR_HANDLING",
  "NETWORK",
  "CONSOLE",
  "API",
  "SERVER_ACTIONS",
  "DATA_PERSISTENCE",
  "CUSTOMER_HISTORY",
  "RESULTS",
  "EXPORTS",
  "NOTIFICATIONS",
  "ADMIN_HQ_PROJECTION",
  "DOMAIN",
  "DNS",
  "SSL",
  "PRODUCTION_DEPLOYMENT",
  "DESIGN_QUALITY",
  "CUSTOMER_PAGE_DEPTH",
] as const;
export type VentureSystemId = (typeof VENTURE_SYSTEM_IDS)[number];

export const QC_STATUSES = ["PASS", "FAIL", "PARTIAL", "UNKNOWN", "NOT_APPLICABLE", "STALE"] as const;
export type QcStatus = (typeof QC_STATUSES)[number];

export const QC_ENVIRONMENTS = ["LOCAL_DEV", "PREVIEW", "LIVE_PRODUCTION"] as const;
export type QcEnvironment = (typeof QC_ENVIRONMENTS)[number];

export const QC_MODES = ["SMOKE", "TARGETED", "FULL"] as const;
export type QcMode = (typeof QC_MODES)[number];

export const VENTURE_ARCHETYPES = [
  "calculator",
  "saas",
  "marketplace",
  "lead_gen",
  "content_hybrid",
  "customer_portal",
  "api_product",
  "founder_hq",
] as const;
export type VentureArchetype = (typeof VENTURE_ARCHETYPES)[number];

export const UNIVERSAL_VENTURE_SYSTEM_QC_PRINCIPLES = {
  whole_venture: "QC MUST REVIEW THE WHOLE VENTURE, NOT JUST THE LAST FEATURE CHANGED.",
  weakest_path: "A VENTURE IS ONLY AS HEALTHY AS ITS WEAKEST MATERIAL CUSTOMER OR OPERATING PATH.",
  feature_is_not_venture: "FEATURE PASS != VENTURE PASS.",
  build_is_not_venture: "BUILD PASS != VENTURE PASS.",
  source_is_not_venture: "SOURCE PASS != VENTURE PASS.",
  deploy_is_not_venture: "DEPLOYMENT PASS != VENTURE PASS.",
  unknown_is_not_pass: "UNKNOWN IS NOT PASS.",
  stale_is_not_current: "STALE IS NOT CURRENT.",
  source_is_not_rendered: "COMPONENT EXISTS != RENDERED.",
  payment_is_not_fulfillment: "PAYMENT IS NOT FULFILLMENT.",
  desktop_is_not_mobile: "DESKTOP PASS DOES NOT OVERRIDE MOBILE FAILURE.",
  templates_are_archetypes: "TEMPLATES ARE ARCHETYPES, NOT FIXED LAYOUTS.",
  founder_physical_wins: "FOUNDER PHYSICAL BROWSER EVIDENCE IS HIGHEST-PRIORITY TRUTH.",
  no_false_green: "ONE MATERIAL SUBSYSTEM FAIL BLOCKS OVERALL HEALTHY GREEN PRODUCTION QC.",
  pricing_is_not_offer: "PRICING IS NOT THE SAME AS THE OFFER.",
  checkout_is_not_offer: "CHECKOUT IS NOT THE SAME AS THE OFFER.",
  payment_is_not_commercial_readiness: "PAYMENT READINESS IS NOT THE SAME AS COMMERCIAL READINESS.",
  hq_offer_is_not_live_offer: "OFFER ARCHITECTURE IN SOURCE/HQ DOES NOT PROVE THE LIVE CUSTOMER EXPERIENCE IMPLEMENTS IT.",
  customer_page_depth:
    "EVERY CUSTOMER-FACING VENTURE PAGE MUST PROVIDE SUFFICIENT DEPTH TO SATISFY THE MATERIAL USER INTENT OF THAT PAGE. DEPTH IS JUDGED BY QUESTION COVERAGE, DECISION SUPPORT, PRODUCT UNDERSTANDING, AND INFORMATION COMPLETENESS — NOT WORD COUNT. THIN, REPETITIVE, OR LONG LOW-INFORMATION PAGES FAIL QC.",
} as const;

export const QC_EVIDENCE_PRECEDENCE = [
  "FOUNDER_PHYSICAL",
  "LIVE_PRODUCTION",
  "SERVED_PREVIEW",
  "SERVED_LOCAL",
  "BUILD_ARTIFACT",
  "COMPILED_SOURCE",
  "SOURCE_DECLARATION",
] as const;
export type SystemQcEvidenceLevel = (typeof QC_EVIDENCE_PRECEDENCE)[number];

export type GovernedException = {
  system_id: VentureSystemId;
  policy: string;
  accepted: boolean;
};

export type QcEvidenceLineage = {
  checked: string;
  where: string;
  when: string;
  evidence_level: SystemQcEvidenceLevel;
  environment: QcEnvironment | "FOUNDER_PHYSICAL";
  tool_runtime: string;
  artifact_or_deployment: string | null;
  venture_id: string;
  version: string;
  result: QcStatus;
};

export type VentureSystemInventoryEntry = {
  system_id: VentureSystemId;
  venture_id: string;
  applicability: "APPLICABLE" | "NOT_APPLICABLE";
  material: boolean;
  required_surfaces: string[];
  required_workflows: string[];
  na_reason?: string;
};

export type VentureSystemInventory = {
  contract: typeof VENTURE_SYSTEM_INVENTORY_CONTRACT;
  venture_id: string;
  archetype: VentureArchetype[];
  entries: VentureSystemInventoryEntry[];
};

export type VentureProductionQcMatrixEntry = {
  system_id: VentureSystemId;
  venture_id: string;
  applicability: "APPLICABLE" | "NOT_APPLICABLE";
  required_surfaces: string[];
  required_workflows: string[];
  verification_level: SystemQcEvidenceLevel | "UNCHECKED";
  environment?: QcEnvironment | "FOUNDER_PHYSICAL";
  last_verified_at: string | null;
  verification_result: QcStatus;
  evidence_reference: string | null;
  failure_reason: string | null;
  owner: string;
  status: QcStatus;
};

export type VentureProductionQcMatrix = {
  contract: typeof VENTURE_PRODUCTION_QC_MATRIX;
  venture_id: string;
  mode: QcMode;
  entries: VentureProductionQcMatrixEntry[];
};

export type VentureQcCoverage = {
  contract: typeof VENTURE_QC_COVERAGE_CONTRACT;
  venture_id: string;
  total_applicable_systems: number;
  verified_systems: number;
  passing_systems: number;
  failing_systems: number;
  unknown_systems: number;
  stale_systems: number;
  partial_systems: number;
  coverage_percent: number;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type NamedSystemGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
  status?: QcStatus;
};

export const SMOKE_REQUIRED_SURFACES = [
  "home_public_entry",
  "navigation",
  "primary_product_workflow",
  "primary_cta",
  "auth_if_applicable",
  "payment_entry_if_paid",
  "primary_offer_surface",
  "primary_offer_cta",
  "offer_state",
  "offer_price_consistency",
  "offer_journey_entry",
  "feedback_improvement_entry",
  "legal_footer",
  "console",
  "network",
  "mobile",
] as const;

export const CANONICAL_FOOTER_COPY =
  "Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR" as const;

export const FACTORY_INHERITED_QC_CONTRACTS = [
  VENTURE_SYSTEM_INVENTORY_CONTRACT,
  VENTURE_PRODUCTION_QC_MATRIX,
  UNIVERSAL_VENTURE_PRODUCTION_QUALITY_GATE,
  VENTURE_QC_COVERAGE_CONTRACT,
  VENTURE_QC_FRESHNESS_GATE,
  CUSTOMER_JOURNEY_END_TO_END_QC_GATE,
  EXPECTED_RENDERED_CAPABILITY_GATE,
  MANDATORY_VENTURE_SMOKE_SUITE,
  "RenderedVisualQualityGate",
  "VentureDesignSystemConformanceGate",
  "DefaultBrowserStyleDetectionGate",
  "RenderedStyleApplicationGate",
  "CanonicalVentureSystemGraph",
  "VentureMaterialCoverageGate",
  "VentureQCManifestDiffGate",
  "CommercialOfferCompletenessGate",
  "RenderedOfferSurfaceContract",
  "PriceOnlyCommercializationGate",
  "CanonicalRenderedOfferParityGate",
  "OfferTimeToValueAlignmentGate",
  "OfferCTACompletenessGate",
  "CommercialOfferJourneyGate",
  "OfferMeasurementReadinessGate",
  "OfferDisclosureQCGate",
  "PageInformationDepthContract",
  "MaterialQuestionCoverageGate",
  "PageInformationGainGate",
  "BuyerDecisionSupportGate",
  "ProductUnderstandingGate",
  "CustomerPageThinnessGate",
  "CommercialContentRedundancyGate",
  "SectionContainerAlignmentGate",
  "PrimaryActionDiscoverabilityGate",
  "AppActionHierarchyGate",
  "InteractiveControlVisualHierarchyGate",
  "CustomerWorkflowDeadEndGate",
  "VentureFaviconGate",
  "VentureBrandIdentityContract",
  "VentureLogoGate",
  "VentureBrandConsistencyGate",
  "VentureBrandCompletenessGate",
  "BrandIdentityDiscoverabilityGate",
  "ApplicationMetadataIdentityGate",
  "MaterialArtifactQCContract",
  "ArtifactQCLayerResolver",
  "UniversalQCOrchestrator",
  "ReleaseEligibilityGate",
  "QCArtifactVersionIntegrityGate",
  "FounderBrowserDefectOverride",
  "RenderedArtifactProofGate",
  "BrowserRuntimeHealthGate",
  "RepeatedQCFailureGate",
  "NoQCNoReleaseGate",
] as const;

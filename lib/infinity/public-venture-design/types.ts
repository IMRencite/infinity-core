import type { BrandMediaProfile } from "@/lib/infinity/creative-media-engine/types";
import type {
  CONVERSION_VARIANTS,
  DESIGN_ARCHETYPES,
  DESIGN_PATTERN_IDS,
  HERO_VARIANTS,
  INTERACTION_TYPES,
  PRICING_VARIANTS,
  PRODUCT_SECTION_VARIANTS,
  SECTION_TYPES,
  TRUST_VARIANTS,
  VISUALIZATION_TYPES,
} from "./constants";

export type DesignArchetype = (typeof DESIGN_ARCHETYPES)[number];
export type SectionType = (typeof SECTION_TYPES)[number];
export type HeroVariant = (typeof HERO_VARIANTS)[number];
export type ProductSectionVariant = (typeof PRODUCT_SECTION_VARIANTS)[number];
export type PricingVariant = (typeof PRICING_VARIANTS)[number];
export type ConversionVariant = (typeof CONVERSION_VARIANTS)[number];
export type TrustVariant = (typeof TRUST_VARIANTS)[number];
export type VisualizationType = (typeof VISUALIZATION_TYPES)[number];
export type InteractionType = (typeof INTERACTION_TYPES)[number];
export type DesignPatternId = (typeof DESIGN_PATTERN_IDS)[number];
export type QualityTarget =
  | "VALIDATION_GRADE_READY"
  | "PREMIUM_VALIDATION_READY"
  | "PREMIUM_AUTHORITY_VALIDATION_READY"
  | "PRODUCTION_GRADE";
export type VisualNecessity = "REQUIRED" | "USEFUL" | "NOT_REQUIRED";
export type EconomicState = "ACTUAL" | "ESTIMATED" | "BENCHMARK" | "UNKNOWN" | "NOT_APPLICABLE";

export type PublicVentureDesignContext = {
  ventureCategory: string;
  productType: string;
  businessModel: string;
  targetPersona: string;
  buyerSophistication: "HIGH" | "MEDIUM" | "LOW";
  validationStage: string;
  offer: string;
  pricingModel: string;
  brandProfile?: BrandMediaProfile | null;
  availableProof: string[];
  unavailableProof: string[];
  desiredConversionAction: string;
  marketDesignExpectations: string;
  artifactQualityTarget: QualityTarget;
};

export type VentureDesignDirection = {
  designArchetype: DesignArchetype;
  visualTone: string;
  surfaceStyle: string;
  density: "AIRY" | "BALANCED" | "COMPACT";
  typographyDirection: string;
  spacingRhythm: string;
  radiusProfile: string;
  borderProfile: string;
  shadowProfile: string;
  depthProfile: string;
  accentBehavior: string;
  imageDirection: string;
  illustrationDirection: string;
  visualizationDirection: string;
  motionDirection: string;
  interactionDirection: string;
  contentDensity: string;
  trustTreatment: string;
  conversionTreatment: string;
};

export type VentureDesignTokens = {
  color: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
    accentContrast: string;
    accentHover: string;
    focus: string;
    panel: string;
  };
  fontScale: {
    display: string;
    section: string;
    body: string;
    caption: string;
    eyebrow: string;
  };
  spacing: {
    section: string;
    stack: string;
    gutter: string;
    gutterTablet?: string;
    gutterMobile?: string;
    footerY?: string;
    headerY?: string;
    cardGap?: string;
    visualGap?: string;
  };
  radius: { sm: string; md: string; lg: string };
  shadow: { subtle: string; elevated: string };
  border: { width: string; color: string };
  container: { max: string; content: string; wide?: string; article?: string };
  motion: { duration: string; easing: string };
  breakpoints: { mobile: string; tablet: string; desktop: string };
};

export type SectionDefinition = {
  sectionType: SectionType;
  variant: string;
  purpose: string;
  targetPersona: string;
  headline: string;
  supportingCopy: string;
  contentItems: string[];
  visualAssetRefs: string[];
  visualizationRefs: string[];
  cta: string | null;
  backgroundTreatment: string;
  layout: string;
  density: string;
  motion: string;
  accessibility: string;
  proofRequirements: string[];
  patternId: DesignPatternId;
};

export type CreativeAssetPlanItem = {
  assetType: string;
  purpose: string;
  section: SectionType | "PAGE";
  generationMethod: "DETERMINISTIC_UI" | "creative.image.generate" | "NO_EXTERNAL_IMAGE_REQUIRED" | "REUSE";
  providerCapability: string | null;
  aspectRatio: string | null;
  styleDirection: string;
  brandProfile: "USED" | "PROVISIONAL" | "NONE";
  reuseCandidate: boolean;
  required: boolean;
};

export type CreativeAssetPlan = {
  visualNecessity: VisualNecessity;
  reason: string;
  items: CreativeAssetPlanItem[];
  creativeMediaInvoked: boolean;
  assetsGenerated: number;
  assetIds: string[];
  providers: string[];
  costState: EconomicState;
  provenance: "PASS" | "FAIL";
  blocker: "NONE" | "CREATIVE_MEDIA_CAPABILITY_REQUIRED";
};

export type CompositionPlan = {
  planner: "PublicVentureCompositionPlanner";
  qualityTarget: QualityTarget;
  heroVariant: HeroVariant;
  sections: SectionDefinition[];
  visualizations: VisualizationType[];
  interactions: InteractionType[];
  why: Record<string, string>;
  aboveFold: string[];
  random: false;
};

export type DesignPatternReference = {
  patternId: DesignPatternId;
  category: string;
  principle: string;
  bestFor: string;
  avoidWhen: string;
  accessibilityNotes: string;
  conversionPurpose: string;
  copiedSourceHtml: false;
};

export type DesignPatternPerformanceProfile = {
  patternId: string;
  sectionType?: SectionType;
  uses: number;
  qualifiedVisits: number;
  ctaInteractions: number;
  formStarts: number;
  submissions: number;
  strongIntent: number;
  conversionRate: number | null;
  segment: string | null;
  ventureCategory: string | null;
  confidence: "INSUFFICIENT" | "LOW" | "MEDIUM" | "HIGH";
};

export type PageCompositionProvenance = {
  designDirection: VentureDesignDirection;
  tokens: VentureDesignTokens;
  composition: CompositionPlan;
  creativeAssetPlan: CreativeAssetPlan;
  qualityTarget: QualityTarget;
  qualityResult: string;
};

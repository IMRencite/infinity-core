import type { BrandMediaProfile } from "@/lib/infinity/creative-media-engine/types";
import { DEFAULT_PUBLIC_VALIDATION_QUALITY_TARGET } from "./constants";
import type {
  DesignArchetype,
  PublicVentureDesignContext,
  VentureDesignDirection,
  VentureDesignTokens,
} from "./types";

export function defaultPublicValidationQualityTarget(
  economicsJustifyValidationGradeOnly = false,
): PublicVentureDesignContext["artifactQualityTarget"] {
  return economicsJustifyValidationGradeOnly ? "VALIDATION_GRADE_READY" : DEFAULT_PUBLIC_VALIDATION_QUALITY_TARGET;
}

export function selectDesignArchetype(context: PublicVentureDesignContext): DesignArchetype {
  const blob = `${context.ventureCategory} ${context.productType} ${context.marketDesignExpectations}`.toLowerCase();
  if (/health|clinic|patient|care/.test(blob)) return "HEALTHCARE_CALM_CREDIBLE";
  if (/marketplace|consumer|retail/.test(blob)) return "CONSUMER_MARKETPLACE_DISCOVERY";
  if (/industrial|manufactur|logistics/.test(blob)) return "INDUSTRIAL_TECHNICAL";
  if (/creator|editorial|media platform/.test(blob)) return "CREATOR_EDITORIAL";
  if (/financ|b2b|analytic|lease|cre|software/.test(blob)) return "FINANCIAL_B2B_ANALYTICAL";
  return "PROVISIONAL_VALIDATION";
}

export function tokensForArchetype(
  archetype: DesignArchetype,
  brand?: BrandMediaProfile | null,
): VentureDesignTokens {
  const accent = brand?.brandColors?.[0] && /^#/.test(brand.brandColors[0]) ? brand.brandColors[0] : null;
  const base: VentureDesignTokens = {
    color: {
      bg: "#f4f6f8",
      surface: "#ffffff",
      text: "#152033",
      muted: "#4b5568",
      border: "#d5dbe3",
      accent: accent ?? "#1d4e78",
      accentContrast: "#ffffff",
      accentHover: "#14385a",
      focus: "#0f3d6b",
      panel: "#0f1c2e",
    },
    fontScale: {
      display: "clamp(2.1rem, 4.4vw, 3.15rem)",
      section: "clamp(1.45rem, 2.4vw, 1.85rem)",
      body: "1.05rem",
      caption: "0.82rem",
      eyebrow: "0.75rem",
    },
    spacing: { section: "5rem", stack: "1.25rem", gutter: "1.5rem" },
    radius: { sm: "6px", md: "10px", lg: "16px" },
    shadow: { subtle: "0 1px 2px rgba(21,32,51,0.06)", elevated: "0 18px 40px rgba(15,28,46,0.12)" },
    border: { width: "1px", color: "#d5dbe3" },
    container: { max: "72rem", content: "40rem" },
    motion: { duration: "220ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    breakpoints: { mobile: "640px", tablet: "960px", desktop: "1200px" },
  };
  if (archetype === "HEALTHCARE_CALM_CREDIBLE") {
    base.color.bg = "#f7f4ef";
    base.color.accent = accent ?? "#3d6b5a";
    base.color.panel = "#24352f";
  }
  if (archetype === "CONSUMER_MARKETPLACE_DISCOVERY") {
    base.color.bg = "#fbf7f2";
    base.color.accent = accent ?? "#c45c26";
  }
  if (archetype === "INDUSTRIAL_TECHNICAL") {
    base.color.bg = "#eef1f3";
    base.color.accent = accent ?? "#2c4a5e";
    base.color.panel = "#1a242c";
  }
  if (archetype === "CREATOR_EDITORIAL") {
    base.color.bg = "#faf6f1";
    base.color.accent = accent ?? "#8a2e4b";
  }
  return base;
}

export function produceVentureDesignDirection(context: PublicVentureDesignContext): VentureDesignDirection {
  const archetype = selectDesignArchetype(context);
  const brand = context.brandProfile;
  const provisional = !brand;
  return {
    designArchetype: archetype,
    visualTone:
      archetype === "FINANCIAL_B2B_ANALYTICAL"
        ? "modern, premium, analytical, institutional, restrained, software-forward"
        : archetype.replace(/_/g, " ").toLowerCase(),
    surfaceStyle: "subtle bordered + data-panel, limited elevation",
    density: context.buyerSophistication === "HIGH" ? "BALANCED" : "AIRY",
    typographyDirection: "display / section / body / caption / eyebrow with tight display tracking",
    spacingRhythm: "intentional section rhythm, content-width discipline",
    radiusProfile: "small-to-medium, not playful pills everywhere",
    borderProfile: "hairline graphite/navy borders",
    shadowProfile: "subtle; one elevated product frame",
    depthProfile: "layered product frame over tonal panel, no glass overload",
    accentBehavior: "controlled blue or brand accent, never neon or AI-purple wash",
    imageDirection: "product-first; atmosphere only if it explains",
    illustrationDirection: provisional ? "restrained provisional identity, no full brand book" : "brand-aligned",
    visualizationDirection: "live/deterministic UI for charts, dashboards, comparisons",
    motionDirection: "restrained entrance and hover; prefers-reduced-motion honored",
    interactionDirection: "comparison toggle, pricing selection, CTA hover — no decorative motion",
    contentDensity: "enough explanation for a sophisticated buyer, not a brochure wall",
    trustTreatment: "validation disclosure and method transparency only; no fake logos or testimonials",
    conversionTreatment: "repeated pilot CTA near pricing and form; interest, not purchase",
  };
}

export function produceVentureDesignTokens(context: PublicVentureDesignContext): VentureDesignTokens {
  return tokensForArchetype(selectDesignArchetype(context), context.brandProfile);
}

export function creDesignContext(): PublicVentureDesignContext {
  return {
    ventureCategory: "financial B2B software / commercial real estate analytics",
    productType: "lease comparison and NPV workflow software",
    businessModel: "annual professional seat or per-deal report",
    targetPersona: "tenant-representation brokers, independent CRE brokers, boutique CRE advisory",
    buyerSophistication: "HIGH",
    validationStage: "COLLECTING",
    offer: "A focused commercial lease comparison and NPV workflow for smaller CRE professionals.",
    pricingModel: "$290/year or $149/deal hypotheses",
    brandProfile: {
      brandColors: ["#1d4e78", "#152033", "#f4f6f8"],
      visualStyle: "restrained institutional software",
      tone: "precise, confident, non-promotional",
      prohibitedStyles: ["neon", "crypto", "AI-purple gradient", "real-estate stock brochure"],
    },
    availableProof: ["pricing hypotheses", "validation disclosure", "illustrative workflow"],
    unavailableProof: ["customers", "testimonials", "adoption metrics", "certifications", "case studies"],
    desiredConversionAction: "Request Pilot Access",
    marketDesignExpectations: "premium analytical financial B2B software, not Infinity HQ neon",
    artifactQualityTarget: defaultPublicValidationQualityTarget(),
  };
}

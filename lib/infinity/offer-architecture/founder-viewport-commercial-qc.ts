import { existsSync, readFileSync } from "node:fs";
import { binaryOfferResult, type NamedOfferGate } from "./types";
import {
  evaluateCommercialContentDensityGate,
  evaluateCommercialInformationHierarchyGate,
  evaluateCustomerFacingLanguageGate,
  evaluateMaterialCustomerAdvantageGate,
  evaluateOfferTruthfulnessGate,
  evaluatePrimaryCommercialActionViewportGate,
} from "./true-offer";
import {
  evaluateCommercialContentRedundancyGate,
  evaluateCommercialPageNarrativeGate,
  evaluateCommercialWhitespaceBalanceGate,
  evaluateHeroConversionBalanceGate,
  evaluateHeroTextReadabilityGate,
  evaluatePricingPageInformationDepthGate,
  evaluateResponsiveHeroGate,
} from "./pricing-page-quality";
import {
  evaluateCommercialPageLayoutConsistencyGate,
  evaluateSectionContainerAlignmentGate,
  type SectionAlignmentObservation,
} from "@/lib/infinity/customer-page-depth";

export const INITIAL_VIEWPORT_COMMERCIAL_ACTION_GATE = "InitialViewportCommercialActionGate" as const;
export const ABOVE_FOLD_COMMERCIAL_DENSITY_GATE = "AboveFoldCommercialDensityGate" as const;
export const COMMERCIAL_HERO_HEIGHT_GATE = "CommercialHeroHeightGate" as const;
export const COMMERCIAL_PANEL_SPACING_GATE = "CommercialPanelSpacingGate" as const;
export const COMMERCIAL_VISUAL_HIERARCHY_GATE = "CommercialVisualHierarchyGate" as const;

export const FOUNDER_VIEWPORT_QC_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-founder-viewport-qc.json" as const;

export const DESIGN_SYSTEM_CARD_GAP_PX = 16;
export const DESIGN_SYSTEM_VISUAL_GAP_PX = 24;
export const DESIGN_SYSTEM_SECTION_GAP_PX = 80;
export const COMPACT_HERO_MAX_HEIGHT_PX = 240;
export const SUPERSEDED_FALSE_POSITIVE = "SUPERSEDED_FALSE_POSITIVE" as const;

export type ViewportRect = {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
  height?: number;
  width?: number;
};

export type FounderViewportProfile = {
  name: string;
  width: number;
  height: number;
  scrollY: number;
  viewportHeight: number;
  professionalPrice: ViewportRect;
  startFreeTrial?: ViewportRect;
  startProfessional: ViewportRect;
  perDealPrice: ViewportRect;
  startOneDeal: ViewportRect;
  hero?: ViewportRect;
  pricingCardProfessional?: ViewportRect;
  pricingCardPerDeal?: ViewportRect;
  pricingGroup?: ViewportRect;
  nextCommercialPanel?: ViewportRect;
  siblingGapPx?: number;
  pricingGroupToNextSectionGapPx?: number;
  relatedPathsContainer?: ViewportRect;
  relatedPathsBackground?: ViewportRect;
  relatedPathsContent?: ViewportRect;
  relatedPathsOverflowX?: boolean;
};

export type FounderViewportQcEvidence = {
  prior_cta_above_fold_pass: typeof SUPERSEDED_FALSE_POSITIVE;
  prior_spacing_pass: typeof SUPERSEDED_FALSE_POSITIVE;
  root_cause: {
    auto_scroll: boolean;
    wrong_viewport: boolean;
    dom_existence_mistaken_for_visibility: boolean;
    hero_omitted_from_geometry: boolean;
    wrong_artifact: boolean;
    other: string;
  };
  profiles: FounderViewportProfile[];
  html?: string;
  captured_at?: string;
};

export function rectVisibleInInitialViewport(
  rect: ViewportRect,
  viewportHeight: number,
  scrollY: number,
): boolean {
  if (scrollY !== 0) return false;
  return rect.top >= 0 && rect.bottom <= viewportHeight && rect.top < viewportHeight;
}

export function rectAdjacentInFirstDecisionViewport(
  primary: ViewportRect,
  secondary: ViewportRect,
  viewportHeight: number,
  scrollY: number,
): boolean {
  if (rectVisibleInInitialViewport(secondary, viewportHeight, scrollY)) return true;
  if (scrollY !== 0) return false;
  if (!rectVisibleInInitialViewport(primary, viewportHeight, scrollY)) return false;
  const adjacent = secondary.top - primary.bottom <= DESIGN_SYSTEM_VISUAL_GAP_PX && secondary.top >= 0;
  return adjacent && secondary.top < viewportHeight;
}

export function evaluateInitialViewportCommercialActionGate(profile: FounderViewportProfile): NamedOfferGate {
  const reasons: string[] = [];
  if (profile.scrollY !== 0) reasons.push("SCROLL_Y_NOT_ZERO");
  if (profile.viewportHeight <= 0) reasons.push("VIEWPORT_HEIGHT_MISSING");
  if (!profile.startFreeTrial || !rectVisibleInInitialViewport(profile.startFreeTrial, profile.viewportHeight, profile.scrollY)) {
    reasons.push("PRIMARY_OFFER_CTA_BELOW_FOLD");
  }
  if (!rectVisibleInInitialViewport(profile.professionalPrice, profile.viewportHeight, profile.scrollY)) {
    reasons.push("PROFESSIONAL_PRICE_BELOW_FOLD");
  }
  if (!rectVisibleInInitialViewport(profile.startProfessional, profile.viewportHeight, profile.scrollY)) {
    reasons.push("PAID_CTA_BELOW_FOLD");
  }
  if (!rectVisibleInInitialViewport(profile.perDealPrice, profile.viewportHeight, profile.scrollY)) {
    reasons.push("PER_DEAL_PRICE_BELOW_FOLD");
  }
  if (!rectAdjacentInFirstDecisionViewport(
    profile.startProfessional,
    profile.startOneDeal,
    profile.viewportHeight,
    profile.scrollY,
  )) {
    reasons.push("SECONDARY_CTA_NOT_IN_FIRST_DECISION_VIEWPORT");
  }
  return {
    gate: INITIAL_VIEWPORT_COMMERCIAL_ACTION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateAboveFoldCommercialDensityGate(input: {
  html: string;
  profile?: FounderViewportProfile | null;
}): NamedOfferGate {
  const html = input.html;
  const preCta = html.slice(0, Math.max(0, html.search(/Start Free Trial|Start Professional/i)));
  const reasons: string[] = [];
  if (/pv-hero-photo|pv-article-hero/i.test(preCta)) reasons.push("TALL_PHOTO_HERO_BEFORE_CTA");
  if (/What does OccupancyNPV cost\?/i.test(preCta)) reasons.push("COST_QNA_BEFORE_CTA");
  if (/pv-pricing-split/i.test(preCta)) reasons.push("DUPLICATE_PRICING_CARDS_BEFORE_CTA");
  if (/These offers exist because/i.test(preCta)) reasons.push("LONG_EXPLANATION_BEFORE_CTA");
  if (/Request Pilot Access/i.test(preCta) && preCta.search(/Request Pilot Access/i) < (preCta.search(/Start Professional/i) || preCta.length)) {
    reasons.push("COMPETING_CTA_BEFORE_PURCHASE");
  }
  if (!input.profile) {
    reasons.push("VIEWPORT_NOT_MEASURED_IN_BROWSER");
  } else {
    const viewport = evaluateInitialViewportCommercialActionGate(input.profile);
    if (viewport.result === "FAIL") reasons.push("PURCHASE_ACTIONS_NOT_IN_INITIAL_VIEWPORT");
  }
  return {
    gate: ABOVE_FOLD_COMMERCIAL_DENSITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateCommercialHeroHeightGate(input: {
  html?: string;
  heroHeightPx?: number | null;
  measurement?: "BROWSER_GEOMETRY" | "SOURCE_INFERENCE";
}): NamedOfferGate {
  const reasons: string[] = [];
  const html = input.html ?? "";
  if (/pv-hero-photo|pv-article-hero/i.test(html) && !/data-commercial-hero="(?:compact|band|overlay)"/i.test(html)) {
    reasons.push("PHOTO_HERO_BLOCKS_CONVERSION");
  }
  if (input.measurement !== "BROWSER_GEOMETRY" || input.heroHeightPx == null) {
    reasons.push("HERO_HEIGHT_NOT_MEASURED");
  } else if (input.heroHeightPx > COMPACT_HERO_MAX_HEIGHT_PX) {
    reasons.push("HERO_TALLER_THAN_CONVERSION_BUDGET");
  }
  return {
    gate: COMMERCIAL_HERO_HEIGHT_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateCommercialPanelSpacingGate(input: {
  siblingGapPx?: number | null;
  pricingGroupToNextSectionGapPx?: number | null;
  measurement?: "BROWSER_GEOMETRY" | "SOURCE_INFERENCE";
}): NamedOfferGate {
  const reasons: string[] = [];
  if (input.measurement !== "BROWSER_GEOMETRY" || input.siblingGapPx == null || input.pricingGroupToNextSectionGapPx == null) {
    return {
      gate: COMMERCIAL_PANEL_SPACING_GATE,
      result: "FAIL",
      reasons: ["SPACING_NOT_MEASURED_IN_BROWSER"],
    };
  }
  if (input.siblingGapPx < DESIGN_SYSTEM_CARD_GAP_PX) reasons.push("SIBLING_CARD_GAP_BELOW_TOKEN");
  if (input.pricingGroupToNextSectionGapPx < DESIGN_SYSTEM_VISUAL_GAP_PX) reasons.push("SECTION_GAP_BELOW_TOKEN");
  if (input.siblingGapPx < 8 || input.pricingGroupToNextSectionGapPx < 8) reasons.push("PANELS_VISUALLY_MERGED");
  return {
    gate: COMMERCIAL_PANEL_SPACING_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateCommercialVisualHierarchyGate(html: string): NamedOfferGate {
  const reasons: string[] = [];
  if (/Compare commercial lease economics without rebuilding the spreadsheet/i.test(html) && !/data-pricing-architecture/.test(html)) {
    const header = html.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? "";
    if (!/Start Free Trial/i.test(html)) reasons.push("PRIMARY_CTA_WEIGHT_MISSING");
    if (!/3-day/i.test(html)) reasons.push("ACQUISITION_OFFER_NOT_STATED");
    if (/>Request Pilot Access</i.test(header)) reasons.push("PILOT_CTA_COMPETES_WITH_TRIAL");
    if (/AnswerFirst/i.test(header)) reasons.push("SUPPORTING_DETAIL_COMPETES_WITH_VALUE");
    if (/vg-cta--secondary[\s\S]*See pricing/i.test(header)) reasons.push("PRICING_LINK_WEAKER_THAN_PHOTO");
    return { gate: COMMERCIAL_VISUAL_HIERARCHY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
  }
  if (/pv-pricing-split/i.test(html) && /onpv-price-grid/i.test(html)) {
    reasons.push("EQUAL_WEIGHT_DUPLICATE_PRICE_BLOCKS");
  }
  if (!/data-offer-cta="primary"[\s\S]{0,200}Start Free Trial/i.test(html)) {
    reasons.push("PRIMARY_CTA_WEIGHT_MISSING");
  }
  if (!/data-offer-cta="secondary"[\s\S]{0,200}Start Professional/i.test(html)) {
    reasons.push("SECONDARY_CTA_WEIGHT_MISSING");
  }
  if (!/Try OccupancyNPV free for 3 days/i.test(html)) reasons.push("ACQUISITION_OFFER_NOT_STATED");
  if (/Primary offer · paid-first/i.test(html)) reasons.push("FAKE_OFFER_COMPETES_WITH_PRICING");
  const foldHtml = html.split(/How the 3-day free trial works/i)[0] ?? html;
  const visibleHtml = foldHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
  if ((visibleHtml.match(/\$290/g) ?? []).length > 8) reasons.push("PRICE_REPEATED_TOO_OFTEN");
  return {
    gate: COMMERCIAL_VISUAL_HIERARCHY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateFounderViewportCommercialQc(input: {
  html: string;
  profile?: FounderViewportProfile | null;
}): {
  InitialViewportCommercialActionGate: NamedOfferGate;
  AboveFoldCommercialDensityGate: NamedOfferGate;
  CommercialHeroHeightGate: NamedOfferGate;
  CommercialPanelSpacingGate: NamedOfferGate;
  CommercialVisualHierarchyGate: NamedOfferGate;
  CommercialContentDensityGate: NamedOfferGate;
  CommercialInformationHierarchyGate: NamedOfferGate;
  CustomerFacingLanguageGate: NamedOfferGate;
  MaterialCustomerAdvantageGate: NamedOfferGate;
  OfferTruthfulnessGate: NamedOfferGate;
  PrimaryCommercialActionViewportGate: NamedOfferGate;
  HeroConversionBalanceGate: NamedOfferGate;
  HeroTextReadabilityGate: NamedOfferGate;
  ResponsiveHeroGate: NamedOfferGate;
  CommercialWhitespaceBalanceGate: NamedOfferGate;
  PricingPageInformationDepthGate: NamedOfferGate;
  CommercialContentRedundancyGate: NamedOfferGate;
  CommercialPageNarrativeGate: NamedOfferGate;
  SectionContainerAlignmentGate: NamedOfferGate;
  CommercialPageLayoutConsistencyGate: NamedOfferGate;
} {
  const profile = input.profile ?? null;
  const primaryVisible = profile
    ? rectVisibleInInitialViewport(profile.startFreeTrial ?? profile.startProfessional, profile.viewportHeight, profile.scrollY)
    : null;
  return {
    InitialViewportCommercialActionGate: profile
      ? evaluateInitialViewportCommercialActionGate(profile)
      : { gate: INITIAL_VIEWPORT_COMMERCIAL_ACTION_GATE, result: "FAIL", reasons: ["VIEWPORT_NOT_MEASURED_IN_BROWSER"] },
    AboveFoldCommercialDensityGate: evaluateAboveFoldCommercialDensityGate({ html: input.html, profile }),
    CommercialHeroHeightGate: evaluateCommercialHeroHeightGate({
      html: input.html,
      heroHeightPx: profile?.hero?.height ?? (profile?.hero ? profile.hero.bottom - profile.hero.top : null),
      measurement: profile?.hero ? "BROWSER_GEOMETRY" : "SOURCE_INFERENCE",
    }),
    CommercialPanelSpacingGate: evaluateCommercialPanelSpacingGate({
      siblingGapPx: profile?.siblingGapPx ?? null,
      pricingGroupToNextSectionGapPx: profile?.pricingGroupToNextSectionGapPx ?? null,
      measurement: profile?.siblingGapPx != null ? "BROWSER_GEOMETRY" : "SOURCE_INFERENCE",
    }),
    CommercialVisualHierarchyGate: evaluateCommercialVisualHierarchyGate(input.html),
    CommercialContentDensityGate: evaluateCommercialContentDensityGate(input.html),
    CommercialInformationHierarchyGate: evaluateCommercialInformationHierarchyGate(input.html),
    CustomerFacingLanguageGate: evaluateCustomerFacingLanguageGate(input.html),
    MaterialCustomerAdvantageGate: evaluateMaterialCustomerAdvantageGate({ html: input.html }),
    OfferTruthfulnessGate: evaluateOfferTruthfulnessGate({ html: input.html }),
    PrimaryCommercialActionViewportGate: evaluatePrimaryCommercialActionViewportGate({
      primary_cta_in_viewport: primaryVisible,
      measurement: profile ? "BROWSER_GEOMETRY" : "SOURCE_INFERENCE",
      scrollY: profile?.scrollY,
    }),
    HeroConversionBalanceGate: evaluateHeroConversionBalanceGate({ html: input.html, profile }),
    HeroTextReadabilityGate: evaluateHeroTextReadabilityGate(input.html),
    ResponsiveHeroGate: evaluateResponsiveHeroGate({ html: input.html }),
    CommercialWhitespaceBalanceGate: evaluateCommercialWhitespaceBalanceGate({ html: input.html, profile }),
    PricingPageInformationDepthGate: evaluatePricingPageInformationDepthGate(input.html),
    CommercialContentRedundancyGate: evaluateCommercialContentRedundancyGate(input.html),
    CommercialPageNarrativeGate: evaluateCommercialPageNarrativeGate(input.html),
    SectionContainerAlignmentGate: relatedObservation(profile)
      ? evaluateSectionContainerAlignmentGate([relatedObservation(profile)!])
      : { gate: "SectionContainerAlignmentGate", result: "FAIL", reasons: ["RELATED_PATHS_GEOMETRY_MISSING"] },
    CommercialPageLayoutConsistencyGate: evaluateCommercialPageLayoutConsistencyGate({
      related: relatedObservation(profile),
    }),
  };
}

function relatedObservation(profile: FounderViewportProfile | null): SectionAlignmentObservation | null {
  if (!profile?.relatedPathsContainer || !profile.relatedPathsBackground || !profile.relatedPathsContent) return null;
  return {
    section: "related_product_paths",
    container: {
      left: profile.relatedPathsContainer.left ?? 0,
      right: profile.relatedPathsContainer.right ?? 0,
      width: profile.relatedPathsContainer.width ?? 0,
    },
    background: {
      left: profile.relatedPathsBackground.left ?? 0,
      right: profile.relatedPathsBackground.right ?? 0,
      width: profile.relatedPathsBackground.width ?? 0,
    },
    content: {
      left: profile.relatedPathsContent.left ?? 0,
      right: profile.relatedPathsContent.right ?? 0,
      width: profile.relatedPathsContent.width ?? 0,
    },
    overflowX: profile.relatedPathsOverflowX,
  };
}

export function loadFounderViewportQcEvidence(): FounderViewportQcEvidence | null {
  try {
    if (!existsSync(FOUNDER_VIEWPORT_QC_EVIDENCE_PATH)) return null;
    return JSON.parse(readFileSync(FOUNDER_VIEWPORT_QC_EVIDENCE_PATH, "utf8")) as FounderViewportQcEvidence;
  } catch {
    return null;
  }
}

export function hqConversionFieldsFromEvidence(html?: string): {
  conversion_ux: "PASS" | "FAIL";
  above_fold_cta: "PASS" | "FAIL";
  panel_spacing: "PASS" | "FAIL";
  pricing_content_depth: "PASS" | "FAIL";
  whitespace: "PASS" | "FAIL";
} {
  const evidence = loadFounderViewportQcEvidence();
  const desktop = evidence?.profiles.find((row) => row.name === "1366x768")
    ?? evidence?.profiles[0]
    ?? null;
  const qc = evaluateFounderViewportCommercialQc({ html: html ?? evidence?.html ?? "", profile: desktop });
  return {
    conversion_ux: [
      qc.InitialViewportCommercialActionGate,
      qc.AboveFoldCommercialDensityGate,
      qc.CommercialHeroHeightGate,
      qc.CommercialPanelSpacingGate,
      qc.CommercialVisualHierarchyGate,
      qc.CommercialContentDensityGate,
      qc.HeroConversionBalanceGate,
    ].every((gate) => gate.result === "PASS") ? "PASS" : "FAIL",
    above_fold_cta: qc.InitialViewportCommercialActionGate.result === "PASS" ? "PASS" : "FAIL",
    panel_spacing: qc.CommercialPanelSpacingGate.result === "PASS" ? "PASS" : "FAIL",
    pricing_content_depth: binaryOfferResult(qc.PricingPageInformationDepthGate.result),
    whitespace: binaryOfferResult(qc.CommercialWhitespaceBalanceGate.result),
  };
}

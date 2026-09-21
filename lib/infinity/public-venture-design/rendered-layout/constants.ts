export const RENDERED_LAYOUT_QUALITY_GATE = "RenderedLayoutQualityGate" as const;
export const RESPONSIVE_SPACING_PROFILE = "ResponsiveSpacingProfile" as const;
export const CONTAINER_GEOMETRY_PROFILE = "ContainerGeometryProfile" as const;
export const SECTION_COMPOSITION_PROFILE = "SectionCompositionProfile" as const;
export const SECTION_RHYTHM_PROFILE = "SectionRhythmProfile" as const;
export const FOOTER_LAYOUT_PROFILE = "FooterLayoutProfile" as const;
export const RENDERED_PAGE_VISUAL_AUDIT = "RenderedPageVisualAudit" as const;
export const PREMIUM_COMPOSITION = "PREMIUM_COMPOSITION" as const;

export const RENDERED_LAYOUT_REPAIR_SITE_CONTRACT = "nextjs_ts_rendered_layout_repair_v1" as const;
export const RENDERED_LAYOUT_REPAIR_REASON =
  "RENDERED_LAYOUT_SPACING_AND_PREMIUM_COMPOSITION_REPAIR" as const;

export const PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD =
  "PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD" as const;
export const SERVED_PRODUCTION_RENDERED_LAYOUT_GATE = "ServedProductionRenderedLayoutGate" as const;
export const DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD =
  "DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD" as const;
export const LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE = "LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE" as const;
export const VERIFICATION_ENGINE_FALSE_NEGATIVE = "VERIFICATION_ENGINE_FALSE_NEGATIVE" as const;
export const RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY =
  "RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY" as const;
export const OPTIONAL_DEFENSIVE_HARDENING = "OPTIONAL_DEFENSIVE_HARDENING" as const;
export const REQUIRED_FOR_CORRECTNESS = "REQUIRED_FOR_CORRECTNESS" as const;

export const RENDERED_LAYOUT_FAIL_REASONS = [
  "BODY_GUTTER_INSUFFICIENT",
  "FULL_BLEED_INNER_PADDING_MISSING",
  "FOOTER_INNER_PADDING_INSUFFICIENT",
  "EDGE_COLLISION",
  "INCONSISTENT_CONTAINER_GRID",
  "WEAK_VERTICAL_RHYTHM",
  "MONOTONOUS_LONG_FORM_COMPOSITION",
  "UNDER_DESIGNED_SECTION",
  "VISUAL_HIERARCHY_WEAK",
  "TABLE_OVERFLOW",
  "MOBILE_LAYOUT_DEFECT",
  "EXCESSIVE_LOW_INFORMATION_SPACE",
  "HEADER_GUTTER_INSUFFICIENT",
  "HORIZONTAL_OVERFLOW",
] as const;

export const HUMAN_DESIGNER_ADVERSARIAL_QUESTION =
  "If an experienced web designer saw only this rendered page, would they reasonably call the layout polished and premium?" as const;

export const REPRESENTATIVE_VIEWPORTS = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
} as const;

export const MIN_SAFE_GUTTER_PX = {
  desktop: 24,
  tablet: 20,
  mobile: 16,
} as const;

export const MIN_FOOTER_PADDING_PX = {
  y: 32,
  x: 24,
} as const;

export const COMPOSITION_PATTERNS = [
  "editorial-split",
  "visual-left-text-right",
  "text-left-visual-right",
  "full-width-data-story",
  "comparison-matrix",
  "timeline",
  "workflow",
  "worked-example",
  "question-cluster",
  "callout-band",
  "faq",
  "cta-band",
  "source-block",
  "topic-map",
  "product-ui",
  "data-visualization",
] as const;

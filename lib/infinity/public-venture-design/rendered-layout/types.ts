import type {
  COMPOSITION_PATTERNS,
  RENDERED_LAYOUT_FAIL_REASONS,
  REPRESENTATIVE_VIEWPORTS,
} from "./constants";

export type RenderedLayoutFailReason = (typeof RENDERED_LAYOUT_FAIL_REASONS)[number];
export type CompositionPattern = (typeof COMPOSITION_PATTERNS)[number];
export type ViewportName = keyof typeof REPRESENTATIVE_VIEWPORTS;
export type LayoutGate = "PASS" | "FAIL";

export type ResponsiveSpacingProfile = {
  model: "ResponsiveSpacingProfile";
  pageGutterDesktop: string;
  pageGutterTablet: string;
  pageGutterMobile: string;
  contentMaxWidth: string;
  wideContentMaxWidth: string;
  articleMeasure: string;
  sectionVerticalSpacing: string;
  cardGap: string;
  visualGap: string;
  footerPaddingY: string;
  footerPaddingX: string;
  headerPaddingY: string;
  tokensUsedInCss: boolean;
  hardcodedMagicNumbers: boolean;
  overall: LayoutGate;
};

export type ContainerGeometryProfile = {
  model: "ContainerGeometryProfile";
  viewportWidth: number;
  containerMaxWidthPx: number | null;
  leftGutterPx: number;
  rightGutterPx: number;
  alignedToCanonicalGrid: boolean;
  heroAlignedWithBody: boolean;
  footerAlignedWithGrid: boolean;
  overall: LayoutGate;
};

export type SectionRhythmProfile = {
  model: "SectionRhythmProfile";
  headingBeforePx: number | null;
  headingAfterPx: number | null;
  paragraphSpacingCompressed: boolean;
  giantLowInformationGaps: boolean;
  sectionToSectionOk: boolean;
  overall: LayoutGate;
};

export type SectionCompositionProfile = {
  model: "SectionCompositionProfile";
  patterns: CompositionPattern[];
  headingParagraphRun: number;
  monotonousLongForm: boolean;
  underDesignedSections: number;
  visualHierarchyWeak: boolean;
  overall: LayoutGate;
};

export type FooterLayoutProfile = {
  model: "FooterLayoutProfile";
  horizontalPaddingPx: number;
  verticalPaddingPx: number;
  innerContainer: boolean;
  contractVisible: boolean;
  wraps: boolean;
  edgeCollision: boolean;
  unstyledStrip: boolean;
  overall: LayoutGate;
};

export type RenderedPageVisualAudit = {
  model: "RenderedPageVisualAudit";
  route: string;
  viewport: ViewportName;
  bodyGutter: LayoutGate;
  fullBleedInnerPadding: LayoutGate;
  footerPadding: LayoutGate;
  headerPadding: LayoutGate;
  containerAlignment: LayoutGate;
  textMeasure: LayoutGate;
  verticalRhythm: LayoutGate;
  sectionComposition: LayoutGate;
  horizontalOverflow: number;
  mobile: LayoutGate;
  premiumComposition: LayoutGate;
  failReasons: RenderedLayoutFailReason[];
  designerWouldCallPremium: boolean;
  overall: LayoutGate;
};

export type RenderedLayoutQualityResult = {
  gate: "RenderedLayoutQualityGate";
  global: true;
  creOnly: false;
  spacing: ResponsiveSpacingProfile;
  container: ContainerGeometryProfile;
  composition: SectionCompositionProfile;
  rhythm: SectionRhythmProfile;
  footer: FooterLayoutProfile;
  pages: RenderedPageVisualAudit[];
  failReasons: RenderedLayoutFailReason[];
  bodyGutter: LayoutGate;
  fullBleedInnerPadding: LayoutGate;
  footerPadding: LayoutGate;
  headerPadding: LayoutGate;
  containerAlignment: LayoutGate;
  textMeasure: LayoutGate;
  verticalRhythm: LayoutGate;
  sectionComposition: LayoutGate;
  horizontalOverflow: number;
  mobile: LayoutGate;
  premiumComposition: LayoutGate;
  designerQuestion: string;
  designerWouldCallPremium: boolean;
  overall: LayoutGate;
};

import type { VentureDesignTokens } from "../types";

export function withRenderedLayoutTokens(tokens: VentureDesignTokens): VentureDesignTokens {
  return {
    ...tokens,
    spacing: {
      ...tokens.spacing,
      gutter: tokens.spacing.gutter || "1.5rem",
      gutterTablet: tokens.spacing.gutterTablet ?? "1.25rem",
      gutterMobile: tokens.spacing.gutterMobile ?? "1.25rem",
      footerY: tokens.spacing.footerY ?? "2.5rem",
      headerY: tokens.spacing.headerY ?? "0.75rem",
      cardGap: tokens.spacing.cardGap ?? "1rem",
      visualGap: tokens.spacing.visualGap ?? "1.5rem",
    },
    container: {
      ...tokens.container,
      wide: tokens.container.wide ?? "80rem",
      article: tokens.container.article ?? "42rem",
    },
  };
}

export function canonicalResponsiveSpacingProfile(tokens: VentureDesignTokens): {
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
} {
  const resolved = withRenderedLayoutTokens(tokens);
  return {
    pageGutterDesktop: resolved.spacing.gutter,
    pageGutterTablet: resolved.spacing.gutterTablet ?? "1.25rem",
    pageGutterMobile: resolved.spacing.gutterMobile ?? "1.25rem",
    contentMaxWidth: resolved.container.max,
    wideContentMaxWidth: resolved.container.wide ?? "80rem",
    articleMeasure: resolved.container.article ?? resolved.container.content,
    sectionVerticalSpacing: resolved.spacing.section,
    cardGap: resolved.spacing.cardGap ?? "1rem",
    visualGap: resolved.spacing.visualGap ?? "1.5rem",
    footerPaddingY: resolved.spacing.footerY ?? "2.5rem",
    footerPaddingX: resolved.spacing.gutter,
    headerPaddingY: resolved.spacing.headerY ?? "0.75rem",
  };
}

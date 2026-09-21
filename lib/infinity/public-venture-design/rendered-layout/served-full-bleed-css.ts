import type { VentureDesignTokens } from "../types";
import { withRenderedLayoutTokens } from "./tokens";

const VERTICAL_ONLY_SECTION_PADDING =
  /\.vg-hero,\s*\.vg-section,\s*\.pv-section,\s*\.pv-hero\s*\{\s*padding:\s*var\(--pv-space-section\)\s+0;\s*\}/g;
const OVERLAY_SHORTHAND_SECTION_PADDING =
  /\.vg-hero,\s*\.vg-section,\s*\.pv-section,\s*\.pv-hero\s*\{\s*padding:\s*var\(--pv-space-section\)\s+var\(--pv-gutter-page\);\s*\}/g;

export function servedProductionFullBleedInnerCss(tokens: VentureDesignTokens): string {
  const resolved = withRenderedLayoutTokens(tokens);
  return `
:root {
  --pv-served-full-bleed-inner: 1;
  --pv-gutter-page: ${resolved.spacing.gutter};
  --pv-gutter-tablet: ${resolved.spacing.gutterTablet ?? "1.25rem"};
  --pv-gutter-mobile: ${resolved.spacing.gutterMobile ?? "1.25rem"};
}
.vg-hero, .vg-section, .pv-section, .pv-hero {
  padding-block: var(--pv-space-section);
  padding-inline: var(--pv-gutter-page);
}
.vg-container, .pv-container {
  width: min(100% - (2 * var(--pv-gutter-page)), var(--pv-max));
  max-width: var(--pv-max);
  margin-inline: auto;
  box-sizing: border-box;
}
@media (max-width: 960px) {
  :root { --pv-gutter-page: var(--pv-gutter-tablet); }
}
@media (max-width: 640px) {
  :root { --pv-gutter-page: var(--pv-gutter-mobile); }
}
`;
}

export function replaceConflictingFullBleedPaddingRules(existingCss: string): string {
  const winning = `.vg-hero, .vg-section, .pv-section, .pv-hero {
  padding-block: var(--pv-space-section);
  padding-inline: var(--pv-gutter-page);
}`;
  return existingCss
    .replace(VERTICAL_ONLY_SECTION_PADDING, winning)
    .replace(OVERLAY_SHORTHAND_SECTION_PADDING, winning);
}

export function applyServedProductionFullBleedCss(
  existingCss: string,
  tokens: VentureDesignTokens,
): string {
  const replaced = replaceConflictingFullBleedPaddingRules(existingCss);
  if (replaced.includes("--pv-served-full-bleed-inner") && replaced.includes("padding-inline: var(--pv-gutter-page)")) {
    return replaced;
  }
  return `${replaced}\n${servedProductionFullBleedInnerCss(tokens)}`;
}

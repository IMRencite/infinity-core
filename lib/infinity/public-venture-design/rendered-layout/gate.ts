import { RENDERED_LAYOUT_QUALITY_GATE } from "./constants";
import { auditRenderedLayoutQuality, layoutSourceFromArtifactFiles } from "./geometry";
import type { RenderedLayoutQualityResult } from "./types";

export function auditRenderedLayoutQualityGate(
  files: Array<{ path: string; content: string }>,
): RenderedLayoutQualityResult {
  void RENDERED_LAYOUT_QUALITY_GATE;
  return auditRenderedLayoutQuality(layoutSourceFromArtifactFiles(files));
}

export function renderedLayoutPassesPremiumAuthority(result: RenderedLayoutQualityResult): boolean {
  return (
    result.overall === "PASS" &&
    result.premiumComposition === "PASS" &&
    result.bodyGutter === "PASS" &&
    result.fullBleedInnerPadding === "PASS" &&
    result.footerPadding === "PASS" &&
    result.headerPadding === "PASS" &&
    result.horizontalOverflow === 0
  );
}

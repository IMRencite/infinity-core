/**
 * Build success proves compilation only. Venture launch requires rendered QC evidence.
 */
export const VENTURE_LAUNCH_QC_GATE = "VentureLaunchQCGate" as const;

export const VENTURE_RELEASE_PIPELINE_STAGES = [
  "BUILD_PASS",
  "SOURCE_QC",
  "LOCAL_PREVIEW_RENDER",
  "DESKTOP_VISUAL_QC",
  "TABLET_VISUAL_QC",
  "MOBILE_VISUAL_QC",
  "SCROLL_QC",
  "INTERACTION_QC",
  "CONTENT_QC",
  "RELEASE_CANDIDATE",
  "PRODUCTION_DEPLOY",
  "POST_DEPLOY_VISUAL_VERIFICATION",
  "LIVE_VERIFIED",
  "LIVE_QC_FAILED",
] as const;

export type VentureReleasePipelineStage = (typeof VENTURE_RELEASE_PIPELINE_STAGES)[number];

const ORDER = VENTURE_RELEASE_PIPELINE_STAGES;

export function assertVentureReleaseStageProgression(
  from: VentureReleasePipelineStage,
  to: VentureReleasePipelineStage,
): { ok: boolean; reason: string } {
  const fromIdx = ORDER.indexOf(from);
  const toIdx = ORDER.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return { ok: false, reason: "UNKNOWN_STAGE" };
  if (toIdx <= fromIdx) return { ok: false, reason: "STAGE_REGRESSION_OR_SKIP" };
  if (toIdx - fromIdx > 1 && to !== "LIVE_QC_FAILED") {
    return { ok: false, reason: "STAGE_SKIP_NOT_ALLOWED" };
  }
  return { ok: true, reason: "OK" };
}

export function evaluateVentureLaunchQcBlocking(input: {
  buildPassed: boolean;
  renderedVisualQcPassed: boolean;
  scrollQcPassed: boolean;
  postDeployVisualQcPassed: boolean;
}): {
  gate: typeof VENTURE_LAUNCH_QC_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  launchComplete: boolean;
} {
  const reasons: string[] = [];
  if (input.buildPassed && !input.renderedVisualQcPassed) {
    reasons.push("BUILD_PASS_IS_NOT_VISUAL_PROOF");
  }
  if (!input.renderedVisualQcPassed) reasons.push("RENDERED_VISUAL_QC_REQUIRED");
  if (!input.scrollQcPassed) reasons.push("SCROLL_QC_REQUIRED");
  if (!input.postDeployVisualQcPassed) reasons.push("POST_DEPLOY_VISUAL_QC_REQUIRED");
  return {
    gate: VENTURE_LAUNCH_QC_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    launchComplete: reasons.length === 0,
  };
}

export function productionPromotionBlockedWithoutRenderedQc(input: {
  currentStage: VentureReleasePipelineStage;
  targetStage: VentureReleasePipelineStage;
}): boolean {
  if (input.targetStage !== "PRODUCTION_DEPLOY" && input.targetStage !== "LIVE_VERIFIED") return false;
  const requiredBeforeProd = ORDER.indexOf("MOBILE_VISUAL_QC");
  const currentIdx = ORDER.indexOf(input.currentStage);
  return currentIdx < requiredBeforeProd;
}

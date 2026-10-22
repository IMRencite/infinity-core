export const AUTONOMOUS_VENTURE_RENDER_QUALITY_POLICY_V1 = "AUTONOMOUS_VENTURE_RENDER_QUALITY_POLICY_V1" as const;

export type VentureRenderQcRouteMatrix = {
  venture_id: string;
  routes: Array<{
    path: string;
    profile: import("@/lib/infinity/organic-growth-engine/continuous/rendered-page-quality-v1").RenderPageProfile;
  }>;
};

export const VENTURE_RENDER_QC_ROUTE_MATRIX: VentureRenderQcRouteMatrix[] = [];

/** Build-complete source does not authorize WEBSITE_LIVE without representative browser render PASS. */
export type VentureRenderedQcOutcome = "PASS" | "FAIL" | "FAIL_EVIDENCE_MISSING" | "NOT_RUN";

export function ventureWebsiteLiveAllowed(input: {
  build_complete: boolean;
  venture_rendered_quality_qc: VentureRenderedQcOutcome;
  venture_blog_render_qc?: VentureRenderedQcOutcome;
}): boolean {
  if (!input.build_complete) return false;
  if (input.venture_rendered_quality_qc !== "PASS") return false;
  if (input.venture_blog_render_qc != null && input.venture_blog_render_qc !== "PASS") return false;
  return true;
}

/** New ventures remain blocked until mandatory browser render QC is production-available. */
export const NO_AUTONOMOUS_NEW_VENTURE_WEBSITE_LIVE_WITHOUT_MANDATORY_BROWSER_RENDER_QC = true as const;

export function evaluateBuildFactoryRenderBlocking(input: {
  build_complete: boolean;
  venture_rendered_quality_qc: VentureRenderedQcOutcome;
}): {
  BUILD_FACTORY_RENDER_BLOCKING_REGRESSION_QC: "PASS" | "FAIL";
  WEBSITE_LIVE_ALLOWED: boolean;
} {
  const allowed = ventureWebsiteLiveAllowed({
    build_complete: input.build_complete,
    venture_rendered_quality_qc: input.venture_rendered_quality_qc,
  });
  const renderBlocked =
    input.venture_rendered_quality_qc === "FAIL" || input.venture_rendered_quality_qc === "FAIL_EVIDENCE_MISSING";
  if (input.build_complete && renderBlocked && allowed) {
    return { BUILD_FACTORY_RENDER_BLOCKING_REGRESSION_QC: "FAIL", WEBSITE_LIVE_ALLOWED: false };
  }
  if (input.build_complete && renderBlocked && !allowed) {
    return { BUILD_FACTORY_RENDER_BLOCKING_REGRESSION_QC: "PASS", WEBSITE_LIVE_ALLOWED: false };
  }
  return {
    BUILD_FACTORY_RENDER_BLOCKING_REGRESSION_QC: allowed ? "PASS" : "FAIL",
    WEBSITE_LIVE_ALLOWED: allowed,
  };
}

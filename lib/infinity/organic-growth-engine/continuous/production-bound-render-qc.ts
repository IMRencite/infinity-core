export const PRODUCTION_BOUND_RENDER_QC = "ProductionBoundRenderQc" as const;

export type ProductionBoundLayer = "FIXTURE" | "PREVIEW" | "LIVE";

export type ProductionBoundRenderQcInput = {
  fixture: {
    known_bad_result: "PASS" | "FAIL";
    known_good_result: "PASS" | "FAIL";
  };
  preview?: {
    geometry_result: "PASS" | "FAIL";
    artifact_id?: string | null;
  };
  live?: {
    url: string;
    geometry_result: "PASS" | "FAIL";
    text_collapse: boolean;
    serving_expected_artifact: boolean;
    cache: string | null;
    deployment_id: string | null;
    expected_deployment_id?: string | null;
  };
};

export function evaluateProductionBoundRenderQc(input: ProductionBoundRenderQcInput): {
  gate: typeof PRODUCTION_BOUND_RENDER_QC;
  fixture_gate: "PASS" | "FAIL";
  preview_gate: "PASS" | "FAIL" | "NOT_RUN";
  production_gate: "PASS" | "FAIL";
  live_render_escape: "YES" | "NO";
  qc_gate_effectiveness: "PASS" | "FAIL";
  serving_expected_artifact: "YES" | "NO" | "UNKNOWN";
  reasons: string[];
} {
  const reasons: string[] = [];
  const fixture_gate = input.fixture.known_bad_result === "FAIL" && input.fixture.known_good_result === "PASS"
    ? "PASS"
    : "FAIL";
  if (input.fixture.known_bad_result !== "FAIL") reasons.push("KNOWN_BAD_NOT_REJECTED");
  if (input.fixture.known_good_result !== "PASS") reasons.push("KNOWN_GOOD_NOT_PASSED");

  const preview_gate = input.preview ? input.preview.geometry_result : "NOT_RUN";
  if (!input.preview) reasons.push("PREVIEW_LAYER_NOT_RUN");
  else if (input.preview.geometry_result !== "PASS") reasons.push("PREVIEW_GEOMETRY_FAIL");

  if (!input.live) {
    reasons.push("LIVE_DOMAIN_NOT_VERIFIED");
    reasons.push("FIXTURE_ONLY_INSUFFICIENT_FOR_PRODUCTION");
    return {
      gate: PRODUCTION_BOUND_RENDER_QC,
      fixture_gate,
      preview_gate,
      production_gate: "FAIL",
      live_render_escape: "YES",
      qc_gate_effectiveness: "FAIL",
      serving_expected_artifact: "UNKNOWN",
      reasons,
    };
  }

  const serving = input.live.serving_expected_artifact ? "YES" : "NO";
  if (!input.live.serving_expected_artifact) reasons.push("IS_PRODUCTION_SERVING_EXPECTED_REPAIRED_ARTIFACT:NO");
  if (input.live.geometry_result !== "PASS") reasons.push("LIVE_GEOMETRY_FAIL");
  if (input.live.text_collapse) reasons.push("LIVE_TEXT_COLLAPSE");
  if (
    input.live.expected_deployment_id
    && input.live.deployment_id
    && input.live.deployment_id !== input.live.expected_deployment_id
  ) {
    reasons.push("ARTIFACT_MISMATCH");
  }

  const live_render_escape = fixture_gate === "PASS" && (
    input.live.geometry_result !== "PASS"
    || input.live.text_collapse
    || !input.live.serving_expected_artifact
  );
  if (live_render_escape) {
    reasons.push("LIVE_RENDER_ESCAPE");
    reasons.push("QC_GATE_EFFECTIVENESS:FAIL");
  }

  const production_gate = fixture_gate === "PASS"
    && preview_gate === "PASS"
    && input.live.serving_expected_artifact
    && input.live.geometry_result === "PASS"
    && !input.live.text_collapse
    && !reasons.includes("ARTIFACT_MISMATCH")
    ? "PASS"
    : "FAIL";

  return {
    gate: PRODUCTION_BOUND_RENDER_QC,
    fixture_gate,
    preview_gate,
    production_gate,
    live_render_escape: live_render_escape ? "YES" : "NO",
    qc_gate_effectiveness: live_render_escape || production_gate === "FAIL" ? "FAIL" : "PASS",
    serving_expected_artifact: serving,
    reasons: reasons.length ? reasons : ["FIXTURE_PREVIEW_LIVE_ALIGNED"],
  };
}

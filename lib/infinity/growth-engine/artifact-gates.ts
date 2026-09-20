export const GROWTH_ARTIFACT_ASKREVIEW_ISOLATION_GATE = "GrowthArtifactAskReviewIsolationGate" as const;
export const GROWTH_RUNTIME_UI_INDEPENDENCE_GATE = "GrowthRuntimeUIIndependenceGate" as const;

const ASKREVIEW = /askreview|20260909040000_askreview/i;
const HQ_UI = /components\/dashboard|playwright|hq-visual|operator-console\/.*\.tsx/i;

export function evaluateGrowthArtifactAskReviewIsolationGate(paths: string[]): {
  gate: typeof GROWTH_ARTIFACT_ASKREVIEW_ISOLATION_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  askReviewDependencies: number;
} {
  const hits = paths.filter((path) => ASKREVIEW.test(path));
  return {
    gate: GROWTH_ARTIFACT_ASKREVIEW_ISOLATION_GATE,
    result: hits.length === 0 ? "PASS" : "FAIL",
    reasons: hits.map((path) => `ASKREVIEW_PATH:${path}`),
    askReviewDependencies: hits.length,
  };
}

export function evaluateGrowthRuntimeUIIndependenceGate(paths: string[]): {
  gate: typeof GROWTH_RUNTIME_UI_INDEPENDENCE_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  hqUiDependencies: number;
} {
  const hits = paths.filter((path) => HQ_UI.test(path) || /\.css$/.test(path));
  return {
    gate: GROWTH_RUNTIME_UI_INDEPENDENCE_GATE,
    result: hits.length === 0 ? "PASS" : "FAIL",
    reasons: hits.map((path) => `HQ_UI_PATH:${path}`),
    hqUiDependencies: hits.length,
  };
}

export function classifyOverlayProvenance(path: string): "NEW_GROWTH" | "SHARED_REQUIRED" | "BASELINE_EXISTING" | "EXTRACTED_SHARED" | "UNKNOWN" {
  const normalized = path.replace(/\\/g, "/");
  if (/growth-engine\/(venture-identity|commercial-readiness|published-email|suppression|gmail-path|runtime-tick-auth|runtime-cycle|stale-schedule|artifact-gates)\.ts$/.test(normalized)) {
    return "EXTRACTED_SHARED";
  }
  if (normalized.startsWith("lib/infinity/growth-engine/") || normalized.startsWith("app/api/runtime/")) {
    return "NEW_GROWTH";
  }
  if (
    normalized.startsWith("lib/infinity/research/public-web/")
    || normalized.startsWith("lib/infinity/cloud-runtime/")
    || normalized.startsWith("lib/infinity/prospect-intelligence/")
    || normalized.startsWith("lib/infinity/autonomous-sales-execution/")
    || normalized === "vercel.json"
    || normalized.startsWith(".infinity/growth-engine/")
    || normalized === ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json"
    || normalized === ".infinity/communication-provider/write-verification.json"
  ) {
    return "SHARED_REQUIRED";
  }
  return "UNKNOWN";
}

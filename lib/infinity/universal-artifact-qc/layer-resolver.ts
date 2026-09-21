import {
  ARTIFACT_QC_LAYER_RESOLVER,
  type MaterialArtifactType,
  type QcLayerId,
} from "./contract";

const UI_TYPES = new Set<MaterialArtifactType>([
  "PAGE",
  "COMPONENT",
  "UI_CHANGE",
  "CONTENT_CHANGE",
  "FORM",
  "WORKFLOW",
  "ROUTE",
  "NAVIGATION",
  "FINANCIAL_SURFACE",
  "TREASURY_SURFACE",
  "HQ_SURFACE",
  "PRODUCT_FLOW",
  "RESPONSIVE_CHANGE",
  "DESIGN_SYSTEM_CHANGE",
  "VENTURE_SITE_BUILD",
  "VENTURE_FEATURE",
  "BUG_REPAIR",
]);

const CUSTOMER_CONTENT_TYPES = new Set<MaterialArtifactType>([
  "PAGE",
  "CONTENT_CHANGE",
  "VENTURE_SITE_BUILD",
  "VENTURE_FEATURE",
  "PRODUCT_FLOW",
]);

const FINANCIAL_TYPES = new Set<MaterialArtifactType>([
  "FINANCIAL_SURFACE",
  "TREASURY_SURFACE",
]);

const INTERACTIVE_TYPES = new Set<MaterialArtifactType>([
  "FORM",
  "WORKFLOW",
  "PRODUCT_FLOW",
  "UI_CHANGE",
  "PAGE",
  "VENTURE_FEATURE",
  "ROUTE",
  "NAVIGATION",
  "HQ_SURFACE",
  "FINANCIAL_SURFACE",
  "TREASURY_SURFACE",
]);

export function resolveArtifactQcLayers(artifactType: MaterialArtifactType): QcLayerId[] {
  const layers = new Set<QcLayerId>(["STRUCTURAL"]);

  if (artifactType === "BACKEND_SERVICE" || artifactType === "DATA_PROJECTION_CHANGE") {
    layers.add("FUNCTIONAL");
    layers.add("DATA_STATE");
    if (FINANCIAL_TYPES.has(artifactType) || artifactType === "DATA_PROJECTION_CHANGE") {
      layers.add("SECURITY_GOVERNANCE");
    }
    return [...layers];
  }

  if (artifactType === "STATE_BEHAVIOR_CHANGE") {
    layers.add("FUNCTIONAL");
    layers.add("DATA_STATE");
    layers.add("FINAL_BROWSER");
    return [...layers];
  }

  if (UI_TYPES.has(artifactType)) {
    layers.add("RENDERED");
    layers.add("RESPONSIVE");
    layers.add("FINAL_BROWSER");
  }

  if (INTERACTIVE_TYPES.has(artifactType) && artifactType !== "CONTENT_CHANGE" && artifactType !== "RESPONSIVE_CHANGE") {
    layers.add("FUNCTIONAL");
  }
  if (artifactType === "CONTENT_CHANGE" || artifactType === "RESPONSIVE_CHANGE" || artifactType === "DESIGN_SYSTEM_CHANGE") {
    /* rendered + responsive + browser only unless interactive */
  }

  if (FINANCIAL_TYPES.has(artifactType) || artifactType === "HQ_SURFACE" || artifactType === "FORM") {
    layers.add("DATA_STATE");
  }

  if (CUSTOMER_CONTENT_TYPES.has(artifactType)) {
    layers.add("CONTENT");
  }

  if (
    INTERACTIVE_TYPES.has(artifactType) ||
    artifactType === "RESPONSIVE_CHANGE" ||
    artifactType === "DESIGN_SYSTEM_CHANGE"
  ) {
    layers.add("ACCESSIBILITY");
  }

  if (FINANCIAL_TYPES.has(artifactType) || artifactType === "VENTURE_SITE_BUILD") {
    layers.add("SECURITY_GOVERNANCE");
  }

  return [...layers];
}

export function evaluateArtifactQcLayerResolver(input: {
  artifact_type: MaterialArtifactType;
  resolved: QcLayerId[];
}): { gate: typeof ARTIFACT_QC_LAYER_RESOLVER; result: "PASS" | "FAIL"; reasons: string[] } {
  const expected = resolveArtifactQcLayers(input.artifact_type);
  const missing = expected.filter((layer) => !input.resolved.includes(layer));
  const extraMeaningless =
    input.artifact_type === "BACKEND_SERVICE" && input.resolved.includes("FINAL_BROWSER");
  const reasons = [
    ...missing.map((layer) => `REQUIRED_LAYER_SKIPPED:${layer}`),
    ...(extraMeaningless ? ["MEANINGLESS_RENDERED_QC_FOR_BACKEND"] : []),
  ];
  return {
    gate: ARTIFACT_QC_LAYER_RESOLVER,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

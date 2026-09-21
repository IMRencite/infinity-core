import { PUBLIC_VENTURE_VISUALIZATION_REGISTRY, VISUALIZATION_TYPES } from "./constants";
import type { VisualizationType } from "./types";

export type VisualizationRegistryEntry = {
  visualizationType: VisualizationType;
  reusable: true;
  preferredMedium: "DETERMINISTIC_UI" | "STATIC_IMAGE";
  bestFor: string;
};

const REGISTRY: Record<VisualizationType, VisualizationRegistryEntry> = {
  COMPARISON_METRIC: { visualizationType: "COMPARISON_METRIC", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Two-option numeric contrast" },
  LINE_CHART: { visualizationType: "LINE_CHART", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Cash-flow or trend series" },
  BAR_COMPARISON: { visualizationType: "BAR_COMPARISON", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "NPV or cost stacks" },
  SENSITIVITY_MATRIX: { visualizationType: "SENSITIVITY_MATRIX", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Discount-rate or assumption grids" },
  ROI_SUMMARY: { visualizationType: "ROI_SUMMARY", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Outcome strip" },
  WORKFLOW_DIAGRAM: { visualizationType: "WORKFLOW_DIAGRAM", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Step transformation" },
  PRODUCT_UI_FRAME: { visualizationType: "PRODUCT_UI_FRAME", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Software product mockup" },
  METRIC_STRIP: { visualizationType: "METRIC_STRIP", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Key figures" },
  TIMELINE: { visualizationType: "TIMELINE", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Process or term sequence" },
  FUNNEL: { visualizationType: "FUNNEL", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Stage drop-off when relevant" },
  TABLE: { visualizationType: "TABLE", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Structured comparison or breakdown" },
  CALCULATION_EXAMPLE: { visualizationType: "CALCULATION_EXAMPLE", reusable: true, preferredMedium: "DETERMINISTIC_UI", bestFor: "Labeled illustrative numeric walkthroughs" },
};

export function publicVentureVisualizationRegistry(): typeof REGISTRY {
  void PUBLIC_VENTURE_VISUALIZATION_REGISTRY;
  void VISUALIZATION_TYPES;
  return REGISTRY;
}

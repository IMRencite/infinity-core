import { GILDAN_5000_LARGE_BACK_PROFILE } from "./gelato-gildan5000-large-back-profile";

export type ProviderPlacementEfficiencyQcResult = {
  PROVIDER_PLACEMENT_EFFICIENCY_QC: "PASS" | "FAIL" | "SUBOPTIMAL" | "UNKNOWN";
  ART_CANVAS_WIDTH_RATIO: number;
  ART_CANVAS_HEIGHT_RATIO: number;
  TRANSPARENT_PADDING_RATIO: number;
  EXPECTED_VISIBLE_PRINT_WIDTH_IN: number | null;
  EXPECTED_VISIBLE_PRINT_HEIGHT_IN: number | null;
  EXPECTED_PROVIDER_DPI: number | null;
  reasons: string[];
  rule: string;
};

/** meet fit of canvas into square Gildan 5000 back print area. */
export function expectedMeetMappingInSquarePrintArea(input: {
  canvas_width: number;
  canvas_height: number;
  print_area_mm?: number;
}): {
  EXPECTED_VISIBLE_PRINT_WIDTH_IN: number;
  EXPECTED_VISIBLE_PRINT_HEIGHT_IN: number;
  EXPECTED_PROVIDER_DPI: number;
} {
  const printMm = input.print_area_mm ?? GILDAN_5000_LARGE_BACK_PROFILE.printAreaMm.width;
  const printIn = printMm / 25.4;
  const maxDim = Math.max(input.canvas_width, input.canvas_height);
  const heightIn = (input.canvas_height / maxDim) * printIn;
  const widthIn = (input.canvas_width / maxDim) * printIn;
  const dpi = maxDim / printIn;
  return {
    EXPECTED_VISIBLE_PRINT_WIDTH_IN: Number(widthIn.toFixed(3)),
    EXPECTED_VISIBLE_PRINT_HEIGHT_IN: Number(heightIn.toFixed(3)),
    EXPECTED_PROVIDER_DPI: Number(dpi.toFixed(1)),
  };
}

export function evaluateProviderPlacementEfficiencyQc(input: {
  canvas_width: number;
  canvas_height: number;
  art_bbox: { width: number; height: number };
  print_area_mm?: number;
  fit_method?: "meet";
  /** Optional: compare against Gelato empirical raster ceiling. */
  effective_provider_raster_max?: number;
}): ProviderPlacementEfficiencyQcResult {
  const profile = GILDAN_5000_LARGE_BACK_PROFILE;
  const reasons: string[] = [];
  const fit = input.fit_method ?? profile.fitMethod;
  if (fit !== "meet") reasons.push("unsupported_fit_method");

  const wR = input.art_bbox.width / input.canvas_width;
  const hR = input.art_bbox.height / input.canvas_height;
  const artArea = input.art_bbox.width * input.art_bbox.height;
  const canvasArea = input.canvas_width * input.canvas_height;
  const transparentPadding = 1 - artArea / canvasArea;

  const mapping = expectedMeetMappingInSquarePrintArea({
    canvas_width: input.canvas_width,
    canvas_height: input.canvas_height,
    print_area_mm: input.print_area_mm,
  });

  const artAspect = input.art_bbox.width / Math.max(input.art_bbox.height, 1);
  const visibleArtWidthIn = mapping.EXPECTED_VISIBLE_PRINT_WIDTH_IN * wR;
  const visibleArtHeightIn = mapping.EXPECTED_VISIBLE_PRINT_HEIGHT_IN * hR;

  const minArtOccupancy = profile.placementEfficiencyTargets.minArtAreaFractionOfCanvas;
  const maxPadding = profile.placementEfficiencyTargets.maxTransparentPaddingRatio;
  const minDpi = profile.minimumEffectiveDpi;

  if (wR < profile.placementEfficiencyTargets.minArtWidthRatioOfCanvas) {
    reasons.push("excess_horizontal_transparent_padding");
  }
  if (transparentPadding > maxPadding) {
    reasons.push("transparent_padding_ratio_high");
  }
  if (artArea / canvasArea < minArtOccupancy) {
    reasons.push("art_area_fraction_below_target");
  }
  if (mapping.EXPECTED_PROVIDER_DPI < minDpi) {
    reasons.push("expected_provider_dpi_below_minimum");
  }

  const maxLong = input.effective_provider_raster_max ?? profile.effectiveProviderRasterMax;
  if (Math.max(input.canvas_width, input.canvas_height) > maxLong + 8) {
    reasons.push("canvas_exceeds_empirical_provider_raster_ceiling");
  }

  const commercialWidthIn = profile.visibleArtTargets.widthIn;
  if (visibleArtWidthIn < commercialWidthIn.min) {
    reasons.push("expected_visible_art_width_below_large_back");
  }

  let qc: ProviderPlacementEfficiencyQcResult["PROVIDER_PLACEMENT_EFFICIENCY_QC"] = "PASS";
  if (reasons.length) {
    qc = reasons.some((r) => r.includes("padding") || r.includes("art_area"))
      ? "SUBOPTIMAL"
      : "FAIL";
    if (
      reasons.includes("expected_provider_dpi_below_minimum") ||
      reasons.includes("canvas_exceeds_empirical_provider_raster_ceiling")
    ) {
      qc = "FAIL";
    }
  }

  return {
    PROVIDER_PLACEMENT_EFFICIENCY_QC: qc,
    ART_CANVAS_WIDTH_RATIO: Number(wR.toFixed(4)),
    ART_CANVAS_HEIGHT_RATIO: Number(hR.toFixed(4)),
    TRANSPARENT_PADDING_RATIO: Number(transparentPadding.toFixed(4)),
    EXPECTED_VISIBLE_PRINT_WIDTH_IN: Number(visibleArtWidthIn.toFixed(3)),
    EXPECTED_VISIBLE_PRINT_HEIGHT_IN: Number(visibleArtHeightIn.toFixed(3)),
    EXPECTED_PROVIDER_DPI: mapping.EXPECTED_PROVIDER_DPI,
    reasons,
    rule: profile.providerAssetStrategyRule,
  };
}

export const LOT_LINE_7200_SQUARE_FIXTURE = {
  id: "LOT_LINE_7200_SQUARE",
  canvas_width: 7200,
  canvas_height: 7200,
  art_bbox: { width: 4962, height: 6048 },
} as const;

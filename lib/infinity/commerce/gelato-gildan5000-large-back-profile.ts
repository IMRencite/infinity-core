import { GELATO_GILDAN_5000_BACK_PRINT_AREA_MM } from "./gelato-gildan-5000-print-areas.ts";

/** Provider placement profile — not the clean canonical art master. */
export const GILDAN_5000_LARGE_BACK_PROFILE = {
  profile: "GILDAN_5000_LARGE_BACK",
  placementIntent: "LARGE_BACK" as const,
  printAreaAspectRatio: "1:1" as const,
  printAreaMm: GELATO_GILDAN_5000_BACK_PRINT_AREA_MM,
  /** Empirical Gelato editor ceiling from founder Properties (7200 upload → ~3600 effective). */
  effectiveProviderRasterMax: 3600,
  minimumEffectiveDpi: 300,
  preferredEffectiveDpi: { min: 300, max: 350 },
  fitMethod: "meet" as const,
  providerAssetStrategy: "TIGHT_COMPOSITION_MATCHED" as const,
  providerAssetStrategyRule:
    "MINIMIZE_TRANSPARENT_PADDING_WITHIN_PRINT_AREA_CONSTRAINTS — do not require canvas aspect = print area aspect",
  deprecatedProviderAssetStrategy: "ALWAYS_MATCH_PRINT_AREA_ASPECT_RATIO" as const,
  /** Target template frame in Gelato — not the erroneous 489mm manual stretch. */
  targetTemplateFrameMm: { widthMin: 273, widthMax: 300, heightMin: 273, heightMax: 300 },
  /** Preferred when geometry allows — not a hard fail when height-constrained (see gildan5000-provider-layout-qc). */
  preferredArtWidthRatio: { min: 0.82, max: 0.88, default: 0.85 },
  artWidthRatioTarget: { min: 0.82, max: 0.88, default: 0.85 },
  HEIGHT_CONSTRAINED_WIDTH_FALLBACK: "ALLOWED" as const,
  topClearanceRatio: 0.08,
  bottomClearanceRatio: 0.05,
  sideClearanceRatio: 0.02,
  horizontalCenter: true,
  placementEfficiencyTargets: {
    minArtWidthRatioOfCanvas: 0.88,
    minArtAreaFractionOfCanvas: 0.72,
    maxTransparentPaddingRatio: 0.28,
  },
  visibleArtTargets: {
    /** ~0.82 W/H at full print height → ~7.6–8.0 in width (273mm × 0.82 is height→width in mm, not in). */
    widthIn: { min: 7.5, max: 9.0 },
    heightIn: { min: 9.0, max: 10.75 },
  },
  deprecatedPattern:
    "7200_square_or_3x4_padded_canvas — use tight ~3600px-long-side composition-matched canvas",
  /** Historical square asset — not final provider file. */
  historicalSquareCanvasPixels: { width: 7200, height: 7200 },
} as const;

export const GELATO_GILDAN5000_LARGE_BACK_V1_REL =
  ".infinity/commerce/club-throttle-artwork/ct-lot-line-1/placement-candidates/gelato-gildan5000-large-back-v1.png" as const;

export const GELATO_GILDAN5000_LARGE_BACK_V2_TIGHT_REL =
  ".infinity/commerce/club-throttle-artwork/ct-lot-line-1/placement-candidates/gelato-gildan5000-large-back-v2-tight.png" as const;

export const GELATO_GILDAN5000_LARGE_BACK_V3_ULTRA_TIGHT_REL =
  ".infinity/commerce/club-throttle-artwork/ct-lot-line-1/placement-candidates/gelato-gildan5000-large-back-v3-ultra-tight.png" as const;

export const GELATO_GILDAN5000_CANDIDATE3_FINAL_3600W_REL =
  ".infinity/commerce/club-throttle-artwork/ct-lot-line-1/placement-candidates/gelato-gildan5000-large-back-recreation-candidate-3-final-3600w.png" as const;

export function gildan5000BackPrintWidthInches(): number {
  return GELATO_GILDAN_5000_BACK_PRINT_AREA_MM.width / 25.4;
}

/** Expected provider effective DPI when canvas maps 1:1 to print area via meet. */
export function expectedProviderDpiForSquareCanvas(input: {
  canvasPx: number;
  artPixelWidth: number;
  printAreaWidthMm?: number;
}): {
  EXPECTED_PRINT_WIDTH_IN: number;
  EXPECTED_PROVIDER_DPI: number;
  artWidthFractionOfPrintArea: number;
} {
  const printIn = (input.printAreaWidthMm ?? GELATO_GILDAN_5000_BACK_PRINT_AREA_MM.width) / 25.4;
  const artFrac = input.artPixelWidth / input.canvasPx;
  const printWidthIn = printIn * artFrac;
  const dpi = printWidthIn > 0 ? input.artPixelWidth / printWidthIn : 0;
  return {
    EXPECTED_PRINT_WIDTH_IN: Number(printWidthIn.toFixed(3)),
    EXPECTED_PROVIDER_DPI: Number(dpi.toFixed(1)),
    artWidthFractionOfPrintArea: Number(artFrac.toFixed(4)),
  };
}

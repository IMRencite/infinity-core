/** Separates provider pixel density from native generative detail. */

export const LOT_LINE_NATIVE_SOURCE_DIMENSIONS = "1776x2368" as const;

export type SourceDetailSufficiencyQcResult = {
  SOURCE_DETAIL_SUFFICIENCY_QC:
    | "PASS"
    | "FAIL"
    | "PENDING_PHYSICAL_SAMPLE"
    | "PENDING_FOUNDER"
    | "UNKNOWN";
  NATIVE_SOURCE_DIMENSIONS: typeof LOT_LINE_NATIVE_SOURCE_DIMENSIONS;
  UPSAMPLED_PROVIDER_ASSET: "YES" | "NO";
  UPSAMPLE_METHOD: string | null;
  truthful_statement: string;
  reasons: string[];
};

export function evaluateSourceDetailSufficiencyQc(input: {
  upsampled_provider_asset?: boolean;
  upsample_method?: string | null;
  /** Even when Gelato reports ~300 DPI after swap. */
  provider_effective_dpi_qc?: "PASS" | "FAIL" | "UNKNOWN";
}): SourceDetailSufficiencyQcResult {
  const upsampled = input.upsampled_provider_asset !== false;
  return {
    SOURCE_DETAIL_SUFFICIENCY_QC: upsampled ? "PENDING_PHYSICAL_SAMPLE" : "UNKNOWN",
    NATIVE_SOURCE_DIMENSIONS: LOT_LINE_NATIVE_SOURCE_DIMENSIONS,
    UPSAMPLED_PROVIDER_ASSET: upsampled ? "YES" : "NO",
    UPSAMPLE_METHOD: input.upsample_method ?? (upsampled ? "MULTISTEP_LANCZOS" : null),
    truthful_statement:
      "Provider raster density ~300 DPI using composition-preserving upsample — not native 300 DPI source detail.",
    reasons: upsampled
      ? ["native_grok_1776x2368_interpolation_does_not_recover_absent_detail"]
      : [],
  };
}

import sharp from "sharp";
import { CHECKERBOARD_GRAY_MAX, CHECKERBOARD_GRAY_MIN } from "./club-throttle-founder-mockup";
import { auditBackPlacementBackground, evaluatePrintFileAlphaQcFromAudit } from "./lot-line-back-background-audit";

export type PrintMasterAlphaProof = {
  path: string;
  width: number;
  height: number;
  channels: number;
  has_alpha: boolean;
  transparent_pixel_ratio: number;
  corner_transparent: boolean;
  checkerboard_baked_ratio: number;
  opaque_border_ratio: number;
};

export async function analyzePrintMasterAlpha(printMasterPath: string): Promise<PrintMasterAlphaProof> {
  const meta = await sharp(printMasterPath).metadata();
  const { data, info } = await sharp(printMasterPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let transparent = 0;
  let checker = 0;
  let samples = 0;
  let opaqueBorder = 0;
  let borderSamples = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      samples += 1;
      const o = (y * width + x) * channels;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const a = data[o + 3]!;
      if (a < 16) transparent += 1;
      const neutral = Math.abs(r - g) < 8 && Math.abs(g - b) < 8;
      if (neutral && r >= CHECKERBOARD_GRAY_MIN && r <= CHECKERBOARD_GRAY_MAX && a > 200) checker += 1;
      const onBorder = x < width * 0.08 || x > width * 0.92 || y < height * 0.08 || y > height * 0.92;
      if (onBorder) {
        borderSamples += 1;
        if (a > 240) opaqueBorder += 1;
      }
    }
  }

  function cornerAlpha(cx: number, cy: number): number {
    const o = (cy * width + cx) * channels;
    return data[o + 3]!;
  }

  const corner_transparent =
    cornerAlpha(0, 0) < 16 &&
    cornerAlpha(width - 1, 0) < 16 &&
    cornerAlpha(0, height - 1) < 16 &&
    cornerAlpha(width - 1, height - 1) < 16;

  return {
    path: printMasterPath,
    width,
    height,
    channels,
    has_alpha: meta.hasAlpha === true,
    transparent_pixel_ratio: transparent / Math.max(samples, 1),
    corner_transparent,
    checkerboard_baked_ratio: checker / Math.max(samples, 1),
    opaque_border_ratio: borderSamples ? opaqueBorder / borderSamples : 0,
  };
}

export function evaluatePrintMasterAlphaQc(proof: PrintMasterAlphaProof): {
  gate: "PRINT_MASTER_ALPHA_QC";
  result: "PASS" | "FAIL";
  CHECKERBOARD_BAKED_INTO_PRINT_MASTER: "YES" | "NO";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!proof.has_alpha) reasons.push("missing_alpha_channel");
  if (proof.transparent_pixel_ratio < 0.05) reasons.push("insufficient_transparent_pixels");
  if (!proof.corner_transparent) reasons.push("corners_not_transparent");
  if (proof.checkerboard_baked_ratio > 0.02) reasons.push("checkerboard_baked_into_print_master");
  if (proof.opaque_border_ratio > 0.85) reasons.push("opaque_matte_border_suspected");
  const checkerBaked = proof.checkerboard_baked_ratio > 0.02 ? "YES" : "NO";
  return {
    gate: "PRINT_MASTER_ALPHA_QC",
    result: reasons.length ? "FAIL" : "PASS",
    CHECKERBOARD_BAKED_INTO_PRINT_MASTER: checkerBaked,
    reasons,
  };
}

/**
 * Production PRINT_FILE_ALPHA_QC — full-image audit (not sparse sampling).
 * Sparse analyzePrintMasterAlpha remains for quick diagnostics only.
 */
export async function evaluatePrintFileAlphaQcRobust(pngPath: string): Promise<{
  gate: "PRINT_FILE_ALPHA_QC";
  result: "PASS" | "FAIL";
  CHECKERBOARD_BAKED_INTO_FILE: "YES" | "NO";
  RECTANGULAR_BACKGROUND_PRESENT: "YES" | "NO";
  reasons: string[];
}> {
  const audit = await auditBackPlacementBackground(pngPath);
  const qc = evaluatePrintFileAlphaQcFromAudit(audit);
  return {
    gate: "PRINT_FILE_ALPHA_QC",
    result: qc.PRINT_FILE_ALPHA_QC,
    CHECKERBOARD_BAKED_INTO_FILE: audit.CHECKERBOARD_BAKED_INTO_FILE,
    RECTANGULAR_BACKGROUND_PRESENT: audit.RECTANGULAR_BACKGROUND_PRESENT,
    reasons: qc.reasons,
  };
}

/** Founder-facing assets must not rasterize checkerboard. */
export function evaluateFounderAssetCheckerboardQc(checkerboard_ratio: number): {
  gate: "FOUNDER_ASSET_CHECKERBOARD_QC";
  result: "PASS" | "FAIL";
} {
  return {
    gate: "FOUNDER_ASSET_CHECKERBOARD_QC",
    result: checkerboard_ratio > 0.008 ? "FAIL" : "PASS",
  };
}

import sharp from "sharp";
import { evaluateGarmentContrastQc } from "./garment-contrast-qc.ts";

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Simulated on-white contrast for linework at expected large-back scale. */
export async function evaluatePrintLineWeightQc(pngPath: string): Promise<{
  gate: "PRINT_LINE_WEIGHT_QC";
  result: "PASS" | "FAIL";
  primary_dark_pixels: number;
  primary_mean_on_white_luminance: number;
  PRIMARY_SUBJECT_CONTRAST_ON_WHITE: "PASS" | "FAIL";
  reasons: string[];
}> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + 3]!;
      if (a >= 48) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = (maxX - minX) / 2;
  const ry = (maxY - minY) / 2;

  let primaryDark = 0;
  let onWhiteSum = 0;
  for (let y = minY; y <= maxY; y += 2) {
    for (let x = minX; x <= maxX; x += 2) {
      const nx = rx ? Math.abs(x - cx) / rx : 1;
      const ny = ry ? Math.abs(y - cy) / ry : 1;
      if (Math.max(nx, ny) > 0.72) continue;
      const o = (y * width + x) * channels;
      const a = data[o + 3]!;
      if (a < 96) continue;
      const l = lum(data[o]!, data[o + 1]!, data[o + 2]!);
      const onWhite = l * (a / 255) + 255 * (1 - a / 255);
      if (l < 175) {
        primaryDark += 1;
        onWhiteSum += onWhite;
      }
    }
  }
  const meanOnWhite = primaryDark ? onWhiteSum / primaryDark : 255;
  const contrast = await evaluateGarmentContrastQc(pngPath);
  const reasons: string[] = [];
  if (primaryDark < 9000) reasons.push(`primary_dark_pixels_${primaryDark}`);
  if (meanOnWhite > 185) reasons.push(`primary_mean_on_white_${meanOnWhite.toFixed(2)}`);
  if (contrast.EXPECTED_WHITE_GARMENT_CONTRAST_QC === "FAIL") reasons.push("garment_contrast_fail");

  const primaryPass = meanOnWhite <= 185 && primaryDark >= 9000;
  return {
    gate: "PRINT_LINE_WEIGHT_QC",
    result: reasons.length ? "FAIL" : "PASS",
    primary_dark_pixels: primaryDark,
    primary_mean_on_white_luminance: Number(meanOnWhite.toFixed(2)),
    PRIMARY_SUBJECT_CONTRAST_ON_WHITE: primaryPass ? "PASS" : "FAIL",
    reasons,
  };
}

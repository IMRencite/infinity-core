import sharp from "sharp";
import { isPaleGreenMattePixel } from "./chroma-green-spill-qc.ts";

export type SemiTransparentMatteProof = {
  width: number;
  height: number;
  low_alpha_tinted_pixel_count: number;
  low_alpha_tinted_ratio: number;
  pale_green_matte_pixel_count: number;
  pale_green_matte_ratio: number;
  perimeter_low_alpha_ratio: number;
  FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED: "YES" | "NO";
  rectangular_matte_bbox_coverage: number;
};

export async function analyzeSemiTransparentMatteBackground(pngPath: string): Promise<SemiTransparentMatteProof> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const total = width * height;
  let lowAlphaTinted = 0;
  let paleGreen = 0;
  let perimeterLowAlpha = 0;
  let perimeterSamples = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const a = data[o + 3]!;
      const onPerimeter =
        x < width * 0.06 || x > width * 0.94 || y < height * 0.06 || y > height * 0.94;
      if (onPerimeter) {
        perimeterSamples += 1;
        if (a > 8 && a < 245) perimeterLowAlpha += 1;
      }
      if (a >= 8 && a < 235) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const greenExcess = g - Math.max(r, b);
        // Ignore dark ink anti-aliasing; target pale green matte haze only.
        if (isPaleGreenMattePixel(r, g, b, a) || (greenExcess > 14 && lum > 95 && lum < 248)) {
          lowAlphaTinted += 1;
        }
      }
      if (isPaleGreenMattePixel(r, g, b, a)) paleGreen += 1;
    }
  }

  const low_alpha_tinted_ratio = lowAlphaTinted / total;
  const pale_green_matte_ratio = paleGreen / total;
  const perimeter_low_alpha_ratio = perimeterSamples ? perimeterLowAlpha / perimeterSamples : 0;

  const FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED =
    low_alpha_tinted_ratio > 0.04 || (pale_green_matte_ratio > 0.06 && low_alpha_tinted_ratio > 0.015) ? "YES" : "NO";

  // Rough rectangular matte: high pale-green coverage with subject-sized bbox
  const rectangular_matte_bbox_coverage = pale_green_matte_ratio;

  return {
    width,
    height,
    low_alpha_tinted_pixel_count: lowAlphaTinted,
    low_alpha_tinted_ratio,
    pale_green_matte_pixel_count: paleGreen,
    pale_green_matte_ratio,
    perimeter_low_alpha_ratio,
    FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED,
    rectangular_matte_bbox_coverage,
  };
}

export function evaluateSemiTransparentRectangularMatteQc(proof: SemiTransparentMatteProof): {
  gate: "SEMI_TRANSPARENT_RECTANGULAR_MATTE_QC";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (proof.FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED === "YES") reasons.push("full_canvas_low_alpha_matte");
  if (proof.pale_green_matte_ratio > 0.025) reasons.push(`pale_green_matte_ratio_${proof.pale_green_matte_ratio.toFixed(4)}`);
  if (proof.perimeter_low_alpha_ratio > 0.12) reasons.push(`perimeter_semi_transparent_${proof.perimeter_low_alpha_ratio.toFixed(4)}`);
  if (proof.low_alpha_tinted_ratio > 0.045 && proof.pale_green_matte_ratio > 0.012) {
    reasons.push(`low_alpha_tinted_${proof.low_alpha_tinted_ratio.toFixed(4)}`);
  }
  if (proof.rectangular_matte_bbox_coverage > 0.2 && proof.pale_green_matte_ratio > 0.04) {
    reasons.push("large_chroma_tinted_rectangle");
  }
  return {
    gate: "SEMI_TRANSPARENT_RECTANGULAR_MATTE_QC",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

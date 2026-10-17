import sharp from "sharp";

export type ChromaGreenSpillQcResult = {
  CHROMA_GREEN_SPILL_QC: "PASS" | "FAIL";
  UNINTENTIONAL_GREEN_PIXELS: number;
  unintentional_green_ratio_of_opaque: number;
  green_in_neutral_typography_pixels: number;
  reasons: string[];
};

/** Keyed / matte green — not intentional forest or lime brand ink on dark subjects. */
export function isUnintentionalGreenSpill(r: number, g: number, b: number, a: number): boolean {
  if (a < 24) return false;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const greenExcess = g - Math.max(r, b);
  // Bright chroma key green
  if (greenExcess > 35 && g > 100 && lum > 55) return true;
  // Pale green matte cast
  if (greenExcess > 12 && g > 80 && lum > 140 && lum < 245) return true;
  // Green haze in nominally white/neutral type
  if (lum > 175 && greenExcess > 8 && g > r + 6 && g > b + 4) return true;
  // Semi-transparent green tint
  if (a < 220 && greenExcess > 10 && g > 70) return true;
  return false;
}

export function isPaleGreenMattePixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 8) return false;
  const greenExcess = g - Math.max(r, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return greenExcess > 8 && g > 60 && lum >= 90 && lum <= 250;
}

export async function analyzeChromaGreenSpillFromPath(pngPath: string): Promise<{
  unintentional_green: number;
  green_in_neutral_typography: number;
  opaque: number;
}> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let unintentional_green = 0;
  let green_in_neutral_typography = 0;
  let opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const a = data[o + 3]!;
      if (a < 40) continue;
      opaque += 1;
      if (isUnintentionalGreenSpill(r, g, b, a)) unintentional_green += 1;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > 160 && isUnintentionalGreenSpill(r, g, b, a)) green_in_neutral_typography += 1;
    }
  }
  return { unintentional_green, green_in_neutral_typography, opaque };
}

export async function evaluateChromaGreenSpillQc(pngPath: string): Promise<ChromaGreenSpillQcResult> {
  const { unintentional_green, green_in_neutral_typography, opaque } = await analyzeChromaGreenSpillFromPath(pngPath);
  const ratio = opaque ? unintentional_green / opaque : 0;
  const reasons: string[] = [];
  if (unintentional_green > 0) reasons.push(`unintentional_green_pixels_${unintentional_green}`);
  if (ratio > 0.00005) reasons.push(`green_ratio_${ratio.toFixed(6)}`);
  if (green_in_neutral_typography > 0) reasons.push(`green_in_neutral_typography_${green_in_neutral_typography}`);
  const fail = unintentional_green > 0 || green_in_neutral_typography > 0;
  return {
    CHROMA_GREEN_SPILL_QC: fail ? "FAIL" : "PASS",
    UNINTENTIONAL_GREEN_PIXELS: unintentional_green,
    unintentional_green_ratio_of_opaque: Number(ratio.toFixed(6)),
    green_in_neutral_typography_pixels: green_in_neutral_typography,
    reasons,
  };
}

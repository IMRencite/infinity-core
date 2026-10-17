import { readFileSync } from "node:fs";
import sharp from "sharp";
import { isPaleGreenMattePixel, isUnintentionalGreenSpill } from "./chroma-green-spill-qc.ts";

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function neutralInkFromRgb(r: number, g: number, b: number, a: number): { r: number; g: number; b: number; a: number } | null {
  if (a < 12) return { r: 0, g: 0, b: 0, a: 0 };
  const greenExcess = g - Math.max(r, b);
  const lum = luminance(r, g, b);
  if (isPaleGreenMattePixel(r, g, b, a)) return null;
  if (isUnintentionalGreenSpill(r, g, b, a) && lum > 95) return null;
  if (greenExcess > 22 && lum > 85) return null;

  const gAdj = Math.min(g, Math.max(r, b) + Math.max(4, greenExcess * 0.15));
  const lumN = luminance(r, gAdj, b);
  const ink = 1 - lumN / 255;
  if (ink < 0.06) return null;
  const gray = Math.round(255 * (1 - Math.min(0.94, ink * 0.98)));
  const outA = Math.round(Math.min(255, a * Math.min(1, ink * 1.35 + 0.15)));
  if (outA < 24) return null;
  return { r: gray, g: gray, b: gray, a: outA };
}

/**
 * Convert chroma-contaminated line art to neutral charcoal linework — no generic key flood.
 */
export async function reconstructKneeDownNeutralLineArt(input: {
  structuralSourcePath: string;
  destPath: string;
}): Promise<{ width: number; height: number }> {
  const src = readFileSync(input.structuralSourcePath);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const mapped = neutralInkFromRgb(data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!);
      if (!mapped) {
        data[o + 3] = 0;
        continue;
      }
      data[o] = mapped.r;
      data[o + 1] = mapped.g;
      data[o + 2] = mapped.b;
      data[o + 3] = mapped.a;
    }
  }

  const out = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  await sharp(out).png().toFile(input.destPath);
  return { width, height };
}

export async function evaluateKneeDownNeutralPaletteQc(pngPath: string): Promise<{
  gate: "KNEE_DOWN_NEUTRAL_PALETTE_QC";
  result: "PASS" | "FAIL";
  non_neutral_subject_pixels: number;
  reasons: string[];
}> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let bad = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const a = data[o + 3]!;
      if (a < 40) continue;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (chroma > 18) bad += 1;
      if (g > r + 8 && g > b + 8) bad += 1;
    }
  }
  const reasons = bad > 0 ? [`non_neutral_subject_pixels_${bad}`] : [];
  return { gate: "KNEE_DOWN_NEUTRAL_PALETTE_QC", result: reasons.length ? "FAIL" : "PASS", non_neutral_subject_pixels: bad, reasons };
}

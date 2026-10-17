import sharp from "sharp";
import { isPaleGreenMattePixel, isUnintentionalGreenSpill } from "./chroma-green-spill-qc.ts";

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isStructuralInk(r: number, g: number, b: number, a: number): boolean {
  if (a < 48) return false;
  if (isPaleGreenMattePixel(r, g, b, a)) return false;
  if (isUnintentionalGreenSpill(r, g, b, a)) return false;
  return luminance(r, g, b) < 235;
}

export async function countStructuralInkPixels(pngPath: string): Promise<number> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      if (isStructuralInk(data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!)) n += 1;
    }
  }
  return n;
}

/** Stacked phrase: ink in upper + lower central bands. */
export async function countCleanRpmTypographyBandInk(pngPath: string): Promise<{ upper: number; lower: number; total: number }> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const x0 = Math.floor(width * 0.12);
  const x1 = Math.floor(width * 0.88);
  const mid = Math.floor(height * 0.52);
  const upperY1 = Math.floor(height * 0.48);
  const lowerY0 = Math.floor(height * 0.48);
  const lowerY1 = Math.floor(height * 0.92);
  let upper = 0;
  let lower = 0;
  for (let y = 0; y < height; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * width + x) * channels;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const a = data[o + 3]!;
      if (a < 64 || luminance(r, g, b) > 120) continue;
      if (y < upperY1 && y > height * 0.08) upper += 1;
      if (y >= lowerY0 && y < lowerY1) lower += 1;
    }
  }
  return { upper, lower, total: upper + lower };
}

export async function evaluateDesignContentRetentionQc(input: {
  structuralSourcePath: string;
  candidatePath: string;
  mode: "CLEANUP_COMPARISON" | "CLEAN_RPM_TYPOGRAPHY_REBUILD";
}): Promise<{
  gate: "DESIGN_CONTENT_RETENTION_QC";
  result: "PASS" | "FAIL";
  structural_ink_pixels: number;
  candidate_ink_pixels: number;
  retention_ratio: number;
  clean_rpm_bands?: { upper: number; lower: number };
  reasons: string[];
}> {
  const reasons: string[] = [];
  const structural = await countStructuralInkPixels(input.structuralSourcePath);
  const candidate = await countStructuralInkPixels(input.candidatePath);
  const ratio = structural ? candidate / structural : 0;

  if (input.mode === "CLEANUP_COMPARISON") {
    if (ratio < 0.55) reasons.push(`content_retention_ratio_${ratio.toFixed(4)}`);
    const bands = await countCleanRpmTypographyBandInk(input.candidatePath);
    if (bands.upper < 800 || bands.lower < 800) reasons.push("typography_band_ink_collapsed");
  } else {
    const bands = await countCleanRpmTypographyBandInk(input.candidatePath);
    if (bands.upper < 1200) reasons.push(`clean_line_band_ink_low_${bands.upper}`);
    if (bands.lower < 1200) reasons.push(`rpm_line_band_ink_low_${bands.lower}`);
    if (bands.total < 3500) reasons.push(`total_typography_ink_low_${bands.total}`);
  }

  return {
    gate: "DESIGN_CONTENT_RETENTION_QC",
    result: reasons.length ? "FAIL" : "PASS",
    structural_ink_pixels: structural,
    candidate_ink_pixels: candidate,
    retention_ratio: Number(ratio.toFixed(4)),
    clean_rpm_bands:
      input.mode === "CLEAN_RPM_TYPOGRAPHY_REBUILD"
        ? await countCleanRpmTypographyBandInk(input.candidatePath)
        : undefined,
    reasons,
  };
}

import sharp from "sharp";
import { analyzeApparelSubjectOccupancyFromPath } from "./apparel-subject-occupancy-analysis.ts";
import { isUnintentionalGreenSpill } from "./chroma-green-spill-qc.ts";

function isKeyedCyanMagenta(r: number, g: number, b: number, a: number): boolean {
  if (a < 32) return false;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum < 55) return false;
  if (g > 180 && b > 180 && r < 90) return true;
  const magentaExcess = r - Math.max(g, b);
  // Intentional warm red accents (Club Throttle) are not chroma-key spill.
  if (r > 120 && g < 95 && b < 95) return false;
  if (magentaExcess > 32 && r > 80 && b > g * 0.85 && g < 120) return true;
  return false;
}

export async function evaluateSubjectPaletteContaminationQc(pngPath: string): Promise<{
  gate: "SUBJECT_PALETTE_CONTAMINATION_QC";
  result: "PASS" | "FAIL";
  GREEN_SUBJECT_CONTAMINATION_PIXELS: number;
  keyed_subject_pixels: number;
  subject_pixels_sampled: number;
  reasons: string[];
}> {
  const analysis = await analyzeApparelSubjectOccupancyFromPath(pngPath);
  const bbox = analysis.SUBJECT_BBOX ?? analysis.ALPHA_ART_BBOX;
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (!bbox) {
    return {
      gate: "SUBJECT_PALETTE_CONTAMINATION_QC",
      result: "FAIL",
      GREEN_SUBJECT_CONTAMINATION_PIXELS: 0,
      keyed_subject_pixels: 0,
      subject_pixels_sampled: 0,
      reasons: ["subject_bbox_missing"],
    };
  }

  let green = 0;
  let keyed = 0;
  let sampled = 0;
  for (let y = bbox.top; y < bbox.top + bbox.height; y += 1) {
    for (let x = bbox.left; x < bbox.left + bbox.width; x += 1) {
      const o = (y * width + x) * channels;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const a = data[o + 3]!;
      if (a < 40) continue;
      sampled += 1;
      if (isUnintentionalGreenSpill(r, g, b, a)) green += 1;
      if (isKeyedCyanMagenta(r, g, b, a)) keyed += 1;
    }
  }

  const reasons: string[] = [];
  if (green > 0) reasons.push(`green_subject_contamination_${green}`);
  if (keyed > 64) reasons.push(`keyed_subject_contamination_${keyed}`);
  if (sampled > 0 && green / sampled > 0.0001) reasons.push(`green_subject_ratio_${(green / sampled).toFixed(6)}`);

  return {
    gate: "SUBJECT_PALETTE_CONTAMINATION_QC",
    result: reasons.length ? "FAIL" : "PASS",
    GREEN_SUBJECT_CONTAMINATION_PIXELS: green,
    keyed_subject_pixels: keyed,
    subject_pixels_sampled: sampled,
    reasons,
  };
}

import sharp from "sharp";

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function evaluateGarmentContrastQc(pngPath: string): Promise<{
  gate: "GARMENT_CONTRAST_QC";
  EXPECTED_WHITE_GARMENT_CONTRAST_QC: "PASS" | "FAIL";
  PRIMARY_CONTENT_VISIBLE_ON_WHITE: "YES" | "NO";
  visible_dark_pixels_on_white: number;
  content_pixels_on_white: number;
  mean_content_luminance_on_white: number;
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
      const o = (y * width + x) * channels;
      if (data[o + 3]! >= 48) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX) {
    return {
      gate: "GARMENT_CONTRAST_QC",
      EXPECTED_WHITE_GARMENT_CONTRAST_QC: "FAIL",
      PRIMARY_CONTENT_VISIBLE_ON_WHITE: "NO",
      visible_dark_pixels_on_white: 0,
      content_pixels_on_white: 0,
      mean_content_luminance_on_white: 255,
      reasons: ["no_visible_content"],
    };
  }

  let dark = 0;
  let content = 0;
  let lumSum = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const o = (y * width + x) * channels;
      const a = data[o + 3]!;
      if (a < 48) continue;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const fgLum = luminance(r, g, b);
      const alpha = a / 255;
      const onWhiteLum = fgLum * alpha + 255 * (1 - alpha);
      content += 1;
      lumSum += onWhiteLum;
      if (onWhiteLum < 200) dark += 1;
    }
  }

  const meanLum = content ? lumSum / content : 255;
  const reasons: string[] = [];
  if (dark < 2500) reasons.push(`visible_dark_pixels_on_white_${dark}`);
  if (meanLum > 215) reasons.push(`mean_content_too_light_${meanLum.toFixed(2)}`);
  const pass = reasons.length === 0;

  return {
    gate: "GARMENT_CONTRAST_QC",
    EXPECTED_WHITE_GARMENT_CONTRAST_QC: pass ? "PASS" : "FAIL",
    PRIMARY_CONTENT_VISIBLE_ON_WHITE: pass ? "YES" : "NO",
    visible_dark_pixels_on_white: dark,
    content_pixels_on_white: content,
    mean_content_luminance_on_white: Number(meanLum.toFixed(2)),
    reasons,
  };
}

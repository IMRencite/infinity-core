import sharp from "sharp";

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function darkInkStats(pngPath: string): Promise<{ dark_pixels: number; mean_luminance: number }> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let dark = 0;
  let lumSum = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const o = (y * width + x) * channels;
      const a = data[o + 3]!;
      if (a < 96) continue;
      const l = lum(data[o]!, data[o + 1]!, data[o + 2]!);
      if (l > 165) continue;
      dark += 1;
      lumSum += l;
    }
  }
  return { dark_pixels: dark, mean_luminance: dark ? lumSum / dark : 255 };
}

/** Ensures provider raster retains master linework density and darkness. */
export async function evaluateFineLinePrintVisibilityQc(input: {
  printMasterPath: string;
  providerPngPath: string;
}): Promise<{
  gate: "FINE_LINE_PRINT_VISIBILITY_QC";
  result: "PASS" | "FAIL";
  master_dark_pixels: number;
  provider_dark_pixels: number;
  dark_pixel_retention_ratio: number;
  provider_mean_dark_luminance: number;
  reasons: string[];
}> {
  const master = await darkInkStats(input.printMasterPath);
  const provider = await darkInkStats(input.providerPngPath);
  const ratio = master.dark_pixels ? provider.dark_pixels / master.dark_pixels : 0;
  const reasons: string[] = [];
  if (ratio < 0.82) reasons.push(`dark_pixel_retention_${ratio.toFixed(4)}`);
  if (provider.mean_luminance > 130) reasons.push(`provider_linework_too_light_${provider.mean_luminance.toFixed(2)}`);
  if (provider.dark_pixels < 12000) reasons.push(`provider_dark_pixels_${provider.dark_pixels}`);

  return {
    gate: "FINE_LINE_PRINT_VISIBILITY_QC",
    result: reasons.length ? "FAIL" : "PASS",
    master_dark_pixels: master.dark_pixels,
    provider_dark_pixels: provider.dark_pixels,
    dark_pixel_retention_ratio: Number(ratio.toFixed(4)),
    provider_mean_dark_luminance: Number(provider.mean_luminance.toFixed(2)),
    reasons,
  };
}

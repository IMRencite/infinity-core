import { BRAND_ASSET_CONTRAST_GATE } from "./venture-brand-presentation-contract";

export { BRAND_ASSET_CONTRAST_GATE };

export type RgbaSample = { r: number; g: number; b: number; a: number };

/** Wordmark band: right portion of hero logo where text lives on IMROS asset. */
export function sampleWordmarkBandPixels(input: {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  xStartRatio?: number;
}): RgbaSample[] {
  const xStart = Math.floor(input.width * (input.xStartRatio ?? 0.42));
  const yStart = Math.floor(input.height * 0.22);
  const yEnd = Math.floor(input.height * 0.58);
  const out: RgbaSample[] = [];
  for (let y = yStart; y < yEnd; y += 3) {
    for (let x = xStart; x < input.width; x += 3) {
      const i = (y * input.width + x) * 4;
      const a = input.rgba[i + 3];
      if (a < 80) continue;
      out.push({
        r: input.rgba[i],
        g: input.rgba[i + 1],
        b: input.rgba[i + 2],
        a,
      });
    }
  }
  return out;
}

export function averageLuminance(samples: RgbaSample[]): number {
  if (samples.length === 0) return 0;
  const sum = samples.reduce((acc, px) => acc + 0.2126 * px.r + 0.7152 * px.g + 0.0722 * px.b, 0);
  return sum / samples.length;
}

export function evaluateBrandAssetContrastGate(input: {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  darkBackgroundRgb?: { r: number; g: number; b: number };
  minWordmarkLuminanceOnDark?: number;
}): {
  gate: typeof BRAND_ASSET_CONTRAST_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  wordmarkLuminance: number;
} {
  const samples = sampleWordmarkBandPixels(input);
  const lums = samples.map((px) => 0.2126 * px.r + 0.7152 * px.g + 0.0722 * px.b).sort((a, b) => a - b);
  const lum = averageLuminance(samples);
  const p70 = lums.length ? lums[Math.floor(lums.length * 0.7)] : 0;
  const min = input.minWordmarkLuminanceOnDark ?? 175;
  const reasons: string[] = [];
  if (samples.length < 40) reasons.push("INSUFFICIENT_WORDMARK_SAMPLES");
  if (p70 < min) reasons.push(`DARK_WORDMARK_ON_DARK_BG:${Math.round(p70)}`);
  return {
    gate: BRAND_ASSET_CONTRAST_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    wordmarkLuminance: Math.round(lum * 10) / 10,
  };
}

/** Regression fixture: unreadable dark wordmark on navy. */
export function darkWordmarkContrastFixture(): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(400 * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 18;
    rgba[i + 1] = 22;
    rgba[i + 2] = 30;
    rgba[i + 3] = 255;
  }
  return rgba;
}

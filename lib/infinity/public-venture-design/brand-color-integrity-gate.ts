import { BRAND_COLOR_INTEGRITY_GATE } from "./venture-brand-presentation-contract";

export type Rgba = { r: number; g: number; b: number; a: number };

/** Blue/cyan infinity symbol family (IMROS primary icon). */
export function isImrosInfinitySymbolPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 35) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 45) return false;
  if (max > 200 && max - min < 35) return false;
  if (max - min < 85 && lum(r, g, b) < 150) return false;
  const blueLead = b >= r + 12 && b >= g + 4;
  const cyanLead = g >= r + 8 && b >= r + 10 && g > 90;
  const brightGlow = max > 170 && b >= g + 6 && b >= r + 10;
  const deepBlue = b > 80 && b > r + 25 && lum(r, g, b) < 120;
  return blueLead || cyanLead || brightGlow || deepBlue;
}

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isNearWhiteContamination(r: number, g: number, b: number, a: number): boolean {
  if (a < 80) return false;
  return r > 210 && g > 210 && b > 210;
}

/** Symbol bounding band on IMROS hero logo (left icon + glow). */
export function sampleSymbolRegionPixels(input: {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  xEndRatio?: number;
}): Rgba[] {
  const xEnd = Math.floor(input.width * (input.xEndRatio ?? 0.52));
  const out: Rgba[] = [];
  for (let y = 0; y < input.height; y += 2) {
    for (let x = 0; x < xEnd; x += 2) {
      const i = (y * input.width + x) * 4;
      const px = {
        r: input.rgba[i],
        g: input.rgba[i + 1],
        b: input.rgba[i + 2],
        a: input.rgba[i + 3],
      };
      if (isImrosInfinitySymbolPixel(px.r, px.g, px.b, px.a)) out.push(px);
    }
  }
  return out;
}

export function evaluateBrandColorIntegrityGate(input: {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  referenceRgba?: Uint8ClampedArray;
  symbolMask?: Uint8Array;
}): {
  gate: typeof BRAND_COLOR_INTEGRITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  whiteContaminationInSymbol: number;
  symbolPixelParityPct: number | null;
} {
  const ref = input.referenceRgba;
  let whiteInSymbol = 0;
  let symbolSamples = 0;
  let parityMatch = 0;
  let parityTotal = 0;

  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const idx = y * input.width + x;
      const i = idx * 4;
      const r = input.rgba[i];
      const g = input.rgba[i + 1];
      const b = input.rgba[i + 2];
      const a = input.rgba[i + 3];
      const refIsSymbol =
        ref && ref.length === input.rgba.length
          ? isImrosInfinitySymbolPixel(ref[i], ref[i + 1], ref[i + 2], ref[i + 3])
          : isImrosInfinitySymbolPixel(r, g, b, a);
      if (!refIsSymbol) continue;
      symbolSamples += 1;
      if (isNearWhiteContamination(r, g, b, a)) {
        whiteInSymbol += 1;
      }
      if (ref && ref.length === input.rgba.length) {
        parityTotal += 1;
        const dr = Math.abs(r - ref[i]);
        const dg = Math.abs(g - ref[i + 1]);
        const db = Math.abs(b - ref[i + 2]);
        if (dr + dg + db <= 24) parityMatch += 1;
      }
    }
  }

  const reasons: string[] = [];
  const minSamples = input.width >= 800 ? 200 : 40;
  if (symbolSamples < minSamples) reasons.push("INSUFFICIENT_SYMBOL_SAMPLES");
  if (whiteInSymbol > 0) reasons.push(`WHITE_CONTAMINATION_IN_SYMBOL:${whiteInSymbol}`);

  const parityPct = parityTotal > 0 ? Math.round((parityMatch / parityTotal) * 1000) / 10 : null;
  if (parityPct !== null && parityPct < 97) {
    reasons.push(`SYMBOL_PIXEL_PARITY_LOW:${parityPct}%`);
  }

  return {
    gate: BRAND_COLOR_INTEGRITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    whiteContaminationInSymbol: whiteInSymbol,
    symbolPixelParityPct: parityPct,
  };
}

/** Flood-fill symbol protection from blue/cyan seeds (reference image). */
export function buildSymbolMaskFromReference(input: {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}): Uint8Array {
  const { width, height, rgba } = input;
  const mask = new Uint8Array(width * height);
  const queue: number[] = [];
  const seedXMax = Math.floor(width * 0.48);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x <= seedXMax; x += 1) {
      const idx = y * width + x;
      const i = idx * 4;
      if (isImrosInfinitySymbolPixel(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])) {
        mask[idx] = 1;
        queue.push(idx);
      }
    }
  }

  const neighbors = [-1, 1, -width, width];
  while (queue.length > 0) {
    const idx = queue.pop()!;
    const x = idx % width;
    const y = (idx / width) | 0;
    for (const d of neighbors) {
      const n = idx + d;
      if (n < 0 || n >= mask.length) continue;
      const nx = n % width;
      const ny = (n / width) | 0;
      if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
      if (nx > Math.floor(width * 0.56)) continue;
      if (mask[n]) continue;
      const i = n * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      const a = rgba[i + 3];
      if (a < 25) continue;
      if (isImrosInfinitySymbolPixel(r, g, b, a)) {
        mask[n] = 1;
        queue.push(n);
      }
    }
  }
  return mask;
}

function isDarkWordmarkPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 80) return false;
  return lum(r, g, b) < 95 && Math.max(r, g, b) - Math.min(r, g, b) < 40;
}

/** Regression: white contamination inside protected blue symbol region. */
export function whiteBleedSymbolFixture(): {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  referenceRgba: Uint8ClampedArray;
} {
  const width = 120;
  const height = 40;
  const referenceRgba = new Uint8ClampedArray(width * height * 4);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < 50; x += 1) {
      const i = (y * width + x) * 4;
      referenceRgba[i] = 40;
      referenceRgba[i + 1] = 120;
      referenceRgba[i + 2] = 240;
      referenceRgba[i + 3] = 255;
      rgba[i] = referenceRgba[i];
      rgba[i + 1] = referenceRgba[i + 1];
      rgba[i + 2] = referenceRgba[i + 2];
      rgba[i + 3] = referenceRgba[i + 3];
      if (x > 32 && x < 46 && y > 12 && y < 26) {
        rgba[i] = 255;
        rgba[i + 1] = 255;
        rgba[i + 2] = 255;
      }
    }
  }
  return { width, height, rgba, referenceRgba };
}

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";

export const SELECTIVE_DARK_GARMENT_KEYLINE_V1 = "SELECTIVE_DARK_GARMENT_KEYLINE_V1" as const;

export type KeylineStyle = "warm_off_white" | "cool_light_gray" | "design_warm_gray";

const KEYLINE_RGB: Record<KeylineStyle, [number, number, number]> = {
  warm_off_white: [232, 228, 220],
  cool_light_gray: [210, 214, 220],
  design_warm_gray: [218, 212, 200],
};

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Print-normalized exterior stroke width (not a fixed pixel count across asset sizes). */
export function normalizedKeylineWidthPx(width: number, height: number, factor = 1): number {
  const base = Math.max(2, Math.min(7, Math.round(Math.min(width, height) * 0.0016)));
  return Math.max(2, Math.min(8, Math.round(base * factor)));
}

function alphaAt(data: Buffer, w: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= w) return 0;
  const h = data.length / (w * 4);
  if (y >= h) return 0;
  return data[(y * w + x) * 4 + 3]!;
}

/** Contour-aware exterior keyline on alpha boundary — no full-canvas or rectangular plate. */
export async function applySelectiveDarkGarmentKeylineV1(input: {
  sourcePath: string;
  destPath: string;
  style?: KeylineStyle;
  strokeWidthPx?: number;
  /** Lift only pixels on the art exterior boundary (never global threshold lift). */
  localEdgeLiftMax?: number;
  /** Silhouette-adjacent clarification depth (px) — not global brightness. */
  silhouetteClarifyDepthPx?: number;
  silhouetteClarifyMax?: number;
}): Promise<{ ok: true; sha256: string; keyline_pixels: number } | { ok: false; reason: string }> {
  if (!existsSync(input.sourcePath)) return { ok: false, reason: "SOURCE_MISSING" };
  const { data, info } = await sharp(input.sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const out = Buffer.from(data);
  const stroke =
    input.strokeWidthPx ?? normalizedKeylineWidthPx(w, h);
  const [kr, kg, kb] = KEYLINE_RGB[input.style ?? "warm_off_white"];
  const opaqueThreshold = 200;
  const transparentThreshold = 32;

  const distToArt = new Int16Array(w * h);
  distToArt.fill(32767);
  const queue: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = alphaAt(data, w, x, y);
      if (a >= opaqueThreshold) continue;
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const;
      for (const [nx, ny] of neighbors) {
        if (alphaAt(data, w, nx, ny) >= opaqueThreshold) {
          const idx = y * w + x;
          distToArt[idx] = 0;
          queue.push(idx);
          break;
        }
      }
    }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const idx = queue[qi]!;
    const d = distToArt[idx]!;
    if (d >= stroke) continue;
    const x = idx % w;
    const y = Math.floor(idx / w);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ] as const) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nidx = ny * w + nx;
      if (distToArt[nidx]! <= d + 1) continue;
      if (alphaAt(data, w, nx, ny) >= opaqueThreshold) continue;
      distToArt[nidx] = d + 1;
      queue.push(nidx);
    }
  }

  let keylinePixels = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const d = distToArt[idx]!;
      if (d < 0 || d >= stroke) continue;
      const i = idx * 4;
      const existingA = out[i + 3]!;
      if (existingA >= opaqueThreshold) continue;
      const t = 1 - d / stroke;
      const blend = 0.72 + 0.25 * t;
      out[i] = Math.round(kr * blend + (existingA > transparentThreshold ? out[i]! : 0) * (1 - blend));
      out[i + 1] = Math.round(kg * blend + (existingA > transparentThreshold ? out[i + 1]! : 0) * (1 - blend));
      out[i + 2] = Math.round(kb * blend + (existingA > transparentThreshold ? out[i + 2]! : 0) * (1 - blend));
      out[i + 3] = Math.max(existingA, Math.round(255 * (0.92 + 0.08 * t)));
      keylinePixels += 1;
    }
  }

  const edgeLift = input.localEdgeLiftMax ?? 0;
  const clarifyMax = input.silhouetteClarifyMax ?? 0;
  if (clarifyMax > 0) {
    applySilhouetteAdjacentClarification(out, w, h, clarifyMax, input.silhouetteClarifyDepthPx ?? 3);
  }

  if (edgeLift > 0) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (out[i + 3]! < opaqueThreshold) continue;
        let onBoundary = false;
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ] as const) {
          if (alphaAt(out, w, nx, ny) < transparentThreshold) {
            onBoundary = true;
            break;
          }
        }
        if (!onBoundary) continue;
        const r = out[i]!;
        const g = out[i + 1]!;
        const b = out[i + 2]!;
        const l = lum(r, g, b);
        if (l >= 55) continue;
        const add = Math.round(edgeLift * (1 - l / 55));
        out[i] = Math.min(255, r + add);
        out[i + 1] = Math.min(255, g + add);
        out[i + 2] = Math.min(255, b + add);
      }
    }
  }

  mkdirSync(dirname(input.destPath), { recursive: true });
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(input.destPath);
  const sha256 = (await import("node:crypto")).createHash("sha256").update(readFileSync(input.destPath)).digest("hex");
  return { ok: true, sha256, keyline_pixels: keylinePixels };
}

/** Clarify only silhouette-adjacent dark pixels (interior deep shadows unchanged). */
export function applySilhouetteAdjacentClarification(
  data: Buffer,
  w: number,
  h: number,
  maxLift: number,
  depthPx = 3,
): void {
  const transparentThreshold = 32;
  const opaqueThreshold = 200;
  const out = data;
  const distExterior = new Int16Array(w * h);
  distExterior.fill(32767);
  const queue: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = alphaAt(out, w, x, y);
      if (a < opaqueThreshold) continue;
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const) {
        if (alphaAt(out, w, nx, ny) < transparentThreshold) {
          const idx = y * w + x;
          distExterior[idx] = 0;
          queue.push(idx);
          break;
        }
      }
    }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const idx = queue[qi]!;
    const d = distExterior[idx]!;
    if (d >= depthPx) continue;
    const x = idx % w;
    const y = Math.floor(idx / w);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ] as const) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nidx = ny * w + nx;
      if (alphaAt(out, w, nx, ny) < opaqueThreshold) continue;
      if (distExterior[nidx]! <= d + 1) continue;
      distExterior[nidx] = d + 1;
      queue.push(nidx);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const d = distExterior[idx]!;
      if (d < 0 || d > depthPx) continue;
      const i = idx * 4;
      if (out[i + 3]! < opaqueThreshold) continue;
      const r = out[i]!;
      const g = out[i + 1]!;
      const b = out[i + 2]!;
      const l = lum(r, g, b);
      if (l >= 52) continue;
      const t = 1 - d / (depthPx + 1);
      const add = Math.round(maxLift * t * (1 - l / 52));
      out[i] = Math.min(255, r + add);
      out[i + 1] = Math.min(255, g + add);
      out[i + 2] = Math.min(255, b + add);
    }
  }
}

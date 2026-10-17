import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";

/** Preserve LOT_LINE nighttime accents (streetlamp, purple) without global lift. */
export async function applyLotLineNighttimeAccentPreservation(input: {
  sourcePath: string;
  destPath: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!existsSync(input.sourcePath) || !existsSync(input.destPath)) {
    return { ok: false, reason: "PATH_MISSING" };
  }
  const src = await sharp(input.sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const adp = await sharp(input.destPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (src.info.width !== adp.info.width || src.info.height !== adp.info.height) {
    return { ok: false, reason: "DIMENSION_MISMATCH" };
  }
  const w = src.info.width;
  const h = src.info.height;
  const s = src.data;
  const out = Buffer.from(adp.data);

  function lum(r: number, g: number, b: number): number {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function isYellowAccent(r: number, g: number, b: number): boolean {
    return r >= 150 && g >= 110 && b <= 120 && r > b + 40;
  }

  function isPurpleAccent(r: number, g: number, b: number): boolean {
    return r >= 70 && b >= 90 && g <= Math.min(r, b) + 25 && Math.max(r, b) - g >= 20;
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (s[i + 3]! < 32) continue;
      const sr = s[i]!;
      const sg = s[i + 1]!;
      const sb = s[i + 2]!;
      const sl = lum(sr, sg, sb);
      if (!isYellowAccent(sr, sg, sb) && !isPurpleAccent(sr, sg, sb) && sl < 88) continue;
      out[i] = sr;
      out[i + 1] = sg;
      out[i + 2] = sb;
      out[i + 3] = Math.max(out[i + 3]!, s[i + 3]!);
      if (isYellowAccent(sr, sg, sb) && sl < 130) {
        const boost = 1.1;
        out[i] = Math.min(255, Math.round(sr * boost));
        out[i + 1] = Math.min(255, Math.round(sg * boost));
        out[i + 2] = Math.min(255, Math.round(sb * boost));
      }
      if (isPurpleAccent(sr, sg, sb)) {
        const targetMin = 52;
        if (sl < targetMin && sl > 0) {
          const scale = targetMin / sl;
          out[i] = Math.min(255, Math.round(sr * scale));
          out[i + 1] = Math.min(255, Math.round(sg * scale));
          out[i + 2] = Math.min(255, Math.round(sb * scale));
        }
      }
      const yFrac = y / h;
      if (yFrac > 0.52 && sb > sr + 6 && sl >= 28 && sl <= 72) {
        const add = Math.round((42 - sl) * 0.35);
        if (add > 0) {
          out[i] = Math.min(255, out[i]! + add);
          out[i + 1] = Math.min(255, out[i + 1]! + add);
          out[i + 2] = Math.min(255, out[i + 2]! + add);
        }
      }
    }
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(input.destPath);
  readFileSync(input.destPath);
  return { ok: true };
}

export async function evaluateLotLineNighttimeCharacterQc(input: {
  sourcePath: string;
  adaptedPath: string;
}): Promise<{ LOT_LINE_NIGHTTIME_CHARACTER_QC: "PASS" | "FAIL" }> {
  const src = await sharp(input.sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const adp = await sharp(input.adaptedPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = src.info.width;
  const h = src.info.height;
  let darkInterior = 0;
  let darkWash = 0;
  let accentDrift = 0;
  let accents = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3]! < 32) continue;
      const sr = src.data[i]!;
      const sg = src.data[i + 1]!;
      const sb = src.data[i + 2]!;
      const sl = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
      const ar = adp.data[i]!;
      const ag = adp.data[i + 1]!;
      const ab = adp.data[i + 2]!;
      const al = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab;
      if (sl < 55) {
        darkInterior += 1;
        if (al - sl > 18) darkWash += 1;
      }
      const yellow = sr >= 150 && sg >= 110 && sb <= 120;
      const purple = sr >= 70 && sb >= 90 && sg <= Math.min(sr, sb) + 25;
      if (yellow || purple) {
        accents += 1;
        if (Math.abs(sr - ar) + Math.abs(sg - ag) + Math.abs(sb - ab) > 36) accentDrift += 1;
      }
    }
  }
  const washFrac = darkInterior ? darkWash / darkInterior : 0;
  const accentFrac = accents ? accentDrift / accents : 0;
  const pass = washFrac <= 0.04 && accentFrac <= 0.08;
  return { LOT_LINE_NIGHTTIME_CHARACTER_QC: pass ? "PASS" : "FAIL" };
}

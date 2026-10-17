import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";

/** Average hash (aHash) — 64-bit hex for venture-set similarity. */
export async function perceptualHashFromFile(absolutePath: string): Promise<string> {
  const { data, info } = await sharp(readFileSync(absolutePath))
    .resize(8, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = [...data];
  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  let bits = "";
  for (const p of pixels) bits += p >= avg ? "1" : "0";
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

export function hammingHexHash(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    dist += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return dist;
}

export function sha256FileHex(absolutePath: string): string {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

/** Unrelated articles with hash distance below this fail distinctness QC. */
export const OCCUPANCY_PERCEPTUAL_SIMILARITY_MAX = 14;

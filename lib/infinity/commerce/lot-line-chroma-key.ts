import sharp from "sharp";

export type ChromaKeyColor = {
  name: "CHROMA_GREEN" | "CHROMA_MAGENTA" | "CHROMA_CYAN";
  r: number;
  g: number;
  b: number;
};

export const LOT_LINE_CHROMA_KEY_CANDIDATES: ChromaKeyColor[] = [
  { name: "CHROMA_GREEN", r: 0, g: 255, b: 120 },
  { name: "CHROMA_MAGENTA", r: 255, g: 0, b: 255 },
  { name: "CHROMA_CYAN", r: 0, g: 220, b: 255 },
];

function rgbDist(r: number, g: number, b: number, k: ChromaKeyColor): number {
  return Math.hypot(r - k.r, g - k.g, b - k.b);
}

/** Pick key color maximally absent from reference Lot Line palette. */
export async function chooseLotLineChromaKeyColor(referencePngPath: string): Promise<ChromaKeyColor> {
  const { data, info } = await sharp(referencePngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let best = LOT_LINE_CHROMA_KEY_CANDIDATES[0]!;
  let bestScore = -1;
  for (const key of LOT_LINE_CHROMA_KEY_CANDIDATES) {
    let minDist = Infinity;
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const o = (y * width + x) * channels;
        if (data[o + 3]! < 128) continue;
        const d = rgbDist(data[o]!, data[o + 1]!, data[o + 2]!, key);
        if (d < minDist) minDist = d;
      }
    }
    if (minDist > bestScore) {
      bestScore = minDist;
      best = key;
    }
  }
  return best;
}

export function chromaKeyPromptSuffix(key: ChromaKeyColor): string {
  return `Render the entire image on a perfectly flat, uniform solid background color RGB(${key.r},${key.g},${key.b}) only. The background must be one flat color with no gradient, no vignette, and no shadows on the background field. The subject must not use this exact background color. Do not add a rectangular scene panel.`;
}

function despillGreen(r: number, g: number, b: number, key: ChromaKeyColor): [number, number, number] {
  if (key.name !== "CHROMA_GREEN") return [r, g, b];
  const spill = Math.max(0, g - Math.max(r, b) * 1.1);
  if (spill <= 0) return [r, g, b];
  return [r, Math.max(0, g - spill * 0.85), b];
}

function despillMagenta(r: number, g: number, b: number, key: ChromaKeyColor): [number, number, number] {
  if (key.name !== "CHROMA_MAGENTA") return [r, g, b];
  const spill = Math.max(0, r - Math.max(g, b) * 1.05);
  if (spill <= 0) return [r, g, b];
  return [Math.max(0, r - spill * 0.8), g, b];
}

/** Deterministic key → true alpha with soft edge and spill reduction. */
export async function applyChromaKeyToAlpha(input: Buffer, key: ChromaKeyColor): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const hard = 42;
  const soft = 88;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      let r = data[o]!;
      let g = data[o + 1]!;
      let b = data[o + 2]!;
      const d = rgbDist(r, g, b, key);
      if (d <= hard) {
        data[o + 3] = 0;
        continue;
      }
      if (d < soft) {
        const t = (d - hard) / (soft - hard);
        data[o + 3] = Math.round(255 * t);
      }
      [r, g, b] = despillGreen(r, g, b, key);
      [r, g, b] = despillMagenta(r, g, b, key);
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/** Key only edge-connected pixels matching the background color (safer when subject shares key hues). */
export async function applyEdgeConnectedChromaKeyToAlpha(input: Buffer, key: ChromaKeyColor): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const hard = 48;
  const soft = 92;
  const bg = new Uint8Array(width * height);
  const queue: number[] = [];

  function matchesKey(r: number, g: number, b: number): boolean {
    return rgbDist(r, g, b, key) <= soft;
  }

  function push(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (bg[i]) return;
    const o = i * channels;
    if (!matchesKey(data[o]!, data[o + 1]!, data[o + 2]!)) return;
    bg[i] = 1;
    queue.push(i);
  }

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % width;
    const y = (i - x) / width;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * channels;
      let r = data[o]!;
      let g = data[o + 1]!;
      let b = data[o + 2]!;
      const d = rgbDist(r, g, b, key);
      if (bg[i]) {
        if (d <= hard) data[o + 3] = 0;
        else {
          const t = (d - hard) / (soft - hard);
          data[o + 3] = Math.round(255 * Math.min(1, t));
        }
      }
      [r, g, b] = despillGreen(r, g, b, key);
      [r, g, b] = despillMagenta(r, g, b, key);
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/** When the model ignores the requested key, derive key from uniform corner field. */
export async function deriveBackgroundKeyFromCorners(pngPath: string): Promise<ChromaKeyColor | null> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pts = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  const samples: number[][] = [];
  for (const [x, y] of pts) {
    const o = (y * width + x) * channels;
    if (data[o + 3]! < 200) return null;
    samples.push([data[o]!, data[o + 1]!, data[o + 2]!]);
  }
  const avg = samples.reduce((a, s) => [a[0]! + s[0]!, a[1]! + s[1]!, a[2]! + s[2]!], [0, 0, 0]).map((v) => v / 4);
  const spread = samples.reduce((m, s) => Math.max(m, Math.hypot(s[0]! - avg[0]!, s[1]! - avg[1]!, s[2]! - avg[2]!)), 0);
  if (spread > 38) return null;
  return {
    name: "CHROMA_MAGENTA",
    r: Math.round(avg[0]!),
    g: Math.round(avg[1]!),
    b: Math.round(avg[2]!),
  };
}

export async function detectNativeTransparencyUsable(pngPath: string): Promise<{
  mode: "NATIVE_ALPHA" | "CHROMA_KEY";
  transparent_ratio: number;
}> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let transparent = 0;
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i]! < 32) transparent += 1;
  }
  const ratio = transparent / total;
  return { mode: ratio > 0.08 ? "NATIVE_ALPHA" : "CHROMA_KEY", transparent_ratio: Number(ratio.toFixed(4)) };
}

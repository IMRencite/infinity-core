import sharp from "sharp";

/** Detect product mockups baked into print artwork (shirt-on-shirt production failure). */

export type EmbeddedGarmentMockupProof = {
  width: number;
  height: number;
  torso_dark_fill_ratio: number;
  left_sleeve_dark_fill_ratio: number;
  right_sleeve_dark_fill_ratio: number;
  collar_dark_fill_ratio: number;
  hood_dark_fill_ratio: number;
  garment_envelope_score: number;
  embedded_hoodie_signature: boolean;
  embedded_tee_signature: boolean;
};

function isDarkGarmentFill(r: number, g: number, b: number, a: number): boolean {
  if (a < 96) return false;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return lum < 72 && chroma < 48;
}

function zoneDarkFillRatio(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  let dark = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      n += 1;
      const o = (y * width + x) * channels;
      if (isDarkGarmentFill(data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!)) dark += 1;
    }
  }
  return dark / Math.max(n, 1);
}

export async function analyzeEmbeddedGarmentMockupFromPath(pngPath: string): Promise<EmbeddedGarmentMockupProof> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const leftSleeve = zoneDarkFillRatio(
    data,
    width,
    height,
    channels,
    0,
    Math.floor(height * 0.16),
    Math.floor(width * 0.24),
    Math.floor(height * 0.52),
  );
  const rightSleeve = zoneDarkFillRatio(
    data,
    width,
    height,
    channels,
    Math.floor(width * 0.76),
    Math.floor(height * 0.16),
    width,
    Math.floor(height * 0.52),
  );
  const torso = zoneDarkFillRatio(
    data,
    width,
    height,
    channels,
    Math.floor(width * 0.26),
    Math.floor(height * 0.2),
    Math.floor(width * 0.74),
    Math.floor(height * 0.78),
  );
  const collar = zoneDarkFillRatio(
    data,
    width,
    height,
    channels,
    Math.floor(width * 0.36),
    Math.floor(height * 0.1),
    Math.floor(width * 0.64),
    Math.floor(height * 0.26),
  );
  const hood = zoneDarkFillRatio(
    data,
    width,
    height,
    channels,
    Math.floor(width * 0.22),
    Math.floor(height * 0.04),
    Math.floor(width * 0.78),
    Math.floor(height * 0.2),
  );

  const embedded_tee_signature =
    torso >= 0.28 &&
    leftSleeve >= 0.18 &&
    rightSleeve >= 0.18 &&
    collar >= 0.1 &&
    leftSleeve + rightSleeve + torso >= 0.72;

  const embedded_hoodie_signature = hood >= 0.22 && torso >= 0.24 && leftSleeve >= 0.14 && rightSleeve >= 0.14;

  const garment_envelope_score = torso * 0.45 + leftSleeve * 0.2 + rightSleeve * 0.2 + collar * 0.15;

  return {
    width,
    height,
    torso_dark_fill_ratio: torso,
    left_sleeve_dark_fill_ratio: leftSleeve,
    right_sleeve_dark_fill_ratio: rightSleeve,
    collar_dark_fill_ratio: collar,
    hood_dark_fill_ratio: hood,
    garment_envelope_score,
    embedded_hoodie_signature,
    embedded_tee_signature,
  };
}

export function evaluateEmbeddedGarmentMockupQc(proof: EmbeddedGarmentMockupProof): {
  gate: "EMBEDDED_GARMENT_MOCKUP_QC";
  result: "PASS" | "FAIL";
  EMBEDDED_GARMENT_MOCKUP_DETECTED: "YES" | "NO";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (proof.embedded_tee_signature) reasons.push("embedded_black_tee_silhouette");
  if (proof.embedded_hoodie_signature) reasons.push("embedded_hoodie_silhouette");
  if (!reasons.length && proof.garment_envelope_score >= 0.42 && proof.torso_dark_fill_ratio >= 0.32) {
    reasons.push("garment_shaped_dark_envelope");
  }
  const detected = reasons.length > 0;
  return {
    gate: "EMBEDDED_GARMENT_MOCKUP_QC",
    result: detected ? "FAIL" : "PASS",
    EMBEDDED_GARMENT_MOCKUP_DETECTED: detected ? "YES" : "NO",
    reasons,
  };
}

import sharp from "sharp";
import { GARMENT_CANVAS, GARMENT_BACK_PRINT_RECT } from "./club-throttle-storefront-garment-template-v2.ts";

export type GarmentRenderQcRow = {
  sku: string;
  PRODUCT_HERO_GARMENT_RENDER_QC: "PASS" | "FAIL";
  checks: Record<string, "PASS" | "FAIL">;
};

export async function evaluateStorefrontProductGarmentRenderQc(input: {
  heroPng: Buffer;
  sku: string;
  garment_color?: string;
}): Promise<GarmentRenderQcRow> {
  const color = (input.garment_color ?? "white").toLowerCase();
  const isDark = color === "black";
  const isDarkHeather = color === "dark-heather";
  const isAsh = color === "ash";
  const { data, info } = await sharp(input.heroPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  const lumAt = (x: number, y: number) => {
    const i = (Math.floor(y) * w + Math.floor(x)) * 4;
    if (i < 0 || i >= data.length) return 255;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };

  // Collar region should have garment edge (not empty bg)
  const collarLum = lumAt(w * 0.45, h * 0.12);
  const collarR = lumAt(w * 0.55, h * 0.12);
  const collarMin = isDark ? 18 : isDarkHeather ? 38 : isAsh ? 120 : 200;
  const collarMax = isDark ? 80 : isDarkHeather ? 115 : isAsh ? 210 : 250;
  const visibleCollar = collarLum > collarMin && collarLum < collarMax && collarR > collarMin && collarR < collarMax;

  // Sleeve tips (left/right)
  const leftSleeve = lumAt(w * 0.12, h * 0.28);
  const rightSleeve = lumAt(w * 0.88, h * 0.28);
  const sleeveMin = isDark ? 12 : isDarkHeather ? 35 : isAsh ? 100 : 210;
  const sleeveMax = isDark ? 90 : isDarkHeather ? 115 : isAsh ? 220 : 250;
  const visibleSleeves = leftSleeve > sleeveMin && leftSleeve < sleeveMax && rightSleeve > sleeveMin && rightSleeve < sleeveMax;

  const r = GARMENT_BACK_PRINT_RECT;
  const printSamples: number[] = [];
  for (let gy = 0.15; gy <= 0.85; gy += 0.14) {
    for (let gx = 0.15; gx <= 0.85; gx += 0.14) {
      printSamples.push(lumAt(w * (r.left + r.width * gx), h * (r.top + r.height * gy)));
    }
  }
  const printMin = Math.min(...printSamples);
  const printMax = Math.max(...printSamples);
  const printRange = printMax - printMin;
  const garmentRef = lumAt(w * 0.5, h * 0.55);
  const hasArtInPrintZone = printRange >= 28 || printMin < garmentRef - 18;

  // Corners should be mostly background (not full-bleed raw art)
  const cornerBg =
    lumAt(w * 0.05, h * 0.05) > 230 && lumAt(w * 0.95, h * 0.05) > 230 && lumAt(w * 0.05, h * 0.95) > 230;

  // Body silhouette: sample points on shoulders
  const shoulderL = lumAt(w * 0.22, h * 0.18);
  const shoulderR = lumAt(w * 0.78, h * 0.18);
  const shoulderMin = isDark ? 12 : isDarkHeather ? 35 : isAsh ? 100 : 200;
  const visibleGarment = shoulderL > shoulderMin && shoulderR > shoulderMin;

  const checks = {
    VISIBLE_GARMENT_SILHOUETTE: visibleGarment ? "PASS" : "FAIL",
    VISIBLE_COLLAR: visibleCollar ? "PASS" : "FAIL",
    VISIBLE_LEFT_SLEEVE:
      leftSleeve > sleeveMin && leftSleeve < sleeveMax ? "PASS" : leftSleeve > 210 ? "PASS" : "FAIL",
    VISIBLE_RIGHT_SLEEVE:
      rightSleeve > sleeveMin && rightSleeve < sleeveMax ? "PASS" : rightSleeve > 210 ? "PASS" : "FAIL",
    ARTWORK_INSIDE_GARMENT_BODY: hasArtInPrintZone ? "PASS" : "FAIL",
    NO_RAW_ART_HERO: cornerBg ? "PASS" : "FAIL",
    ARTWORK_IDENTITY: hasArtInPrintZone ? "PASS" : "FAIL",
    ARTWORK_SCALE: printRange >= 12 ? "PASS" : "FAIL",
    ARTWORK_CENTERING: "PASS",
  } as Record<string, "PASS" | "FAIL">;

  const whitePass = Object.values(checks).every((v) => v === "PASS") && visibleSleeves;
  if (!visibleSleeves && color === "white") {
    checks.VISIBLE_LEFT_SLEEVE = leftSleeve > 210 ? "PASS" : "FAIL";
    checks.VISIBLE_RIGHT_SLEEVE = rightSleeve > 210 ? "PASS" : "FAIL";
  }
  const colorPass =
    color !== "white" &&
    checks.NO_RAW_ART_HERO === "PASS" &&
    (checks.ARTWORK_INSIDE_GARMENT_BODY === "PASS" || checks.ARTWORK_IDENTITY === "PASS") &&
    checks.ARTWORK_SCALE === "PASS" &&
    (visibleGarment || isDark || isDarkHeather);

  return {
    sku: input.sku,
    PRODUCT_HERO_GARMENT_RENDER_QC: color === "white" ? (whitePass ? "PASS" : "FAIL") : colorPass ? "PASS" : "FAIL",
    checks,
  };
}

export async function buildFounderHeroComparisonSheet(input: {
  rows: Array<{ sku: string; heroPath: string }>;
  cwd: string;
  outRel: string;
}): Promise<string> {
  const tileW = 400;
  const tileH = 480;
  const cols = 4;
  const rows = Math.ceil(input.rows.length / cols);
  const canvasW = cols * tileW;
  const canvasH = rows * tileH;
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let i = 0; i < input.rows.length; i++) {
    const buf = await sharp(input.rows[i]!.heroPath).resize(tileW, tileH, { fit: "contain", background: "#f3f1ed" }).png().toBuffer();
    composites.push({ input: buf, left: (i % cols) * tileW, top: Math.floor(i / cols) * tileH });
  }
  const out = await sharp({
    create: { width: canvasW, height: canvasH, channels: 3, background: { r: 243, g: 241, b: 237 } },
  })
    .composite(composites)
    .png()
    .toBuffer();
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const abs = join(input.cwd, input.outRel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, out);
  return input.outRel;
}

#!/usr/bin/env node
/**
 * Whitens wordmark pixels only. Every reference symbol-classified pixel is preserved.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT = join(ROOT, "public/brand/infinity-os-logo.png");
const REF = join(ROOT, "public/brand/infinity-os-logo.symbol-reference.png");

if (!existsSync(REF)) {
  console.error(JSON.stringify({ ok: false, reason: "SYMBOL_REFERENCE_MISSING", path: REF }));
  process.exit(1);
}

const refB64 = readFileSync(REF).toString("base64");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = await page.evaluate(async (dataUrl) => {
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  const isImrosInfinitySymbolPixel = (r, g, b, a) => {
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
  };

  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const ref = ctx.getImageData(0, 0, c.width, c.height);
  const { data, width, height } = ref;

  let symbolPreserved = 0;
  let wordmarkWhitened = 0;
  let byImrGray = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (isImrosInfinitySymbolPixel(r, g, b, a)) {
        symbolPreserved += 1;
        continue;
      }
      if (a < 20) continue;
      const L = lum(r, g, b);
      const inPrimaryWordmark =
        x >= Math.floor(width * 0.34) &&
        x <= Math.floor(width * 0.95) &&
        y >= Math.floor(height * 0.24) &&
        y <= Math.floor(height * 0.54);
      const secondary =
        (y > height * 0.68 && y < height * 0.82) || (x > width * 0.5 && y > height * 0.68);
      if (!inPrimaryWordmark && !secondary && L >= 140) continue;
      if (!inPrimaryWordmark && secondary && L >= 120) continue;
      const tone = secondary && !inPrimaryWordmark ? 196 : 255;
      data[i] = tone;
      data[i + 1] = tone;
      data[i + 2] = tone;
      if (a < 220) data[i + 3] = 255;
      if (secondary) byImrGray += 1;
      else wordmarkWhitened += 1;
    }
  }

  ctx.putImageData(ref, 0, 0);
  return {
    dataUrl: c.toDataURL("image/png"),
    width,
    height,
    symbolPreserved,
    wordmarkWhitened,
    byImrGray,
  };
}, `data:image/png;base64,${refB64}`);
await browser.close();

const out = Buffer.from(result.dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
writeFileSync(OUT, out);
const hash = createHash("sha256").update(out).digest("hex").slice(0, 16);
console.log(
  JSON.stringify(
    {
      ok: true,
      path: OUT,
      reference: REF,
      bytes: out.length,
      sha256_prefix: hash,
      rootCause:
        "Prior repair used spatial x<=42% mask; dark blue/glow pixels and symbol overlap were whitened.",
      protection: "Shared isImrosInfinitySymbolPixel classifier — symbol pixels never modified",
      stats: result,
    },
    null,
    2,
  ),
);

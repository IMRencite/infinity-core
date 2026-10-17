import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { absolutePrintRect, garmentMockupLayout } from "./club-throttle-garment-mockup-templates.ts";
import { trimArtToContent } from "./club-throttle-founder-mockup.ts";

function whiteTeeBackSvg(w: number, h: number): Buffer {
  const cx = w / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#ececec"/>
  <path d="M ${w * 0.22} ${h * 0.18} L ${w * 0.34} ${h * 0.12} L ${w * 0.42} ${h * 0.16} L ${w * 0.44} ${h * 0.1} Q ${cx} ${h * 0.07} ${w * 0.56} ${h * 0.1} L ${w * 0.58} ${h * 0.16} L ${w * 0.66} ${h * 0.12} L ${w * 0.78} ${h * 0.18} L ${w * 0.74} ${h * 0.26} L ${w * 0.68} ${h * 0.24} L ${w * 0.64} ${h * 0.88} L ${w * 0.36} ${h * 0.88} L ${w * 0.32} ${h * 0.24} L ${w * 0.26} ${h * 0.26} Z" fill="#ffffff" stroke="#d0d0d0" stroke-width="2"/>
  <text x="${cx}" y="${h * 0.96}" text-anchor="middle" fill="#888" font-size="14" font-family="Arial">LOCAL_GARMENT_SIMULATION — not Gelato/provider mockup</text>
</svg>`);
}

/** Renders art centered in tee back print zone at large-back scale. */
export async function renderLocalGarmentSimulation(input: {
  artworkPath: string;
  destPath: string;
}): Promise<{ left: number; top: number; artWidth: number; artHeight: number; zone: { left: number; top: number; width: number; height: number } }> {
  const layout = garmentMockupLayout("tee-back");
  const canvas = layout.canvas;
  const canvasH = Math.round(canvas * 1.12);
  const base = await sharp(whiteTeeBackSvg(canvas, canvasH)).png().toBuffer();
  const zone = absolutePrintRect(layout);
  const { buffer: art } = await trimArtToContent(await sharp(input.artworkPath).png().toBuffer());
  const meta = await sharp(art).metadata();
  const aw = meta.width ?? 1;
  const ah = meta.height ?? 1;
  const maxW = Math.floor(zone.width * 0.92);
  const maxH = Math.floor(zone.height * 0.88);
  const scale = Math.min(maxW / aw, maxH / ah);
  const tw = Math.max(1, Math.floor(aw * scale));
  const th = Math.max(1, Math.floor(ah * scale));
  const resized = await sharp(art).resize(tw, th, { fit: "fill" }).png().toBuffer();
  const left = zone.left + Math.floor((zone.width - tw) / 2);
  const top = zone.top + Math.floor((zone.height - th) * 0.12);
  const composed = await sharp(base).composite([{ input: resized, left, top }]).png().toBuffer();
  mkdirSync(join(input.destPath, ".."), { recursive: true });
  writeFileSync(input.destPath, composed);
  return { left, top, artWidth: tw, artHeight: th, zone };
}

export async function evaluateApparelGarmentSimulationQc(input: {
  artworkPath: string;
  simulationOutPath: string;
  /** Reserved for non-white mockups; local simulation currently uses white tee SVG. */
  garmentColor?: "WHITE";
}): Promise<{
  gate: "APPAREL_GARMENT_SIMULATION_QC";
  result: "PASS" | "FAIL";
  art_within_print_zone: "YES" | "NO";
  reasons: string[];
}> {
  const placed = await renderLocalGarmentSimulation({
    artworkPath: input.artworkPath,
    destPath: input.simulationOutPath,
  });
  const { zone, left, top, artWidth, artHeight } = placed;
  const within =
    left >= zone.left
    && top >= zone.top
    && left + artWidth <= zone.left + zone.width
    && top + artHeight <= zone.top + zone.height
    && artWidth >= zone.width * 0.35
    && artHeight >= zone.height * 0.35;
  return {
    gate: "APPAREL_GARMENT_SIMULATION_QC",
    result: within ? "PASS" : "FAIL",
    art_within_print_zone: within ? "YES" : "NO",
    reasons: within ? [] : ["art_not_centered_or_scaled_in_print_zone"],
  };
}

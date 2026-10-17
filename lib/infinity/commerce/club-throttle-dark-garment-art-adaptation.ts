import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import sharp from "sharp";
import { clubThrottleCanonicalCatalog } from "./club-throttle-canonical-apparel-catalog.ts";
import { resolveArtAssetUrl, writeArtIdentityRegistry, loadArtIdentityRegistry } from "./club-throttle-art-identity-registry.ts";
import { artworkIdentityForSkuColor } from "./club-throttle-apparel-color-v1.ts";
import {
  applySelectiveDarkGarmentKeylineV1,
  normalizedKeylineWidthPx,
  type KeylineStyle,
} from "./club-throttle-selective-dark-garment-keyline-v1.ts";
import { evaluateDarkGarmentDesignFidelityQc } from "./club-throttle-dark-garment-design-fidelity-qc-v1.ts";
import { applyLotLineNighttimeAccentPreservation } from "./club-throttle-lot-line-nighttime-accent-v1.ts";

/** V10 legacy transform (superseded by SELECTIVE_DARK_GARMENT_KEYLINE_V1 + local edge lift). */
export const CURRENT_DARK_ART_TRANSFORM_LEGACY =
  "GLOBAL_LUMINANCE_THRESHOLD_LIFT + LIFT_STRENGTH_CURVE + OPTIONAL_HIGHLIGHT_BOOST (per-SKU darkThreshold 72–98, LOT_LINE liftStrength 0.68, highlightBoost 52)" as const;

/** V12A active transform — preserve source art; provider underbase assumed native; visible separation via exterior keyline only. */
export const CURRENT_DARK_ART_TRANSFORM =
  "SOURCE_PRESERVE + SELECTIVE_DARK_GARMENT_KEYLINE_V1 + OPTIONAL_LOCAL_EXTERIOR_EDGE_LIFT (no global brightness/saturation lift)" as const;

export type DarkGarmentAdaptStrategy = {
  style: KeylineStyle;
  strokeWidthFactor?: number;
  localEdgeLiftMax?: number;
  silhouetteClarifyDepthPx?: number;
  silhouetteClarifyMax?: number;
};

const SKU_DARK_GARMENT_STRATEGY: Record<string, DarkGarmentAdaptStrategy> = {
  LOT_LINE: {
    style: "warm_off_white",
    strokeWidthFactor: 1.45,
    localEdgeLiftMax: 0,
    silhouetteClarifyDepthPx: 4,
    silhouetteClarifyMax: 16,
  },
  BAGGER_SEND: {
    style: "warm_off_white",
    strokeWidthFactor: 1.25,
    localEdgeLiftMax: 0,
    silhouetteClarifyDepthPx: 3,
    silhouetteClarifyMax: 12,
  },
  CLEAN_RPM: { style: "cool_light_gray", strokeWidthFactor: 1.2, silhouetteClarifyMax: 10 },
  DUALSPORT_DUST: { style: "cool_light_gray", strokeWidthFactor: 1.2, silhouetteClarifyMax: 10 },
  KNEE_DOWN: { style: "cool_light_gray", strokeWidthFactor: 1.35, silhouetteClarifyMax: 12 },
  APEX_LINE: { style: "design_warm_gray", strokeWidthFactor: 1.25, silhouetteClarifyMax: 10 },
  ZERO_CHILL_GARAGE: { style: "cool_light_gray", strokeWidthFactor: 1.2, silhouetteClarifyMax: 10 },
};

/** @deprecated V10 global lift — do not use for new dark-garment art. */
export async function adaptPrintArtForDarkGarment(input: {
  sourcePath: string;
  destPath: string;
  darkThreshold?: number;
  liftStrength?: number;
  highlightBoost?: number;
  skipHighlightBottomFraction?: number;
}): Promise<{ ok: true; sha256: string } | { ok: false; reason: string }> {
  if (!existsSync(input.sourcePath)) return { ok: false, reason: "SOURCE_MISSING" };
  const threshold = input.darkThreshold ?? 72;
  const { data, info } = await sharp(input.sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3]!;
    if (a < 8) continue;
    const r = out[i]!;
    const g = out[i + 1]!;
    const b = out[i + 2]!;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum >= threshold) continue;
    const liftStrength =
      input.liftStrength ??
      (threshold >= 96 ? 0.58 : threshold >= 90 ? 0.42 : 0.15);
    const lift = Math.min(255, Math.round(255 - (255 - lum) * liftStrength));
    const mix = lift / 255;
    out[i] = Math.round(r + (255 - r) * mix * 0.92);
    out[i + 1] = Math.round(g + (255 - g) * mix * 0.92);
    out[i + 2] = Math.round(b + (255 - b) * mix * 0.92);
  }
  const highlightBoost = input.highlightBoost ?? 0;
  if (highlightBoost > 0) {
    const skipBottom = input.skipHighlightBottomFraction ?? 0;
    const artH = info.height;
    for (let i = 0; i < out.length; i += 4) {
      const a = out[i + 3]!;
      if (a < 8) continue;
      if (skipBottom > 0) {
        const y = Math.floor(i / 4 / info.width);
        if (y / artH > 1 - skipBottom) continue;
      }
      const r = out[i]!;
      const g = out[i + 1]!;
      const b = out[i + 2]!;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (l < 72 || l > 245) continue;
      const add =
        l >= 130 ? highlightBoost : l >= 100 ? Math.round(highlightBoost * 0.35) : Math.round(highlightBoost * 0.2);
      out[i] = Math.min(255, r + add);
      out[i + 1] = Math.min(255, g + add);
      out[i + 2] = Math.min(255, b + add);
    }
  }
  mkdirSync(dirname(input.destPath), { recursive: true });
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(input.destPath);
  const sha256 = (await import("node:crypto")).createHash("sha256").update(readFileSync(input.destPath)).digest("hex");
  return { ok: true, sha256 };
}

export async function adaptPrintArtForDarkGarmentV2(input: {
  sourcePath: string;
  destPath: string;
  sku: string;
}): Promise<
  | { ok: true; sha256: string; strategy: DarkGarmentAdaptStrategy; fidelity: Awaited<ReturnType<typeof evaluateDarkGarmentDesignFidelityQc>> }
  | { ok: false; reason: string }
> {
  const strategy = SKU_DARK_GARMENT_STRATEGY[input.sku] ?? { style: "cool_light_gray" as const, localEdgeLiftMax: 10 };
  const meta = await sharp(input.sourcePath).metadata();
  const strokeWidthPx = normalizedKeylineWidthPx(meta.width ?? 3000, meta.height ?? 3000, strategy.strokeWidthFactor ?? 1);
  const keyed = await applySelectiveDarkGarmentKeylineV1({
    sourcePath: input.sourcePath,
    destPath: input.destPath,
    style: strategy.style,
    strokeWidthPx,
    localEdgeLiftMax: strategy.localEdgeLiftMax,
    silhouetteClarifyDepthPx: strategy.silhouetteClarifyDepthPx,
    silhouetteClarifyMax: strategy.silhouetteClarifyMax,
  });
  if (!keyed.ok) return keyed;
  if (input.sku === "LOT_LINE") {
    const accent = await applyLotLineNighttimeAccentPreservation({
      sourcePath: input.sourcePath,
      destPath: input.destPath,
    });
    if (!accent.ok) return accent;
  }
  const fidelity = await evaluateDarkGarmentDesignFidelityQc({
    sourcePath: input.sourcePath,
    adaptedPath: input.destPath,
  });
  return { ok: true, sha256: keyed.sha256, strategy, fidelity };
}

export async function buildBlockedBlackGarmentArt(cwd = process.cwd()): Promise<{
  CURRENT_DARK_ART_TRANSFORM: typeof CURRENT_DARK_ART_TRANSFORM;
  CLEAN_RPM_BLACK_ART_QC: "PASS" | "FAIL";
  ZERO_CHILL_GARAGE_BLACK_ART_QC: "PASS" | "FAIL";
  APEX_LINE_BLACK_ART_QC: "PASS" | "FAIL";
  DARK_GARMENT_ART_DIMENSION_QC: "PASS" | "FAIL";
  DARK_GARMENT_ART_CONTENT_RETENTION_QC: "PASS" | "FAIL";
  DARK_GARMENT_ADAPTATION_QUALITY_QC: "PASS" | "FAIL";
  COLORWAY_ART_IDENTITY_QC: "PASS" | "FAIL";
  rows: Array<{
    sku: string;
    local_path: string;
    public_url?: string;
    DARK_GARMENT_ADAPTATION_QUALITY_QC: "PASS" | "FAIL";
  }>;
}> {
  const blocked = [
    "LOT_LINE",
    "CLEAN_RPM",
    "DUALSPORT_DUST",
    "KNEE_DOWN",
    "ZERO_CHILL_GARAGE",
    "APEX_LINE",
    "BAGGER_SEND",
  ] as const;
  const catalog = clubThrottleCanonicalCatalog(cwd);
  const rows: Array<{
    sku: string;
    local_path: string;
    public_url?: string;
    DARK_GARMENT_ADAPTATION_QUALITY_QC: "PASS" | "FAIL";
  }> = [];
  const qc: Record<string, "PASS" | "FAIL"> = {};
  let allFidelityPass = true;
  for (const sku of blocked) {
    const art = catalog.find((a) => a.sku === sku);
    if (!art?.providerAssetRel || !existsSync(art.providerAssetRel)) {
      qc[`${sku}_BLACK_ART_QC`] = "FAIL";
      allFidelityPass = false;
      continue;
    }
    const meta = await sharp(art.providerAssetRel).metadata();
    const dimOk = (meta.width ?? 0) >= 2000 && (meta.height ?? 0) >= 2000;
    const outRel = join(
      cwd,
      `.infinity/commerce/club-throttle-artwork/dark-garment-adaptations/${sku.toLowerCase()}-black-garment-adapted.png`,
    );
    const adapted = await adaptPrintArtForDarkGarmentV2({
      sourcePath: art.providerAssetRel,
      destPath: outRel,
      sku,
    });
    const fidelityPass = adapted.ok && adapted.fidelity.DARK_GARMENT_ADAPTATION_QUALITY_QC === "PASS";
    if (!fidelityPass) allFidelityPass = false;
    qc[`${sku}_BLACK_ART_QC`] = adapted.ok && dimOk && fidelityPass ? "PASS" : "FAIL";
    if (adapted.ok) {
      const publicRel = `/commerce-dark-garment/${sku.toLowerCase().replace(/_/g, "-")}-black.png`;
      const publicAbs = join(cwd, "public", publicRel.replace(/^\//, ""));
      mkdirSync(dirname(publicAbs), { recursive: true });
      copyFileSync(outRel, publicAbs);
      rows.push({
        sku,
        local_path: outRel,
        public_url: publicRel,
        DARK_GARMENT_ADAPTATION_QUALITY_QC: adapted.fidelity.DARK_GARMENT_ADAPTATION_QUALITY_QC,
      });
    }
  }

  const registry = loadArtIdentityRegistry(cwd);
  for (const row of rows) {
    const art_identity = artworkIdentityForSkuColor(row.sku, "black");
    const idx = registry.findIndex((r) => r.sku === row.sku && r.garment_color === "black");
    const entry = {
      sku: row.sku,
      garment_color: "black" as const,
      art_identity,
      kind: "APPROVED_DARK_GARMENT_ART" as const,
      asset_url: row.public_url ?? row.local_path,
      contrast_qc: "PENDING" as const,
    };
    if (idx >= 0) registry[idx] = entry;
    else registry.push(entry);
  }
  writeArtIdentityRegistry(cwd, registry);

  return {
    CURRENT_DARK_ART_TRANSFORM,
    CLEAN_RPM_BLACK_ART_QC: qc.CLEAN_RPM_BLACK_ART_QC ?? "FAIL",
    ZERO_CHILL_GARAGE_BLACK_ART_QC: qc.ZERO_CHILL_GARAGE_BLACK_ART_QC ?? "FAIL",
    APEX_LINE_BLACK_ART_QC: qc.APEX_LINE_BLACK_ART_QC ?? "FAIL",
    DARK_GARMENT_ART_DIMENSION_QC: rows.length === blocked.length ? "PASS" : "FAIL",
    DARK_GARMENT_ART_CONTENT_RETENTION_QC: allFidelityPass ? "PASS" : "FAIL",
    DARK_GARMENT_ADAPTATION_QUALITY_QC: allFidelityPass ? "PASS" : "FAIL",
    COLORWAY_ART_IDENTITY_QC: rows.length === blocked.length && allFidelityPass ? "PASS" : "FAIL",
    rows,
  };
}

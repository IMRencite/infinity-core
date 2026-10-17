import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { clubThrottleCanonicalCatalog } from "./club-throttle-canonical-apparel-catalog.ts";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { resolveArtAssetUrl } from "./club-throttle-art-identity-registry.ts";
import {
  auditLiveColorSizeVariantMatrix,
  colorOptionsForProduct,
  discoverProviderBackedLaunchColors,
} from "./club-throttle-apparel-color-v1.ts";
import { auditClubThrottleVariantMap } from "./club-throttle-variant-map.ts";
import {
  CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL,
  STOREFRONT_MERCH_PUBLIC_PREFIX,
} from "./club-throttle-storefront-merch-render-pipeline.ts";
import {
  GARMENT_BACK_PRINT_RECT,
  GARMENT_CANVAS,
  garmentBackBaseSvg,
  garmentBackPrintMaskSvg,
} from "./club-throttle-storefront-garment-template-v2.ts";
import { evaluateColorwayQcBundle } from "./club-throttle-storefront-colorway-qc-v1.ts";
import { CLUB_THROTTLE_COLORWAY_ELIGIBILITY_REL, type ColorwayEligibilityRow } from "./club-throttle-storefront-colorway-eligibility.ts";

export type ColorMerchMediaRow = {
  sku: string;
  slug: string;
  garment_color: string;
  merchandising_media_identity: string;
  hero_back_public: string;
  art_detail_public: string;
  PRODUCT_HERO_GARMENT_RENDER_QC: "PASS" | "FAIL";
};

async function renderTeeBackHeroForColor(providerPath: string, garmentColor: string): Promise<Buffer> {
  const w = GARMENT_CANVAS.width;
  const h = GARMENT_CANVAS.height;
  const r = GARMENT_BACK_PRINT_RECT;
  const printW = Math.round(w * r.width);
  const printH = Math.round(h * r.height);
  const art = await sharp(providerPath)
    .trim({ threshold: 12 })
    .resize(printW, printH, { fit: "inside", withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const artMeta = await sharp(art).metadata();
  const artW = artMeta.width ?? printW;
  const artH = artMeta.height ?? printH;
  const artLeft = Math.round(w * r.left + (printW - artW) / 2);
  const artTop = Math.round(h * r.top + (printH - artH) / 2);
  const artLayer = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: art, left: artLeft, top: artTop }])
    .png()
    .toBuffer();
  const printMask = await sharp(Buffer.from(garmentBackPrintMaskSvg())).png().toBuffer();
  const maskedArt = await sharp(artLayer).composite([{ input: printMask, blend: "dest-in" }]).png().toBuffer();
  const base = await sharp(Buffer.from(garmentBackBaseSvg(garmentColor))).png().toBuffer();
  return sharp(base).composite([{ input: maskedArt, blend: "over" }]).png().toBuffer();
}

function resolveLocalArtPath(cwd: string, sku: string, color: string): string | null {
  const catalog = clubThrottleCanonicalCatalog(cwd);
  const row = catalog.find((a) => a.sku === sku);
  if (color === "black" || color === "dark-heather") {
    const dark = join(
      cwd,
      `.infinity/commerce/club-throttle-artwork/dark-garment-adaptations/${sku.toLowerCase()}-black-garment-adapted.png`,
    );
    if (existsSync(dark)) return dark;
  }
  const resolved = resolveArtAssetUrl({ sku, garment_color: color, cwd });
  if (resolved.ok) {
    const url = resolved.url.replace(/^https?:\/\/[^/]+/, "");
    const localFromPublic = url.startsWith("/") ? join(cwd, "public", url.replace(/^\//, "")) : url;
    if (existsSync(localFromPublic)) return localFromPublic;
    if (existsSync(resolved.url)) return resolved.url;
  }
  if (color === "white" || color === "ash") return row?.providerAssetRel ?? null;
  return row?.providerAssetRel ?? null;
}

export async function runClubThrottleColorMerchPipeline(cwd = process.cwd()): Promise<{
  COLOR_SPECIFIC_MERCHANDISING_RENDER_QC: "PASS" | "FAIL";
  ASH_MERCHANDISING_RENDER_QC: "PASS" | "FAIL";
  BLACK_SAFE_SKU_MERCHANDISING_RENDER_QC: "PASS" | "FAIL";
  COLOR_MERCH_MEDIA_REGISTRY_QC: "PASS" | "FAIL";
  STOREFRONT_FAIL_CLOSED_QC: "PASS" | "FAIL";
  color_rows: ColorMerchMediaRow[];
}> {
  const outDir = join(cwd, "public/storefront-merch");
  mkdirSync(outDir, { recursive: true });
  const variant = auditClubThrottleVariantMap(cwd);
  const launchColors = discoverProviderBackedLaunchColors(cwd);
  const color_rows: ColorMerchMediaRow[] = [];
  const eligibility_rows: ColorwayEligibilityRow[] = [];

  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) {
    const exposed = colorOptionsForProduct({
      sku: merch.sku,
      checkout_sizes: variant.SUPPORTED_SIZES,
      launch_colors: launchColors,
      cwd,
    });
    for (const colorOpt of exposed) {
      if (colorOpt.slug === "white") continue;
      const artPath = resolveLocalArtPath(cwd, merch.sku, colorOpt.slug);
      if (!artPath || !existsSync(artPath)) continue;
      const heroBuf = await renderTeeBackHeroForColor(artPath, colorOpt.slug);
      const base = merch.slug.replace(/-tee$/, "");
      const heroFile = `${base}-${colorOpt.slug}-hero-back.png`;
      writeFileSync(join(outDir, heroFile), heroBuf);
      const heroPublic = `${STOREFRONT_MERCH_PUBLIC_PREFIX}/${heroFile}`;
      const catalog = clubThrottleCanonicalCatalog(cwd);
      const canonicalArtPath = catalog.find((a) => a.sku === merch.sku)?.providerAssetRel ?? null;
      const adaptedDarkArtPath = ["black", "dark-heather"].includes(colorOpt.slug)
        ? join(
            cwd,
            `.infinity/commerce/club-throttle-artwork/dark-garment-adaptations/${merch.sku.toLowerCase()}-black-garment-adapted.png`,
          )
        : null;
      const bundle = await evaluateColorwayQcBundle({
        heroPng: heroBuf,
        sku: merch.sku,
        garment_color: colorOpt.slug,
        cwd,
        canonicalArtPath,
        adaptedDarkArtPath,
      });
      const merchandising_media_identity = `${merch.sku}|${colorOpt.slug}|hero-back-v1`;
      color_rows.push({
        sku: merch.sku,
        slug: merch.slug,
        garment_color: colorOpt.slug,
        merchandising_media_identity,
        hero_back_public: heroPublic,
        art_detail_public: heroPublic,
        PRODUCT_HERO_GARMENT_RENDER_QC: bundle.PRODUCT_HERO_GARMENT_RENDER_QC,
      });
      eligibility_rows.push({
        ...bundle,
        slug: merch.slug,
        hero_back_public: heroPublic,
        audited_at: new Date().toISOString(),
      });
    }
  }

  const manifestPath = join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL);
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>)
    : {};
  manifest.color_merch_rows = color_rows;
  manifest.color_merch_generated_at = new Date().toISOString();
  manifest.COLOR_MERCH_MEDIA_REGISTRY_QC = color_rows.length >= 11 ? "PASS" : "FAIL";
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const eligibilityPath = join(cwd, CLUB_THROTTLE_COLORWAY_ELIGIBILITY_REL);
  mkdirSync(dirname(eligibilityPath), { recursive: true });
  writeFileSync(eligibilityPath, `${JSON.stringify({ generated_at: new Date().toISOString(), rows: eligibility_rows }, null, 2)}\n`);

  const ashRows = color_rows.filter((r) => r.garment_color === "ash");
  const blackRows = color_rows.filter((r) => r.garment_color === "black");
  const ashPass = ashRows.length === 7 && ashRows.every((r) => r.PRODUCT_HERO_GARMENT_RENDER_QC === "PASS");
  const eligibleBlack = eligibility_rows.filter((r) => r.garment_color === "black" && r.STOREFRONT_VARIANT_ELIGIBLE);
  const blackPass = eligibleBlack.length > 0 && eligibility_rows.filter((r) => r.garment_color === "black").every((r) => r.STOREFRONT_VARIANT_ELIGIBLE || r.failure_codes.length > 0);
  const storefrontEligiblePass = eligibility_rows.every((r) => r.STOREFRONT_VARIANT_ELIGIBLE || r.garment_color === "white");

  return {
    COLOR_SPECIFIC_MERCHANDISING_RENDER_QC: ashPass && eligibility_rows.every((r) => r.COLOR_SPECIFIC_MERCHANDISING_RENDER_QC === "PASS" || !r.STOREFRONT_VARIANT_ELIGIBLE) ? "PASS" : "FAIL",
    ASH_MERCHANDISING_RENDER_QC: ashPass ? "PASS" : "FAIL",
    BLACK_SAFE_SKU_MERCHANDISING_RENDER_QC: blackPass ? "PASS" : "FAIL",
    COLOR_MERCH_MEDIA_REGISTRY_QC: color_rows.length >= 11 ? "PASS" : "FAIL",
    STOREFRONT_FAIL_CLOSED_QC: storefrontEligiblePass ? "PASS" : "FAIL",
    color_rows,
  };
}

export function lookupColorMerchHero(cwd: string, sku: string, garment_color: string): string | null {
  const manifestPath = join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL);
  if (!existsSync(manifestPath)) return null;
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as { color_merch_rows?: ColorMerchMediaRow[] };
  const row = (parsed.color_merch_rows ?? []).find((r) => r.sku === sku && r.garment_color === garment_color);
  return row?.hero_back_public ?? null;
}

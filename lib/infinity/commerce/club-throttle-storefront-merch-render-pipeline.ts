import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { clubThrottleCanonicalCatalog } from "./club-throttle-canonical-apparel-catalog.ts";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { GILDAN_5000_LARGE_BACK_PROFILE } from "./gelato-gildan5000-large-back-profile.ts";
import {
  GARMENT_BACK_PRINT_RECT,
  GARMENT_CANVAS,
  garmentBackBaseSvg,
  garmentBackPrintMaskSvg,
  garmentFrontBaseSvg,
} from "./club-throttle-storefront-garment-template-v2.ts";
import {
  buildFounderHeroComparisonSheet,
  evaluateStorefrontProductGarmentRenderQc,
} from "./club-throttle-storefront-garment-render-qc.ts";

export const CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL =
  ".infinity/commerce/club-throttle-storefront-merch-manifest.json" as const;

export const STOREFRONT_MERCH_PUBLIC_PREFIX = "/storefront-merch" as const;

export type StorefrontMerchAssetRow = {
  sku: string;
  slug: string;
  hero_back_public: string;
  art_detail_public: string;
  front_blank_public: string;
  gallery_public: string[];
  provider_asset_sha256: string;
  STOREFRONT_MERCH_PLACEMENT_QC: "PASS" | "FAIL";
  STOREFRONT_PRODUCT_IMAGE_QC: "PASS" | "FAIL";
  PRODUCT_HERO_GARMENT_RENDER_QC: "PASS" | "FAIL";
};

async function renderTeeBackHero(providerPath: string): Promise<Buffer> {
  const w = GARMENT_CANVAS.width;
  const h = GARMENT_CANVAS.height;
  const r = GARMENT_BACK_PRINT_RECT;
  const printW = Math.round(w * r.width);
  const printH = Math.round(h * r.height);

  const art = await sharp(providerPath)
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
  const base = await sharp(Buffer.from(garmentBackBaseSvg())).png().toBuffer();
  return sharp(base).composite([{ input: maskedArt, blend: "over" }]).png().toBuffer();
}

async function renderArtDetail(providerPath: string): Promise<Buffer> {
  return sharp(providerPath)
    .resize(1000, 1000, { fit: "inside", background: { r: 247, g: 245, b: 241, alpha: 1 } })
    .png()
    .toBuffer();
}

async function renderFrontBlank(): Promise<Buffer> {
  return sharp(Buffer.from(garmentFrontBaseSvg())).png().toBuffer();
}

export async function runClubThrottleStorefrontMerchAssetPipeline(cwd = process.cwd()): Promise<{
  STOREFRONT_MERCHANDISING_ASSET_PIPELINE: "PASS" | "FAIL";
  rows: StorefrontMerchAssetRow[];
  category_images: Record<string, string>;
}> {
  const apparel = clubThrottleCanonicalCatalog(cwd);
  const outDir = join(cwd, "public/storefront-merch");
  const catDir = join(outDir, "categories");
  mkdirSync(catDir, { recursive: true });

  const rows: StorefrontMerchAssetRow[] = [];
  const frontBlank = await renderFrontBlank();
  const frontBlankPath = join(outDir, "shared-front-blank.png");
  writeFileSync(frontBlankPath, frontBlank);

  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) {
    const art = apparel.find((a) => a.sku === merch.sku);
    const providerRel =
      merch.sku === "KNEE_DOWN" && art?.kneeDownLineWeightProviderRel
        ? art.kneeDownLineWeightProviderRel
        : art?.providerAssetRel ?? "";
    if (!providerRel || !existsSync(providerRel)) {
      rows.push({
        sku: merch.sku,
        slug: merch.slug,
        hero_back_public: "",
        art_detail_public: "",
        front_blank_public: `${STOREFRONT_MERCH_PUBLIC_PREFIX}/shared-front-blank.png`,
        gallery_public: [],
        provider_asset_sha256: "",
        STOREFRONT_MERCH_PLACEMENT_QC: "FAIL",
        STOREFRONT_PRODUCT_IMAGE_QC: "FAIL",
        PRODUCT_HERO_GARMENT_RENDER_QC: "FAIL",
      });
      continue;
    }
    const providerBuf = readFileSync(providerRel);
    const sha = createHash("sha256").update(providerBuf).digest("hex");
    const hero = await renderTeeBackHero(providerRel);
    const detail = await renderArtDetail(providerRel);
    const base = merch.slug.replace(/-tee$/, "");
    const heroFile = `${base}-hero-back.png`;
    const detailFile = `${base}-art-detail.png`;
    writeFileSync(join(outDir, heroFile), hero);
    writeFileSync(join(outDir, detailFile), detail);

    const garmentQc = await evaluateStorefrontProductGarmentRenderQc({ heroPng: hero, sku: merch.sku });

    const heroPublic = `${STOREFRONT_MERCH_PUBLIC_PREFIX}/${heroFile}`;
    const detailPublic = `${STOREFRONT_MERCH_PUBLIC_PREFIX}/${detailFile}`;
    const frontPublic = `${STOREFRONT_MERCH_PUBLIC_PREFIX}/shared-front-blank.png`;
    rows.push({
      sku: merch.sku,
      slug: merch.slug,
      hero_back_public: heroPublic,
      art_detail_public: detailPublic,
      front_blank_public: frontPublic,
      gallery_public: [heroPublic, detailPublic, frontPublic],
      provider_asset_sha256: sha,
      STOREFRONT_MERCH_PLACEMENT_QC: garmentQc.PRODUCT_HERO_GARMENT_RENDER_QC,
      STOREFRONT_PRODUCT_IMAGE_QC: garmentQc.PRODUCT_HERO_GARMENT_RENDER_QC,
      PRODUCT_HERO_GARMENT_RENDER_QC: garmentQc.PRODUCT_HERO_GARMENT_RENDER_QC,
    });
  }

  const heroPaths = rows
    .filter((r) => r.hero_back_public)
    .map((r) => ({ sku: r.sku, heroPath: join(outDir, r.hero_back_public.replace(`${STOREFRONT_MERCH_PUBLIC_PREFIX}/`, "")) }));
  if (heroPaths.length === 7) {
    await buildFounderHeroComparisonSheet({
      rows: heroPaths,
      cwd,
      outRel: ".infinity/commerce/club-throttle-founder-storefront-hero-comparison-sheet.png",
    });
  }

  const categoryImages: Record<string, string> = {};
  const heroBySku = new Map(rows.map((r) => [r.sku, r.hero_back_public]));
  const composites: Array<{ key: string; skus: string[] }> = [
    { key: "sport-track", skus: ["KNEE_DOWN", "APEX_LINE"] },
    { key: "adventure-dualsport", skus: ["DUALSPORT_DUST"] },
    { key: "garage-culture", skus: ["CLEAN_RPM", "ZERO_CHILL_GARAGE"] },
    { key: "street-night", skus: ["LOT_LINE"] },
    { key: "bagger-cruiser", skus: ["BAGGER_SEND"] },
  ];
  for (const cat of composites) {
    const paths = cat.skus.map((sku) => heroBySku.get(sku)).filter(Boolean) as string[];
    if (!paths.length) continue;
    const buffers = await Promise.all(
      paths.map((p) => sharp(join(cwd, "public", p.replace(/^\//, ""))).resize(580, 720, { fit: "cover" }).png().toBuffer()),
    );
    const tileW = 600;
    const tileH = 720;
    const canvasW = buffers.length > 1 ? tileW * 2 : tileW;
    const composite = buffers.map((buf, i) => ({
      input: buf,
      left: i * tileW,
      top: 0,
    }));
    const catBuf = await sharp({
      create: { width: canvasW, height: tileH, channels: 3, background: { r: 247, g: 245, b: 241 } },
    })
      .composite(composite)
      .png()
      .toBuffer();
    const catName = `${cat.key}-category.png`;
    writeFileSync(join(catDir, catName), catBuf);
    categoryImages[cat.key] = `${STOREFRONT_MERCH_PUBLIC_PREFIX}/categories/${catName}`;
  }

  const pipelinePass =
    rows.length === 7 && rows.every((r) => r.PRODUCT_HERO_GARMENT_RENDER_QC === "PASS");
  const manifest = {
    generated_at: new Date().toISOString(),
    pipeline: "CLUB_THROTTLE_STOREFRONT_MERCH_RENDER_PIPELINE_V2",
    profile: GILDAN_5000_LARGE_BACK_PROFILE.profile,
    PRODUCT_HERO_GARMENT_RENDER_QC: pipelinePass ? "PASS" : "FAIL",
    STOREFRONT_MERCHANDISING_ASSET_PIPELINE: pipelinePass ? "PASS" : "FAIL",
    rows,
    category_images: categoryImages,
  };
  writeFileSync(join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL), `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    STOREFRONT_MERCHANDISING_ASSET_PIPELINE: pipelinePass ? "PASS" : "FAIL",
    PRODUCT_HERO_GARMENT_RENDER_QC: pipelinePass ? "PASS" : "FAIL",
    rows,
    category_images: categoryImages,
  };
}

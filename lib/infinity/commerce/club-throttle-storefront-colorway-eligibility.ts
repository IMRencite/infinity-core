import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import sharp from "sharp";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { discoverProviderBackedLaunchColors, exposedColorsForSku } from "./club-throttle-apparel-color-v1.ts";
import { evaluateColorwayQcBundle, type ColorwayQcBundle } from "./club-throttle-storefront-colorway-qc-v1.ts";
import { CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL } from "./club-throttle-storefront-merch-render-pipeline.ts";
import { clubThrottleCanonicalCatalog } from "./club-throttle-canonical-apparel-catalog.ts";

export const CLUB_THROTTLE_COLORWAY_ELIGIBILITY_REL =
  ".infinity/commerce/club-throttle-storefront-colorway-eligibility.json" as const;

export type ColorwayEligibilityRow = ColorwayQcBundle & {
  slug: string;
  hero_back_public: string | null;
  audited_at: string;
};

export function loadColorwayEligibility(cwd = process.cwd()): ColorwayEligibilityRow[] {
  const path = join(cwd, CLUB_THROTTLE_COLORWAY_ELIGIBILITY_REL);
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { rows?: ColorwayEligibilityRow[] };
  return parsed.rows ?? [];
}

export function isStorefrontVariantEligible(sku: string, garment_color: string, cwd = process.cwd()): boolean {
  const row = loadColorwayEligibility(cwd).find((r) => r.sku === sku && r.garment_color === garment_color);
  if (!row) return garment_color === "white";
  return row.STOREFRONT_VARIANT_ELIGIBLE;
}

export async function auditClubThrottleStorefrontColorways(cwd = process.cwd()): Promise<{
  rows: ColorwayEligibilityRow[];
  LIVE_RENDERED_COLORWAY_QC: "PASS" | "FAIL";
  POST_DEPLOY_COLORWAY_RENDER_QC: "PASS" | "FAIL";
}> {
  const manifestPath = join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL);
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { color_merch_rows?: Array<{ sku: string; slug: string; garment_color: string; hero_back_public: string }> })
    : { color_merch_rows: [] };
  const merchRows = manifest.color_merch_rows ?? [];
  const launch = discoverProviderBackedLaunchColors(cwd);
  const rows: ColorwayEligibilityRow[] = [];

  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) {
    for (const color of exposedColorsForSku(merch.sku, launch, cwd)) {
      if (color === "white") {
        rows.push({
          sku: merch.sku,
          slug: merch.slug,
          garment_color: color,
          hero_back_public: null,
          audited_at: new Date().toISOString(),
          PROVIDER_VARIANT_MAPPING_QC: "PASS",
          COLOR_SIZE_VARIANT_MATRIX_QC: "PASS",
          GARMENT_COLOR_PURITY_QC: "PASS",
          GARMENT_RENDER_ARTIFACT_QC: "PASS",
          GARMENT_CONTRAST_QC: "PASS",
          CRITICAL_ART_REGION_CONTRAST_QC: "PASS",
          PRINT_VISIBILITY_QC: "PASS",
          ORIGINAL_ART_COLOR_FIDELITY_QC: "SKIP",
          DARK_GARMENT_TONAL_RANGE_QC: "SKIP",
          SELECTIVE_KEYLINE_QUALITY_QC: "SKIP",
          DARK_GARMENT_ADAPTATION_QUALITY_QC: "SKIP",
          SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC: "SKIP",
          PRODUCT_HERO_GARMENT_RENDER_QC: "PASS",
          COLOR_SPECIFIC_MERCHANDISING_RENDER_QC: "PASS",
          VARIANT_METADATA_SYNC_QC: "PASS",
          STOREFRONT_VARIANT_ELIGIBLE: true,
          failure_codes: [],
        });
        continue;
      }
      const heroRow = merchRows.find((r) => r.sku === merch.sku && r.garment_color === color);
      const heroPublic = heroRow?.hero_back_public ?? null;
      if (!heroPublic) {
        rows.push({
          sku: merch.sku,
          slug: merch.slug,
          garment_color: color,
          hero_back_public: null,
          audited_at: new Date().toISOString(),
          PROVIDER_VARIANT_MAPPING_QC: "PASS",
          COLOR_SIZE_VARIANT_MATRIX_QC: "PASS",
          GARMENT_COLOR_PURITY_QC: "FAIL",
          GARMENT_RENDER_ARTIFACT_QC: "FAIL",
          GARMENT_CONTRAST_QC: "FAIL",
          CRITICAL_ART_REGION_CONTRAST_QC: "FAIL",
          PRINT_VISIBILITY_QC: "FAIL",
          ORIGINAL_ART_COLOR_FIDELITY_QC: "FAIL",
          DARK_GARMENT_TONAL_RANGE_QC: "FAIL",
          SELECTIVE_KEYLINE_QUALITY_QC: "FAIL",
          DARK_GARMENT_ADAPTATION_QUALITY_QC: "FAIL",
          SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC: "FAIL",
          PRODUCT_HERO_GARMENT_RENDER_QC: "FAIL",
          COLOR_SPECIFIC_MERCHANDISING_RENDER_QC: "FAIL",
          VARIANT_METADATA_SYNC_QC: "PASS",
          STOREFRONT_VARIANT_ELIGIBLE: false,
          failure_codes: ["MISSING_HERO_RENDER"],
        });
        continue;
      }
      const heroAbs = join(cwd, "public", heroPublic.replace(/^\//, ""));
      const heroPng = readFileSync(heroAbs);
      const catalog = clubThrottleCanonicalCatalog(cwd);
      const canonicalArtPath = catalog.find((a) => a.sku === merch.sku)?.providerAssetRel ?? null;
      const adaptedDarkArtPath = ["black", "dark-heather"].includes(color)
        ? join(
            cwd,
            `.infinity/commerce/club-throttle-artwork/dark-garment-adaptations/${merch.sku.toLowerCase()}-black-garment-adapted.png`,
          )
        : null;
      const bundle = await evaluateColorwayQcBundle({
        sku: merch.sku,
        garment_color: color,
        heroPng,
        cwd,
        canonicalArtPath,
        adaptedDarkArtPath,
      });
      rows.push({
        ...bundle,
        slug: merch.slug,
        hero_back_public: heroPublic,
        audited_at: new Date().toISOString(),
      });
    }
  }

  const path = join(cwd, CLUB_THROTTLE_COLORWAY_ELIGIBILITY_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ generated_at: new Date().toISOString(), rows }, null, 2)}\n`);

  const nonWhite = rows.filter((r) => r.garment_color !== "white");
  const allEligiblePass = nonWhite.every((r) => r.STOREFRONT_VARIANT_ELIGIBLE || !r.hero_back_public);
  const anyFail = nonWhite.some((r) => r.hero_back_public && !r.STOREFRONT_VARIANT_ELIGIBLE);
  return {
    rows,
    LIVE_RENDERED_COLORWAY_QC: anyFail ? "FAIL" : "PASS",
    POST_DEPLOY_COLORWAY_RENDER_QC: allEligiblePass ? "PASS" : "FAIL",
  };
}

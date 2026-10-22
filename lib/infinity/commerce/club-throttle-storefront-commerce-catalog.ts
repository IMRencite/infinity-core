import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD, CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import {
  CLUB_THROTTLE_LAUNCH_GARMENT,
  CLUB_THROTTLE_SHOP_CATEGORIES,
  categoriesForSku,
  type ClubThrottleShopCategorySlug,
} from "./club-throttle-shop-taxonomy.ts";
import {
  CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL,
  type StorefrontMerchAssetRow,
} from "./club-throttle-storefront-merch-render-pipeline.ts";
import { lookupColorMerchHero } from "./club-throttle-storefront-color-merch-pipeline.ts";
import {
  CLUB_THROTTLE_DEFAULT_GARMENT_COLOR,
  colorOptionsForProduct,
  discoverProviderBackedLaunchColors,
  storefrontExposedColorsForSku,
} from "./club-throttle-apparel-color-v1.ts";
import { auditClubThrottleVariantMap } from "./club-throttle-variant-map.ts";
import { CLUB_THROTTLE_CORE_TEE, CLUB_THROTTLE_SIZE_CHART } from "./club-throttle-catalog.ts";
import { listCustomerVisibleAutonomousStorefrontProducts } from "./club-throttle-autonomous-storefront-publication-v1.ts";

export type StorefrontCommerceProduct = {
  sku: string;
  slug: string;
  product_id: string;
  title: string;
  price_usd: number;
  short_description: string;
  design_story: string;
  garment_color: string;
  default_color: string;
  colors: readonly {
    slug: string;
    display_name: string;
    swatch_hex: string;
    artwork_identity: string;
    sizes: readonly string[];
    primary_image: string;
    hover_image: string;
  }[];
  garment_summary: string;
  size_range_label: string;
  checkout_sizes: readonly string[];
  shop_categories: ClubThrottleShopCategorySlug[];
  category_labels: string[];
  riding_style: string[];
  search_blob: string;
  primary_image: string;
  hover_image: string;
  gallery: string[];
  image_kind: "STOREFRONT_MERCHANDISING_RENDER";
  released_at: string;
};

function loadMerchRows(cwd: string): StorefrontMerchAssetRow[] {
  const path = join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL);
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { rows?: StorefrontMerchAssetRow[] };
  return parsed.rows ?? [];
}

export function buildClubThrottleStorefrontCommerceCatalog(cwd = process.cwd()): {
  products: StorefrontCommerceProduct[];
  category_images: Record<string, string>;
  shop_categories: typeof CLUB_THROTTLE_SHOP_CATEGORIES;
  sizes: typeof CLUB_THROTTLE_SIZE_CHART;
  garment_launch: typeof CLUB_THROTTLE_LAUNCH_GARMENT;
  core_garment_facts: typeof CLUB_THROTTLE_CORE_TEE.garment;
  retail_usd: number;
} {
  const merchRows = loadMerchRows(cwd);
  const manifestPath = join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL);
  const category_images =
    existsSync(manifestPath) ?
      ((JSON.parse(readFileSync(manifestPath, "utf8")) as { category_images?: Record<string, string> }).category_images ?? {})
    : {};
  const variant = auditClubThrottleVariantMap(cwd);
  const launchColors = discoverProviderBackedLaunchColors(cwd);
  const canonicalProducts: StorefrontCommerceProduct[] = CLUB_THROTTLE_SEVEN_SHIRT_MERCH.map((merch) => {
    const assets = merchRows.find((r) => r.sku === merch.sku);
    const hero = assets?.hero_back_public ?? "";
    const detail = assets?.art_detail_public ?? merch.public_asset_url;
    if (!hero) {
      throw new Error(
        `Missing storefront merch hero for ${merch.sku}. Run scripts/run-club-throttle-storefront-merch-assets.mjs first.`,
      );
    }
    const cats = categoriesForSku(merch.sku);
    const styles = cats.map((c) => c.riding_style);
    const whiteGarment = {
      ...CLUB_THROTTLE_CORE_TEE.garment,
      name: "Gildan 5000 Heavy Cotton tee",
      colors: ["white"],
      print_method: "Direct-to-garment large back",
    };
    const colorOptions = colorOptionsForProduct({
      sku: merch.sku,
      checkout_sizes: variant.SUPPORTED_SIZES,
      launch_colors: storefrontExposedColorsForSku(merch.sku, launchColors, cwd),
      cwd,
    });
    const defaultColor = colorOptions.find((c) => c.slug === CLUB_THROTTLE_DEFAULT_GARMENT_COLOR)?.slug ?? colorOptions[0]?.slug ?? "white";
    const colors = colorOptions.map((c) => {
      const colorHero = lookupColorMerchHero(cwd, merch.sku, c.slug) ?? hero;
      return {
        slug: c.slug,
        display_name: c.display_name,
        swatch_hex: c.swatch_hex,
        artwork_identity: c.artwork_identity,
        sizes: c.sizes,
        primary_image: colorHero,
        hover_image: c.slug === "white" ? detail : colorHero,
      };
    });
    return {
      sku: merch.sku,
      slug: merch.slug,
      product_id: merch.product_id,
      title: merch.title,
      price_usd: CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD,
      short_description: merch.short_description,
      design_story: merch.design_story,
      garment_color: defaultColor,
      default_color: defaultColor,
      colors,
      garment_summary: `${CLUB_THROTTLE_LAUNCH_GARMENT.name} · ${colors.find((c) => c.slug === defaultColor)?.display_name ?? "White"}`,
      size_range_label:
        variant.SUPPORTED_SIZES.length > 1 ?
          `${variant.SUPPORTED_SIZES[0]}–${variant.SUPPORTED_SIZES[variant.SUPPORTED_SIZES.length - 1]}`
        : CLUB_THROTTLE_LAUNCH_GARMENT.size_range_label,
      checkout_sizes: variant.SUPPORTED_SIZES,
      shop_categories: ["all-tees", ...cats.map((c) => c.slug)],
      category_labels: cats.map((c) => c.name),
      riding_style: styles,
      search_blob: `${merch.title} ${merch.short_description} ${merch.design_story} ${merch.sku} ${styles.join(" ")} ${cats.map((c) => c.search_keywords.join(" ")).join(" ")}`.toLowerCase(),
      primary_image: hero,
      hover_image: detail,
      gallery: assets?.gallery_public?.length ? assets.gallery_public : [hero, detail],
      image_kind: "STOREFRONT_MERCHANDISING_RENDER",
      released_at: "2026-10-07",
    };
  });

  const autonomousRows = listCustomerVisibleAutonomousStorefrontProducts(cwd);
  const autonomousProducts: StorefrontCommerceProduct[] = autonomousRows.map((row) => {
    const cats = categoriesForSku("LOT_LINE");
    const styles = cats.map((c) => c.riding_style);
    return {
      sku: row.sku,
      slug: row.slug,
      product_id: row.product_id,
      title: row.title,
      price_usd: row.price_usd,
      short_description: row.short_description,
      design_story: row.design_story,
      garment_color: row.default_color,
      default_color: row.default_color,
      colors: [
        {
          slug: row.default_color,
          display_name: row.default_color,
          swatch_hex: "#ffffff",
          artwork_identity: row.source_artwork_hash,
          sizes: row.checkout_sizes,
          primary_image: row.public_hero_path,
          hover_image: row.public_art_detail_path,
        },
      ],
      garment_summary: "Gildan 5000 Heavy Cotton tee · Autonomous creative",
      size_range_label:
        row.checkout_sizes.length > 1 ?
          `${row.checkout_sizes[0]}–${row.checkout_sizes[row.checkout_sizes.length - 1]}`
        : "One size",
      checkout_sizes: row.checkout_sizes,
      shop_categories: ["all-tees"],
      category_labels: ["All Tees"],
      riding_style: styles,
      search_blob: `${row.title} ${row.short_description} ${row.design_story} ${row.sku} autonomous`.toLowerCase(),
      primary_image: row.public_hero_path,
      hover_image: row.public_art_detail_path,
      gallery: [row.public_hero_path, row.public_art_detail_path],
      image_kind: "STOREFRONT_MERCHANDISING_RENDER",
      released_at: row.publication_timestamp.slice(0, 10),
    };
  });

  const products = [...canonicalProducts, ...autonomousProducts];

  return {
    products,
    category_images,
    shop_categories: CLUB_THROTTLE_SHOP_CATEGORIES,
    sizes: CLUB_THROTTLE_SIZE_CHART,
    garment_launch: CLUB_THROTTLE_LAUNCH_GARMENT,
    core_garment_facts: {
      ...CLUB_THROTTLE_CORE_TEE.garment,
      name: "Gildan 5000 Heavy Cotton tee",
      colors: ["white"],
      print_method: "Direct-to-garment large back",
    } as unknown as typeof CLUB_THROTTLE_CORE_TEE.garment,
    retail_usd: CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD,
  };
}

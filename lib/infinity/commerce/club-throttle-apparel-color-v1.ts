import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { auditClubThrottleVariantMap, resolveGelatoVariantUid } from "./club-throttle-variant-map.ts";
import { CLUB_THROTTLE_VARIANT_BINDINGS_REL } from "./club-throttle-variant-bindings-path.ts";
import { isStorefrontVariantEligible } from "./club-throttle-storefront-colorway-eligibility.ts";

/** Normalized customer-facing color slug (lowercase). */
export type ClubThrottleGarmentColorSlug = string;

export type ClubThrottleColorOption = {
  slug: ClubThrottleGarmentColorSlug;
  display_name: string;
  swatch_hex: string;
  color_family: "light" | "dark" | "neutral";
  artwork_identity: string;
  /** Provider-backed sizes for this color on this SKU. */
  sizes: readonly string[];
};

export const CLUB_THROTTLE_DEFAULT_GARMENT_COLOR: ClubThrottleGarmentColorSlug = "white";

const COLOR_META: Record<
  string,
  { display_name: string; swatch_hex: string; color_family: "light" | "dark" | "neutral"; artwork_suffix: string }
> = {
  white: { display_name: "White", swatch_hex: "#f7f5f1", color_family: "light", artwork_suffix: "light-garment" },
  ash: { display_name: "Ash", swatch_hex: "#b8b5ae", color_family: "neutral", artwork_suffix: "light-garment" },
  black: { display_name: "Black", swatch_hex: "#1a1816", color_family: "dark", artwork_suffix: "dark-garment" },
  navy: { display_name: "Navy", swatch_hex: "#1e2a44", color_family: "dark", artwork_suffix: "dark-garment" },
  charcoal: { display_name: "Charcoal", swatch_hex: "#3a3a3a", color_family: "dark", artwork_suffix: "dark-garment" },
  "dark-heather": {
    display_name: "Dark Heather",
    swatch_hex: "#4a4f55",
    color_family: "dark",
    artwork_suffix: "dark-garment",
  },
  "light-blue": {
    display_name: "Light Blue",
    swatch_hex: "#a8c5db",
    color_family: "light",
    artwork_suffix: "light-garment",
  },
  natural: { display_name: "Natural", swatch_hex: "#e8dcc8", color_family: "neutral", artwork_suffix: "light-garment" },
};

export function garmentSwatchHex(color: ClubThrottleGarmentColorSlug): string {
  return COLOR_META[color]?.swatch_hex ?? "#cccccc";
}

export function isDarkGarmentColor(color: ClubThrottleGarmentColorSlug): boolean {
  const family = COLOR_META[color]?.color_family;
  return family === "dark";
}

export function normalizeGarmentColorSlug(input: string | undefined | null): ClubThrottleGarmentColorSlug {
  const slug = (input ?? CLUB_THROTTLE_DEFAULT_GARMENT_COLOR).trim().toLowerCase();
  return slug || CLUB_THROTTLE_DEFAULT_GARMENT_COLOR;
}

export function artworkIdentityForSkuColor(sku: string, color: ClubThrottleGarmentColorSlug): string {
  const meta = COLOR_META[color];
  const suffix = meta?.artwork_suffix ?? "light-garment";
  return `${sku.toLowerCase().replace(/_/g, "-")}-${suffix}-art`;
}

/** Provider-truthful launch colors (union). White always live; ash/black when any canonical SKU resolves at M. */
export function discoverProviderBackedLaunchColors(cwd = process.cwd()): ClubThrottleGarmentColorSlug[] {
  auditClubThrottleVariantMap(cwd);
  const skus = [
    "LOT_LINE",
    "CLEAN_RPM",
    "DUALSPORT_DUST",
    "KNEE_DOWN",
    "ZERO_CHILL_GARAGE",
    "APEX_LINE",
    "BAGGER_SEND",
  ] as const;
  const backed: ClubThrottleGarmentColorSlug[] = [CLUB_THROTTLE_DEFAULT_GARMENT_COLOR];
  const colorSet = new Set<string>();
  const bindingsPath = join(cwd, CLUB_THROTTLE_VARIANT_BINDINGS_REL);
  if (existsSync(bindingsPath)) {
    const parsed = JSON.parse(readFileSync(bindingsPath, "utf8")) as {
      bindings?: Array<{ variants_by_color?: Record<string, Record<string, { variant_uid?: string }>> }>;
    };
    for (const row of parsed.bindings ?? []) {
      for (const [color, bySize] of Object.entries(row.variants_by_color ?? {})) {
        if (CHECKOUT_SIZES.every((size) => bySize[size]?.variant_uid?.trim())) colorSet.add(color);
      }
    }
  }
  for (const color of ["ash", "black", "dark-heather", "light-blue", "natural"] as const) {
    if (colorSet.has(color)) backed.push(color);
    else {
      const anySku = skus.some((sku) => resolveGelatoVariantUid({ sku, size: "M", color, cwd }).ok);
      if (anySku) backed.push(color);
    }
  }
  return [...new Set(backed)];
}

export function colorOptionsForProduct(input: {
  sku: string;
  checkout_sizes: readonly string[];
  launch_colors: readonly ClubThrottleGarmentColorSlug[];
  cwd?: string;
}): ClubThrottleColorOption[] {
  const cwd = input.cwd ?? process.cwd();
  return input.launch_colors
    .map((slug) => {
      const meta = COLOR_META[slug] ?? {
        display_name: slug.charAt(0).toUpperCase() + slug.slice(1),
        swatch_hex: "#cccccc",
        color_family: "neutral" as const,
        artwork_suffix: "light-garment",
      };
      const sizes = input.checkout_sizes.filter(
        (size) => resolveGelatoVariantUid({ sku: input.sku, size, color: slug, cwd }).ok,
      );
      return {
        slug,
        display_name: meta.display_name,
        swatch_hex: meta.swatch_hex,
        color_family: meta.color_family,
        artwork_identity: artworkIdentityForSkuColor(input.sku, slug),
        sizes,
      };
    })
    .filter((row) => row.sizes.length > 0);
}

const CANONICAL_SKUS = [
  "LOT_LINE",
  "CLEAN_RPM",
  "DUALSPORT_DUST",
  "KNEE_DOWN",
  "ZERO_CHILL_GARAGE",
  "APEX_LINE",
  "BAGGER_SEND",
] as const;

const CHECKOUT_SIZES = ["S", "M", "L", "XL", "2XL"] as const;

/** Planned final assortment: all SKUs × selected launch colors. */
export const CLUB_THROTTLE_TARGET_LAUNCH_COLORS = ["white", "ash", "black"] as const;

export function exposedColorsForSku(
  sku: string,
  launch_colors: readonly ClubThrottleGarmentColorSlug[],
  cwd = process.cwd(),
): ClubThrottleGarmentColorSlug[] {
  return launch_colors.filter((color) =>
    CHECKOUT_SIZES.some((size) => resolveGelatoVariantUid({ sku, size, color, cwd }).ok),
  );
}

/** Customer-facing colors on PDP/cart — fail-closed on rendered colorway QC (provider-backed ≠ ready). */
export function storefrontExposedColorsForSku(
  sku: string,
  launch_colors: readonly ClubThrottleGarmentColorSlug[],
  cwd = process.cwd(),
): ClubThrottleGarmentColorSlug[] {
  return exposedColorsForSku(sku, launch_colors, cwd).filter((color) =>
    isStorefrontVariantEligible(sku, color, cwd),
  );
}

/** PASS when every exposed product/color has full S–2XL provider backing (partial assortments OK). */
export function auditLiveColorSizeVariantMatrix(cwd = process.cwd()): {
  LIVE_COLOR_SIZE_VARIANT_MATRIX_QC: "PASS" | "FAIL";
  CUSTOMER_OPTION_PROVIDER_MAPPING_QC: "PASS" | "FAIL";
  launch_colors: ClubThrottleGarmentColorSlug[];
  unmapped_exposed: string[];
  CURRENT_LIVE_COLORS_BY_PRODUCT: Record<string, ClubThrottleGarmentColorSlug[]>;
} {
  const launch_colors = discoverProviderBackedLaunchColors(cwd);
  const unmapped_exposed: string[] = [];
  const CURRENT_LIVE_COLORS_BY_PRODUCT: Record<string, ClubThrottleGarmentColorSlug[]> = {};
  for (const sku of CANONICAL_SKUS) {
    const exposed = storefrontExposedColorsForSku(sku, launch_colors, cwd);
    CURRENT_LIVE_COLORS_BY_PRODUCT[sku] = exposed;
    for (const color of exposed) {
      for (const size of CHECKOUT_SIZES) {
        const r = resolveGelatoVariantUid({ sku, size, color, cwd });
        if (!r.ok) unmapped_exposed.push(`${sku}:${color}:${size}`);
      }
    }
  }
  const pass = unmapped_exposed.length === 0 && launch_colors.length > 0;
  return {
    LIVE_COLOR_SIZE_VARIANT_MATRIX_QC: pass ? "PASS" : "FAIL",
    CUSTOMER_OPTION_PROVIDER_MAPPING_QC: pass ? "PASS" : "FAIL",
    launch_colors,
    unmapped_exposed,
    CURRENT_LIVE_COLORS_BY_PRODUCT,
  };
}

/** Provider-backed planned catalog (all SKUs × target colors). */
export function auditProviderTargetAssortmentCompleteness(cwd = process.cwd()): {
  PROVIDER_TARGET_ASSORTMENT_COMPLETENESS_QC: "PASS" | "PENDING";
  missing: string[];
} {
  const missing: string[] = [];
  for (const sku of CANONICAL_SKUS) {
    for (const color of CLUB_THROTTLE_TARGET_LAUNCH_COLORS) {
      const complete = CHECKOUT_SIZES.every((size) => resolveGelatoVariantUid({ sku, size, color, cwd }).ok);
      if (!complete) missing.push(`${sku}:${color}`);
    }
  }
  return {
    PROVIDER_TARGET_ASSORTMENT_COMPLETENESS_QC: missing.length === 0 ? "PASS" : "PENDING",
    missing,
  };
}

/** Customer-facing storefront completeness (exposed colors × sizes). */
export function auditLiveStorefrontTargetAssortmentCompleteness(cwd = process.cwd()): {
  LIVE_STOREFRONT_TARGET_ASSORTMENT_COMPLETENESS_QC: "PASS" | "PENDING";
  missing: string[];
} {
  const launch_colors = discoverProviderBackedLaunchColors(cwd);
  const missing: string[] = [];
  for (const sku of CANONICAL_SKUS) {
    for (const color of CLUB_THROTTLE_TARGET_LAUNCH_COLORS) {
      if (!launch_colors.includes(color)) {
        missing.push(`${sku}:${color}`);
        continue;
      }
      const exposed = storefrontExposedColorsForSku(sku, launch_colors, cwd);
      if (!exposed.includes(color)) {
        missing.push(`${sku}:${color}:not_exposed`);
        continue;
      }
      for (const size of CHECKOUT_SIZES) {
        if (!resolveGelatoVariantUid({ sku, size, color, cwd }).ok) missing.push(`${sku}:${color}:${size}`);
      }
    }
  }
  return {
    LIVE_STOREFRONT_TARGET_ASSORTMENT_COMPLETENESS_QC: missing.length === 0 ? "PASS" : "PENDING",
    missing,
  };
}

/** @deprecated Use auditProviderTargetAssortmentCompleteness */
export function auditTargetAssortmentCompleteness(cwd = process.cwd()): {
  TARGET_ASSORTMENT_COMPLETENESS_QC: "PASS" | "PENDING";
  missing: string[];
} {
  const provider = auditProviderTargetAssortmentCompleteness(cwd);
  return {
    TARGET_ASSORTMENT_COMPLETENESS_QC: provider.PROVIDER_TARGET_ASSORTMENT_COMPLETENESS_QC,
    missing: provider.missing,
  };
}

/** @deprecated Use auditLiveColorSizeVariantMatrix — global union matrix is not a live-catalog gate. */
export function auditColorSizeVariantMatrix(cwd = process.cwd()): {
  COLOR_SIZE_VARIANT_MATRIX_QC: "PASS" | "FAIL";
  CUSTOMER_OPTION_PROVIDER_MAPPING_QC: "PASS" | "FAIL";
  launch_colors: ClubThrottleGarmentColorSlug[];
  unmapped: string[];
} {
  const live = auditLiveColorSizeVariantMatrix(cwd);
  return {
    COLOR_SIZE_VARIANT_MATRIX_QC: live.LIVE_COLOR_SIZE_VARIANT_MATRIX_QC,
    CUSTOMER_OPTION_PROVIDER_MAPPING_QC: live.CUSTOMER_OPTION_PROVIDER_MAPPING_QC,
    launch_colors: live.launch_colors,
    unmapped: live.unmapped_exposed,
  };
}

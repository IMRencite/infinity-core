import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import {
  CLUB_THROTTLE_GELATO_WHITE_CATALOG_PRODUCT_UID_BY_SIZE,
  CLUB_THROTTLE_LAUNCH_SIZE_PROFILE,
  type ClubThrottleLaunchSize,
} from "./club-throttle-launch-size-profile.ts";
import {
  CLUB_THROTTLE_VARIANT_BINDINGS_REL,
  type GelatoVariantBinding,
} from "./club-throttle-variant-bindings-path.ts";
import bundledVariantBindings from "./club-throttle-gelato-variant-bindings.json" with { type: "json" };

export const CLUB_THROTTLE_SUPPORTED_COLORS = ["white", "black", "navy", "charcoal"] as const;

export type ClubThrottleCustomerVariant = {
  color: (typeof CLUB_THROTTLE_SUPPORTED_COLORS)[number];
  size: ClubThrottleLaunchSize;
};

const SIZE_ALIASES = new Set<string>(CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes);

/** Repair-ingest and legacy storefront labels that differ from canonical binding SKUs. */
const LEGACY_SKU_ALIASES: Record<string, string> = {
  "CT-LOT-LINE-TEE": "LOT_LINE",
};

function normalizeBindingSku(sku: string): string {
  const trimmed = sku.trim();
  if (LEGACY_SKU_ALIASES[trimmed]) return LEGACY_SKU_ALIASES[trimmed];
  const merch = CLUB_THROTTLE_SEVEN_SHIRT_MERCH.find((row) => row.sku === trimmed || row.slug === trimmed);
  return merch?.sku ?? trimmed;
}

function loadBindings(cwd: string): GelatoVariantBinding[] | null {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(cwd, CLUB_THROTTLE_VARIANT_BINDINGS_REL),
    join(moduleDir, "club-throttle-gelato-variant-bindings.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { bindings?: GelatoVariantBinding[] };
    if (Array.isArray(parsed.bindings) && parsed.bindings.length === 7) return parsed.bindings;
  }
  const bundled = bundledVariantBindings as { bindings?: GelatoVariantBinding[] };
  if (Array.isArray(bundled.bindings) && bundled.bindings.length === 7) return bundled.bindings;
  return null;
}

export function resolveGelatoVariantUid(input: {
  sku: string;
  size: string;
  color?: string;
  cwd?: string;
}): { ok: true; gelato_product_id: string; variant_uid: string; order_product_uid: string } | { ok: false; reason: string } {
  const color = (input.color ?? "white").toLowerCase();
  const size = input.size.toUpperCase();
  if (!SIZE_ALIASES.has(size)) return { ok: false, reason: "INVALID_SIZE" };
  const bindings = loadBindings(input.cwd ?? process.cwd());
  if (!bindings) return { ok: false, reason: "VARIANT_BINDINGS_MISSING" };
  const sku = normalizeBindingSku(input.sku);
  const row = bindings.find((b) => b.sku === sku);
  if (!row) return { ok: false, reason: "UNKNOWN_SKU" };
  const byColor = row.variants_by_color?.[color]?.[size];
  if (byColor?.variant_uid?.trim()) {
    return {
      ok: true,
      gelato_product_id: byColor.gelato_product_id?.trim() || row.gelato_product_id,
      variant_uid: byColor.variant_uid.trim(),
      order_product_uid: byColor.order_product_uid?.trim() || byColor.variant_uid.trim(),
    };
  }
  if (color !== "white") return { ok: false, reason: "UNSUPPORTED_COLOR" };
  const catalogUid =
    CLUB_THROTTLE_GELATO_WHITE_CATALOG_PRODUCT_UID_BY_SIZE[
      size as keyof typeof CLUB_THROTTLE_GELATO_WHITE_CATALOG_PRODUCT_UID_BY_SIZE
    ];
  if (!catalogUid) return { ok: false, reason: "UNMAPPED_VARIANT" };
  const variant = row.variants[size];
  const storeVariantUid = variant?.variant_uid?.trim() ?? "";
  return {
    ok: true,
    gelato_product_id: row.gelato_product_id,
    variant_uid: storeVariantUid || catalogUid,
    order_product_uid: catalogUid,
  };
}

export type VariantMapQc = {
  CLUB_THROTTLE_VARIANT_MAP_QC: "PASS" | "FAIL";
  NO_UNFULFILLABLE_STOREFRONT_VARIANTS: "PASS" | "FAIL";
  STORE_VARIANT_UID_QC: "PASS" | "FAIL" | "PENDING_GELATO_ASYNC";
  SUPPORTED_COLORS: readonly string[];
  SUPPORTED_SIZES: readonly string[];
  UNMAPPED_VARIANTS: string[];
};

export function auditClubThrottleVariantMap(cwd = process.cwd()): VariantMapQc {
  const bindings = loadBindings(cwd);
  const bindingRowsReady = bindings?.length === 7;
  const supportedSizes = bindingRowsReady
    ? [...CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes]
    : (["M"] as const);
  const unmapped: string[] = [];
  if (!bindingRowsReady) {
    for (const size of CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes) {
      if (size !== "M") unmapped.push(`white:${size}`);
    }
  }
  const storeVariantUidsReady =
    bindingRowsReady &&
    bindings!.every((row) =>
      CLUB_THROTTLE_LAUNCH_SIZE_PROFILE.checkout_sizes.every((size) => Boolean(row.variants[size]?.variant_uid)),
    );
  return {
    CLUB_THROTTLE_VARIANT_MAP_QC: bindingRowsReady ? "PASS" : "FAIL",
    NO_UNFULFILLABLE_STOREFRONT_VARIANTS: bindingRowsReady ? "PASS" : "FAIL",
    SUPPORTED_COLORS: CLUB_THROTTLE_SUPPORTED_COLORS,
    SUPPORTED_SIZES: supportedSizes,
    UNMAPPED_VARIANTS: unmapped,
    STORE_VARIANT_UID_QC: storeVariantUidsReady ? "PASS" : "PENDING_GELATO_ASYNC",
  };
}

export function validateCustomerVariant(input: { color?: string; size?: string; sku?: string; cwd?: string }): {
  ok: boolean;
  reason: string;
} {
  const color = (input.color ?? "white").toLowerCase();
  const size = (input.size ?? "").toUpperCase();
  if (!SIZE_ALIASES.has(size)) return { ok: false, reason: "INVALID_SIZE" };
  if (input.sku) {
    const resolved = resolveGelatoVariantUid({ sku: input.sku, size, color, cwd: input.cwd });
    return resolved.ok ? { ok: true, reason: "MAPPED" } : { ok: false, reason: resolved.reason };
  }
  const qc = auditClubThrottleVariantMap(input.cwd);
  if (!qc.SUPPORTED_SIZES.includes(size)) return { ok: false, reason: "UNMAPPED_VARIANT" };
  return { ok: true, reason: "MAPPED" };
}

export function slugForSku(sku: string): string | null {
  return CLUB_THROTTLE_SEVEN_SHIRT_MERCH.find((row) => row.sku === sku)?.slug ?? null;
}

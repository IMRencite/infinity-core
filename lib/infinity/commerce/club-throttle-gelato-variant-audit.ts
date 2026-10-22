import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { GELATO_ECOMMERCE_API } from "../commercialization/providers/gelato/ecommerce-preflight.ts";
import { loadGelatoConfig } from "../commercialization/providers/gelato/config.ts";
import { CLUB_THROTTLE_GELATO_STORE_ID } from "../commercialization/providers/gelato/lot-line-capability-probe-v2-plan.ts";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";

export type GelatoVariantRow = {
  variant_uid: string;
  color: string | null;
  size: string | null;
  title: string | null;
  state: string;
};

export type GelatoProductVariantAudit = {
  product_id: string;
  sku: string;
  title: string;
  http_status: number;
  variants: GelatoVariantRow[];
  sizes_found: string[];
  colors_found: string[];
  m_only: boolean;
};

const TARGET_SIZES = ["S", "M", "L", "XL", "2XL"] as const;

function parseVariantTitle(title: string | null): { color: string | null; size: string | null } {
  if (!title) return { color: null, size: null };
  const m = title.match(/^(.+?)\s-\s(.+?)\s-\s/i);
  if (!m) return { color: null, size: null };
  return { color: m[1].trim(), size: m[2].trim().toUpperCase() };
}

function parseVariantOptions(variant: Record<string, unknown>): { color: string | null; size: string | null } {
  const opts = Array.isArray(variant.variantOptions) ? variant.variantOptions : [];
  let color: string | null = null;
  let size: string | null = null;
  for (const row of opts) {
    if (!row || typeof row !== "object") continue;
    const name = String((row as { name?: string }).name ?? "").toLowerCase();
    const value = String((row as { value?: string }).value ?? "").trim();
    if (name === "color") color = value;
    if (name === "size") size = value.toUpperCase();
  }
  if (!color || !size) {
    const fromTitle = parseVariantTitle(typeof variant.title === "string" ? variant.title : null);
    color = color ?? fromTitle.color;
    size = size ?? fromTitle.size;
  }
  return { color, size };
}

export async function fetchGelatoStoreProduct(productId: string): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const config = loadGelatoConfig();
  if (!config.credentials) return { status: 0, json: null };
  const url = `${GELATO_ECOMMERCE_API}/v1/stores/${encodeURIComponent(CLUB_THROTTLE_GELATO_STORE_ID)}/products/${encodeURIComponent(productId)}`;
  const res = await fetch(url, { headers: { "X-API-KEY": config.credentials.headerValue() } });
  if (!res.ok) return { status: res.status, json: null };
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

export async function auditCanonicalSevenGelatoVariants(cwd = process.cwd()): Promise<{
  CANONICAL_PRODUCTS_VARIANT_AUDIT: GelatoProductVariantAudit[];
  COMMON_LAUNCH_SIZES: string[];
  M_ONLY_BLOCKER: boolean;
  gelato_credentials: "PRESENT" | "MISSING";
}> {
  const audits: GelatoProductVariantAudit[] = [];
  const config = loadGelatoConfig();
  if (!config.credentials) {
    return {
      CANONICAL_PRODUCTS_VARIANT_AUDIT: [],
      COMMON_LAUNCH_SIZES: [],
      M_ONLY_BLOCKER: true,
      gelato_credentials: "MISSING",
    };
  }

  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) {
    const fetched = await fetchGelatoStoreProduct(merch.gelato_product_id);
    const variantsRaw = Array.isArray(fetched.json?.variants) ? (fetched.json!.variants as Record<string, unknown>[]) : [];
    const variants: GelatoVariantRow[] = variantsRaw.map((v) => {
      const { color, size } = parseVariantOptions(v);
      return {
        variant_uid: String(v.id ?? v.variantUid ?? ""),
        color,
        size,
        title: typeof v.title === "string" ? v.title : null,
        state: typeof v.status === "string" ? v.status : "UNKNOWN",
      };
    });
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean) as string[])];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean) as string[])];
    audits.push({
      product_id: merch.gelato_product_id,
      sku: merch.sku,
      title: merch.title,
      http_status: fetched.status,
      variants,
      sizes_found: sizes,
      colors_found: colors,
      m_only:
        (sizes.length === 1 && sizes[0] === "M") ||
        (variants.length === 1 && parseVariantTitle(variants[0]?.title ?? null).size === "M"),
    });
  }

  const sizeSets = audits.map((a) => new Set(a.sizes_found));
  let common = [...TARGET_SIZES];
  for (const set of sizeSets) {
    common = common.filter((s) => set.has(s));
  }
  const allMOnly = audits.every((a) => a.m_only);

  const out = {
    generated_at: new Date().toISOString(),
    store_id: CLUB_THROTTLE_GELATO_STORE_ID,
    audits,
    COMMON_LAUNCH_SIZES: common,
    M_ONLY_BLOCKER: allMOnly,
    TARGET_SIZES,
  };
  mkdirSync(join(cwd, ".infinity/commerce"), { recursive: true });
  writeFileSync(join(cwd, ".infinity/commerce/club-throttle-gelato-canonical-variant-audit.json"), `${JSON.stringify(out, null, 2)}\n`);

  return {
    CANONICAL_PRODUCTS_VARIANT_AUDIT: audits,
    COMMON_LAUNCH_SIZES: common,
    M_ONLY_BLOCKER: allMOnly,
    gelato_credentials: "PRESENT",
  };
}

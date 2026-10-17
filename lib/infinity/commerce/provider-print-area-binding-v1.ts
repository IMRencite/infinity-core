import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "./club-throttle-canonical-seven-shirt-catalog.ts";
import {
  buildGelatoCatalogOrderProductUid,
  requiredOrderFileTypesForCatalogProductUid,
} from "./club-throttle-gelato-catalog-order-product-v1.ts";
import { authoritativeOrderProductUidForFulfillment } from "./club-throttle-product-design-intent-v1.ts";
import { clubThrottleSkuPrintDesignIntent } from "./club-throttle-product-design-intent-v1.ts";
import { resolveClubThrottleFulfillmentPrintAssetUrl } from "./club-throttle-fulfillment-art-asset-v1.ts";
import {
  gelatoPrintFileValidityQc,
  probeProviderPrintAssetDownload,
  providerPrintAssetDownloadabilityQc,
  TRANSPARENT_PLACEHOLDER_FOR_UNINTENDED_PROVIDER_PLACEMENT,
} from "./gelato-print-asset-delivery-standard-v1.ts";
import { resolveGelatoVariantUid } from "./club-throttle-variant-map.ts";

export const PROVIDER_PRINT_AREA_BINDING_V1 = "PROVIDER_PRINT_AREA_BINDING_V1" as const;

export type GelatoOrderPrintAreaType = "back" | "default" | "neck-inner";

export type PrintAreaDesignIntent = "CANONICAL_BACK_ART" | "NOT_INTENDED";

export type ResolvedPrintAreaFile = {
  type: GelatoOrderPrintAreaType;
  url: string;
  intent: PrintAreaDesignIntent;
  art_identity: string;
};

export { TRANSPARENT_PLACEHOLDER_FOR_UNINTENDED_PROVIDER_PLACEMENT };

export function clubThrottlePublicOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return (env.CLUB_THROTTLE_PUBLIC_ORIGIN ?? "https://clubthrottle.com").replace(/\/+$/, "");
}

export function resolveGelatoOrderPrintAreaFiles(input: {
  sku: string;
  garment_color: string;
  size: string;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}):
  | { ok: true; files: ResolvedPrintAreaFile[]; configured_areas: GelatoOrderPrintAreaType[]; order_product_uid: string }
  | { ok: false; reason: string } {
  const variant = resolveGelatoVariantUid({
    sku: input.sku,
    size: input.size,
    color: input.garment_color,
    cwd: input.cwd,
  });
  if (!variant.ok) return { ok: false, reason: variant.reason };
  const authoritative = authoritativeOrderProductUidForFulfillment({
    sku: input.sku,
    garment_color: input.garment_color,
    size: input.size,
  });
  if (!authoritative.ok) return { ok: false, reason: authoritative.reason };
  const orderProductUid = authoritative.order_product_uid;
  const required = requiredOrderFileTypesForCatalogProductUid(orderProductUid);
  const intent = clubThrottleSkuPrintDesignIntent(input.sku);
  const intentional = new Set(intent.intentional_order_file_types);
  const missing = required.filter((r) => !intentional.has(r as "back"));
  if (missing.length > 0) {
    return { ok: false, reason: "PROVIDER_PRODUCT_CONFIGURATION_MISMATCH" };
  }
  if (required.length !== 1 || required[0] !== "back") {
    return { ok: false, reason: "PROVIDER_REQUIRES_UNINTENDED_PRINT_AREAS" };
  }
  const art = resolveClubThrottleFulfillmentPrintAssetUrl({
    sku: input.sku,
    garment_color: input.garment_color,
    cwd: input.cwd,
    env: input.env,
  });
  if (!art.ok) return { ok: false, reason: art.reason };
  if (!/^https:\/\//i.test(art.url)) return { ok: false, reason: "BACK_ARTWORK_URL_INVALID" };
  const files: ResolvedPrintAreaFile[] = [
    {
      type: "back",
      url: art.url.trim(),
      intent: "CANONICAL_BACK_ART",
      art_identity: `${input.sku}:${input.garment_color}:back`,
    },
  ];
  return {
    ok: true,
    files,
    configured_areas: ["back"],
    order_product_uid: orderProductUid,
  };
}

export async function gelatoProductSubmissionCompatibilityQcAsync(input: {
  sku: string;
  garment_color: string;
  size: string;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}): Promise<"PASS" | "FAIL"> {
  const resolved = resolveGelatoOrderPrintAreaFiles(input);
  if (!resolved.ok) return "FAIL";
  for (const file of resolved.files) {
    const probe = await probeProviderPrintAssetDownload(file.url);
    if (providerPrintAssetDownloadabilityQc(probe) !== "PASS") return "FAIL";
    if (gelatoPrintFileValidityQc(probe) !== "PASS") return "FAIL";
  }
  return "PASS";
}

export function gelatoProductSubmissionCompatibilityQc(input: {
  sku: string;
  garment_color: string;
  size: string;
  backArtworkUrl?: string;
  env?: NodeJS.ProcessEnv;
}): "PASS" | "FAIL" {
  void input.backArtworkUrl;
  const resolved = resolveGelatoOrderPrintAreaFiles({
    sku: input.sku,
    garment_color: input.garment_color,
    size: input.size,
    env: input.env,
  });
  return resolved.ok ? "PASS" : "FAIL";
}

export const GELATO_PRINT_AREA_ROOT_CAUSE_V34 =
  "Club Throttle fulfillment used inlbl Gelato catalog order productUids (front+back+inner label) plus transparent placeholder URLs for unintended placements; replacement order failed because assets were not provider-downloadable (404 / wrong paths) and inlbl configuration does not match back-only design intent." as const;

export type LiveStorefrontPrintAreaMatrixRow = {
  sku: string;
  color: string;
  gelato_product_submission_compatibility_qc: "PASS" | "FAIL";
  required_print_areas: string[];
  configured_print_areas: string[];
  back_art_url: string | null;
  reason?: string;
};

function loadLiveCustomerVisibleColorMatrix(cwd: string): Record<string, string[]> {
  const path = join(cwd, ".infinity/commerce/club-throttle-cart-variant-transaction-qc-v10.json");
  if (existsSync(path)) {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { LIVE_COLOR_MATRIX?: Record<string, string[]> };
    if (parsed.LIVE_COLOR_MATRIX) return parsed.LIVE_COLOR_MATRIX;
  }
  const fallback: Record<string, string[]> = {};
  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) fallback[merch.sku] = ["white"];
  return fallback;
}

export function auditLiveStorefrontProviderPrintAreaMatrix(cwd = process.cwd()): {
  LIVE_STOREFRONT_PROVIDER_PRINT_AREA_MATRIX_EXPECTED: number;
  rows: LiveStorefrontPrintAreaMatrixRow[];
  LIVE_STOREFRONT_PROVIDER_PRINT_AREA_MATRIX_PASS: number;
  LIVE_STOREFRONT_PROVIDER_PRINT_AREA_MATRIX_FAIL: number;
  LIVE_STOREFRONT_PROVIDER_PRINT_AREA_MATRIX_QC: "PASS" | "FAIL";
} {
  const matrix = loadLiveCustomerVisibleColorMatrix(cwd);
  const rows: LiveStorefrontPrintAreaMatrixRow[] = [];
  for (const merch of CLUB_THROTTLE_SEVEN_SHIRT_MERCH) {
    for (const color of matrix[merch.sku] ?? []) {
      const resolved = resolveGelatoOrderPrintAreaFiles({
        sku: merch.sku,
        garment_color: color,
        size: "M",
        cwd,
      });
      const qc = gelatoProductSubmissionCompatibilityQc({ sku: merch.sku, garment_color: color, size: "M" });
      rows.push({
        sku: merch.sku,
        color,
        gelato_product_submission_compatibility_qc: qc,
        required_print_areas: resolved.ok ? ["back"] : ["back"],
        configured_print_areas: resolved.ok ? resolved.configured_areas : [],
        back_art_url: resolved.ok ? resolved.files[0]?.url ?? null : null,
        ...(qc === "FAIL" ? { reason: resolved.ok ? "SYNC_QC_FAIL" : resolved.reason } : {}),
      });
    }
  }
  const pass = rows.filter((r) => r.gelato_product_submission_compatibility_qc === "PASS").length;
  const fail = rows.length - pass;
  return {
    LIVE_STOREFRONT_PROVIDER_PRINT_AREA_MATRIX_EXPECTED: rows.length,
    rows,
    LIVE_STOREFRONT_PROVIDER_PRINT_AREA_MATRIX_PASS: pass,
    LIVE_STOREFRONT_PROVIDER_PRINT_AREA_MATRIX_FAIL: fail,
    LIVE_STOREFRONT_PROVIDER_PRINT_AREA_MATRIX_QC: fail === 0 && rows.length === 17 ? "PASS" : "FAIL",
  };
}

/** @deprecated Use buildGelatoCatalogOrderProductUid BACK_ONLY profile. */
export const GELATO_GILDAN_INLBL_ORDER_FILE_TYPES = ["back", "default", "neck-inner"] as const;

export const GELATO_PRINT_AREA_ROOT_CAUSE = GELATO_PRINT_AREA_ROOT_CAUSE_V34;

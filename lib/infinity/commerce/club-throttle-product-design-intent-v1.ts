/** Founder-approved print placement intent — independent of Gelato store product copy. */

import { buildGelatoCatalogOrderProductUid } from "./club-throttle-gelato-catalog-order-product-v1.ts";

export const CLUB_THROTTLE_PRODUCT_DESIGN_INTENT_V1 = "CLUB_THROTTLE_PRODUCT_DESIGN_INTENT_V1" as const;

export type IntendedPrintPlacement = "BACK" | "FRONT_DEFAULT" | "NECK_INNER";

export type SkuPrintDesignIntent = {
  sku: string;
  /** Order API / provider file types required by intentional design (not store misconfiguration). */
  intentional_order_file_types: readonly ["back"];
  placements: Record<IntendedPrintPlacement, "CANONICAL_ART" | "NOT_INTENDED">;
};

const BACK_ONLY_INTENT: Omit<SkuPrintDesignIntent, "sku"> = {
  intentional_order_file_types: ["back"],
  placements: {
    BACK: "CANONICAL_ART",
    FRONT_DEFAULT: "NOT_INTENDED",
    NECK_INNER: "NOT_INTENDED",
  },
};

export function clubThrottleSkuPrintDesignIntent(sku: string): SkuPrintDesignIntent {
  return { sku, ...BACK_ONLY_INTENT };
}

export function intendedProductPrintConfigurationLabel(intent: SkuPrintDesignIntent): string {
  return "back print only (large back placement)";
}

/** Design intent wins over stale variant-binding order_product_uid fields at fulfillment time. */
export function authoritativeOrderProductUidForFulfillment(input: {
  sku: string;
  garment_color: string;
  size: string;
}): { ok: true; order_product_uid: string } | { ok: false; reason: string } {
  const intent = clubThrottleSkuPrintDesignIntent(input.sku);
  if (intent.intentional_order_file_types.length !== 1 || intent.intentional_order_file_types[0] !== "back") {
    return { ok: false, reason: "UNSUPPORTED_DESIGN_INTENT" };
  }
  const order_product_uid = buildGelatoCatalogOrderProductUid({
    size: input.size,
    colorSlug: input.garment_color.trim().toLowerCase(),
    profile: "BACK_ONLY",
  });
  if (order_product_uid.includes("inlbl")) return { ok: false, reason: "INLBL_UID_FORBIDDEN" };
  return { ok: true, order_product_uid };
}

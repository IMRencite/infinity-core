import type { ResolvedCanonicalLine } from "./club-throttle-canonical-fulfillment-resolve.ts";
import { resolveGelatoVariantUid, validateCustomerVariant } from "./club-throttle-variant-map.ts";
import {
  gelatoProductSubmissionCompatibilityQc,
  resolveGelatoOrderPrintAreaFiles,
  type GelatoOrderPrintAreaType,
} from "./provider-print-area-binding-v1.ts";

export type ClubThrottleShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type GelatoProductionOrderPayload = {
  orderType: "order" | "draft";
  orderReferenceId: string;
  customerReferenceId: string;
  currency: "USD";
  adjustProductUidByFileTypes?: boolean;
  items: Array<{
    itemReferenceId: string;
    productUid: string;
    quantity: number;
    adjustProductUidByFileTypes?: boolean;
    files: Array<{ type: GelatoOrderPrintAreaType; url: string }>;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postCode: string;
    state: string;
    country: string;
    email: string;
    phone?: string;
  };
  shipmentMethodUid?: string;
};

export function validateShippingAddressForGelato(input: ClubThrottleShippingAddress): { ok: boolean; reason: string } {
  if (!input.line1?.trim()) return { ok: false, reason: "ADDRESS_LINE1_REQUIRED" };
  if (!input.city?.trim()) return { ok: false, reason: "CITY_REQUIRED" };
  if (!input.postal_code?.trim()) return { ok: false, reason: "POSTAL_CODE_REQUIRED" };
  if (!input.country?.trim()) return { ok: false, reason: "COUNTRY_REQUIRED" };
  return { ok: true, reason: "OK" };
}

export function buildGelatoProductionOrderPayload(input: {
  internalOrderId: string;
  providerSubmissionKey: string;
  customerEmail: string | null;
  customerName: string | null;
  shippingAddress: ClubThrottleShippingAddress;
  lines: Array<{
    line: ResolvedCanonicalLine;
    quantity: number;
    size: string;
    garment_color?: string;
    artworkUrl: string;
  }>;
  shipmentMethodUid?: string;
}): { ok: true; payload: GelatoProductionOrderPayload } | { ok: false; reason: string } {
  const shipCheck = validateShippingAddressForGelato(input.shippingAddress);
  if (!shipCheck.ok) return { ok: false, reason: shipCheck.reason };
  if (!input.lines.length) return { ok: false, reason: "NO_LINES" };
  const builtLines: Array<{
    row: (typeof input.lines)[number];
    orderProductUid: string;
    files: Array<{ type: GelatoOrderPrintAreaType; url: string }>;
  }> = [];
  for (const row of input.lines) {
    const garmentColor = (row.garment_color ?? "white").trim().toLowerCase();
    const variant = validateCustomerVariant({ color: garmentColor, size: row.size, sku: row.line.sku });
    if (!variant.ok) return { ok: false, reason: variant.reason };
    const resolved = resolveGelatoVariantUid({ sku: row.line.sku, size: row.size, color: garmentColor });
    if (!resolved.ok) return { ok: false, reason: resolved.reason };
    const compat = gelatoProductSubmissionCompatibilityQc({
      sku: row.line.sku,
      garment_color: garmentColor,
      size: row.size,
    });
    if (compat !== "PASS") return { ok: false, reason: "GELATO_PRODUCT_SUBMISSION_COMPATIBILITY_QC_FAIL" };
    const printAreas = resolveGelatoOrderPrintAreaFiles({
      sku: row.line.sku,
      garment_color: garmentColor,
      size: row.size,
    });
    if (!printAreas.ok) return { ok: false, reason: printAreas.reason };
    builtLines.push({
      row,
      orderProductUid: printAreas.order_product_uid,
      files: printAreas.files.map((f) => ({ type: f.type, url: f.url })),
    });
  }
  const nameParts = (input.customerName ?? "Club Throttle Customer").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "Customer";
  const lastName = nameParts.slice(1).join(" ") || "Order";
  const payload: GelatoProductionOrderPayload = {
    orderType: "order",
    orderReferenceId: input.providerSubmissionKey,
    customerReferenceId: input.internalOrderId,
    currency: "USD",
    items: builtLines.map(({ row, orderProductUid, files }, idx) => ({
      itemReferenceId: `${input.internalOrderId}-item-${idx + 1}`,
      productUid: orderProductUid,
      quantity: row.quantity,
      files,
    })),
    shippingAddress: {
      firstName,
      lastName,
      addressLine1: input.shippingAddress.line1!.trim(),
      addressLine2: input.shippingAddress.line2?.trim() || undefined,
      city: input.shippingAddress.city!.trim(),
      postCode: input.shippingAddress.postal_code!.trim(),
      state: (input.shippingAddress.state ?? "").trim() || "—",
      country: input.shippingAddress.country!.trim().toUpperCase(),
      email: input.customerEmail?.trim() || "orders@clubthrottle.com",
    },
    ...(input.shipmentMethodUid ? { shipmentMethodUid: input.shipmentMethodUid } : {}),
  };
  return { ok: true, payload };
}

export function auditGelatoOrderPayloadDryRun(input: Parameters<typeof buildGelatoProductionOrderPayload>[0]): "PASS" | "FAIL" {
  return buildGelatoProductionOrderPayload(input).ok ? "PASS" : "FAIL";
}

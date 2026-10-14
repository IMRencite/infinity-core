import { ClubThrottleGelatoLiveOrderAdapter } from "./club-throttle-gelato-live-order-adapter.ts";
import { parseGelatoProductionOrderResponse } from "./provider-fulfillment-reconciliation-v1.ts";
import { requiredGelatoOrderFileTypesForProductUid } from "./gelato-apparel-uid-semantics-v1.ts";

export const GELATO_PREFLIGHT_DRAFT_VALIDATION_V1 = "GELATO_PREFLIGHT_DRAFT_VALIDATION_V1" as const;

/** Convertible drafts must mirror real order fulfillment data (V38+). */
export const GELATO_PREFLIGHT_DRAFT_REAL_FULFILLMENT_DATA_RULE_V1 =
  "GELATO_PREFLIGHT_DRAFT_REAL_FULFILLMENT_DATA_RULE_V1" as const;

export type GelatoValidationDraftPayload = {
  orderType: "draft";
  orderReferenceId: string;
  customerReferenceId: string;
  currency: "USD";
  items: Array<{
    itemReferenceId: string;
    productUid: string;
    quantity: number;
    adjustProductUidByFileTypes?: boolean;
    files: Array<{ type: string; url: string }>;
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

export async function submitGelatoValidationDraft(input: {
  payload: GelatoValidationDraftPayload;
  env?: NodeJS.ProcessEnv;
}): Promise<{ ok: boolean; provider_order_id: string | null; provider_response_code: number; safe_error: string | null }> {
  const env = input.env ?? process.env;
  const v37 = (env.CLUB_THROTTLE_V37_VALIDATION_DRAFT_AUTHORIZED ?? "").trim() === "ENABLED";
  const v38 = (env.CLUB_THROTTLE_V38_VALIDATION_DRAFT_AUTHORIZED ?? "").trim() === "ENABLED";
  const v42 = (env.CLUB_THROTTLE_V42_VALIDATION_DRAFT_AUTHORIZED ?? "").trim() === "ENABLED";
  if (!v37 && !v38 && !v42) {
    return { ok: false, provider_order_id: null, provider_response_code: 0, safe_error: "VALIDATION_DRAFT_NOT_AUTHORIZED" };
  }
  const adapter = new ClubThrottleGelatoLiveOrderAdapter({ env });
  if (!adapter.productionEnabled()) {
    return { ok: false, provider_order_id: null, provider_response_code: 0, safe_error: "GELATO_LIVE_UNCONFIGURED" };
  }
  const result = await adapter.submitProductionOrder(input.payload as unknown as import("./club-throttle-gelato-order-payload.ts").GelatoProductionOrderPayload);
  return {
    ok: result.ok,
    provider_order_id: result.provider_order_id,
    provider_response_code: result.provider_response_code,
    safe_error: result.safe_error,
  };
}

export async function inspectGelatoValidationDraft(input: {
  providerOrderId: string;
  submittedProductUid: string;
  env?: NodeJS.ProcessEnv;
}): Promise<{
  DRAFT_GELATO_ORDER_ID: string;
  DRAFT_ORDER_TYPE: string | null;
  DRAFT_SUBMITTED_PRODUCT_UID: string;
  DRAFT_PROVIDER_RESOLVED_PRODUCT_UID: string | null;
  DRAFT_SUBMITTED_FILE_TYPES: string[];
  DRAFT_PROVIDER_REQUIRED_FILE_TYPES: string[];
  DRAFT_PROVIDER_MISSING_FILE_TYPES: string[];
  DRAFT_FILE_PROCESSING_STATUS: string | null;
  DRAFT_HOLD_STATE: boolean;
  GELATO_VALIDATION_DRAFT_NON_PRODUCTION_QC: "PASS" | "FAIL";
  GELATO_DRAFT_PRINT_CONFIGURATION_VALIDATION_QC: "PASS" | "FAIL";
  raw_financial_status: string | null;
  raw_fulfillment_status: string | null;
}> {
  const adapter = new ClubThrottleGelatoLiveOrderAdapter({ env: input.env ?? process.env });
  const read = await adapter.getProductionOrderParsed(input.providerOrderId);
  const json = read.parsed;
  const orderType =
    read.ok && json
      ? ((await adapter.getProductionOrder(input.providerOrderId)).provider_status ?? null)
      : null;
  const res = await fetch(`https://order.gelatoapis.com/v4/orders/${encodeURIComponent(input.providerOrderId)}`, {
    headers: {
      "X-API-KEY": (input.env ?? process.env).GELATO_LIVE_API_KEY?.trim() ?? "",
      Accept: "application/json",
    },
  });
  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseGelatoProductionOrderResponse(raw);
  const item = Array.isArray(raw.items) ? (raw.items[0] as Record<string, unknown>) : null;
  const resolvedUid =
    (typeof item?.productUid === "string" && item.productUid) ||
    (typeof item?.finalProductUid === "string" && item.finalProductUid) ||
    null;
  const requiredFromUid = requiredGelatoOrderFileTypesForProductUid(resolvedUid ?? input.submittedProductUid);
  const nonProduction =
    (typeof raw.orderType === "string" && raw.orderType === "draft") ||
    (parsed.fulfillment_status ?? "").toLowerCase() === "draft" ||
    (parsed.financial_status ?? "").toLowerCase() !== "paid";
  const draftQc =
    nonProduction &&
    (parsed.financial_status ?? "").toLowerCase() !== "charged" &&
    !(parsed.fulfillment_status ?? "").toLowerCase().includes("production")
      ? "PASS"
      : "FAIL";
  const configQc =
    draftQc === "PASS" &&
    requiredFromUid.includes("back") &&
    parsed.submitted_file_types.includes("back") &&
    parsed.missing_file_types.length === 0 &&
    !parsed.missing_file_types.includes("default") &&
    !parsed.missing_file_types.includes("neck-inner")
      ? "PASS"
      : "FAIL";
  return {
    DRAFT_GELATO_ORDER_ID: input.providerOrderId,
    DRAFT_ORDER_TYPE: typeof raw.orderType === "string" ? raw.orderType : null,
    DRAFT_SUBMITTED_PRODUCT_UID: input.submittedProductUid,
    DRAFT_PROVIDER_RESOLVED_PRODUCT_UID: resolvedUid,
    DRAFT_SUBMITTED_FILE_TYPES: parsed.submitted_file_types,
    DRAFT_PROVIDER_REQUIRED_FILE_TYPES: requiredFromUid,
    DRAFT_PROVIDER_MISSING_FILE_TYPES: parsed.missing_file_types,
    DRAFT_FILE_PROCESSING_STATUS: parsed.fulfillment_status,
    DRAFT_HOLD_STATE: parsed.on_hold,
    GELATO_VALIDATION_DRAFT_NON_PRODUCTION_QC: draftQc,
    GELATO_DRAFT_PRINT_CONFIGURATION_VALIDATION_QC: configQc,
    raw_financial_status: parsed.financial_status,
    raw_fulfillment_status: parsed.fulfillment_status,
  };
}

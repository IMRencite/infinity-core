import { requiredGelatoOrderFileTypesForProductUid } from "./gelato-apparel-uid-semantics-v1.ts";

export const PROVIDER_FULFILLMENT_RECONCILIATION_V1 = "PROVIDER_FULFILLMENT_RECONCILIATION_V1" as const;

export type ProviderReconciliationState =
  | "SUBMITTED"
  | "PROVIDER_CREATED"
  | "VALIDATING"
  | "ACCEPTED_FOR_PRODUCTION"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "DELIVERED"
  | "ON_HOLD"
  | "FILE_ERROR"
  | "REJECTED"
  | "CANCELLED"
  | "ACTION_REQUIRED"
  | "UNKNOWN";

export type ParsedGelatoProductionOrder = {
  provider_order_id: string | null;
  fulfillment_status: string | null;
  financial_status: string | null;
  reconciliation_state: ProviderReconciliationState;
  required_file_types: string[];
  submitted_file_types: string[];
  missing_file_types: string[];
  on_hold: boolean;
  production_accepted: boolean;
  raw_item_statuses: string[];
};

function normalizeFileType(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().toLowerCase();
}

function collectFileTypesFromItem(item: Record<string, unknown>): string[] {
  const types = new Set<string>();
  const files = item.files ?? item.fileReferences ?? item.assets;
  if (Array.isArray(files)) {
    for (const file of files) {
      if (!file || typeof file !== "object") continue;
      const row = file as Record<string, unknown>;
      const t =
        normalizeFileType(row.type) ??
        normalizeFileType(row.fileType) ??
        normalizeFileType(row.name) ??
        normalizeFileType(row.placeholderName);
      if (t) types.add(t);
    }
  }
  const requiredOnly = item.requiredFiles ?? item.required_files;
  if (Array.isArray(requiredOnly)) {
    for (const entry of requiredOnly) {
      const t = typeof entry === "string" ? normalizeFileType(entry) : normalizeFileType((entry as Record<string, unknown>)?.type);
      if (t) types.add(t);
    }
  }
  return [...types];
}

function inferRequiredFileTypes(items: Record<string, unknown>[], issuesText: string): string[] {
  const fromIssues = [...issuesText.matchAll(/['"]([a-z0-9-]+)['"]/gi)].map((m) => m[1]!.toLowerCase());
  const required = new Set<string>();
  for (const item of items) {
    const uid =
      (typeof item.productUid === "string" && item.productUid) ||
      (typeof item.finalProductUid === "string" && item.finalProductUid) ||
      "";
    for (const t of requiredGelatoOrderFileTypesForProductUid(uid)) required.add(t);
    const req = item.requiredFiles ?? item.required_files ?? item.missingFiles ?? item.missing_files;
    if (Array.isArray(req)) {
      for (const entry of req) {
        const t = typeof entry === "string" ? normalizeFileType(entry) : normalizeFileType((entry as Record<string, unknown>)?.type);
        if (t) required.add(t);
      }
    }
  }
  for (const t of fromIssues) {
    if (["default", "back", "neck-inner", "front"].includes(t)) required.add(t);
  }
  return [...required];
}

export function parseGelatoProductionOrderResponse(json: Record<string, unknown>): ParsedGelatoProductionOrder {
  const id =
    (typeof json.id === "string" && json.id) ||
    (typeof json.orderId === "string" && json.orderId) ||
    null;
  const fulfillmentStatus =
    (typeof json.fulfillmentStatus === "string" && json.fulfillmentStatus) ||
    (typeof json.status === "string" && json.status) ||
    null;
  const financialStatus =
    (typeof json.financialStatus === "string" && json.financialStatus) ||
    (typeof json.paymentStatus === "string" && json.paymentStatus) ||
    null;
  const itemsRaw = (json.items ?? json.orderItems ?? []) as unknown;
  const items = Array.isArray(itemsRaw) ? (itemsRaw as Record<string, unknown>[]) : [];
  const submitted = new Set<string>();
  const itemStatuses: string[] = [];
  let issuesBlob = "";
  for (const item of items) {
    for (const t of collectFileTypesFromItem(item)) submitted.add(t);
    const status = item.status ?? item.fulfillmentStatus ?? item.itemStatus;
    if (typeof status === "string") itemStatuses.push(status.toLowerCase());
    const issues = item.issues ?? item.validationIssues ?? item.holdReason ?? item.errors;
    if (typeof issues === "string") issuesBlob += ` ${issues}`;
    else if (Array.isArray(issues)) issuesBlob += ` ${JSON.stringify(issues)}`;
  }
  const required = inferRequiredFileTypes(items, issuesBlob);
  const submittedList = [...submitted];
  const missing = required.filter((r) => !submitted.has(r));
  const statusLower = (fulfillmentStatus ?? "").toLowerCase();
  const holdSignals =
    missing.length > 0 ||
    statusLower.includes("hold") ||
    itemStatuses.some((s) => s.includes("hold") || s.includes("file") || s.includes("action")) ||
    /on hold|missing file|required file/i.test(issuesBlob);

  let reconciliation: ProviderReconciliationState = "UNKNOWN";
  if (statusLower.includes("cancel")) reconciliation = "CANCELLED";
  else if (statusLower.includes("fail") || statusLower.includes("refus")) reconciliation = "REJECTED";
  else if (statusLower.includes("reject")) reconciliation = "REJECTED";
  else if (holdSignals) reconciliation = missing.length ? "ON_HOLD" : "ACTION_REQUIRED";
  else if (statusLower.includes("deliver")) reconciliation = "DELIVERED";
  else if (statusLower.includes("ship")) reconciliation = "SHIPPED";
  else if (statusLower.includes("production") || statusLower.includes("print")) reconciliation = "IN_PRODUCTION";
  else if (statusLower.includes("accept") || statusLower.includes("approved")) reconciliation = "ACCEPTED_FOR_PRODUCTION";
  else if (statusLower.includes("valid") || statusLower.includes("process")) reconciliation = "VALIDATING";
  else if (id) reconciliation = "PROVIDER_CREATED";

  const createdOnly =
    statusLower === "created" ||
    statusLower === "draft" ||
    reconciliation === "PROVIDER_CREATED" ||
    reconciliation === "VALIDATING";
  const productionAccepted =
    !holdSignals &&
    !createdOnly &&
    missing.length === 0 &&
    (reconciliation === "ACCEPTED_FOR_PRODUCTION" ||
      reconciliation === "IN_PRODUCTION" ||
      reconciliation === "SHIPPED" ||
      reconciliation === "DELIVERED" ||
      itemStatuses.some((s) => s.includes("production") || s.includes("passed") || s.includes("approved")));

  return {
    provider_order_id: id,
    fulfillment_status: fulfillmentStatus,
    financial_status: financialStatus,
    reconciliation_state: reconciliation,
    required_file_types: required,
    submitted_file_types: submittedList,
    missing_file_types: missing,
    on_hold: holdSignals,
    production_accepted: productionAccepted,
    raw_item_statuses: itemStatuses,
  };
}

export function normalizeGelatoFulfillmentStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

const GELATO_FAILURE_STATUS_MARKERS = ["failed", "canceled", "cancelled", "on_hold", "refused", "action_required", "file_error"];

export function gelatoProviderFailureStateQc(fulfillmentStatus: string | null | undefined): "PASS" | "FAIL" {
  const s = normalizeGelatoFulfillmentStatus(fulfillmentStatus);
  return GELATO_FAILURE_STATUS_MARKERS.some((m) => s.includes(m)) ? "FAIL" : "PASS";
}

/** Gelato `passed` — validated and ready toward fulfillment (not production-partner acceptance). */
export function gelatoProviderValidationAcceptanceQc(fulfillmentStatus: string | null | undefined): "PASS" | "FAIL" {
  if (gelatoProviderFailureStateQc(fulfillmentStatus) === "FAIL") return "FAIL";
  const s = normalizeGelatoFulfillmentStatus(fulfillmentStatus);
  if (s === "passed") return "PASS";
  if (s.includes("in_production") || s.includes("printed") || s.includes("shipped") || s.includes("delivered")) {
    return "PASS";
  }
  return "FAIL";
}

/** Production partner accepted — `in_production` or stronger downstream states. */
export function gelatoOrderProductionAcceptanceFromStatusQc(
  fulfillmentStatus: string | null | undefined,
): "PASS" | "FAIL" {
  if (gelatoProviderFailureStateQc(fulfillmentStatus) === "FAIL") return "FAIL";
  const s = normalizeGelatoFulfillmentStatus(fulfillmentStatus);
  if (s.includes("in_production") || s.includes("printed") || s.includes("shipped") || s.includes("delivered")) {
    return "PASS";
  }
  return "FAIL";
}

export function providerOrderHoldDetectionQc(parsed: ParsedGelatoProductionOrder): "PASS" | "FAIL" {
  return parsed.on_hold || parsed.missing_file_types.length > 0 ? "FAIL" : "PASS";
}

export function gelatoOrderProductionAcceptanceQc(parsed: ParsedGelatoProductionOrder): "PASS" | "FAIL" {
  if (!parsed.provider_order_id) return "FAIL";
  if (parsed.on_hold || parsed.missing_file_types.length > 0) return "FAIL";
  if (parsed.reconciliation_state === "REJECTED" || parsed.reconciliation_state === "CANCELLED") return "FAIL";
  const fs = (parsed.fulfillment_status ?? "").trim().toLowerCase();
  if (fs === "created" || fs === "draft") return "FAIL";
  if (parsed.reconciliation_state === "PROVIDER_CREATED" || parsed.reconciliation_state === "VALIDATING") {
    return "FAIL";
  }
  return parsed.production_accepted ? "PASS" : "FAIL";
}
